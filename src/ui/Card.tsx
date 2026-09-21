import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
  tone?: 'surface' | 'primary' | 'soft';
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function Card({ children, onPress, style, padded = true, tone = 'surface', accessibilityLabel, accessibilityHint }: CardProps) {
  const { colors } = useTheme();
  const background = tone === 'primary' ? colors.primary : tone === 'soft' ? colors.primarySoft : colors.surface;
  const border = tone === 'surface' ? colors.border : background;
  const base = [
    styles.card,
    { backgroundColor: background, borderColor: border, padding: padded ? spacing.md : 0 },
    style,
  ];
  if (!onPress) {
    // With a label, screen readers announce the card as one summary instead of piece by piece.
    return (
      <View
        style={base}
        accessible={accessibilityLabel ? true : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [...base, pressed && { opacity: 0.88, transform: [{ scale: 0.995 }] }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
});
