import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { ApprovalKind } from '@/api/types';
import { useRefetchOnFocus } from '@/features/common/useRefetchOnFocus';
import { ApprovalCard } from '@/features/principal/ApprovalCard';
import { formatDate, formatTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { AppBar, EmptyState, ErrorState, Icon, ICON_SIZE, IconButton, LoadingCards, pointer, Screen, Sheet, Stamp, Text, ThemeToggle } from '@/ui';

const KINDS: ApprovalKind[] = ['leave', 'marks', 'refund', 'admission', 'attendance'];
const FIRST = 5;

/** PMApprovals: the in-tray, most urgent on top. Open one to read it, then approve, decline or send back. */
export default function PrincipalApprovals() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [kind, setKind] = useState<ApprovalKind | ''>('');
  const [open, setOpen] = useState<string>();
  const [more, setMore] = useState(false);
  const [history, setHistory] = useState(false);
  // One query for the whole tray; filtering is local so counts and decided cards stay put.
  const tray = useQuery({ queryKey: ['approvals', ''], queryFn: () => api.approvals() });
  useRefetchOnFocus(tray.refetch);
  const all = tray.data?.items ?? [];
  const items = kind ? all.filter((i) => i.kind === kind) : all;
  useEffect(() => {
    if (!open && items[0]) setOpen(items.find((i) => i.status === 'pending')?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tray.data, kind]);
  const shown = more ? items : items.slice(0, FIRST);
  const rest = items.slice(FIRST);
  const restCounts = KINDS.map((k) => [k, rest.filter((i) => i.kind === k).length] as const).filter(([, n]) => n);

  return (
    <Screen
      dock
      gap={18}
      refreshing={tray.isRefetching}
      onRefresh={tray.refetch}
      header={
        <AppBar
          subtitle={t('principal.approvals.kicker')}
          title={t('principal.approvals.title')}
          theme={false}
          actions={
            <>
              <ThemeToggle />
              <IconButton icon="history" size="lg" label={t('principal.approvals.history')} onPress={() => setHistory(true)} />
            </>
          }
        />
      }>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        style={{ marginHorizontal: -20, marginTop: -4, flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.line }}
        contentContainerStyle={{ gap: 2, paddingHorizontal: 16, paddingBottom: 10 }}>
        {([['', tray.data?.total ?? 0], ...KINDS.map((k) => [k, tray.data?.counts[k] ?? 0] as const).filter(([, n]) => n)] as const).map(([k, n]) => {
          const on = kind === k;
          return (
            <Pressable
              key={k || 'all'}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                setKind(k as ApprovalKind | '');
                setOpen(undefined);
                setMore(false);
              }}
              style={[styles.filter, on && { backgroundColor: colors.brand }, pointer]}>
              <Text variant="sm" weight={on ? 700 : 600} rawColor={on ? colors.onBrand : colors.ink2}>
                {k ? t(`principal.filter.${k}`) : t('principal.filter.all')}{' '}
                <Text variant="sm" num rawColor={on ? colors.onBrand : colors.muted} style={{ opacity: 0.8 }}>
                  {n}
                </Text>
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {tray.error ? <ErrorState error={tray.error} onRetry={tray.refetch} /> : null}
      {!tray.data ? <LoadingCards count={3} /> : null}
      {tray.data && !items.length ? <EmptyState icon="checkCircle" title={t('principal.approvals.empty')} /> : null}
      {shown.map((item) => (
        <ApprovalCard key={item.id} item={item} expanded={open === item.id} onOpen={() => setOpen(item.id)} />
      ))}
      {!more && rest.length ? (
        <Pressable accessibilityRole="button" onPress={() => setMore(true)} style={[styles.row, styles.more, { borderColor: colors.line }, pointer]}>
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Text variant="sm" weight={700}>
              {t('principal.approvals.more', { count: rest.length })}
            </Text>
            <Text variant="xs" color="muted">
              {restCounts.map(([k, n]) => t(`principal.approvals.count_${k}`, { count: n })).join(' · ')}
            </Text>
          </View>
          <Icon name="chevronDown" size={ICON_SIZE.sm} rawColor={colors.ink2} />
        </Pressable>
      ) : null}
      {tray.data ? (
        <View style={[styles.row, { gap: 10, alignItems: 'flex-start', paddingHorizontal: 2 }]}>
          <Icon name="shield" size={ICON_SIZE.sm} rawColor={colors.muted} />
          <Text variant="xs" color="muted" style={{ flex: 1 }}>
            {t('principal.approvals.auditNote')}
          </Text>
        </View>
      ) : null}
      <History visible={history} onClose={() => setHistory(false)} />
    </Screen>
  );
}

function History({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const q = useQuery({ queryKey: ['approvals-history'], queryFn: api.approvalHistory, enabled: visible });
  return (
    <Sheet visible={visible} onClose={onClose} title={t('principal.approvals.history')} message={t('principal.approvals.historyBody')}>
      <ScrollView style={{ maxHeight: 440 }}>
        {!q.data ? <LoadingCards count={2} /> : null}
        {q.data && !q.data.items.length ? (
          <Text variant="sm" color="muted">
            {t('principal.approvals.noHistory')}
          </Text>
        ) : null}
        {q.data?.items.map((i) => (
          <View key={i.id} style={[styles.row, { gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="sm" weight={700} numberOfLines={1}>
                {`${i.requested_by?.name ?? ''} · ${t(`principal.kind.${i.kind}`).toLowerCase()}`}
              </Text>
              <Text variant="xs" color="muted" numberOfLines={1}>
                {[i.summary, i.decided_at ? `${formatDate(i.decided_at)}, ${formatTime(new Date(i.decided_at))}` : null, i.decided_by].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Stamp tone={i.status === 'approved' ? 'ok' : i.status === 'sent_back' ? 'warn' : 'bad'} rotate={-4}>
              {t(`principal.approvals.stamp_${i.status}`)}
            </Stamp>
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  filter: { height: 38, paddingHorizontal: 14, borderRadius: 19, justifyContent: 'center' },
  more: { gap: 12, minHeight: 56, paddingVertical: 10, paddingHorizontal: 4, borderTopWidth: 1, borderBottomWidth: 1 },
});
