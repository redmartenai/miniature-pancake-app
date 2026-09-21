import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AccountCard } from '@/features/common/AccountCard';
import { useUnread } from '@/features/common/useUnread';
import { ChildSwitcher } from '@/features/family/ChildSwitcher';
import { useFamily } from '@/features/family/useFamily';
import { Card, ListRow, Pill, Screen, SectionHeader, Text } from '@/ui';

export default function FamilyMore() {
  const { t } = useTranslation();
  const family = useFamily();
  const unread = useUnread();
  const child = family.selected;

  return (
    <Screen>
      <Text variant="title">{t('more.title')}</Text>
      <AccountCard />
      <ChildSwitcher students={family.students} selectedId={child?.id} onSelect={family.select} />
      {child ? <SectionHeader title={t('more.child', { name: child.first_name })} /> : null}
      <Card padded={false}>
        <ListRow icon="calendar-outline" title={t('attendance.title')} onPress={() => router.push('/attendance')} />
        <ListRow icon="book-outline" iconTone="accent" title={t('homework.title')} onPress={() => router.push('/homework')} />
        <ListRow icon="wallet-outline" iconTone="warning" title={t('fees.title')} onPress={() => router.push('/fees')} />
        <ListRow icon="ribbon-outline" iconTone="info" title={t('results.title')} onPress={() => router.push('/results')} />
        <ListRow icon="time-outline" iconTone="success" title={t('timetable.title')} onPress={() => router.push('/timetable')} last />
      </Card>
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
