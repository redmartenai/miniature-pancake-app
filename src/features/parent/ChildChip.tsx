import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { useFamily } from '@/features/family/useFamily';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Avatar, Icon, ICON_SIZE, pointer, Text } from '@/ui';

/** The "AS Aarav ⇅" chip in parent app bars: shows who you're viewing, opens My children. */
export function ChildChip() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { selected, students } = useFamily();
  if (!selected) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('parent.home.switchChild', { name: selected.first_name, class: selected.class.short_label })}
      onPress={() => router.push('/parent/children')}
      style={[styles.chip, pointer, { borderColor: colors.lineStrong, backgroundColor: colors.surface }]}>
      <Avatar initials={selected.initials} size="xs" tone={1} />
      <Text rawColor={colors.ink2} style={styles.text}>
        {selected.first_name}
      </Text>
      {students.length > 1 ? <Icon name="sort" size={ICON_SIZE.xs} rawColor={colors.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingLeft: 6, paddingRight: 10, borderRadius: 999, borderWidth: 1 },
  text: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 16 },
});
