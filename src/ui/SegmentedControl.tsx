import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

import { pointer } from './css';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Option<T extends string | number> = { value: T; label: string; accessibilityLabel?: string; badge?: ReactNode; disabled?: boolean; icon?: IconName };

/** `.seg` (and `.seg.full` when `full`). */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  full = true,
  fit = false,
  style,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  full?: boolean;
  /** Size each segment to its label (for long labels or badges) instead of equal widths. */
  fit?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.track, { backgroundColor: colors.sunken, borderColor: colors.line, alignSelf: full ? 'stretch' : 'flex-start' }, style]}
      accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: !!option.disabled }}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            disabled={option.disabled}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              pointer,
              full && (fit ? { flexGrow: 1, flexBasis: 'auto', paddingHorizontal: 10 } : { flex: 1 }),
              selected && { backgroundColor: colors.surface, boxShadow: `0 1px 2px rgba(20,26,46,0.08), 0 0 0 1px ${colors.line}` },
              option.disabled && { opacity: 0.5 },
            ]}>
            {option.icon ? <Icon name={option.icon} size={14} rawColor={selected ? colors.ink : colors.muted} /> : null}
            <Text rawColor={selected ? colors.ink : colors.muted} style={styles.label} numberOfLines={1}>
              {option.label}
            </Text>
            {option.badge}
          </Pressable>
        );
      })}
    </View>
  );
}

/** `.tabs`: underlined tabs. */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string; badge?: ReactNode; disabled?: boolean }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tabs, { borderBottomColor: colors.line }, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on, disabled: !!o.disabled }}
            disabled={o.disabled}
            onPress={() => onChange(o.value)}
            style={[styles.tab, pointer, { borderBottomColor: on ? colors.brand : 'transparent' }, o.disabled && { opacity: 0.5 }]}>
            <Text rawColor={on ? colors.ink : colors.muted} style={styles.tabLabel}>
              {o.label}
            </Text>
            {o.badge}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, gap: 2, borderRadius: 13, borderWidth: 1 },
  segment: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 16 },
  tabs: { flexDirection: 'row', gap: 26, borderBottomWidth: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: 2, marginBottom: -1 },
  tabLabel: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 17 },
});
