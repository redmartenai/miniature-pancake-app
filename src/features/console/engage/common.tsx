import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ApiError } from '@/api/client';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { cardShadowLg, Icon, ICON_SIZE, IconButton, pointer, Text, type IconName } from '@/ui';

import type { Audience } from './api';

/** A centred console dialog: title + subtitle, a close button, scrolling body and an optional footer strip. */
export function Dialog({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 560,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.center}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('console.engage.close')}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          accessibilityRole={'dialog' as never}
          style={[styles.dialog, { width, backgroundColor: colors.surface, borderColor: colors.line }, cardShadowLg(scheme)]}>
          <View style={[styles.head, { borderBottomColor: colors.line }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="h3" accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="xs" color="muted">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <IconButton icon="close" variant="bare" size="sm" label={t('console.engage.close')} onPress={onClose} />
          </View>
          <ScrollView style={{ maxHeight: 620 }} contentContainerStyle={{ padding: 24, gap: 16 }}>
            {children}
          </ScrollView>
          {footer ? <View style={[styles.foot, { borderTopColor: colors.line, backgroundColor: colors.subtle }]}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

export type MenuItem = { key: string; label: string; icon?: IconName; selected?: boolean; danger?: boolean; disabled?: boolean };

/**
 * A dropdown anchored under its trigger (filters, "…" menus). The popover lives in a modal layer so cards with
 * hidden overflow never clip it.
 */
export function Dropdown({
  trigger,
  items,
  onSelect,
  label,
  width = 220,
  align = 'left',
  keepOpen,
}: {
  trigger: (open: () => void) => ReactNode;
  items: MenuItem[];
  onSelect: (key: string) => void;
  label: string;
  width?: number;
  align?: 'left' | 'right';
  /** Multi-select: picking an item doesn't close the menu. */
  keepOpen?: boolean;
}) {
  const { colors, scheme } = useTheme();
  const anchor = useRef<View>(null);
  const [at, setAt] = useState<{ x: number; y: number; w: number } | null>(null);
  const open = () =>
    anchor.current?.measureInWindow((x, y, w, h) => {
      setAt({ x: align === 'right' ? x + w - width : x, y: y + h + 6, w });
    });
  return (
    <View ref={anchor} collapsable={false}>
      {trigger(open)}
      {at ? (
        <Modal visible transparent animationType="none" onRequestClose={() => setAt(null)}>
          <Pressable accessibilityRole="button" accessibilityLabel={label} style={StyleSheet.absoluteFill} onPress={() => setAt(null)} />
          <View
            accessibilityRole="menu"
            style={[
              styles.menu,
              { left: Math.max(8, at.x), top: at.y, width, backgroundColor: colors.surface, borderColor: colors.line },
              cardShadowLg(scheme),
            ]}>
            <ScrollView style={{ maxHeight: 360 }}>
              {items.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: !!item.selected, disabled: !!item.disabled }}
                  disabled={item.disabled}
                  onPress={() => {
                    if (!keepOpen) setAt(null);
                    onSelect(item.key);
                  }}
                  style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.item,
                    pointer,
                    { backgroundColor: hovered ? colors.subtle : 'transparent', opacity: item.disabled ? 0.5 : 1 },
                  ]}>
                  {item.icon ? <Icon name={item.icon} size={ICON_SIZE.sm} rawColor={item.danger ? colors.bad : colors.ink2} /> : null}
                  <Text style={[styles.itemText, { color: item.danger ? colors.bad : colors.ink }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.selected ? <Icon name="check" size={14} rawColor={colors.brandInk} bold /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

/** A `.btn-secondary` filter trigger: "Access: any ⌄". */
export function FilterButton({
  label,
  icon,
  onPress,
  style,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.filter,
        pointer,
        { borderColor: colors.lineStrong, backgroundColor: hovered ? colors.subtle : colors.surface },
        style,
      ]}>
      {icon ? <Icon name={icon} size={ICON_SIZE.sm} rawColor={colors.ink2} /> : null}
      <Text style={[styles.filterText, { color: colors.ink }]} numberOfLines={1}>
        {label}
      </Text>
      <Icon name="chevronDown" size={14} rawColor={colors.muted} />
    </Pressable>
  );
}

/** A form label (`.label`). */
export function FieldLabel({ children, right }: { children: string; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: colors.ink2 }}>{children}</Text>
      {right}
    </View>
  );
}

/** A message for a failed mutation. */
export function errorText(e: unknown, fallback: string): string {
  return e instanceof ApiError ? (e.fieldMessage() ?? e.message) : fallback;
}

/** Grades as the design writes them: "Grade 6", "Nursery". */
export function gradeName(t: (k: string, o?: Record<string, unknown>) => string, grade: string): string {
  return /^\d+$/.test(grade) ? t('console.engage.aud.gradeN', { grade }) : grade;
}

/** "Grades 6–8 · Parents", "Whole school", "All parents", "Staff". */
export function audienceText(t: (k: string, o?: Record<string, unknown>) => string, a: Audience): string {
  let base: string;
  if (a.kind === 'school') base = t('console.engage.aud.school');
  else if (a.kind === 'parents') return t('console.engage.aud.allParents');
  else if (a.kind === 'families') base = t('console.engage.aud.families');
  else if (a.kind === 'staff') return t('console.engage.aud.staff');
  else if (a.kind === 'route') base = t('console.engage.aud.route', { route: a.label });
  else if (a.kind === 'grades')
    base = a.grades.length === 1 ? gradeName(t, a.grades[0]) : t('console.engage.aud.grades', { range: a.label });
  else base = a.label;
  return a.parents_only
    ? t('console.engage.aud.parentsOf', { who: base })
    : a.kind === 'grades' || a.kind === 'sections'
      ? t('console.engage.aud.familiesOf', { who: base })
      : base;
}

/** "Today, 11:05 AM" / "18 Sep, 4:30 PM". */
export function stamp(
  t: (k: string, o?: Record<string, unknown>) => string,
  iso: string,
  time: (d: Date) => string,
  date: (d: Date) => string,
): string {
  const d = new Date(iso);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  return same ? t('console.engage.todayAt', { time: time(d) }) : `${date(d)}, ${time(d)}`;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', maxWidth: '100%' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 18, paddingHorizontal: 24, borderBottomWidth: 1 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderTopWidth: 1,
  },
  menu: { position: 'absolute', borderRadius: 14, borderWidth: 1, paddingVertical: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 14 },
  itemText: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 18 },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  filterText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 16 },
});
