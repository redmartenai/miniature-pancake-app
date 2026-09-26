import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { inrShort } from '@/features/console/format';
import { CardHead } from '@/features/console/Page';
import { DataTable, Pager, TableFoot, type Column } from '@/features/console/Table';
import { formatDate, formatInr } from '@/lib/format';
import { Button, Card, Link, Search, SegmentedControl, Sheet, Text, TextField, useToast } from '@/ui';

import { feesApi, useOverdue, type Family, type FeesPayload, type PeriodKey, type Reminder, type Segment } from './api';

const PREVIEW = 6;
const PAGE = 25;

export type LedgerView = { segment: Segment; q: string; selected: Family[] };

/** The overdue ledger: families grouped by guardian, largest dues first, with search, segments, selection and paging. */
export function Ledger({
  data,
  period,
  onChange,
  onRemind,
  resetKey,
}: {
  data: FeesPayload;
  period: PeriodKey;
  /** Changes when reminders were sent: the selection is cleared. */
  resetKey: number;
  onChange: (view: LedgerView) => void;
  onRemind: (families: Family[]) => void;
}) {
  const { t } = useTranslation();
  const [segment, setSegment] = useState<Segment>('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Map<string, Family>>(new Map());
  const [calling, setCalling] = useState<Family | null>(null);

  // Debounce the search box.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [q]);
  useEffect(() => {
    setSelected(new Map());
    setPage(1);
  }, [period]);
  useEffect(() => setSelected(new Map()), [resetKey]);
  useEffect(() => {
    onChange({ segment, q: search, selected: [...selected.values()] });
  }, [segment, search, selected, onChange]);

  const size = expanded ? PAGE : PREVIEW;
  const query = useOverdue({ period, segment, q: search, page: expanded ? page : 1, pageSize: size }, true);
  const rows = query.data?.items ?? (segment === 'all' && !search ? data.ledger.preview : []);
  const counts = query.data?.counts ?? data.ledger.counts;
  const total = query.data?.total ?? counts.all;
  const selectedAmount = [...selected.values()].reduce((a, f) => a + Number(f.amount), 0);

  const columns: Column<Family>[] = useMemo(
    () => [
      {
        key: 'family',
        title: t('console.operations.fees.ledger.family'),
        flex: 1.25,
        render: (f) => (
          <View style={{ gap: 1 }}>
            <Text variant="sm" weight={700} style={{ fontSize: 13.5 }} numberOfLines={1}>
              {f.guardian?.name ?? t('console.operations.fees.ledger.noGuardian')}
            </Text>
            {f.guardian ? (
              <Text variant="xs" color="muted" num>
                {formatPhone(f.guardian.phone)}
              </Text>
            ) : null}
          </View>
        ),
      },
      {
        key: 'children',
        title: t('console.operations.fees.ledger.children'),
        flex: 1.7,
        render: (f) => (
          <Text variant="sm" color="ink2" style={{ fontSize: 13.5 }} numberOfLines={2}>
            {f.children.map((c) => `${c.first_name} · ${c.class}`).join(', ')}
          </Text>
        ),
      },
      {
        key: 'days',
        title: t('console.operations.fees.ledger.overdueFor'),
        width: 132,
        align: 'right',
        render: (f) => (
          <Text variant="sm" weight={700} num color={f.overdue_days >= 60 ? 'bad' : 'warn'} style={{ fontSize: 13.5 }}>
            {t('console.operations.fees.ledger.days', { count: f.overdue_days })}
          </Text>
        ),
      },
      {
        key: 'amount',
        title: t('console.operations.fees.ledger.amount'),
        width: 122,
        align: 'right',
        render: (f) => (
          <Text variant="sm" weight={800} num style={{ fontSize: 13.5 }}>
            {formatInr(f.amount)}
          </Text>
        ),
      },
      {
        key: 'last',
        title: t('console.operations.fees.ledger.lastReminder'),
        flex: 1.45,
        render: (f) => <LastReminder r={f.last_reminder} />,
      },
      {
        key: 'actions',
        title: t('console.operations.fees.ledger.actions'),
        width: 190,
        align: 'right',
        render: (f) => (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Button
              title={t('console.operations.fees.ledger.remind')}
              variant="secondary"
              size="sm"
              disabled={!f.guardian}
              accessibilityLabel={t('console.operations.fees.ledger.remindA11y', { name: f.guardian?.name ?? '' })}
              onPress={() => onRemind([f])}
            />
            <Button
              title={t('console.operations.fees.ledger.call')}
              variant="ghost"
              size="sm"
              icon="call"
              disabled={!f.guardian}
              accessibilityLabel={t('console.operations.fees.ledger.callA11y', { name: f.guardian?.name ?? '' })}
              onPress={() => setCalling(f)}
            />
          </View>
        ),
      },
    ],
    [t, onRemind],
  );

  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <View nativeID="fees-ledger" id="fees-ledger" style={styles.head}>
        <CardHead
          style={{ flex: 1 }}
          title={t('console.operations.fees.ledger.title')}
          subtitle={t('console.operations.fees.ledger.subtitle', {
            count: counts.all,
            students: t('console.operations.fees.lead.overdueStudents', { count: counts.students }),
          })}
          right={
            <>
              <Search
                value={q}
                onChangeText={setQ}
                placeholder={t('console.operations.fees.ledger.search')}
                style={{ width: 260, height: 38 }}
              />
              <SegmentedControl<Segment>
                full={false}
                fit
                options={(['all', 'over60', 'never'] as const).map((s) => ({
                  value: s,
                  label: t(`console.operations.fees.ledger.seg.${s}`),
                }))}
                value={segment}
                onChange={(s) => {
                  setSegment(s);
                  setPage(1);
                }}
              />
            </>
          }
        />
      </View>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(f) => f.id}
        selection={{
          selected: new Set(selected.keys()),
          onChange: (next) => {
            const map = new Map<string, Family>();
            next.forEach((id) => {
              const f = selected.get(id) ?? rows.find((r) => r.id === id);
              if (f) map.set(id, f);
            });
            setSelected(map);
          },
          label: (f) => t('console.operations.fees.ledger.select', { name: f.guardian?.name ?? f.children[0]?.name ?? '' }),
          allLabel: t('console.operations.fees.ledger.selectAll'),
        }}
        empty={
          <Text variant="sm" color="muted">
            {counts.all ? t('console.operations.fees.ledger.empty') : t('console.operations.fees.ledger.emptyAll')}
          </Text>
        }
      />
      <TableFoot
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {expanded ? <Pager page={page} pageSize={PAGE} total={total} onPage={setPage} /> : null}
            {expanded ? (
              <Link label={t('console.operations.fees.ledger.fewer')} icon="chevronUp" onPress={() => setExpanded(false)} />
            ) : total > PREVIEW ? (
              <Link label={t('console.operations.fees.ledger.allFamilies', { count: total })} onPress={() => setExpanded(true)} />
            ) : null}
          </View>
        }>
        <Text variant="xs" color="ink2" weight={600}>
          {selected.size
            ? t('console.operations.fees.ledger.selected', { count: selected.size, amount: formatInr(selectedAmount) })
            : t('console.operations.fees.ledger.footer')}
        </Text>
      </TableFoot>
      {calling ? <CallSheet family={calling} period={period} onClose={() => setCalling(null)} /> : null}
    </Card>
  );
}

