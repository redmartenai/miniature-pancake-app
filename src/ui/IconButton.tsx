import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function IconButton({ icon, label, onPress, badge, size = 42 }: { icon: IconName; label: string; onPress: () => void; badge?: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2, borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
      ]}>
      <Icon name={icon} size={20} color="ink" />
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.bg }]}>
          <Text variant="caption" rawColor="#FFFFFF" style={styles.badgeText}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '700' },
});
