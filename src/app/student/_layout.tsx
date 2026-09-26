import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { useExperience } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { makeDock } from '@/ui';

/**
 * Student app. Dock: Home · Schedule · Tasks · Results · Me.
 * Classes, attendance, assignments, exams, material and messages open from Me and Home.
 */
export default function StudentTabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const experience = useExperience();
  if (experience && experience !== 'student') return <Redirect href="/" />;

  const dock = makeDock([
    { name: 'index', label: t('tabs.home'), icon: 'home' },
    { name: 'schedule', label: t('tabs.schedule'), icon: 'calendar' },
    { name: 'tasks', label: t('tabs.tasks'), icon: 'edit' },
    { name: 'results', label: t('tabs.results'), icon: 'award' },
    { name: 'me', label: t('tabs.me'), icon: 'user' },
  ]);

  return (
    <Tabs backBehavior="history" tabBar={dock} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.canvas } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="schedule" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="results" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
