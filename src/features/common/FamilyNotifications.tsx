import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { AppNotification, NotificationCategory } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { routeForNotification } from '@/features/notifications/push';
import { formatDate, formatTime, isToday, joinNames } from '@/lib/format';
import { useActiveSchool } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { AppBar, Button, Card, Chip, Dot, EmptyState, ErrorState, IconButton, LoadingCards, pointer, Screen, Text, ThemeToggle, TileIcon, type IconName, type TileTone } from '@/ui';

type Filter = 'all' | 'attendance' | 'academics' | 'fees' | 'bus' | 'school';

const FILTER_OF: Record<NotificationCategory, Filter> = {
  attendance: 'attendance',
  homework: 'academics',
  results: 'academics',
  general: 'academics',
  fees: 'fees',
  bus: 'bus',
  safety: 'bus',
  announcement: 'school',
  chat: 'school',
};

const LOOK: Record<NotificationCategory, { icon: IconName; tone: TileTone }> = {
  bus: { icon: 'bus', tone: 'warn' },
  safety: { icon: 'alert', tone: 'bad' },
  attendance: { icon: 'calendarCheck', tone: 'ok' },
  homework: { icon: 'edit', tone: 'peach' },
  fees: { icon: 'wallet', tone: 'butter' },
  results: { icon: 'award', tone: 'lav' },
  chat: { icon: 'chat', tone: 'pink' },
  announcement: { icon: 'megaphone', tone: 'info' },
  general: { icon: 'document', tone: 'peach' },
};

/** Notifications for families (parent and student apps): by day, filterable, with the bus shortcut. */
export function FamilyNotifications({ base }: { base: '/parent' | '/student' }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const client = useQueryClient();
  const school = useActiveSchool();
  const family = useFamily();
  const [filter, setFilter] = useState<Filter>('all');
  const query = useQuery({ queryKey: ['notifications', school?.id], queryFn: api.notifications });
  const markAll = useMutation({
    mutationFn: () => api.markNotificationsRead(),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const open = useMutation({
    mutationFn: (item: AppNotification) => (item.read ? Promise.resolve({ marked: 0 }) : api.markNotificationsRead([item.id])),
    onSettled: () => void client.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = query.data?.items ?? [];
  const shown = filter === 'all' ? items : items.filter((n) => FILTER_OF[n.category] === filter);
  const unread = items.filter((n) => !n.read).length;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const groups = [
    { key: 'today', label: t('parent.notifications.today'), items: shown.filter((n) => isToday(new Date(n.created_at))) },
    { key: 'yesterday', label: t('parent.notifications.yesterday'), items: shown.filter((n) => new Date(n.created_at).toDateString() === yesterday.toDateString()) },
    {
      key: 'earlier',
      label: t('parent.notifications.earlier'),
      items: shown.filter((n) => {
        const d = new Date(n.created_at);
        return !isToday(d) && d.toDateString() !== yesterday.toDateString();
      }),
    },
  ].filter((g) => g.items.length);

  const names = family.students.map((s) => s.first_name);
  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('parent.notifications.all') },
    { value: 'attendance', label: t('parent.notifications.attendance') },
    { value: 'academics', label: t('parent.notifications.academics') },
    { value: 'fees', label: t('parent.notifications.fees') },
    { value: 'bus', label: t('parent.notifications.bus') },
    { value: 'school', label: t('parent.notifications.school') },
  ];

  const go = (item: AppNotification) => {
    open.mutate(item);
    const target = routeForNotification(item.data as Record<string, unknown>, true, base);
    if (target && target !== `${base}/notifications`) router.push(target as never);
  };

  return (
    <Screen
      dock
      refreshing={query.isRefetching}
      onRefresh={query.refetch}
      header={
        <AppBar
          back
          title={t('parent.notifications.title')}
          subtitle={joinNames(names, true)}
          theme={false}
          actions={
            <>
              <ThemeToggle />
              <IconButton icon="sliders" size="lg" label={t('parent.notifications.settings')} onPress={() => router.push(`${base}/${base === '/parent' ? 'more' : 'me'}`)} />
            </>
          }
        />
      }>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} accessibilityRole="tablist">
        {filters.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            selected={filter === f.value}
            count={f.value === 'all' && unread ? t('parent.notifications.newCount', { count: unread }) : undefined}
            onPress={() => setFilter(f.value)}
            style={{ height: 44 }}
          />
        ))}
      </ScrollView>
      {items.length ? (
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text variant="sm" color="ink2">
            {unread ? (
              <Trans i18nKey="parent.notifications.unread" count={unread} components={{ b: <Text variant="sm" weight={700} color="ink2" /> }} />
            ) : (
              t('parent.notifications.noneUnread')
            )}
          </Text>
          {unread ? (
            <Button
              title={t('parent.notifications.markAll')}
              icon="check"
              variant="ghost"
              height={44}
              textColor={colors.brandInk}
              loading={markAll.isPending}
              onPress={() => markAll.mutate()}
              style={{ marginRight: -12, paddingHorizontal: 12 }}
            />
          ) : null}
        </View>
      ) : null}
      {query.error ? <ErrorState error={query.error} onRetry={query.refetch} /> : null}
      {query.isLoading ? <LoadingCards count={3} /> : null}
      {query.data && !shown.length ? <EmptyState icon="bell" title={t('parent.notifications.empty')} /> : null}
      {groups.map((group) => (
        <View key={group.key} style={{ gap: 10 }}>
          <Text variant="eyebrow" style={{ paddingHorizontal: 2 }} accessibilityRole="header">
            {group.label}
          </Text>
          <Card pad={0} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
            {group.items.map((item, i) => (
              <NotificationRow key={item.id} item={item} last={i === group.items.length - 1} onPress={() => go(item)} today={group.key === 'today'} busRoute={base === '/parent' ? '/parent/bus' : null} />
            ))}
          </Card>
        </View>
      ))}
      {groups.length ? (
        <Text variant="xs" color="muted" align="center">
          {t('parent.notifications.caughtUp')}
        </Text>
      ) : null}
    </Screen>
  );
}

function NotificationRow({ item, last, onPress, today, busRoute }: { item: AppNotification; last: boolean; onPress: () => void; today: boolean; busRoute: string | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const look = LOOK[item.category] ?? LOOK.general;
  const time = today || isToday(new Date(item.created_at)) ? formatTime(item.created_at) : new Date(item.created_at).toDateString() === new Date(Date.now() - 86_400_000).toDateString() ? formatTime(item.created_at) : formatDate(item.created_at);
  const bus = item.category === 'bus' && today && !!busRoute;
  const body = (
    <View style={[styles.row, { alignItems: 'flex-start', gap: 12, paddingVertical: 14 }, !last && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
      <TileIcon icon={look.icon} tone={look.tone} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={[styles.row, { gap: 8 }]}>
          <Text variant="sm" weight={item.read ? 600 : 800} style={{ flex: 1, minWidth: 0 }}>
            {item.title}
          </Text>
          <Text variant="xxs" color="muted" weight={600} num>
            {time}
          </Text>
          {!item.read ? <Dot rawColor={colors.brand} /> : null}
        </View>
        {item.body ? (
          <Text variant="xs" color="ink2">
            {item.body}
          </Text>
        ) : null}
        {bus ? <Button title={t('parent.notifications.trackBus')} icon="navigate" height={44} onPress={() => router.push(busRoute as never)} style={{ alignSelf: 'flex-start', marginTop: 8 }} /> : null}
      </View>
    </View>
  );
  if (bus) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.body}${item.read ? '' : `. ${t('parent.notifications.unreadDot')}`}`} onPress={onPress} style={pointer}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
