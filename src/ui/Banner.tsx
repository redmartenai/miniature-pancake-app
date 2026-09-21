import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, toneColors, type Tone } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function Banner({ tone = 'info', icon = 'information-circle-outline', title, message, action }: { tone?: Tone; icon?: IconName; title?: string; message: string; action?: { label: string; onPress: () => void } }) {
  const { colors } = useTheme();
  const { fg, bg } = toneColors(colors, tone);
  return (
    <View style={[styles.banner, { backgroundColor: bg }]} accessibilityRole="alert">
      <Icon name={icon} size={20} rawColor={fg} />
      <View style={styles.body}>
        {title ? (
          <Text variant="subheading" rawColor={fg}>
            {title}
          </Text>
        ) : null}
        <Text variant="body" rawColor={tone === 'neutral' ? colors.text : fg} style={styles.message}>
          {message}
        </Text>
        {action ? (
          <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={10} style={styles.action}>
            <Text variant="label" rawColor={fg} style={styles.actionText}>
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm + 2, borderRadius: radius.md, alignItems: 'flex-start' },
  body: { flex: 1, gap: 2 },
  message: { fontSize: 14, lineHeight: 20 },
  action: { marginTop: 4, alignSelf: 'flex-start' },
  actionText: { textDecorationLine: 'underline' },
});
