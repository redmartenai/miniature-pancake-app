import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { api } from '@/api/endpoints';
import { APP_VARIANT } from '@/lib/config';

/**
 * Expo Go on Android has no push support (since SDK 53), and expo-notifications throws as soon as
 * it is imported there. So load it only where it works; everywhere else push is simply off.
 */
const Notifications: typeof import('expo-notifications') | null =
  Platform.OS === 'android' && isRunningInExpoGo() ? null : require('expo-notifications');

Notifications?.setNotificationHandler({
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
  if (Platform.OS !== 'android' || !Notifications) return;
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
  if (Platform.OS === 'web' || !Device.isDevice || !Notifications) return null;
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
    return null;
  }
}

/** Calls `onTap` with a notification's data when the user taps it. Returns the unsubscribe function. */
export function addNotificationTapListener(onTap: (data: Record<string, unknown>) => void): () => void {
  if (!Notifications) return () => undefined;
  const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
    onTap(response.notification.request.content.data as Record<string, unknown>),
  );
  return () => subscription.remove();
}

/** Where tapping a notification should take the user. */
/** Where a notification tap should land. Families get the parent app's screens. */
export function routeForNotification(data: Record<string, unknown> | undefined, family = true, base: '/parent' | '/student' = '/parent'): string | null {
  if (!data) return null;
  if (typeof data.conversation_id === 'string') return `/chat/${data.conversation_id}`;
  if (typeof data.trip_id === 'string') {
    if (data.type === 'sos' || data.category === 'safety') return `/trip/${data.trip_id}`;
    return family ? (base === '/parent' ? '/parent/bus' : '/student') : `/trip/${data.trip_id}`;
  }
  if (!family) {
    if (typeof data.approval_id === 'string') return '/principal/approvals';
    if (typeof data.homework_id === 'string') return '/staff/homework';
    if (data.type === 'cover' || data.type === 'cover_note') return '/staff/timetable';
    if (data.type === 'staff_leave') return '/staff/leave';
    if (data.type === 'assignment') return '/staff/assignments';
    if (typeof data.announcement_id === 'string') return '/announcements';
    return '/notifications';
  }
  if (base === '/student') {
    if (typeof data.homework_id === 'string') return '/student/tasks';
    if (data.type === 'leave' || data.type === 'attendance_absent' || data.type === 'attendance_late') return '/student/attendance';
    if (data.type === 'results' || typeof data.exam_id === 'string') return '/student/results';
    return '/student/notifications';
  }
  if (typeof data.homework_id === 'string') return '/parent/homework';
  if (typeof data.invoice_id === 'string' || typeof data.payment_id === 'string') return '/parent/fees';
  if (data.type === 'remark') return '/parent/remarks';
  if (data.type === 'leave' || data.type === 'attendance_absent' || data.type === 'attendance_late') return '/parent/attendance';
  if (data.type === 'results' || typeof data.exam_id === 'string') return '/parent/results';
  return '/parent/notifications';
}

/**
 * A reminder on this phone at `at` (no server involved). Returns false where local
 * notifications aren't available (the web, Android Expo Go) or permission was refused.
 */
export async function scheduleLocalReminder(at: Date, title: string, body: string): Promise<boolean> {
  if (!Notifications || Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return false;
  await ensureChannels();
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: Platform.OS === 'android' ? 'school' : undefined },
  });
  return true;
}
