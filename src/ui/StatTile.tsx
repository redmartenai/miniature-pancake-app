import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing, toneColors, type Tone } from '@/theme/tokens';

import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type StatTileProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  icon?: IconName;
  onPress?: () => void;
};

export function StatTile({ label, value, hint, tone = 'neutral', icon, onPress }: StatTileProps) {
  const { colors } = useTheme();
  const { fg, bg } = toneColors(colors, tone);
  return (
    <Card onPress={onPress} style={styles.tile} accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ''}`}>
      <View style={styles.top}>
        {icon ? (
          <View style={[styles.icon, { backgroundColor: bg }]}>
            <Icon name={icon} size={16} rawColor={fg} />
          </View>
        ) : null}
        <Text variant="caption" numberOfLines={1} style={styles.label}>
          {label}
        </Text>
      </View>
      <Text variant="number" style={[styles.value, value.length > 9 && styles.valueLong]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint ? (
        <Text variant="caption" rawColor={tone === 'neutral' ? colors.textMuted : fg} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 150, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  icon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1 },
  value: { fontSize: 22, lineHeight: 28 },
  valueLong: { fontSize: 18, lineHeight: 28 },
});
