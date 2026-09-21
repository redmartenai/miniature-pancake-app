import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, spacing } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'lg' | 'sm';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  fullWidth,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.ink, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.danger, fg: '#FFFFFF', border: colors.danger },
    soft: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft },
  }[variant];
  const height = size === 'lg' ? 54 : size === 'sm' ? 38 : 48;
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.lg,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 19} rawColor={palette.fg} /> : null}
          <Text
            variant="bodyStrong"
            rawColor={palette.fg}
            style={{ fontFamily: fonts.semibold, fontSize: size === 'sm' ? 13.5 : 15.5 }}
            numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
