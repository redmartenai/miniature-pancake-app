import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { RosterStudent, TripLive } from '@/api/types';
import { useDriverTracking } from '@/features/driver/useDriverTracking';
import { StopTimeline } from '@/features/tracking/StopTimeline';
import { formatEta } from '@/lib/format';
import { newClientId } from '@/lib/ids';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { Avatar, Banner, Button, Card, Dot, ErrorState, Icon, LoadingCards, Pill, Screen, Text, useToast } from '@/ui';
import { Sheet } from '@/ui/Sheet';

export default function DriverTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const trip = useQuery({
    queryKey: ['driver-trip', id],
    queryFn: () => api.driverTrip(id),
    refetchInterval: (q) => (q.state.data?.trip.status === 'active' ? 8_000 : 30_000),
  });
  const status = trip.data?.trip.status;
  const active = status === 'active';
  const tracking = useDriverTracking(id, active);
  const roster = useQuery({ queryKey: ['driver-roster', id], queryFn: () => api.tripRoster(id), refetchInterval: active ? 20_000 : false });
  const [ending, setEnding] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['driver-trip', id] });
    void queryClient.invalidateQueries({ queryKey: ['driver-trips'] });
  };
  const start = useMutation({
    mutationFn: () => api.startTrip(id),
    onSuccess: refresh,
    onError: (error) => toast(error instanceof ApiError ? error.message : t('common.somethingWrong'), 'danger'),
  });
  const end = useMutation({
    mutationFn: async () => {
      await tracking.stop();
      return api.endTrip(id, confirmed);
    },
    onSuccess: () => {
      setEnding(false);
      toast(t('driver.tripDone'));
      refresh();
    },
    onError: (error) => toast(error instanceof ApiError ? (error.fieldMessage() ?? error.message) : t('common.somethingWrong'), 'danger'),
  });

  if (trip.isLoading) {
    return (
      <Screen edges={[]}>
        <LoadingCards />
      </Screen>
    );
  }
  if (trip.error || !trip.data) return <ErrorState error={trip.error} onRetry={() => void trip.refetch()} />;

  const { trip: summary, live } = trip.data;
  const next = tracking.lastResult?.next_stop ?? live.next_stop;
  const stopStudents = roster.data?.stops.find((s) => s.id === next?.id)?.students ?? [];

  return (
    <Screen
      edges={[]}
      onRefresh={() => void trip.refetch()}
      refreshing={trip.isRefetching}
      footer={
        status === 'scheduled' ? (
          <Button title={t('driver.startTrip')} icon="play" size="lg" onPress={() => start.mutate()} loading={start.isPending} fullWidth />
        ) : active ? (
          <View style={styles.footerRow}>
            <SosButton tripId={id} />
            <Button title={t('driver.endTrip')} icon="flag-outline" variant="secondary" size="lg" onPress={() => setEnding(true)} style={styles.flex} />
          </View>
        ) : undefined
      }>
      <Stack.Screen options={{ title: `${summary.route.code} · ${summary.direction === 'pickup' ? t('driver.morningPickup') : t('driver.afternoonDrop')}` }} />

      {status === 'completed' ? <Banner tone="success" icon="checkmark-circle-outline" message={t('driver.tripDone')} /> : null}

      {active ? <GpsStatus gps={tracking.gps} accuracy={tracking.accuracy} pending={tracking.pending} /> : null}

      {status === 'scheduled' ? (
        <Card>
          <Text variant="heading">{summary.route.name}</Text>
          <Text variant="body" style={styles.gap}>
            {t('driver.riders', { riders: summary.riders, absent: summary.absent })}
          </Text>
          <Text variant="caption">{t('driver.stopsProgress', { done: 0, total: summary.stops_total })}</Text>
          <Text variant="caption" style={styles.gap}>
            {t('driver.keepOpen')}
          </Text>
        </Card>
      ) : null}

      {active && next ? (
        <Card tone="primary">
          <NextStopHeader live={live} nextName={next.name} eta={next.eta_seconds} />
          {stopStudents.length ? (
            <View style={styles.students}>
              {stopStudents.map((student) => (
                <BoardingRow key={student.id} tripId={id} student={student} direction={summary.direction} />
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <StopTimeline live={live} />
      </Card>

      <Sheet visible={ending} onClose={() => setEnding(false)} title={t('driver.emptyCheckTitle')}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmed }}
          onPress={() => setConfirmed((c) => !c)}
          style={styles.checkRow}>
          <Icon name={confirmed ? 'checkbox' : 'square-outline'} size={26} color={confirmed ? 'primary' : 'textMuted'} />
          <Text variant="bodyStrong" style={styles.flex}>
            {t('driver.emptyCheck')}
          </Text>
        </Pressable>
        <Button title={t('driver.endTrip')} icon="flag" onPress={() => end.mutate()} loading={end.isPending} disabled={!confirmed} fullWidth />
      </Sheet>
    </Screen>
  );
}

function NextStopHeader({ live, nextName, eta }: { live: TripLive; nextName: string; eta: number | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View>
      <Text variant="label" rawColor={colors.onPrimary}>
        {t('bus.nextStop')}
      </Text>
      <Text variant="display" rawColor={colors.onPrimary}>
        {nextName}
      </Text>
      <Text variant="bodyStrong" rawColor={colors.onPrimary}>
        {formatEta(eta)} · {t('driver.stopsProgress', { done: live.stops.filter((s) => s.status === 'departed' || s.status === 'skipped').length, total: live.stops.length })}
      </Text>
    </View>
  );
}

function GpsStatus({ gps, accuracy, pending }: { gps: string; accuracy: number | null; pending: number }) {
  const { t } = useTranslation();
  if (gps === 'denied') {
    return (
      <Banner
        tone="danger"
        icon="location-outline"
        title={t('driver.permissionTitle')}
        message={t('driver.permissionHint')}
        action={{ label: t('driver.openSettings'), onPress: () => void Linking.openSettings() }}
      />
    );
  }
  return (
    <View style={styles.gpsRow}>
      <Dot tone={gps === 'live' ? 'success' : 'warning'} size={10} />
      <Text variant="bodyStrong">
        {gps === 'live' ? `${t('driver.gpsLive')}${accuracy ? ` · ±${Math.round(accuracy)} m` : ''}` : t('driver.gpsSearching')}
      </Text>
      {pending > 0 ? <Pill label={t('driver.waitingUpload', { count: pending })} tone="warning" icon="cloud-upload-outline" /> : null}
    </View>
  );
}

function BoardingRow({ tripId, student, direction }: { tripId: string; student: RosterStudent; direction: 'pickup' | 'drop' }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const toast = useToast();
  const record = useMutation({
    mutationFn: (kind: 'boarded' | 'dropped' | 'no_show') => api.recordBoarding(tripId, student.id, kind, newClientId()),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['driver-roster', tripId] }),
    onError: () => toast(t('common.somethingWrong'), 'danger'),
  });
  const done = student.boarded_at || student.dropped_at || student.no_show_at;
  return (
    <View style={[styles.student, { backgroundColor: colors.surface }]}>
      <Avatar initials={student.initials} size={34} seed={student.id} />
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {student.name}
        </Text>
        <Text variant="caption">{student.class_label}</Text>
      </View>
      {student.absent ? (
        <Pill label={t('driver.absent')} tone="neutral" />
      ) : done ? (
        <Pill
          label={student.no_show_at ? t('driver.noShow') : student.dropped_at ? t('driver.dropped') : t('driver.boarded')}
          tone={student.no_show_at ? 'warning' : 'success'}
          icon={student.no_show_at ? 'alert-circle-outline' : 'checkmark-circle-outline'}
        />
      ) : direction === 'pickup' ? (
        <View style={styles.actions}>
          <Button title={t('driver.noShow')} size="sm" variant="secondary" onPress={() => record.mutate('no_show')} />
          <Button title={t('driver.boarded')} size="sm" onPress={() => record.mutate('boarded')} loading={record.isPending} />
        </View>
      ) : (
        <Button title={t('driver.dropped')} size="sm" onPress={() => record.mutate('dropped')} loading={record.isPending} />
      )}
    </View>
  );
}

/** Press and hold for 2 seconds, so an SOS is never sent by accident. */
function SosButton({ tripId }: { tripId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);
  const sos = useMutation({
    mutationFn: () => api.sos(tripId, null, null, ''),
    onSuccess: () => toast(t('driver.sosSent'), 'danger'),
    onError: () => toast(t('common.somethingWrong'), 'danger'),
  });
  const begin = () => {
    setHolding(true);
    timer.current = setTimeout(() => {
      setHolding(false);
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      sos.mutate();
    }, 2000);
  };
  const cancel = () => {
    setHolding(false);
    if (timer.current) clearTimeout(timer.current);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('driver.sos')}
      accessibilityHint={t('driver.sosHold')}
      onPressIn={begin}
      onPressOut={cancel}
      style={[styles.sos, { backgroundColor: holding ? colors.dangerSoft : colors.danger, borderColor: colors.danger }]}>
      <Text variant="heading" rawColor={holding ? colors.danger : '#FFFFFF'}>
        {t('driver.sos')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { marginTop: spacing.xs },
  footerRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  students: { gap: spacing.xs, marginTop: spacing.md },
  student: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.xs + 2, borderRadius: radius.md },
  actions: { flexDirection: 'row', gap: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  sos: { width: 88, height: 54, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
