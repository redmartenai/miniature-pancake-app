import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { StudentCard } from '@/api/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { Avatar, Text } from '@/ui';

/** Chips to switch between children. Hidden for single-child families and students. */
export function ChildSwitcher({ students, selectedId, onSelect }: { students: StudentCard[]; selectedId?: string; onSelect: (id: string) => void }) {
  const { colors } = useTheme();
  if (students.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
      {students.map((student) => {
        const selected = student.id === selectedId;
        return (
          <Pressable
            key={student.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${student.name}, ${student.class.label}`}
            onPress={() => onSelect(student.id)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.primary : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
              },
            ]}>
            <Avatar initials={student.initials} size={28} seed={student.id} />
            <View>
              <Text variant="label" rawColor={selected ? colors.onPrimary : colors.ink}>
                {student.first_name}
              </Text>
              <Text variant="caption" rawColor={selected ? colors.onPrimary : colors.textMuted} style={{ fontSize: 11, lineHeight: 14 }}>
                {student.class.short_label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: 6,
    paddingRight: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 44,
  },
});
