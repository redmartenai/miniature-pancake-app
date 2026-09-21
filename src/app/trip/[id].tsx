import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { BusMap } from '@/features/tracking/BusMap';
import { agoText, tripHeadline } from '@/features/tracking/status';
import { StopTimeline } from '@/features/tracking/StopTimeline';
import { useRouteShape, useTripLive } from '@/features/tracking/useTripLive';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { Banner, Card, ErrorState, LoadingCards, Pill, Skeleton, Text } from '@/ui';

/** Transport desk / principal view of any running bus. */
export default function StaffTripView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const live = useTripLive(id);
  const route = useRouteShape(live.data?.route.id, live.data?.direction);
  const [follow, setFollow] = useState(true);
  const mapHeight = Platform.OS === 'web' ? 420 : Math.round(height * 0.45);
  const data = live.data;

  if (live.isLoading) return <View style={[styles.fill, { backgroundColor: colors.bg, padding: spacing.md }]}><LoadingCards /></View>;
  if (live.error || !data) return <ErrorState error={live.error} onRetry={() => void live.refetch()} />;

  const headline = tripHeadline(data, undefined, t);
  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: `${data.route.code} · ${data.vehicle?.label ?? ''}` }} />
      <View style={{ height: mapHeight }}>
        {route.data ? <BusMap route={route.data} live={data} follow={follow} onUserPan={() => setFollow(false)} /> : <Skeleton height={mapHeight} />}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <Card>
            <View style={styles.row}>
              <Text variant="heading" style={styles.flex}>
                {headline.title}
              </Text>
              <Pill label={data.signal === 'live' ? t('bus.signalLive') : t('bus.signalWeak', { ago: agoText(data.last_update_seconds, t) })} tone={data.signal === 'live' ? 'success' : 'warning'} />
            </View>
            <Text variant="caption" style={styles.gap}>
              {data.route.name} · {data.vehicle?.registration_no} · {t('bus.crew', { driver: data.crew.driver ?? '—', attendant: data.crew.attendant ?? '—' })}
            </Text>
            {data.position?.speed_kmh !== null && data.position?.speed_kmh !== undefined ? (
              <Text variant="bodyStrong" style={styles.gap}>
                {Math.round(data.position.speed_kmh)} km/h
              </Text>
            ) : null}
          </Card>
          {data.staff?.off_route ? <Banner tone="danger" icon="git-branch-outline" message="The bus has left its route." /> : null}
          {data.delay_minutes && data.delay_minutes >= 5 ? <Banner tone="warning" icon="time-outline" message={t('bus.delay', { minutes: data.delay_minutes })} /> : null}
          <Card>
            <StopTimeline live={data} />
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingVertical: spacing.md, paddingBottom: spacing.xxl },
  inner: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: spacing.md, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gap: { marginTop: spacing.xs },
});
