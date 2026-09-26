import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ApiError } from '@/api/client';
import { formatDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { cardShadow, cardShadowLg, Icon, ICON_SIZE, IconButton, pointer, Text, type IconName } from '@/ui';

/** The API's own message for a failed mutation (first field error first). */
export function errorText(e: unknown, fallback: string): string {
  return e instanceof ApiError ? (e.fieldMessage() ?? e.message) : fallback;
}

/** "22 Sep" from an ISO date. */
export function dayMonth(iso: string): string {
  return formatDate(iso.length === 10 ? iso : new Date(iso));
}

/** "Tue 22 Sep". */
export function dowDayMonth(iso: string): string {
  return formatDate(iso.length === 10 ? iso : new Date(iso), { weekday: true }).replace(',', '');
}

/** "7:52 AM" from "07:52" or an ISO timestamp. */
export function clock(value: string | null | undefined): string {
  if (!value) return '';
  let h: number;
  let m: number;
  if (/^\d{2}:\d{2}/.test(value)) {
    [h, m] = value.split(':').map(Number);
  } else {
    const d = new Date(value);
    h = d.getHours();
    m = d.getMinutes();
  }
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Days between today and an ISO date (positive = future). */
export function daysFrom(iso: string, today = new Date()): number {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}

/** `.btn.btn-secondary` / `.btn-primary` for the page toolbars, with an optional trailing note (e.g. "Audited"). */
export function ToolbarButton({
  label,
  icon,
  onPress,
  primary,
  disabled,
  busy,
  trailing,
  hint,
  size = 'md',
  chevron,
  style,
}: {
  label: string;
  icon?: IconName;
  onPress?: () => void;
  primary?: boolean;
  disabled?: boolean;
  busy?: boolean;
  trailing?: ReactNode;
  /** Why it's disabled, shown as a tooltip on the web and read by screen readers. */
  hint?: string;
  size?: 'sm' | 'md';
  chevron?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, scheme } = useTheme();
  const fg = primary ? colors.onBrand : colors.ink;
  const sm = size === 'sm';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!(disabled || busy) }}
      disabled={disabled || busy}
      onPress={onPress}
      {...(Platform.OS === 'web' && hint ? ({ title: hint } as object) : {})}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        sm ? styles.btnSm : styles.btn,
        !(disabled || busy) && pointer,
        primary
          ? { backgroundColor: hovered ? colors.brandHover : colors.brand, borderColor: colors.brand }
          : { backgroundColor: hovered ? colors.subtle : colors.surface, borderColor: colors.lineStrong },
        primary ? cardShadow(scheme) : null,
        (disabled || busy) && { opacity: 0.55 },
        style,
      ]}>
      {icon ? <Icon name={icon} size={sm ? ICON_SIZE.sm : ICON_SIZE.md} rawColor={fg} /> : null}
      <Text style={[sm ? styles.btnTextSm : styles.btnText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
      {trailing}
      {chevron ? <Icon name="chevronDown" size={14} rawColor={colors.ink2} /> : null}
    </Pressable>
  );
}

/** The small "Audited" pill that sits inside an Export button. */
export function AuditedPill({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.audited, { backgroundColor: colors.sunken }]}>
      <Icon name="shield" size={11} rawColor={colors.ink2} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 11, lineHeight: 13, color: colors.ink2 }}>{label}</Text>
    </View>
  );
}

export type MenuItem = { key: string; label: string; icon?: IconName; selected?: boolean; danger?: boolean; onPress: () => void };

