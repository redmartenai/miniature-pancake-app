import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';

import { Text } from './Text';

export function SectionHeader({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.row}>
      <Text variant="overline" accessibilityRole="header">
        {title}
      </Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={12}>
          <Text variant="label" color="primary">
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs, paddingHorizontal: 2 },
});
