import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { BusSummary } from '@/api/types';
import { afterMyStopLine } from '@/features/tracking/status';
import { useTripLive } from '@/features/tracking/useTripLive';
import { formatClock, formatEta } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { Card, Dot, Icon, Pill, Text } from '@/ui';

/**
 * The home screen's bus card: what a parent checks every morning. It subscribes to the
 * same live feed as the Bus tab, so it updates the moment the bus moves.
 */
export function BusCard({ bus }: { bus: BusSummary }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const watchId = bus.enrolled && bus.status !== 'done' ? bus.trip_id : null;
  const live = useTripLive(watchId);

  if (!bus.enrolled) return null;

  const data = live.data;
  const status = data ? (data.status === 'active' ? 'active' : data.status === 'scheduled' ? 'scheduled' : 'done') : bus.status;
  const direction = data?.direction ?? bus.direction;
  const myStopId = direction === 'drop' ? bus.drop_stop_id : bus.pickup_stop_id;
  const myStopName = direction === 'drop' ? bus.drop_stop : bus.pickup_stop;
  const mine = data?.stops.find((stop) => stop.id === myStopId);
  const active = status === 'active';
  const signal = data?.signal ?? bus.signal;
  const tripLabel = direction === 'drop' ? t('bus.afternoon') : t('bus.morning');

  let headline = t('bus.noTripToday');
  let detail = bus.route_name;
  if (active) {
    if (mine?.status === 'at_stop') {
      headline = t('bus.hereNow');
      detail = myStopName;
    } else if (mine?.status === 'departed' || mine?.status === 'skipped') {
      headline = t('bus.passedYourStop');
      detail = (data && afterMyStopLine(data, myStopId, t)) ?? t('bus.onTheWay');
    } else {
      headline = formatEta(mine?.eta_seconds ?? bus.eta_seconds);
      detail = t('bus.toStop', { stop: myStopName });
    }
  } else if (status === 'scheduled') {
    headline = t('bus.startsAt', { time: formatClock(data?.scheduled_start ?? bus.scheduled_start) });
    detail = `${tripLabel} · ${myStopName}`;
  }
  const foreground = active ? colors.onPrimary : colors.ink;

  return (
    <Card
      tone={active ? 'primary' : 'surface'}
      onPress={() => router.push('/family/bus')}
      accessibilityLabel={`${bus.vehicle_label ?? t('bus.title')}: ${headline}, ${detail}`}
      accessibilityHint="Opens live bus tracking">
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: active ? 'rgba(255,255,255,0.16)' : colors.primarySoft }]}>
          <Icon name="bus" size={20} rawColor={active ? colors.onPrimary : colors.primary} />
        </View>
        <Text variant="subheading" rawColor={foreground} style={styles.flex}>
          {bus.vehicle_label ?? t('bus.title')} · {tripLabel}
        </Text>
        {active ? (
          signal === 'live' ? (
            <View style={styles.live}>
              <Dot rawColor={colors.onPrimary} />
              <Text variant="label" rawColor={colors.onPrimary}>
                {t('bus.signalLive')}
              </Text>
            </View>
          ) : (
            <Pill label={t('bus.gpsWeak')} tone="warning" icon="cellular-outline" />
          )
        ) : bus.absent ? (
          <Pill label={t('bus.notTravelling')} tone="warning" />
        ) : null}
      </View>
      <Text variant="display" rawColor={foreground} style={styles.headline} numberOfLines={1} adjustsFontSizeToFit>
        {headline}
      </Text>
      <View style={styles.bottom}>
        <Text variant="body" rawColor={active ? colors.onPrimary : colors.textMuted} style={styles.flex} numberOfLines={1}>
          {detail}
        </Text>
        <Icon name="chevron-forward" size={18} rawColor={active ? colors.onPrimary : colors.textMuted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headline: { marginTop: spacing.sm, fontSize: 32, lineHeight: 38 },
  bottom: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
});