/** Anchored popover menu. `children` renders the trigger given an `open` callback. */
export function Popover({
  items,
  children,
  align = 'left',
  width,
}: {
  items: MenuItem[];
  children: (open: () => void) => ReactNode;
  align?: 'left' | 'right';
  width?: number;
}) {
  const { colors, scheme } = useTheme();
  const anchor = useRef<View>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; w: number } | null>(null);
  const open = () =>
    anchor.current?.measureInWindow((x, y, w, h) => {
      setMenu({ x: align === 'right' ? x + w : x, y: y + h + 4, w });
    });
  const menuWidth = width ?? Math.max(menu?.w ?? 0, 180);
  return (
    <>
      <View ref={anchor} collapsable={false}>
        {children(open)}
      </View>
      <Modal visible={!!menu} transparent animationType="none" onRequestClose={() => setMenu(null)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          style={StyleSheet.absoluteFill}
          onPress={() => setMenu(null)}
        />
        {menu ? (
          <View
            accessibilityRole="menu"
            style={[
              styles.menu,
              { top: menu.y, width: menuWidth, backgroundColor: colors.surface, borderColor: colors.line },
              align === 'right' ? { left: menu.x - menuWidth } : { left: menu.x },
              cardShadowLg(scheme),
            ]}>
            <ScrollView style={{ maxHeight: 360 }}>
              {items.map((it) => (
                <Pressable
                  key={it.key}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: !!it.selected }}
                  onPress={() => {
                    setMenu(null);
                    it.onPress();
                  }}
                  style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.item,
                    pointer,
                    hovered && { backgroundColor: colors.subtle },
                  ]}>
                  {it.icon ? <Icon name={it.icon} size={ICON_SIZE.sm} rawColor={it.danger ? colors.bad : colors.ink2} /> : null}
                  <Text
                    style={[
                      styles.itemText,
                      { color: it.danger ? colors.bad : colors.ink, fontFamily: it.selected ? fonts.bold : fonts.medium },
                    ]}
                    numberOfLines={1}>
                    {it.label}
                  </Text>
                  {it.selected ? <Icon name="check" size={14} rawColor={colors.brand} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </>
  );
}

/** A `.btn-secondary.btn-sm` filter that opens a menu of options; the first option clears the filter. */
export function FilterButton<T extends string>({
  label,
  value,
  options,
  onChange,
  allLabel,
}: {
  label: string;
  value: T | '';
  options: { value: T; label: string }[];
  onChange: (v: T | '') => void;
  allLabel: string;
}) {
  const { colors } = useTheme();
  const current = options.find((o) => o.value === value);
  return (
    <Popover
      items={[
        { key: '__all', label: allLabel, selected: !value, onPress: () => onChange('') },
        ...options.map((o) => ({ key: o.value, label: o.label, selected: o.value === value, onPress: () => onChange(o.value) })),
      ]}>
      {(open) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={current ? `${label}: ${current.label}` : label}
          onPress={open}
          style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.btnSm,
            pointer,
            {
              backgroundColor: current ? colors.brandSoft : hovered ? colors.subtle : colors.surface,
              borderColor: current ? colors.brandLine : colors.lineStrong,
            },
          ]}>
          <Text style={[styles.btnTextSm, { color: current ? colors.brandInk : colors.ink }]} numberOfLines={1}>
            {current ? `${label}: ${current.label}` : label}
          </Text>
          <Icon name="chevronDown" size={14} rawColor={current ? colors.brandInk : colors.ink2} />
        </Pressable>
      )}
    </Popover>
  );
}

/** A centred dialog for the web console. */
export function Dialog({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 520,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.center}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          style={[styles.dialog, { width, backgroundColor: colors.surface, borderColor: colors.line }, cardShadowLg(scheme)]}>
          <View style={styles.head}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="h2" accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="sm" color="muted">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <IconButton icon="close" label={t('common.close')} onPress={onClose} variant="bare" />
          </View>
          <ScrollView style={{ maxHeight: 600 }} contentContainerStyle={{ gap: 14 }}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

/** Pick one of a few options as pills (a compact radio group). */
export function Choice<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: colors.ink2 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => onChange(o.value)}
              style={[
                styles.btnSm,
                pointer,
                { backgroundColor: on ? colors.brandSoft : colors.surface, borderColor: on ? colors.brand : colors.lineStrong },
              ]}>
              <Text style={[styles.btnTextSm, { color: on ? colors.brandInk : colors.ink }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { height: 40, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnSm: { height: 32, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
  btnTextSm: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 16 },
  audited: { height: 20, paddingHorizontal: 8, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4 },
  menu: { position: 'absolute', borderWidth: 1, borderRadius: 12, padding: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  itemText: { fontSize: 13, lineHeight: 17, flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 18, maxWidth: '100%' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});
