import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { useUnread } from '@/features/common/useUnread';
import { useExperience } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { makeDock } from '@/ui';

/**
 * Parent app. Dock: Home · Attendance · Results · Bus · More.
 * Every other screen in this group is a secondary page: the dock stays, no tab is highlighted.
 */
export default function ParentTabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const experience = useExperience();
  const unread = useUnread();
  if (experience && experience !== 'parent') return <Redirect href="/" />;

  const dock = makeDock([
    { name: 'index', label: t('tabs.home'), icon: 'home' },
    { name: 'attendance', label: t('tabs.attendance'), icon: 'calendarCheck' },
    { name: 'results', label: t('tabs.results'), icon: 'award' },
    { name: 'bus', label: t('tabs.bus'), icon: 'bus' },
    { name: 'more', label: t('tabs.more'), icon: 'menu', badge: unread.messages || undefined },
  ]);

  return (
    <Tabs
      backBehavior="history"
      tabBar={dock}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.canvas } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="attendance" />
      <Tabs.Screen name="results" />
      <Tabs.Screen name="bus" />
      <Tabs.Screen name="more" />
      <Tabs.Screen name="messages" />
    </Tabs>
  );
}
