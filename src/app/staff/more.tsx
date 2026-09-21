import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AccountCard } from '@/features/common/AccountCard';
import { useUnread } from '@/features/common/useUnread';
import { Card, ListRow, Pill, Screen, Text } from '@/ui';

export default function StaffMore() {
  const { t } = useTranslation();
  const unread = useUnread();
  return (
    <Screen>
      <Text variant="title">{t('more.title')}</Text>
      <AccountCard />
      <Card padded={false}>
        <ListRow icon="megaphone-outline" iconTone="accent" title={t('announcements.title')} onPress={() => router.push('/announcements')} />
        <ListRow
          icon="notifications-outline"
          title={t('notifications.title')}
          right={unread.notifications ? <Pill label={String(unread.notifications)} tone="accent" /> : undefined}
          onPress={() => router.push('/notifications')}
        />
        <ListRow icon="settings-outline" iconTone="neutral" title={t('settings.title')} onPress={() => router.push('/settings')} last />
      </Card>
    </Screen>
  );
}
