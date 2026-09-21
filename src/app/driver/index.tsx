import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { DriverTrip } from '@/api/types';
import { useRefetchOnFocus } from '@/features/common/useRefetchOnFocus';
import { formatClock, formatEta } from '@/lib/format';
import { useActiveSchool, useSession } from '@/state/session';
import { spacing, type Tone } from '@/theme/tokens';
import { Button, Card, EmptyState, ErrorState, IconButton, LoadingCards, Pill, Screen, Text } from '@/ui';

export default function DriverHome() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const school = useActiveSchool();
  const query = useQuery({ queryKey: ['driver-trips'], queryFn: api.driverTrips, refetchInterval: 30_000 });
  useRefetchOnFocus(query.refetch);
  const trips = query.data?.trips ?? [];

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="caption">{school?.name}</Text>
          <Text variant="title">{t('driver.hello', { name: user?.first_name ?? '' })}</Text>
        </View>
        <IconButton icon="settings-outline" label={t('settings.title')} onPress={() => router.push('/settings')} />
      </View>
      <Text variant="overline">{t('driver.todaysTrips')}</Text>
      {query.isLoading ? (
        <LoadingCards />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : trips.length === 0 ? (
        <EmptyState icon="bus-outline" title={t('driver.noTrips')} />
      ) : (
        trips.map((trip) => <TripCard key={trip.id} trip={trip} />)
      )}
    </Screen>
  );
}

function TripCard({ trip }: { trip: DriverTrip }) {
  const { t } = useTranslation();
  const tone: Tone = trip.status === 'active' ? 'success' : trip.status === 'completed' ? 'neutral' : 'info';
  const statusLabel = trip.status === 'active' ? t('bus.onTheWay') : trip.status === 'completed' ? t('bus.completed') : formatClock(trip.scheduled_start);
  return (
    <Card onPress={() => router.push(`/driver/trip/${trip.id}`)} accessibilityLabel={`${trip.route.name}, ${statusLabel}`}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="heading">{trip.direction === 'pickup' ? t('driver.morningPickup') : t('driver.afternoonDrop')}</Text>
          <Text variant="caption">
            {trip.route.name} · {trip.vehicle?.label ?? ''} {trip.vehicle?.registration_no ?? ''}
          </Text>
        </View>
        <Pill label={statusLabel} tone={tone} />
      </View>
      <Text variant="body" style={styles.gap}>
        {t('driver.riders', { riders: trip.riders, absent: trip.absent })}
      </Text>
      {trip.status === 'active' && trip.next_stop ? (
        <Text variant="bodyStrong" color="primary">
          {t('bus.nextStop')}: {trip.next_stop.name} · {formatEta(trip.next_stop.eta_seconds)}
        </Text>
      ) : null}
      {trip.status !== 'completed' ? (
        <Button
          title={trip.status === 'active' ? t('common.continue') : t('driver.startTrip')}
          icon={trip.status === 'active' ? 'navigate' : 'play'}
          onPress={() => router.push(`/driver/trip/${trip.id}`)}
          style={styles.gap}
          fullWidth
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gap: { marginTop: spacing.sm },
});
