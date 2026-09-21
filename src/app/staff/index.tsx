import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { api } from '@/api/endpoints';
import type { DriverTrip } from '@/api/types';
import { useRefetchOnFocus } from '@/features/common/useRefetchOnFocus';
import { useUnread } from '@/features/common/useUnread';
import { formatClock, formatEta, greetingKey } from '@/lib/format';
import { useActiveSchool, useSession } from '@/state/session';
import { spacing, type Tone } from '@/theme/tokens';
import { Banner, Card, EmptyState, IconButton, ListRow, LoadingCards, Pill, Screen, SectionHeader, Text } from '@/ui';

const TRANSPORT_ROLES = new Set(['transport_manager', 'principal', 'admin']);

export default function StaffToday() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const role = useSession((s) => s.role);
  const school = useActiveSchool();
  const unread = useUnread();
  const isTeacher = role === 'teacher';
  const seesTransport = !!role && TRANSPORT_ROLES.has(role);

  const seesClasses = isTeacher || role === 'principal';

  const today = useQuery({ queryKey: ['teacher-today'], queryFn: api.teacherToday, enabled: isTeacher });
  const classes = useQuery({ queryKey: ['teacher-classes'], queryFn: api.teacherClasses, enabled: seesClasses });
  const transport = useQuery({
    queryKey: ['transport-dashboard'],
    queryFn: api.transportDashboard,
    enabled: seesTransport,
    refetchInterval: 20_000,
  });

  const pending = (classes.data?.classes ?? []).filter((c) => c.is_class_teacher && !c.attendance_marked_today);
  // refetch() ignores `enabled`, so only refresh what this role can see.
  const refresh = () => {
    if (isTeacher) void today.refetch();
    if (seesClasses) void classes.refetch();
    if (seesTransport) void transport.refetch();
  };
  useRefetchOnFocus(refresh);

  return (
    <Screen onRefresh={refresh} refreshing={today.isRefetching || classes.isRefetching || transport.isRefetching}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="caption">{school?.name}</Text>
          <Text variant="title">
            {t(greetingKey())}, {user?.first_name}
          </Text>
        </View>
        <IconButton icon="notifications-outline" label={t('home.notifications')} badge={unread.notifications} onPress={() => router.push('/notifications')} />
      </View>

      {pending.map((group) => (
        <Banner
          key={group.id}
          tone="warning"
          icon="checkbox-outline"
          message={t('teacher.attendancePending', { class: group.label })}
          action={{ label: t('teacher.markAttendance'), onPress: () => router.push(`/class/${group.id}/attendance`) }}
        />
      ))}

      {seesTransport ? <TransportOverview trips={transport.data?.trips} incidents={transport.data?.open_incidents.length ?? 0} loading={transport.isLoading} /> : null}

      {isTeacher ? (
        <>
          <SectionHeader title={t('teacher.periodsToday')} />
          {today.isLoading ? (
            <LoadingCards count={2} />
          ) : today.data?.periods.length ? (
            <Card padded={false}>
              {today.data.periods.map((period, index, list) => (
                <ListRow
                  key={`${period.period}-${period.class.id}`}
                  left={
                    <View style={styles.time}>
                      <Text variant="label">{formatClock(period.starts_at)}</Text>
                      <Text variant="caption">{formatClock(period.ends_at)}</Text>
                    </View>
                  }
                  title={`${period.subject} · ${period.class.label}`}
                  subtitle={period.room}
                  onPress={() => router.push(`/class/${period.class.id}/homework`)}
                  last={index === list.length - 1}
                />
              ))}
            </Card>
          ) : (
            <EmptyState icon="cafe-outline" title={t('teacher.noPeriods')} />
          )}
        </>
      ) : null}
    </Screen>
  );
}

function TransportOverview({ trips, incidents, loading }: { trips?: DriverTrip[]; incidents: number; loading: boolean }) {
  const { t } = useTranslation();
  const tone = (trip: DriverTrip): Tone => (trip.status === 'active' ? (trip.signal === 'live' ? 'success' : 'warning') : trip.status === 'completed' ? 'neutral' : 'info');
  return (
    <>
      <SectionHeader title={t('bus.title')} />
      {incidents ? <Banner tone="danger" icon="warning-outline" message={`${incidents} open safety alert${incidents > 1 ? 's' : ''} today`} /> : null}
      {loading ? (
        <LoadingCards count={1} />
      ) : (
        <Card padded={false}>
          {(trips ?? []).map((trip, index, list) => (
            <ListRow
              key={trip.id}
              icon="bus-outline"
              iconTone={trip.status === 'active' ? 'primary' : 'neutral'}
              title={`${trip.route.code} · ${trip.direction === 'pickup' ? t('bus.morning') : t('bus.afternoon')} · ${formatClock(trip.scheduled_start)}`}
              subtitle={
                trip.status === 'active' && trip.next_stop
                  ? `${t('bus.nextStop')}: ${trip.next_stop.name} · ${formatEta(trip.next_stop.eta_seconds)}`
                  : t('driver.stopsProgress', { done: trip.stops_done, total: trip.stops_total })
              }
              right={<Pill label={trip.status === 'active' ? t('bus.onTheWay') : trip.status === 'completed' ? t('bus.completed') : formatClock(trip.scheduled_start)} tone={tone(trip)} />}
              onPress={() => router.push(`/trip/${trip.id}`)}
              last={index === list.length - 1}
            />
          ))}
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
  time: { width: 70 },
});
