import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api/endpoints';
import type { StudentTransport, TransportTrip, TripLive } from '@/api/types';
import { useRefetchOnFocus } from '@/features/common/useRefetchOnFocus';
import { ChildSwitcher } from '@/features/family/ChildSwitcher';
import { useFamily } from '@/features/family/useFamily';
import { BusMap } from '@/features/tracking/BusMap';
import { afterMyStopLine, agoText, tripHeadline } from '@/features/tracking/status';
import { StopTimeline } from '@/features/tracking/StopTimeline';
import { useRouteShape, useTripLive } from '@/features/tracking/useTripLive';
import { formatClock, formatEta, formatTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { Banner, Button, Card, Dot, EmptyState, ErrorState, Icon, LoadingCards, SegmentedControl, Skeleton, Text, useToast } from '@/ui';

type Enrolled = Extract<StudentTransport, { enrolled: true }>;

function defaultTrip(trips: TransportTrip[]): TransportTrip | undefined {
  return (
    trips.find((trip) => trip.status === 'active') ??
    trips.find((trip) => trip.status === 'scheduled') ??
    trips[trips.length - 1]
  );
}

export default function BusScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const family = useFamily();
  const studentId = family.selected?.id;
  const transport = useQuery({
    queryKey: ['transport', studentId],
    queryFn: () => api.transport(studentId as string),
    enabled: !!studentId,
    refetchInterval: 60_000,
  });
  useRefetchOnFocus(() => {
    if (studentId) void transport.refetch();
  });

  if (family.isLoading || transport.isLoading) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
        <View style={styles.padded}>
          <LoadingCards />
        </View>
      </SafeAreaView>
    );
  }
  if (transport.error) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
        <ErrorState error={transport.error} onRetry={() => void transport.refetch()} />
      </SafeAreaView>
    );
  }
  if (!transport.data || !transport.data.enrolled) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
        <View style={styles.padded}>
          <ChildSwitcher students={family.students} selectedId={studentId} onSelect={family.select} />
          <EmptyState icon="bus-outline" title={t('bus.noBus', { name: family.selected?.first_name ?? '' })} />
        </View>
      </SafeAreaView>
    );
  }
  return <BusTracker key={studentId} transport={transport.data} studentId={studentId as string} />;
}

