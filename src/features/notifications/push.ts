import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/api/endpoints';
import { APP_VARIANT } from '@/lib/config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Android channels, so families can tune each kind separately in system settings.
 * Bus and safety alerts are high priority; everything else is quiet by default.
 */
async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    Notifications.setNotificationChannelAsync('bus', {
      name: 'Bus alerts',
      description: 'Bus started, near your stop, arrived and delays',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
    }),
    Notifications.setNotificationChannelAsync('safety', {
      name: 'Safety alerts',
      description: 'Emergencies and urgent school announcements',
      importance: Notifications.AndroidImportance.MAX,
      bypassDnd: true,
    }),
    Notifications.setNotificationChannelAsync('chat', {
      name: 'Messages',
      description: 'Messages from teachers and the school office',
      importance: Notifications.AndroidImportance.DEFAULT,
    }),
    Notifications.setNotificationChannelAsync('school', {
      name: 'School updates',
      description: 'Attendance, homework, fees, results and announcements',
      importance: Notifications.AndroidImportance.DEFAULT,
    }),
  ]);
}

/** Ask for permission (once), get this device's push token and give it to the backend. */
export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  try {
    await ensureChannels();
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted && existing.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return null;
    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return null; // push needs an EAS project (development or store build)
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api.registerPushDevice(token, Platform.OS === 'ios' ? 'ios' : 'android', APP_VARIANT);
    return token;
  } catch {
    return null; // e.g. Expo Go on Android, which has no push support
  }
}

/** Where tapping a notification should take the user. */
export function routeForNotification(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  if (typeof data.conversation_id === 'string') return `/chat/${data.conversation_id}`;
  if (typeof data.trip_id === 'string') return data.type === 'sos' || data.category === 'safety' ? `/trip/${data.trip_id}` : '/family/bus';
  if (typeof data.homework_id === 'string') return `/homework/${data.homework_id}`;
  if (typeof data.invoice_id === 'string' || typeof data.payment_id === 'string') return '/fees';
  if (typeof data.announcement_id === 'string') return '/announcements';
  if (data.type === 'attendance_absent' || data.type === 'attendance_late') return '/attendance';
  return '/notifications';
}
