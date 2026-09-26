import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

import { pointer } from './css';
import { Icon, ICON_SIZE, type IconName } from './Icon';
import { Text } from './Text';

/** `.btn-*` variants from eduflow.css. */
export type ButtonVariant = 'primary' | 'ink' | 'secondary' | 'ghost' | 'soft' | 'danger' | 'ok' | 'onHero' | 'heroOutline';

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  /** Icon after the label instead of before. */
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** `.btn-block`. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  /** Override the label/icon colour (e.g. a brand-coloured ghost button). */
  textColor?: string;
  /** Override the height (e.g. 44 for a ghost link button). */
  height?: number;
  /** Draw the button inside a larger tappable card: looks the same, isn't a separate button. */
  decorative?: boolean;
};

const SIZES = {
  sm: { height: 32, px: 12, font: 13, radius: 10, gap: 6, icon: ICON_SIZE.sm },
  md: { height: 40, px: 16, font: 14, radius: 12, gap: 8, icon: ICON_SIZE.md },
  lg: { height: 52, px: 22, font: 15, radius: 15, gap: 8, icon: ICON_SIZE.md },
} as const;

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth,
  style,
  accessibilityHint,
  accessibilityLabel,
  textColor,
  height,
  decorative,
}: ButtonProps) {
  const { colors, scheme } = useTheme();
  const v = {
    primary: { bg: colors.brand, fg: colors.onBrand, border: 'transparent' },
    ink: { bg: colors.ink, fg: colors.canvas, border: 'transparent' },
    secondary: { bg: colors.surface, fg: colors.ink, border: colors.lineStrong },
    ghost: { bg: 'transparent', fg: colors.ink2, border: 'transparent' },
    soft: { bg: colors.brandSoft, fg: colors.brandInk, border: 'transparent' },
    danger: { bg: colors.badSoft, fg: colors.bad, border: 'transparent' },
    ok: { bg: colors.okSoft, fg: colors.ok, border: 'transparent' },
    onHero: { bg: colors.onHero, fg: colors.hero, border: 'transparent' },
    heroOutline: { bg: colors.heroWash, fg: colors.onHero, border: colors.heroEdge },
  }[variant];
  if (textColor) v.fg = textColor;
  const s = SIZES[size];
  const inactive = disabled || loading;

  if (decorative) {
    return (
      <View
        accessible={false}
        style={[
          styles.base,
          { height: height ?? s.height, paddingHorizontal: s.px, borderRadius: s.radius, backgroundColor: v.bg, borderColor: v.border, alignSelf: fullWidth ? 'stretch' : 'auto' },
          variant === 'primary' && scheme === 'light' && { boxShadow: '0 6px 16px -8px rgba(61,99,245,0.55)' },
          style,
        ]}>
        <View style={[styles.content, { gap: s.gap }]}>
          {icon ? <Icon name={icon} size={s.icon} rawColor={v.fg} /> : null}
          <Text rawColor={v.fg} style={{ fontFamily: fonts.semibold, fontSize: s.font, lineHeight: s.font + 4 }} numberOfLines={1}>
            {title}
          </Text>
          {iconRight ? <Icon name={iconRight} size={s.icon} rawColor={v.fg} /> : null}
        </View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress?.();
      }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.base,
        pointer,
        {
          height: height ?? s.height,
          paddingHorizontal: s.px,
          borderRadius: s.radius,
          backgroundColor:
            hovered && variant === 'primary'
              ? colors.brandHover
              : hovered && variant === 'secondary'
                ? colors.subtle
                : hovered && variant === 'ghost'
                  ? colors.sunken
                  : v.bg,
          borderColor: v.border,
          opacity: inactive ? 0.5 : pressed ? 0.88 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        variant === 'primary' && scheme === 'light' && !inactive && { boxShadow: '0 6px 16px -8px rgba(61,99,245,0.55)' },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={[styles.content, { gap: s.gap }]}>
          {icon ? <Icon name={icon} size={s.icon} rawColor={v.fg} /> : null}
          <Text rawColor={v.fg} style={{ fontFamily: fonts.semibold, fontSize: s.font, lineHeight: s.font + 4 }} numberOfLines={1}>
            {title}
          </Text>
          {iconRight ? <Icon name={iconRight} size={s.icon} rawColor={v.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  content: { flexDirection: 'row', alignItems: 'center' },
});