function BusTracker({ transport, studentId }: { transport: Enrolled; studentId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const family = useFamily();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [direction, setDirection] = useState<'pickup' | 'drop'>(defaultTrip(transport.today)?.direction ?? 'pickup');
  const [follow, setFollow] = useState(true);

  const trip = transport.today.find((item) => item.direction === direction);
  const live = useTripLive(trip?.trip_id);
  const route = useRouteShape(transport.route.id, direction);
  const myStop = direction === 'pickup' ? transport.pickup_stop : transport.drop_stop;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['transport', studentId] });
    void queryClient.invalidateQueries({ queryKey: ['summary', studentId] });
  };
  const alertMinutes = useMutation({
    mutationFn: (minutes: number) => api.setAlertMinutes(studentId, minutes),
    onSuccess: refresh,
    onError: () => toast(t('common.somethingWrong'), 'danger'),
  });
  const absence = useMutation({
    mutationFn: (absent: boolean) =>
      absent ? api.markNotTravelling(studentId, direction) : api.undoNotTravelling(studentId, direction),
    onSuccess: refresh,
    onError: () => toast(t('common.somethingWrong'), 'danger'),
  });
  const contactDesk = useMutation({
    mutationFn: () =>
      api.startConversation({
        kind: 'department',
        department: 'transport',
        name: '',
        initials: '',
        subtitle: '',
        student: { id: studentId, name: family.selected?.name ?? '', first_name: family.selected?.first_name ?? '' },
      }),
    onSuccess: (conversation) => router.push(`/chat/${conversation.id}`),
    onError: () => toast(t('common.somethingWrong'), 'danger'),
  });

  const absentNow = trip?.absent ?? false;
  const mapHeight = Platform.OS === 'web' ? 380 : Math.round(height * 0.46);
  const data = live.data;

  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <View style={{ height: mapHeight }}>
        {route.data ? (
          <BusMap route={route.data} live={data} myStopId={myStop.id} follow={follow} onUserPan={() => setFollow(false)} />
        ) : (
          <Skeleton height={mapHeight} style={{ borderRadius: 0 }} />
        )}
        <SafeAreaView edges={['top']} style={styles.mapTop} pointerEvents="box-none">
          <View style={[styles.segment, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SegmentedControl
              value={direction}
              onChange={(value) => {
                setDirection(value);
                setFollow(true);
              }}
              options={[
                { value: 'pickup', label: t('bus.morning') },
                { value: 'drop', label: t('bus.afternoon') },
              ]}
            />
          </View>
        </SafeAreaView>
        {!follow && data?.position ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bus.recenter')}
            onPress={() => setFollow(true)}
            style={[styles.recenter, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="locate" size={18} color="primary" />
            <Text variant="label" color="primary">
              {t('bus.recenter')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView style={[styles.sheet, { backgroundColor: colors.bg }]} contentContainerStyle={styles.sheetContent}>
        <View style={styles.inner}>
          <ChildSwitcher students={family.students} selectedId={studentId} onSelect={family.select} />
          {!trip ? (
            <EmptyState icon="moon-outline" title={t('bus.noTripToday')} />
          ) : data ? (
            <StatusCard live={data} myStopId={myStop.id} myStopName={myStop.name} myStopTime={myStop.time} realtime={live.isRealtime} absent={absentNow} />
          ) : live.error ? (
            <ErrorState error={live.error} onRetry={() => void live.refetch()} />
          ) : (
            <Skeleton height={120} style={{ borderRadius: radius.lg }} />
          )}

          {data && data.delay_minutes && data.delay_minutes >= 5 && data.status === 'active' ? (
            <Banner tone="warning" icon="time-outline" message={t('bus.delay', { minutes: data.delay_minutes })} />
          ) : null}

          {data ? (
            <Card>
              <Text variant="overline" style={styles.cardTitle}>
                {t('bus.stops')}
              </Text>
              <StopTimeline live={data} myStopId={myStop.id} />
            </Card>
          ) : null}

          <Card>
            <Text variant="subheading">{t('bus.alertMe')}</Text>
            <View style={styles.gapTop}>
              <SegmentedControl
                value={transport.alert_minutes}
                onChange={(minutes) => alertMinutes.mutate(minutes)}
                options={transport.alert_choices.map((minutes) => ({
                  value: minutes,
                  label: `${minutes}`,
                  accessibilityLabel: t('bus.alertAway', { minutes }),
                }))}
              />
            </View>
            <Text variant="caption" style={styles.gapTop}>
              {t('bus.alertAway', { minutes: transport.alert_minutes })} · {myStop.name}
            </Text>
          </Card>

          {trip && trip.status !== 'completed' ? (
            <Card>
              <View style={styles.switchRow}>
                <View style={styles.flex}>
                  <Text variant="subheading">{t('bus.notTravelling')}</Text>
                  <Text variant="caption">{t('bus.notTravellingHint')}</Text>
                </View>
                <Switch
                  accessibilityLabel={t('bus.notTravelling')}
                  value={absentNow}
                  onValueChange={(value) => absence.mutate(value)}
                  disabled={absence.isPending}
                  trackColor={{ true: colors.warning, false: colors.border }}
                  thumbColor={Platform.OS === 'android' ? colors.surface : undefined}
                />
              </View>
            </Card>
          ) : null}

          <Card>
            <View style={styles.crewRow}>
              <View style={[styles.busIcon, { backgroundColor: colors.primarySoft }]}>
                <Icon name="bus-outline" size={20} color="primary" />
              </View>
              <View style={styles.flex}>
                <Text variant="subheading">
                  {transport.vehicle?.label ?? t('bus.title')} · {transport.vehicle?.registration_no}
                </Text>
                <Text variant="caption">
                  {transport.route.name}
                  {transport.crew.driver ? ` · ${t('bus.crew', { driver: transport.crew.driver, attendant: transport.crew.attendant ?? '—' })}` : ''}
                </Text>
              </View>
            </View>
            <Button
              title={t('bus.contactDesk')}
              icon="chatbubble-ellipses-outline"
              variant="secondary"
              onPress={() => contactDesk.mutate()}
              loading={contactDesk.isPending}
              fullWidth
              style={styles.gapTop}
            />
          </Card>

          <Text variant="caption" align="center" style={styles.privacy}>
            {t('bus.privacyNote')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function StatusCard({
  live,
  myStopId,
  myStopName,
  myStopTime,
  realtime,
  absent,
}: {
  live: TripLive;
  myStopId: string;
  myStopName: string;
  myStopTime: string;
  realtime: boolean;
  absent: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const mine = live.stops.find((stop) => stop.id === myStopId);
  const headline = tripHeadline(live, mine, t);
  const active = live.status === 'active';
  const onCard = active ? colors.onPrimary : colors.ink;
  const waiting = active && mine && (mine.status === 'next' || mine.status === 'upcoming');
  const here = active && mine?.status === 'at_stop';
  const passed = active && (mine?.status === 'departed' || mine?.status === 'skipped');

  // One message per state: the small line sets context, the big line is what the parent acts on.
  let title = headline.title;
  let big: string | null = null;
  let detail: string | null = null;
  let spoken = headline.title;
  if (absent) {
    detail = t('bus.notTravelling');
  } else if (waiting) {
    big = formatEta(mine?.eta_seconds);
    detail = `${t('bus.toStop', { stop: myStopName })} · ${t('bus.scheduled', { time: formatClock(mine?.scheduled_time) })}`;
    spoken = `${headline.title}, ${big} ${detail}`;
  } else if (here) {
    title = `${t('bus.yourStop')} · ${myStopName}`;
    big = t('bus.hereNow');
    detail = mine?.arrived_at ? t('bus.arrivedAt', { time: formatTime(mine.arrived_at) }) : null;
    spoken = t('bus.atYourStop');
  } else if (passed) {
    big = t('bus.passedYourStop');
    detail = afterMyStopLine(live, myStopId, t);
    spoken = `${big}${detail ? `, ${detail}` : ''}`;
  } else if (live.status === 'scheduled') {
    detail = `${myStopName} · ${t('bus.scheduled', { time: formatClock(myStopTime) })}`;
    spoken = `${headline.title}, ${detail}`;
  } else if (active && live.next_stop) {
    detail = `${t('bus.nextStop')}: ${live.next_stop.name} · ${formatEta(live.next_stop.eta_seconds)}`;
    spoken = `${headline.title}, ${detail}`;
  }

  return (
    <Card tone={active ? 'primary' : 'surface'} accessibilityLabel={spoken}>
      <View style={styles.statusTop}>
        <Text variant="subheading" rawColor={onCard} style={styles.flex}>
          {title}
        </Text>
        {active ? (
          <View style={styles.liveTag}>
            <Dot rawColor={live.signal === 'live' ? colors.onPrimary : colors.warning} />
            <Text variant="label" rawColor={colors.onPrimary}>
              {live.signal === 'live'
                ? realtime
                  ? t('bus.liveUpdates')
                  : t('bus.pollingUpdates')
                : t('bus.signalWeak', { ago: agoText(live.last_update_seconds, t) })}
            </Text>
          </View>
        ) : null}
      </View>
      {big ? (
        <Text variant="display" rawColor={onCard} style={styles.eta} numberOfLines={1} adjustsFontSizeToFit>
          {big}
        </Text>
      ) : null}
      {detail ? (
        <Text
          variant="body"
          rawColor={active ? colors.onPrimary : absent ? colors.warning : colors.textMuted}
          style={big ? undefined : styles.gapTop}>
          {detail}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  padded: { padding: spacing.md, gap: spacing.md },
  mapTop: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingTop: spacing.xs },
  segment: { width: 240, borderRadius: radius.pill, borderWidth: 1, padding: 2 },
  recenter: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  sheet: { flex: 1, marginTop: -spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  sheetContent: { paddingTop: spacing.md, paddingBottom: spacing.xxl },
  inner: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: spacing.md, gap: spacing.md },
  cardTitle: { marginBottom: spacing.sm },
  gapTop: { marginTop: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  crewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  busIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  eta: { marginTop: spacing.xs, fontSize: 40, lineHeight: 46 },
  privacy: { marginTop: spacing.xs, paddingHorizontal: spacing.md },
});
