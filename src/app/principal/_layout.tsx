import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { api } from '@/api/endpoints';
import { useExperience } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { makeDock } from '@/ui';

/** Principal app (phone). Dock: Pulse · Approvals · Attendance · Broadcast. The full dashboard is on the web. */
export default function PrincipalTabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const experience = useExperience();
  const tray = useQuery({ queryKey: ['approvals', ''], queryFn: () => api.approvals(), refetchInterval: 60_000, enabled: experience === 'principal' });
  if (experience && experience !== 'principal') return <Redirect href="/" />;

  const dock = makeDock([
    { name: 'index', label: t('tabs.pulse'), icon: 'pulse' },
    { name: 'approvals', label: t('tabs.approvals'), icon: 'checkCircle', badge: tray.data?.total || undefined },
    { name: 'attendance', label: t('tabs.attendance'), icon: 'calendarCheck' },
    { name: 'broadcast', label: t('tabs.broadcast'), icon: 'speaker' },
  ]);

  return (
    <Tabs backBehavior="history" tabBar={dock} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.canvas } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="approvals" />
      <Tabs.Screen name="attendance" />
      <Tabs.Screen name="broadcast" />
    </Tabs>
  );
}
