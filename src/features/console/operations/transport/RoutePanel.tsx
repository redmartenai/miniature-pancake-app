import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { clockShort, formatClock, formatDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Avatar, Bar, Button, Card, ErrorState, Icon, IconButton, Pill, Skeleton, Text, TileIcon } from '@/ui';

import { useRouteRun, type FleetRow, type RouteRun, type TimelineStop } from './api';
import { NotifySheet } from './NotifySheet';
import { statusPill, statusTile } from './status';

const T = 'console.operations.transport.route';

function call(phone: string) {
  Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
}

/** The selected route's run: late banner, crew, who's on board, and the stops with planned vs live times. */
export function RoutePanel({ row }: { row: FleetRow }) {
  if (row.kind === 'vehicle' || !row.route_id) return <DepotPanel row={row} />;
  return <RouteRunPanel routeId={row.route_id} />;
}

function RouteRunPanel({ routeId }: { routeId: string }) {
  const q = useRouteRun(routeId);
  if (q.error) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!q.data) return <Skeleton height={420} style={{ borderRadius: 18 }} />;
  return <RunCard run={q.data} />;
}

function RunCard({ run }: { run: RouteRun }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [notifying, setNotifying] = useState(false);
  const pill = statusPill(t, { status: run.status, delay: run.delay, start: run.trip.start });
  const runName = t(`console.operations.transport.run.${run.trip.direction}`);
  const driver = run.crew.find((c) => c.role === 'driver');
  const absentNames = run.absent.map((s) => `${s.name} (${s.class})`).join(', ');
  const notes = [
    run.absent.length ? t(`${T}.absent`, { count: run.absent.length, names: absentNames }) : t(`${T}.noneAbsent`),
    run.dropped ? t(`${T}.dropped`, { count: run.dropped }) : null,
  ].filter(Boolean);

  return (
    <Card pad={22} style={{ gap: 18 }}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <TileIcon icon="bus" tone={statusTile(run.status)} />
          <View style={{ gap: 2, flexShrink: 1 }}>
            <View style={styles.titleRow}>
              <Text variant="h3" accessibilityRole="header" style={{ flexShrink: 1 }}>
                {t(`${T}.title`, { route: run.route.name, run: runName })}
              </Text>
              <Pill label={pill.label} tone={pill.tone} />
            </View>
            {run.vehicle ? (
              <Text variant="xs" color="muted">
                {t(run.trip.direction === 'drop' ? `${T}.meta` : `${T}.metaPickup`, {
                  reg: run.vehicle.registration_no,
                  seats: run.vehicle.capacity,
                  count: run.service_stops,
                })}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.actions}>
          {driver ? <Button title={t(`${T}.callDriver`)} icon="call" variant="secondary" onPress={() => call(driver.phone)} /> : null}
          <Button
            title={t(`${T}.notify`, { route: run.route.name })}
            icon="send"
            onPress={() => setNotifying(true)}
            disabled={run.notify.families === 0}
          />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.side}>
          {run.status === 'late' ? <LateBanner run={run} /> : null}
          <View>
            {run.crew.map((c, i) => (
              <View key={c.id} style={[styles.crew, i < run.crew.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
                <Avatar name={c.name} size="sm" tone={c.role === 'driver' ? 3 : 4} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="sm" weight={700} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text variant="xs" color="muted" numberOfLines={1}>
                    {t(`${T}.${c.role}`)} · {c.phone_display ?? c.phone}
                  </Text>
                </View>
                <IconButton icon="call" size="sm" label={t(`${T}.call`, { name: c.name })} onPress={() => call(c.phone)} />
              </View>
            ))}
          </View>
          <View style={[styles.well, { backgroundColor: colors.sunken }]}>
            <View style={styles.wellHead}>
              <Text variant="sm" weight={600} color="ink2">
                {t(`${T}.onBoard`)}
              </Text>
              <Text style={[styles.kpi, { color: colors.ink }]}>
                {run.on_board} / {run.riders}
              </Text>
            </View>
            <Bar value={run.on_board} max={Math.max(1, run.riders)} accessibilityLabel={`${run.on_board} / ${run.riders}`} />
            <Text variant="xs" color="muted">
              {notes.join(' · ')}
            </Text>
          </View>
        </View>
        <Timeline run={run} />
      </View>
      <NotifySheet run={run} visible={notifying} onClose={() => setNotifying(false)} />
    </Card>
  );
}

function LateBanner({ run }: { run: RouteRun }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const title = run.reason
    ? t(`${T}.lateTitle`, { count: run.delay, reason: run.reason })
    : run.held
      ? t(`${T}.lateHeld`, { count: run.delay, stop: run.held.stop })
      : t(`${T}.lateOnly`, { count: run.delay });
  const end = run.final;
  const body =
    end && end.eta
      ? run.next && run.next.eta && run.next.name !== end.name
        ? t(`${T}.lateBody`, {
            end: formatClock(end.eta),
            planned: clockShort(end.planned),
            stop: run.next.name,
            eta: formatClock(run.next.eta),
            stopPlanned: clockShort(run.next.planned),
          })
        : t(`${T}.lateBodyEnd`, { end: formatClock(end.eta), planned: clockShort(end.planned) })
      : null;
  return (
    <View style={[styles.banner, { backgroundColor: colors.warnSoft }]} accessibilityRole="alert">
      <View style={{ paddingTop: 1 }}>
        <Icon name="alert" size={18} rawColor={colors.warn} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="sm" weight={700}>
          {title}
        </Text>
        {body ? (
          <Text variant="xs" color="ink2">
            {body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Timeline({ run }: { run: RouteRun }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const stops = run.stops;
  const done = (s: TimelineStop) => s.state === 'departed' || s.state === 'arrived' || s.state === 'skipped';
  return (
    <View style={{ flex: 1, minWidth: 0 }} accessibilityLabel={t(`${T}.timeline`, { route: run.route.name })}>
      <View style={[styles.grid, styles.gridHead, { borderBottomColor: colors.line }]}>
        <View style={styles.c1} />
        <Text variant="eyebrow" style={styles.c2}>
          {t(`${T}.stop`)}
        </Text>
        <Text variant="eyebrow" style={[styles.c3, styles.right]}>
          {t(`${T}.planned`)}
        </Text>
        <Text variant="eyebrow" style={[styles.c4, styles.right]}>
          {t(`${T}.liveEta`)}
        </Text>
      </View>
      <View style={{ paddingTop: 4 }} accessibilityRole="list">
        {stops.map((s, i) => {
          const next = stops[i + 1];
          const travelled = next ? done(next) || next.state === 'at_stop' : false;
          const current = s.state === 'at_stop' || s.state === 'next';
          const late = run.status === 'late';
          let sub: string;
          let subColor: string = colors.muted;
          let subBold = false;
          if (s.state === 'departed' && s.departed) sub = t(`${T}.left`, { time: formatClock(s.departed) });
          else if (s.state === 'arrived' && s.arrived) sub = t(`${T}.arrivedAt`, { time: formatClock(s.arrived) });
          else if (s.state === 'skipped') sub = t(`${T}.skipped`);
          else if (s.state === 'at_stop' && s.held_minutes) {
            sub = t(`${T}.heldHere`, { count: s.held_minutes });
            subColor = colors.warn;
            subBold = true;
          } else if (s.state === 'at_stop') sub = t(`${T}.atStop`);
          else if (s.is_school) sub = t(`${T}.schoolGate`);
          else if (s.students) sub = t(`${T}.students`, { count: s.students });
          else sub = i === stops.length - 1 ? t(`${T}.endOfRun`) : t(`${T}.students`, { count: 0 });

          const actual = s.state === 'departed' ? s.departed : s.state === 'arrived' ? s.arrived : null;
          const live =
            s.state === 'at_stop'
              ? t(`${T}.now`)
              : s.state === 'skipped'
                ? '—'
                : actual
                  ? clockShort(actual)
                  : s.eta
                    ? clockShort(s.eta)
                    : '—';
          const liveColor = s.state === 'at_stop' ? (late ? colors.warn : colors.brand) : colors.ink;
          return (
            <View
              key={s.id}
              style={[styles.grid, styles.stopRow]}
              accessibilityLabel={`${s.name}, ${sub}, ${clockShort(s.planned)}, ${live}`}>
              {next ? <View style={[styles.rail, { backgroundColor: travelled ? colors.brand : colors.lineStrong }]} /> : null}
              <View style={[styles.c1, styles.dotCell]}>
                {done(s) ? (
                  <View style={[styles.dot, { backgroundColor: s.state === 'skipped' ? colors.faint : colors.brand }]} />
                ) : current ? (
                  <View style={[styles.dotNow, { backgroundColor: colors.surface, borderColor: late ? colors.warn : colors.brand }]} />
                ) : (
                  <View style={[styles.dot, { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.lineStrong }]} />
                )}
              </View>
              <View style={styles.c2}>
                <Text variant="sm" weight={700} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text variant="xs" rawColor={subColor} weight={subBold ? 700 : undefined} numberOfLines={1}>
                  {sub}
                </Text>
              </View>
              <Text variant="sm" color="muted" num style={[styles.c3, styles.right]}>
                {clockShort(s.planned)}
              </Text>
              <Text variant="sm" weight={700} num rawColor={liveColor} style={[styles.c4, styles.right]}>
                {live}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** A bus with no route today: what it is and whether it's road-ready. */
function DepotPanel({ row }: { row: FleetRow }) {
  const { t } = useTranslation();
  const v = row.vehicle;
  const pill = statusPill(t, row);
  const date = (d: string | null) => (d ? formatDate(d, { year: true }) : t(`${T}.notRecorded`));
  const facts: [string, string][] = v
    ? [
        [t(`${T}.gps`), v.gps ? t(`${T}.yes`) : t(`${T}.no`)],
        [t(`${T}.fitness`), date(v.fitness_valid_until)],
        [t(`${T}.insurance`), date(v.insurance_valid_until)],
        [t(`${T}.permit`), date(v.permit_valid_until)],
      ]
    : [];
  return (
    <Card pad={22} style={{ gap: 18 }}>
      <View style={styles.headLeft}>
        <TileIcon icon="bus" tone="neutral" />
        <View style={{ gap: 2, flexShrink: 1 }}>
          <View style={styles.titleRow}>
            <Text variant="h3" accessibilityRole="header">
              {t(`${T}.depotTitle`, { bus: row.label })}
            </Text>
            <Pill label={pill.label} tone={pill.tone} />
          </View>
          {v ? (
            <Text variant="xs" color="muted">
              {t(`${T}.depotMeta`, { reg: v.registration_no, seats: v.capacity })}
            </Text>
          ) : null}
        </View>
      </View>
      <Text variant="sm" color="ink2">
        {t(`${T}.depotBody`)}
      </Text>
      <View style={styles.facts}>
        {facts.map(([k, val]) => (
          <View key={k} style={styles.fact}>
            <Text variant="eyebrow">{k}</Text>
            <Text variant="sm" weight={700}>
              {val}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  body: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  side: { width: 290, gap: 14 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14 },
  crew: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  well: { padding: 14, borderRadius: 14, gap: 8 },
  wellHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  kpi: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.66, fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gridHead: { paddingBottom: 6, borderBottomWidth: 1 },
  stopRow: { position: 'relative', paddingVertical: 7 },
  right: { textAlign: 'right' },
  c1: { width: 20 },
  c2: { flex: 1, minWidth: 0 },
  c3: { width: 62 },
  c4: { width: 64 },
  rail: { position: 'absolute', left: 9, top: 25, bottom: -26, width: 2 },
  dotCell: { alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotNow: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  fact: { gap: 4, minWidth: 150 },
});
