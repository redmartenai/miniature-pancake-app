import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { useUnread } from '@/features/common/useUnread';
import { useExperience } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { makeDock } from '@/ui';

/**
 * Staff app. Dock: Home · Classes · Attendance · Messages · Me.
 * Homework, assignments, marks, students, timetable, leave and documents open from these.
 */
export default function StaffTabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const experience = useExperience();
  const unread = useUnread();
  if (experience && experience !== 'staff') return <Redirect href="/" />;

  const dock = makeDock([
    { name: 'index', label: t('tabs.home'), icon: 'home' },
    { name: 'classes', label: t('tabs.classes'), icon: 'layers' },
    { name: 'attendance', label: t('tabs.attendance'), icon: 'calendarCheck' },
    { name: 'messages', label: t('tabs.messages'), icon: 'chat', badge: unread.messages || undefined },
    { name: 'me', label: t('tabs.me'), icon: 'user' },
  ]);

  return (
    <Tabs backBehavior="history" tabBar={dock} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.canvas } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="classes" />
      {/* Submit bars replace the dock on the roll call and marks screens. */}
      <Tabs.Screen name="attendance" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="marks" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
