import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Col, ConsolePage, Row } from '@/features/console/Page';
import { parseDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Button, cardShadowLg, Chip, Highlight, Icon, pointer, Skeleton, Text } from '@/ui';

import {
  KINDS,
  useApproval,
  useApprovalMutations,
  useInTray,
  type Approval,
  type ApprovalKind,
  type HistoryRange,
  type InTray as Tray,
} from './api';
import { P } from './copy';
import { Detail } from './Detail';
import { InTray, sections, type Grouping } from './InTray';
import { HistorySheet, RulesSheet } from './Sheets';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Console › Operations › Approvals: the principal's in-tray on the web. */
export function ApprovalsPage() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string; kind?: string }>();
  const tray = useInTray();
  const data = tray.data;
  const [kind, setKind] = useState<ApprovalKind | 'all'>(
    KINDS.includes(params.kind as ApprovalKind) ? (params.kind as ApprovalKind) : 'all',
  );
  const [grouping, setGrouping] = useState<Grouping>('type');
  const [menu, setMenu] = useState(false);
  const [picked, setPicked] = useState<string | undefined>(params.id);
  const [history, setHistory] = useState<HistoryRange | null>(null);
  const [rules, setRules] = useState(false);
  // What a decision or undo returned, shown until the in-tray refetches.
  const [fresh, setFresh] = useState<Record<string, Approval>>({});
  const { decide, undo } = useApprovalMutations();

  const visible = useMemo(() => (data ? data.items.filter((i) => kind === 'all' || i.kind === kind) : []), [data, kind]);
  const { groups, flat } = useMemo(() => sections(t, visible, grouping), [t, visible, grouping]);
  const decided = useMemo(() => (data ? data.decided_today.items.filter((i) => kind === 'all' || i.kind === kind) : []), [data, kind]);

  const known = picked
    ? (fresh[picked] ?? data?.items.find((i) => i.id === picked) ?? data?.decided_today.items.find((i) => i.id === picked))
    : undefined;
  const remote = useApproval(picked, !!data && !known);
  const selected = known ?? (picked ? remote.data : undefined) ?? flat[0];
  const index = selected ? flat.findIndex((i) => i.id === selected.id) : -1;

  const select = (id: string) => {
    setPicked(id);
    router.setParams({ id });
  };
  const chooseKind = (k: ApprovalKind | 'all') => {
    setKind(k);
    setPicked(undefined);
    router.setParams({ kind: k === 'all' ? undefined : k, id: undefined });
  };
  const remember = (item: Approval) => {
    setFresh((f) => ({ ...f, [item.id]: item }));
    return item;
  };

  return (
    <ConsolePage
      title={t(`${P}.title`)}
      crumbs={[{ label: t(`${P}.crumb`) }]}
      subtitle={data ? <Lead data={data} /> : undefined}
      actions={
        <>
          <Button title={t(`${P}.history`)} variant="secondary" icon="history" onPress={() => setHistory('all')} />
          <Button title={t(`${P}.rules`)} variant="secondary" icon="sliders" onPress={() => setRules(true)} />
        </>
      }
      loading={tray.isLoading}
      error={tray.error}
      onRetry={() => void tray.refetch()}>
      {data ? (
        <>
          <View style={[styles.toolbar, { zIndex: 5 }]} accessibilityRole="tablist" aria-label={t(`${P}.filterLabel`)}>
            <KindChip label={t(`${P}.all`)} n={data.total} selected={kind === 'all'} onPress={() => chooseKind('all')} />
            {KINDS.filter((k) => data.counts[k] > 0 || kind === k).map((k) => (
              <KindChip key={k} label={t(`${P}.chip.${k}`)} n={data.counts[k]} selected={kind === k} onPress={() => chooseKind(k)} />
            ))}
            <View style={{ flex: 1 }} />
            <GroupMenu
              value={grouping}
              open={menu}
              onToggle={() => setMenu((m) => !m)}
              onChange={(g) => (setGrouping(g), setMenu(false))}
            />
          </View>
          <Row gap={28}>
            <Col span={4}>
              <InTray
                groups={groups}
                decided={decided}
                decidedTotal={data.decided_today.total}
                selectedId={selected?.id}
                onSelect={select}
                onAllDecisions={() => setHistory('today')}
                emptyText={data.total ? t(`${P}.empty`) : t(`${P}.emptyAll`)}
              />
            </Col>
            <Col span={8}>
              {selected ? (
                <Detail
                  item={selected}
                  today={data.today}
                  signer={data.signer}
                  position={index >= 0 ? { index, total: flat.length } : null}
                  onPrev={index > 0 ? () => select(flat[index - 1].id) : undefined}
                  onNext={
                    index >= 0 && index < flat.length - 1
                      ? () => select(flat[index + 1].id)
                      : index < 0 && flat.length
                        ? () => select(flat[0].id)
                        : undefined
                  }
                  onDecide={async (decision, note) => {
                    const id = selected.id;
                    setPicked(id);
                    return remember(await decide.mutateAsync({ id, decision, note }));
                  }}
                  onUndo={async () => remember(await undo.mutateAsync(selected.id))}
                  busy={decide.isPending || undo.isPending}
                />
              ) : picked && remote.isLoading ? (
                <Skeleton height={420} style={{ borderRadius: 18 }} />
              ) : (
                <Text variant="sm" color="muted">
                  {t(`${P}.emptyAll`)}
                </Text>
              )}
            </Col>
          </Row>
          <HistorySheet
            visible={history !== null}
            initialRange={history ?? 'all'}
            today={data.today}
            onClose={() => setHistory(null)}
            onOpen={(id) => {
              setHistory(null);
              select(id);
            }}
          />
          <RulesSheet visible={rules} onClose={() => setRules(false)} />
        </>
      ) : null}
    </ConsolePage>
  );
}

