import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing, toneColors, type Tone } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconTone?: Tone;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
  accessibilityHint?: string;
};

export function ListRow({ title, subtitle, icon, iconTone = 'primary', left, right, onPress, chevron = !!onPress, last, accessibilityHint }: ListRowProps) {
  const { colors } = useTheme();
  const { fg, bg } = toneColors(colors, iconTone);
  const content = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.borderSoft }]}>
      {left ??
        (icon ? (
          <View style={[styles.icon, { backgroundColor: bg }]}>
            <Icon name={icon} size={19} rawColor={fg} />
          </View>
        ) : null)}
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="chevron-forward" size={18} color="textMuted" /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => pressed && { backgroundColor: colors.surfaceAlt }}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 60,
  },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