/** "+919840003067" → "+91 98400 03067". */
export function formatPhone(phone: string) {
  const m = /^\+91(\d{5})(\d{5})$/.exec(phone);
  return m ? `+91 ${m[1]} ${m[2]}` : phone;
}

function channelsLabel(t: ReturnType<typeof useTranslation>['t'], channels: Reminder['channels']) {
  const order = ['whatsapp', 'sms', 'call', 'app'] as const;
  const names = order.filter((c) => channels.includes(c)).map((c) => t(`console.operations.fees.ledger.channel.${c}`));
  return names.map((n, i) => (i > 0 && n === t('console.operations.fees.ledger.channel.app') ? n.toLowerCase() : n)).join(' + ');
}

function LastReminder({ r }: { r: Reminder | null }) {
  const { t } = useTranslation();
  if (!r) {
    return (
      <Text variant="sm" color="muted">
        {t('console.operations.fees.ledger.notYet')}
      </Text>
    );
  }
  return (
    <View style={{ gap: 1 }}>
      <Text variant="sm" numberOfLines={1}>
        {channelsLabel(t, r.channels)} · {formatDate(r.sent_at)}
      </Text>
      <Text variant="xs" color="muted" numberOfLines={1}>
        {r.note || t(`console.operations.fees.ledger.status.${r.status as 'sent'}`, { defaultValue: r.status })}
      </Text>
    </View>
  );
}

function CallSheet({ family, period, onClose }: { family: Family; period: PeriodKey; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState<'answered' | 'no_answer'>('answered');
  const [note, setNote] = useState('');
  const g = family.guardian!;
  const save = useMutation({
    mutationFn: () => feesApi.logCall({ period, guardian_id: g.id, status, note: note.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['console'] });
      toast(t('console.operations.fees.callSheet.saved'));
      onClose();
    },
    onError: () => toast(t('console.operations.fees.callSheet.failed'), 'danger'),
  });
  return (
    <Sheet
      visible
      onClose={onClose}
      title={t('console.operations.fees.callSheet.title', { name: g.name })}
      message={t('console.operations.fees.callSheet.message', {
        phone: formatPhone(g.phone),
        amount: inrShort(family.amount),
        children: family.children.map((c) => `${c.first_name} (${c.class})`).join(', '),
      })}>
      <Button
        title={t('console.operations.fees.callSheet.dial')}
        icon="call"
        variant="secondary"
        onPress={() => Linking.openURL(`tel:${g.phone}`)}
      />
      <Text variant="sm" weight={700}>
        {t('console.operations.fees.callSheet.outcome')}
      </Text>
      <SegmentedControl
        options={[
          { value: 'answered' as const, label: t('console.operations.fees.callSheet.answered') },
          { value: 'no_answer' as const, label: t('console.operations.fees.callSheet.noAnswer') },
        ]}
        value={status}
        onChange={setStatus}
      />
      <TextField
        label={t('console.operations.fees.callSheet.note')}
        value={note}
        onChangeText={setNote}
        placeholder={t('console.operations.fees.callSheet.notePlaceholder')}
        maxLength={200}
      />
      <Button title={t('console.operations.fees.callSheet.save')} loading={save.isPending} onPress={() => save.mutate()} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: 20, paddingHorizontal: 22, paddingBottom: 16, flexDirection: 'row' },
});
