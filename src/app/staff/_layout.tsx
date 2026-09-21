import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { tabIcon } from '@/features/common/TabIcon';
import { tabScreenOptions } from '@/features/common/tabOptions';
import { useUnread } from '@/features/common/useUnread';
import { useExperience } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';

export default function StaffTabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const experience = useExperience();
  const unread = useUnread();
  if (experience && experience !== 'staff') return <Redirect href="/" />;

  return (
    <Tabs screenOptions={tabScreenOptions(colors)}>
      <Tabs.Screen name="index" options={{ title: t('tabs.today'), tabBarIcon: tabIcon('today', 'today-outline') }} />
      <Tabs.Screen name="classes" options={{ title: t('tabs.classes'), tabBarIcon: tabIcon('people', 'people-outline') }} />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('tabs.messages'),
          tabBarIcon: tabIcon('chatbubbles', 'chatbubbles-outline'),
          tabBarBadge: unread.messages || undefined,
        }}
      />
      <Tabs.Screen name="more" options={{ title: t('tabs.more'), tabBarIcon: tabIcon('grid', 'grid-outline') }} />
    </Tabs>
  );
}