/** "12 requests are waiting on you. 3 are past the two-day promise, and Vikram Singh needs an answer before tomorrow's timetable goes out." */
function Lead({ data }: { data: Tray }) {
  const { t } = useTranslation();
  const days = data.sla_hours % 24 === 0 ? data.sla_hours / 24 : 0;
  const promise = days
    ? t(`${P}.promiseWords.${days}`, { defaultValue: t(`${P}.promiseDays`, { count: days }) })
    : t(`${P}.promiseHours`, { count: data.sla_hours });
  const names = data.urgent.names;
  const joined = names.length > 1 ? t(`${P}.and`, { a: names.slice(0, -1).join(', '), b: names[names.length - 1] }) : (names[0] ?? '');
  const next = parseDate(data.urgent.day);
  const tomorrow = parseDate(data.today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day =
    next.getTime() === tomorrow.getTime()
      ? t(`${P}.tomorrows`)
      : t(`${P}.dayName`, { day: t(`${P}.weekday.${WEEKDAY_KEYS[next.getDay()]}`) });
  if (!data.total) {
    return (
      <Text variant="lg" color="ink2" style={styles.lead}>
        {t(`${P}.leadNone`)}
      </Text>
    );
  }
  return (
    <Text variant="lg" color="ink2" style={styles.lead}>
      <Trans i18nKey={`${P}.lead`} count={data.total} values={{ count: data.total }} components={{ p: <Highlight color="pink" /> }} />
      {data.past_sla ? (
        <Trans i18nKey={`${P}.past`} count={data.past_sla} values={{ count: data.past_sla, promise }} components={{ b: <Highlight /> }} />
      ) : (
        t(`${P}.pastNone`, { promise })
      )}
      {names.length ? t(`${P}.urgent`, { count: names.length, names: joined, day }) : t(`${P}.urgentNone`)}
    </Text>
  );
}

function KindChip({ label, n, selected, onPress }: { label: string; n: number; selected: boolean; onPress: () => void }) {
  return (
    <Chip
      label={selected ? label : `${label} ${n}`}
      count={selected ? n : undefined}
      selected={selected}
      onPress={onPress}
      accessibilityLabel={`${label}, ${n}`}
      style={!selected && { borderColor: 'transparent' }}
    />
  );
}

function GroupMenu({
  value,
  open,
  onToggle,
  onChange,
}: {
  value: Grouping;
  open: boolean;
  onToggle: () => void;
  onChange: (g: Grouping) => void;
}) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  return (
    <View style={{ position: 'relative' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(`${P}.group.menu`)}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.groupBtn,
          pointer,
          hovered && { backgroundColor: colors.subtle },
        ]}>
        <Text style={[styles.groupText, { color: colors.ink2 }]}>{t(`${P}.group.${value}`)}</Text>
        <Icon name="chevronDown" size={14} rawColor={colors.ink2} />
      </Pressable>
      {open ? (
        <View
          style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.line }, cardShadowLg(scheme)]}
          accessibilityRole="menu">
          {(['type', 'age'] as const).map((g) => (
            <Pressable
              key={g}
              accessibilityRole="menuitem"
              accessibilityState={{ checked: g === value }}
              onPress={() => onChange(g)}
              style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.menuItem,
                pointer,
                hovered && { backgroundColor: colors.subtle },
              ]}>
              <View style={{ flex: 1 }}>
                <Text variant="sm" weight={700}>
                  {t(`${P}.group.${g}`)}
                </Text>
                <Text variant="xs" color="muted">
                  {t(`${P}.group.${g}Hint`)}
                </Text>
              </View>
              {g === value ? <Icon name="check" size={16} rawColor={colors.brandInk} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { maxWidth: 680 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  groupBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999 },
  groupText: { fontFamily: fonts.semibold, fontSize: 13 },
  menu: { position: 'absolute', top: 42, right: 0, width: 250, borderRadius: 14, borderWidth: 1, padding: 6, zIndex: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10 },
});
