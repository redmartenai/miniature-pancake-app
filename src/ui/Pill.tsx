import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, toneColors, type Tone } from '@/theme/tokens';

import { useSurface } from './Card';
import { pointer } from './css';
import { Icon, ICON_SIZE, type IconName } from './Icon';
import { Text } from './Text';

export type PillTone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'brand' | 'pink' | 'ink' | 'outline' | Tone;

/** `.pill` (+ `-ok`, `-warn`, `-bad`, `-info`, `-brand`, `-pink`, `-ink`, `-outline`, `-lg`, `.nodot`). */
export function Pill({
  label,
  tone = 'neutral',
  icon,
  dot = true,
  size = 'md',
  style,
}: {
  label: string;
  tone?: PillTone;
  icon?: IconName;
  dot?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const surface = useSurface();
  const outline = tone === 'outline';
  let { fg, bg } = outline ? { fg: colors.ink2, bg: 'transparent' } : toneColors(colors, tone as Tone);
  // Inside pastel widgets and heroes, neutral pills sit on the surface / wash colour.
  if (tone === 'neutral' || surface.kind !== 'plain') {
    if (surface.kind === 'widget') bg = outline ? 'transparent' : colors.surface;
    if (surface.kind === 'hero') bg = outline ? 'transparent' : colors.heroWash;
  }
  if (tone === 'neutral' && surface.kind === 'hero') fg = colors.onHero;
  const lg = size === 'lg';
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: bg, height: lg ? 28 : 24, paddingHorizontal: lg ? 12 : 10 },
        outline && { borderWidth: 1, borderColor: colors.lineStrong },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={label}>
      {icon ? (
        <Icon name={icon} size={ICON_SIZE.xs} rawColor={fg} />
      ) : dot ? (
        <View style={[styles.dot, { backgroundColor: fg }]} />
      ) : null}
      <Text rawColor={fg} style={[styles.text, { fontSize: lg ? 12.5 : 12 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** `.dot`. */
export function Dot({ tone = 'ok', size = 8, rawColor, ring }: { tone?: Tone; size?: number; rawColor?: string; ring?: string }) {
  const { colors } = useTheme();
  const { fg } = toneColors(colors, tone);
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: rawColor ?? fg },
        ring ? { boxShadow: `0 0 0 4px ${ring}` } : null,
      ]}
    />
  );
}

/** `.chip` filter button (+ `.on`, count bubble `.n`). */
export function Chip({
  label,
  selected,
  onPress,
  count,
  icon,
  disabled,
  style,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  count?: number | string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const fg = selected ? colors.onBrand : colors.ink2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? (count !== undefined ? `${label}, ${count}` : label)}
      onPress={onPress}
      disabled={disabled}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.chip,
        disabled ? { opacity: 0.55 } : pointer,
        {
          backgroundColor: selected ? colors.brand : colors.surface,
          borderColor: selected ? colors.brand : hovered ? colors.brandLine : colors.lineStrong,
        },
        style,
      ]}>
      {icon ? <Icon name={icon} size={ICON_SIZE.sm} rawColor={fg} /> : null}
      <Text rawColor={selected ? fg : colors.ink2} style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>
      {count !== undefined ? (
        <View style={[styles.count, { backgroundColor: selected ? 'rgba(255,255,255,0.22)' : colors.sunken }]}>
          <Text rawColor={fg} style={styles.countText}>
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** `.badge` (pink ink by default, `.bad` red). */
export function Badge({ value, tone = 'pink', style }: { value: ReactNode; tone?: 'pink' | 'bad'; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: tone === 'bad' ? colors.bad : colors.pPinkInk }, style]}>
      <Text rawColor={tone === 'bad' ? '#FFFFFF' : colors.surface} style={styles.badgeText}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 999, flexShrink: 0 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: fonts.semibold, lineHeight: 15 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 16 },
  count: { borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  countText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 13 },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 13 },
});
