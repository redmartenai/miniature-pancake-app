import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { cardShadowLg, Icon, IconButton, pointer, Text } from '@/ui';

/** A centred dialog for the web console (the phone `Sheet` is a bottom sheet). */
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
          <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ gap: 14 }}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

export type Option<T extends string> = { value: T; label: string };

/** `.btn-secondary.btn-sm` that opens a small menu of options under itself. */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
  locked,
  changed,
  style,
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  /** Accessibility label, e.g. "Data scope for Students". */
  label: string;
  disabled?: boolean;
  /** Shows a lock instead of the chevron. */
  locked?: boolean;
  /** Unsaved: brand-soft fill. */
  changed?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, scheme } = useTheme();
  const anchor = useRef<View>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; w: number } | null>(null);
  const current = options.find((o) => o.value === value);
  const open = () =>
    anchor.current?.measureInWindow((x, y, w, h) => {
      // Open upwards when the list wouldn't fit below the button.
      const height = options.length * 36 + 10;
      const below = y + h + 4;
      setMenu({ x, y: below + height > Dimensions.get('window').height ? Math.max(8, y - height - 4) : below, w });
    });
  return (
    <>
      <Pressable
        ref={anchor}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? ''}`}
        accessibilityState={{ disabled: !!disabled, expanded: !!menu }}
        disabled={disabled}
        onPress={open}
        style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.select,
          {
            backgroundColor: changed ? colors.brandSoft : colors.surface,
            borderColor: changed ? colors.brandLine : hovered && !disabled ? colors.brandLine : colors.lineStrong,
          },
          !disabled && pointer,
          style,
        ]}>
        <Text numberOfLines={1} style={[styles.selectText, { color: disabled ? colors.muted : colors.ink }]}>
          {current?.label ?? ''}
        </Text>
        <Icon name={locked ? 'lock' : 'chevronDown'} size={14} rawColor={disabled ? colors.muted : colors.ink2} />
      </Pressable>
      <Modal visible={!!menu} transparent animationType="none" onRequestClose={() => setMenu(null)}>
        <Pressable accessibilityRole="button" accessibilityLabel={label} style={StyleSheet.absoluteFill} onPress={() => setMenu(null)} />
        {menu ? (
          <View
            accessibilityRole="menu"
            style={[
              styles.menu,
              { left: menu.x, top: menu.y, minWidth: menu.w, backgroundColor: colors.surface, borderColor: colors.line },
              cardShadowLg(scheme),
            ]}>
            {options.map((o) => {
              const on = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setMenu(null);
                    if (!on) onChange(o.value);
                  }}
                  style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.item,
                    pointer,
                    hovered && { backgroundColor: colors.subtle },
                  ]}>
                  <Text style={[styles.selectText, { color: colors.ink, fontFamily: on ? fonts.bold : fonts.medium, flex: 1 }]}>
                    {o.label}
                  </Text>
                  {on ? <Icon name="check" size={14} rawColor={colors.brand} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 18, maxWidth: '100%' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  select: {
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  selectText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, flexShrink: 1 },
  menu: { position: 'absolute', borderWidth: 1, borderRadius: 12, padding: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
});
