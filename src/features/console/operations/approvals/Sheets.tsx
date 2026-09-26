import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, ErrorState, pointer, SegmentedControl, Sheet, Skeleton, Stamp, Text, useToast } from '@/ui';

import { KINDS, useApprovalMutations, useHistory, useRules, type ApprovalKind, type DecidedStatus, type HistoryRange } from './api';
import { decidedTitle, P, when } from './copy';
import { STAMP_TONE } from './InTray';

/** Every decision, newest first; picking one opens it in the detail pane. */
export function HistorySheet({
  visible,
  initialRange = 'all',
  today,
  onClose,
  onOpen,
}: {
  visible: boolean;
  initialRange?: HistoryRange;
  today: string;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [range, setRange] = useState<HistoryRange>(initialRange);
  const [status, setStatus] = useState<DecidedStatus | 'all'>('all');
  useEffect(() => {
    if (visible) setRange(initialRange);
  }, [visible, initialRange]);
  const q = useHistory(range, status === 'all' ? undefined : status, visible);
  const counts = q.data?.counts;
  const statusOptions = (['all', 'approved', 'sent_back', 'declined'] as const).map((s) => ({
    value: s,
    label: `${t(`${P}.historySheet.status.${s}`)}${counts ? ` ${s === 'all' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[s]}` : ''}`,
  }));
  return (
    <Sheet visible={visible} onClose={onClose} title={t(`${P}.historySheet.title`)} message={t(`${P}.historySheet.message`)}>
      <SegmentedControl
        options={(['today', 'week', 'all'] as const).map((r) => ({ value: r, label: t(`${P}.historySheet.range.${r}`) }))}
        value={range}
        onChange={setRange}
      />
      <SegmentedControl options={statusOptions} value={status} onChange={setStatus} fit />
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 4 }}>
        {q.error ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : !q.data ? (
          <View style={{ gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={48} style={{ borderRadius: 12 }} />
            ))}
          </View>
        ) : q.data.items.length === 0 ? (
          <Text variant="sm" color="muted" style={{ paddingVertical: 16 }}>
            {t(`${P}.historySheet.empty`)}
          </Text>
        ) : (
          q.data.items.map((item, i) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${decidedTitle(t, item)}, ${t(`${P}.stamp.${item.status}`)}`}
              onPress={() => onOpen(item.id)}
              style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.row,
                pointer,
                { borderBottomColor: i === q.data!.items.length - 1 ? 'transparent' : colors.line },
                hovered && { backgroundColor: colors.subtle },
              ]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="sm" weight={600} numberOfLines={1}>
                  {decidedTitle(t, item)}
                </Text>
                <Text variant="xs" color="muted" numberOfLines={1}>
                  {[
                    t(`${P}.historySheet.by`, { when: item.decided_at ? when(item.decided_at, today) : '', name: item.decided_by ?? '' }),
                    item.decision_note,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Stamp tone={STAMP_TONE[item.status]} rotate={-5} style={styles.stamp} textStyle={styles.stampText}>
                {t(`${P}.stamp.${item.status}`)}
              </Stamp>
            </Pressable>
          ))
        )}
        {q.data && q.data.items.length >= q.data.limit ? (
          <Text variant="xs" color="muted" style={{ paddingTop: 8 }}>
            {t(`${P}.historySheet.limit`, { count: q.data.limit })}
          </Text>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

/** The SLA per kind (editable) and the rules every decision follows. */
export function RulesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const q = useRules(visible);
  const { saveRules } = useApprovalMutations();
  const [draft, setDraft] = useState<Partial<Record<ApprovalKind, number>>>({});
  useEffect(() => {
    if (visible) setDraft({});
  }, [visible]);
  const rules = q.data;
  const changed = rules ? (Object.entries(draft) as [ApprovalKind, number][]).filter(([k, v]) => rules.sla_hours[k] !== v) : [];

  const save = async () => {
    if (!changed.length) {
      toast(t(`${P}.rulesSheet.unchanged`), 'info');
      return;
    }
    try {
      await saveRules.mutateAsync(Object.fromEntries(changed));
      toast(t(`${P}.rulesSheet.saved`));
      onClose();
    } catch (e) {
      toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t(`${P}.decision.failed`), 'bad');
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t(`${P}.rulesSheet.title`)} message={t(`${P}.rulesSheet.message`)}>
      {q.error ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !rules ? (
        <Skeleton height={220} style={{ borderRadius: 12 }} />
      ) : (
        <View style={{ gap: 14 }}>
          {KINDS.map((k) => (
            <View key={k} style={styles.rule}>
              <Text variant="sm" weight={700} style={{ width: 130 }}>
                {t(`${P}.section.${k}`)}
              </Text>
              <SegmentedControl
                full={false}
                options={rules.choices.map((h) => ({ value: h, label: t(`${P}.rulesSheet.hours`, { count: h }) }))}
                value={draft[k] ?? rules.sla_hours[k]}
                onChange={(v) => setDraft((d) => ({ ...d, [k]: v }))}
              />
            </View>
          ))}
          <View style={[styles.policy, { backgroundColor: colors.subtle, borderColor: colors.line }]}>
            <Text variant="kicker">{t(`${P}.rulesSheet.policy`)}</Text>
            {[
              t(`${P}.rulesSheet.notes`),
              t(`${P}.rulesSheet.undo`, { count: rules.undo_minutes }),
              t(`${P}.rulesSheet.audit`),
              rules.deciders.length ? t(`${P}.rulesSheet.deciders`, { names: rules.deciders.join(', ') }) : '',
            ]
              .filter(Boolean)
              .map((line) => (
                <Text key={line} variant="xs" color="ink2">
                  {`• ${line}`}
                </Text>
              ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title={t(`${P}.rulesSheet.close`)} variant="secondary" onPress={onClose} style={{ flex: 1 }} />
            <Button title={t(`${P}.rulesSheet.save`)} onPress={() => void save()} loading={saveRules.isPending} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 4, borderBottomWidth: 1 },
  stamp: { paddingHorizontal: 8, paddingVertical: 6, alignSelf: 'center' },
  stampText: { fontSize: 9.5, lineHeight: 10, letterSpacing: 9.5 * 0.12 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  policy: { gap: 6, padding: 14, borderRadius: 12, borderWidth: 1 },
});
