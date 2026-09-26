import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Kicker, Link, pointer, Stamp, Text, type StampTone } from '@/ui';

import { KINDS, type Approval, type ApprovalKind } from './api';
import { age, decidedTitle, lowerFirst, P, rowText } from './copy';

export type Grouping = 'type' | 'age';

export const STAMP_TONE: Record<string, StampTone> = { approved: 'ok', sent_back: 'brand', declined: 'bad', withdrawn: 'warn' };
const TILT = [-7, -4, -9];

/** Requests someone has already checked (an HOD) are ready for a decision, so they lead their section. */
function readyFirst(items: Approval[]): Approval[] {
  const ready = (i: Approval) => (i.trail.some((s) => s.action === 'checked') ? 0 : 1);
  return [...items].sort((a, b) => ready(a) - ready(b));
}

/** Sections of the in-tray, in reading order; `flat` is the order prev/next walks. */
export function sections(t: TFunction, items: Approval[], grouping: Grouping) {
  const groups: { key: string; label: string; items: Approval[] }[] =
    grouping === 'type'
      ? KINDS.map((k: ApprovalKind) => ({ key: k, label: t(`${P}.section.${k}`), items: readyFirst(items.filter((i) => i.kind === k)) }))
      : [
          { key: 'past', label: t(`${P}.section.past`), items: items.filter((i) => i.sla?.past) },
          { key: 'today', label: t(`${P}.section.today`), items: items.filter((i) => !i.sla?.past && i.decide_today) },
          {
            key: 'onTime',
            label: t(`${P}.section.onTime`),
            items: items.filter((i) => !i.sla?.past && !i.decide_today).sort((a, b) => (a.sla?.hours_left ?? 0) - (b.sla?.hours_left ?? 0)),
          },
        ];
  if (grouping === 'age') groups[0].items.sort((a, b) => (b.sla?.past_by_hours ?? 0) - (a.sla?.past_by_hours ?? 0));
  const shown = groups.filter((g) => g.items.length);
  return { groups: shown, flat: shown.flatMap((g) => g.items) };
}

export function InTray({
  groups,
  decided,
  decidedTotal,
  selectedId,
  onSelect,
  onAllDecisions,
  emptyText,
}: {
  groups: { key: string; label: string; items: Approval[] }[];
  decided: Approval[];
  decidedTotal: number;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onAllDecisions: () => void;
  emptyText: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.col} accessibilityRole="list" aria-label={t(`${P}.listLabel`)}>
      {groups.length === 0 ? (
        <Text variant="sm" color="muted" style={{ paddingVertical: 8 }}>
          {emptyText}
        </Text>
      ) : null}
      {groups.map((g) => (
        <View key={g.key} style={styles.group}>
          <Kicker>{`${g.label} · ${g.items.length}`}</Kicker>
          <View>
            {g.items.map((item, i) => (
              <PendingRow
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                last={i === g.items.length - 1}
                onPress={() => onSelect(item.id)}
              />
            ))}
          </View>
        </View>
      ))}
      <View style={styles.group}>
        <Kicker>{`${t(`${P}.section.decided`)} · ${decided.length}`}</Kicker>
        {decided.length ? (
          <View>
            {decided.slice(0, 3).map((item, i) => (
              <DecidedRow
                key={item.id}
                item={item}
                tilt={TILT[i % TILT.length]}
                selected={item.id === selectedId}
                last={i === Math.min(decided.length, 3) - 1}
                onPress={() => onSelect(item.id)}
              />
            ))}
          </View>
        ) : (
          <Text variant="xs" color="muted" style={{ paddingVertical: 8 }}>
            {t(`${P}.noneDecided`)}
          </Text>
        )}
        {decidedTotal ? (
          <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
            <Link label={t(`${P}.allDecisions`, { count: decidedTotal })} onPress={onAllDecisions} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function PendingRow({ item, selected, last, onPress }: { item: Approval; selected: boolean; last: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { title, sub } = rowText(t, item);
  const past = !!item.sla?.past;
  const flag = past ? t(`${P}.pastSla`) : item.decide_today ? t(`${P}.decideToday`) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={[title, sub, item.sla ? age(t, item.sla.age_hours) : '', flag ?? ''].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.row,
        pointer,
        { borderBottomColor: last || selected ? 'transparent' : colors.line },
        selected && { backgroundColor: colors.brandSoft, borderRadius: 12, paddingHorizontal: 12, marginHorizontal: -12 },
        !selected && hovered && { backgroundColor: colors.subtle, borderRadius: 12, paddingHorizontal: 12, marginHorizontal: -12 },
      ]}>
      <View style={styles.text}>
        <Text variant="sm" weight={700} numberOfLines={1}>
          {title}
        </Text>
        <Text variant="xs" color="muted" numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {item.sla ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="xs" num rawColor={past ? colors.bad : colors.ink2} style={{ fontFamily: past ? fonts.extrabold : fonts.bold }}>
            {age(t, item.sla.age_hours)}
          </Text>
          {flag ? (
            <Text rawColor={past ? colors.bad : colors.warn} style={styles.flag}>
              {flag}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function DecidedRow({
  item,
  tilt,
  selected,
  last,
  onPress,
}: {
  item: Approval;
  tilt: number;
  selected: boolean;
  last: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sub = [item.decided_at ? formatTime(item.decided_at) : '', lowerFirst(item.decision_note)].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.row,
        styles.decided,
        pointer,
        { borderBottomColor: last || selected ? 'transparent' : colors.line },
        (selected || hovered) && {
          backgroundColor: selected ? colors.brandSoft : colors.subtle,
          borderRadius: 12,
          paddingHorizontal: 12,
          marginHorizontal: -12,
        },
      ]}>
      <View style={styles.text}>
        <Text variant="sm" weight={600} color="ink2" numberOfLines={1}>
          {decidedTitle(t, item)}
        </Text>
        <Text variant="xs" color="muted" numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Stamp tone={STAMP_TONE[item.status]} rotate={tilt} style={styles.stamp} textStyle={styles.stampText}>
        {t(`${P}.stamp.${item.status}`)}
      </Stamp>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  col: { gap: 22 },
  group: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1 },
  decided: { paddingVertical: 12 },
  text: { flex: 1, minWidth: 0 },
  flag: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15 },
  stamp: { paddingHorizontal: 8, paddingVertical: 6, alignSelf: 'center' },
  stampText: { fontSize: 9.5, lineHeight: 10, letterSpacing: 9.5 * 0.12 },
});
