import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { AppNotification, NotificationCategory } from '@/api/types';
import { routeForNotification } from '@/features/notifications/push';
import { relativeTime } from '@/lib/format';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, toneColors, type Tone } from '@/theme/tokens';
import { Card, EmptyState, ErrorState, Icon, type IconName, LoadingCards, Screen, Text } from '@/ui';

const CATEGORY: Record<NotificationCategory, { icon: IconName; tone: Tone }> = {
  bus: { icon: 'bus', tone: 'primary' },
  safety: { icon: 'warning', tone: 'danger' },
  attendance: { icon: 'calendar', tone: 'warning' },
  homework: { icon: 'book', tone: 'accent' },
  fees: { icon: 'wallet', tone: 'info' },
  results: { icon: 'ribbon', tone: 'success' },
  chat: { icon: 'chatbubbles', tone: 'primary' },
  announcement: { icon: 'megaphone', tone: 'accent' },
  general: { icon: 'notifications', tone: 'neutral' },
};

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const schoolId = useSession((s) => s.schoolId);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['notifications', schoolId], queryFn: api.notifications });
  const markRead = useMutation({
    mutationFn: (ids?: string[]) => api.markNotificationsRead(ids),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const items = (query.data?.items ?? []).filter((n) => n.category !== 'chat');

  const open = (item: AppNotification) => {
    if (!item.read) markRead.mutate([item.id]);
    const target = routeForNotification(item.data as Record<string, unknown>);
    if (target && target !== '/notifications') router.push(target as never);
  };

  return (
    <Screen edges={[]} onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Stack.Screen
        options={{
          title: t('notifications.title'),
          headerRight: () =>
            query.data?.unread ? (
              <Pressable accessibilityRole="button" onPress={() => markRead.mutate(undefined)} hitSlop={10}>
                <Text variant="label" color="primary">
                  {t('notifications.markAllRead')}
                </Text>
              </Pressable>
            ) : null,
        }}
      />
      {query.isLoading ? (
        <LoadingCards />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="notifications-off-outline" title={t('notifications.empty')} />
      ) : (
        <Card padded={false}>
          {items.map((item, index) => {
            const category = CATEGORY[item.category] ?? CATEGORY.general;
            const { fg, bg } = toneColors(colors, category.tone);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.read ? '' : 'Unread. '}${item.title}. ${item.body}`}
                onPress={() => open(item)}
                style={({ pressed }) => [styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.borderSoft }, pressed && { backgroundColor: colors.surfaceAlt }]}>
                <View style={[styles.icon, { backgroundColor: bg }]}>
                  <Icon name={category.icon} size={18} rawColor={fg} />
                </View>
                <View style={styles.flex}>
                  <Text variant={item.read ? 'bodyStrong' : 'subheading'} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text variant="body" color="textMuted" numberOfLines={3} style={styles.body}>
                    {item.body}
                  </Text>
                  <Text variant="caption">{relativeTime(item.created_at)}</Text>
                </View>
                {!item.read ? <View style={[styles.unread, { backgroundColor: colors.accent }]} /> : null}
              </Pressable>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, alignItems: 'flex-start' },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
  body: { fontSize: 14, lineHeight: 20 },
  unread: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
});
