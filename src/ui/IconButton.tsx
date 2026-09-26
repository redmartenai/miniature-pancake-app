import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { pointer } from './css';
import { Icon, ICON_SIZE, type IconName } from './Icon';
import { Text } from './Text';

type Size = 'sm' | 'md' | 'lg';
const DIM: Record<Size, { box: number; radius: number }> = {
  sm: { box: 32, radius: 10 },
  md: { box: 40, radius: 12 },
  lg: { box: 44, radius: 14 },
};

/** `.icon-btn` (+ `.bare`, `.lg`, `.sm`, `.ok`, `.bad`, `.ping`). */
export function IconButton({
  icon,
  label,
  onPress,
  badge,
  ping,
  size = 'md',
  variant = 'default',
  iconSize,
  iconColor,
  disabled,
  style,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  /** Number badge (legacy); prefer `ping` for the design's unread dot. */
  badge?: number;
  /** The accent unread dot. */
  ping?: boolean;
  size?: Size | number;
  variant?: 'default' | 'bare' | 'ok' | 'bad' | 'brand';
  iconSize?: number;
  iconColor?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const dim = typeof size === 'number' ? { box: size, radius: Math.round(size * 0.3) } : DIM[size];
  const v = {
    default: { bg: colors.surface, border: colors.line, fg: colors.ink2 },
    bare: { bg: 'transparent', border: 'transparent', fg: colors.ink2 },
    ok: { bg: colors.okSoft, border: 'transparent', fg: colors.ok },
    bad: { bg: colors.badSoft, border: 'transparent', fg: colors.bad },
    brand: { bg: colors.brand, border: 'transparent', fg: colors.onBrand },
  }[variant];
  const a11y = badge ? `${label}, ${badge} unread` : label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={size === 'sm' ? 6 : 2}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.button,
        pointer,
        {
          width: dim.box,
          height: dim.box,
          borderRadius: dim.radius,
          borderColor: v.border,
          backgroundColor: hovered && variant === 'default' ? colors.subtle : v.bg,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}>
      <Icon name={icon} size={iconSize ?? (dim.box <= 32 ? ICON_SIZE.sm : ICON_SIZE.md)} rawColor={iconColor ?? v.fg} />
      {ping ? <View style={[styles.ping, { backgroundColor: colors.accent, boxShadow: `0 0 0 2px ${colors.surface}` }]} /> : null}
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.pPinkInk }]}>
          <Text variant="xxs" weight={700} rawColor={colors.surface} style={styles.badgeText}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  ping: { position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
});
