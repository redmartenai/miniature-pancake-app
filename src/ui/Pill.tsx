import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, toneColors, type Tone } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const { colors } = useTheme();
  const { fg, bg } = toneColors(colors, tone);
  return (
    <View style={[styles.pill, { backgroundColor: bg }]} accessibilityRole="text" accessibilityLabel={label}>
      {icon ? <Icon name={icon} size={13} rawColor={fg} /> : null}
      <Text variant="label" rawColor={fg} style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function Dot({ tone = 'success', size = 8, rawColor }: { tone?: Tone; size?: number; rawColor?: string }) {
  const { colors } = useTheme();
  const { fg } = toneColors(colors, tone);
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: rawColor ?? fg }} />;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  text: { fontSize: 12, lineHeight: 16 },
});
