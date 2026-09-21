import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { tabIcon } from '@/features/common/TabIcon';
import { tabScreenOptions } from '@/features/common/tabOptions';
import { useUnread } from '@/features/common/useUnread';
import { useExperience } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';

export default function FamilyTabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const experience = useExperience();
  const unread = useUnread();
  if (experience && experience !== 'family') return <Redirect href="/" />;

  return (
    <Tabs screenOptions={tabScreenOptions(colors)}>
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen name="bus" options={{ title: t('tabs.bus'), tabBarIcon: tabIcon('bus', 'bus-outline') }} />
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
