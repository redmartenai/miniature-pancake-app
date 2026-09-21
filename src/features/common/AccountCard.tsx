import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useActiveSchool, useSession } from '@/state/session';
import { spacing } from '@/theme/tokens';
import { Avatar, Card, Icon, Text } from '@/ui';

export function AccountCard() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const role = useSession((s) => s.role);
  const school = useActiveSchool();
  if (!user) return null;
  return (
    <Card onPress={() => router.push('/settings')} accessibilityLabel={`${user.full_name}, ${role ? t(`roles.${role}`) : ''}, ${school?.name ?? ''}`}>
      <View style={styles.row}>
        <Avatar initials={user.initials} size={52} seed={user.id} />
        <View style={styles.flex}>
          <Text variant="heading">{user.full_name}</Text>
          <Text variant="caption">
            {role ? t(`roles.${role}`) : ''} · {school?.short_name}
          </Text>
        </View>
        <Icon name="settings-outline" size={20} color="textMuted" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
