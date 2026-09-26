import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Col, ConsolePage, Row } from '@/features/console/Page';
import { formatClock } from '@/lib/format';
import { Button, Pill } from '@/ui';

import { useTransportLive, type FleetRow, type TransportLive } from './api';
import { Exceptions } from './Exceptions';
import { FleetList } from './FleetList';
import { FleetMap } from './FleetMap';
import { RoutePanel } from './RoutePanel';
import { RoutesSheet } from './RoutesSheet';

const T = 'console.operations.transport';

/** "14 buses · 12 on the drop run (1 late) · 1 arrived · 1 in depot" */
function subtitle(t: (k: string, o?: Record<string, unknown>) => string, data: TransportLive) {
  const c = data.counts;
  const run = t(`${T}.run.${data.run.direction}`);
  const parts = [t(`${T}.sub.buses`, { count: c.buses })];
  if (c.on_road) parts.push(t(`${T}.sub.onRun`, { count: c.on_road, run }) + (c.late ? ` ${t(`${T}.sub.late`, { count: c.late })}` : ''));
  if (c.scheduled) parts.push(t(`${T}.sub.scheduled`, { count: c.scheduled }));
  if (c.arrived) parts.push(t(`${T}.sub.arrived`, { count: c.arrived }));
  if (c.cancelled) parts.push(t(`${T}.sub.cancelled`, { count: c.cancelled }));
  if (c.depot) parts.push(t(`${T}.sub.depot`, { count: c.depot }));
  return parts.join(' · ');
}

/** PTransport: the fleet live on the map, the selected route's run, and today's pickup & drop exceptions. */
export function TransportPage() {
  const { t } = useTranslation();
  const q = useTransportLive();
  const data = q.data;
  const [picked, setPicked] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [routesOpen, setRoutesOpen] = useState(false);

  const selectedId = picked && data?.fleet.some((r) => r.id === picked) ? picked : (data?.selected ?? null);
  const selected = data?.fleet.find((r) => r.id === selectedId) ?? null;

  // Three other routes in colour: the ones picked before, then the busiest on the road.
  const compare = useMemo<FleetRow[]>(() => {
    if (!data) return [];
    const drawable = data.fleet.filter((r) => r.kind === 'route' && r.id !== selectedId && r.path.line.length > 1);
    const byId = new Map(drawable.map((r) => [r.id, r]));
    const first = recent.map((id) => byId.get(id)).filter((r): r is FleetRow => !!r);
    const rest = drawable
      .filter((r) => (r.status === 'late' || r.status === 'on_time') && !first.includes(r))
      .sort((a, b) => b.riders - a.riders || a.label.localeCompare(b.label));
    return [...first, ...rest].slice(0, 3).sort((a, b) => a.label.localeCompare(b.label));
  }, [data, recent, selectedId]);

  const select = (id: string) => {
    if (id === selectedId) return;
    if (selectedId) setRecent((r) => [selectedId, ...r.filter((x) => x !== selectedId && x !== id)].slice(0, 3));
    setPicked(id);
  };

  const status = data
    ? data.live
      ? { label: t(`${T}.live`, { time: formatClock(data.updated) }), tone: 'ok' as const }
      : data.last_fix
        ? { label: t(`${T}.stale`, { time: formatClock(data.updated), fix: formatClock(data.last_fix) }), tone: 'neutral' as const }
        : { label: t(`${T}.idle`, { time: formatClock(data.updated) }), tone: 'neutral' as const }
    : null;

  return (
    <ConsolePage
      title={t(`${T}.title`)}
      crumbTitle={t('console.shell.nav.transport')}
      crumbs={[{ label: t('console.shell.group.operations') }]}
      subtitle={data ? subtitle(t, data) : undefined}
      actions={
        <>
          {status ? <Pill label={status.label} tone={status.tone} size="lg" /> : null}
          <Button title={t(`${T}.manageRoutes`)} icon="sliders" variant="secondary" onPress={() => setRoutesOpen(true)} />
        </>
      }
      loading={q.isLoading}
      error={q.error}
      onRetry={q.refetch}>
      {data ? (
        <Row>
          <Col span={8} gap={20}>
            <FleetMap data={data} selected={selected} compare={compare} onSelect={select} />
            {selected ? <RoutePanel row={selected} /> : null}
          </Col>
          <Col span={4} gap={20}>
            <FleetList fleet={data.fleet} selectedId={selectedId} onSelect={select} />
            <Exceptions items={data.exceptions.items} />
          </Col>
        </Row>
      ) : null}
      <RoutesSheet visible={routesOpen} onClose={() => setRoutesOpen(false)} />
    </ConsolePage>
  );
}
