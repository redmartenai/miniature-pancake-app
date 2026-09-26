import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Linking, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/api/endpoints';
import type { StudentTransport, TransportTrip, TripLive, TripStop } from '@/api/types';
import { useRefetchOnFocus } from '@/features/common/useRefetchOnFocus';
import { useFamily } from '@/features/family/useFamily';
import { BusMap } from '@/features/tracking/BusMap';
import { useRouteShape, useTripLive } from '@/features/tracking/useTripLive';
import { clockShort, formatClock, formatTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import {
  AppBar,
  Button,
  Card,
  DOCK_CLEARANCE,
  EmptyState,
  ErrorState,
  Icon,
  ICON_SIZE,
  IconButton,
  Kicker,
  ListRow,
  LoadingCards,
  Pill,
  Screen,
  SegmentedControl,
  Skeleton,
  Stamp,
  Switch,
  TearV,
  Text,
  ThemeToggle,
  Ticket,
  useToast,
} from '@/ui';

type Enrolled = Extract<StudentTransport, { enrolled: true }>;

function defaultTrip(trips: TransportTrip[]): TransportTrip | undefined {
  return trips.find((trip) => trip.status === 'active') ?? trips.find((trip) => trip.status === 'scheduled') ?? trips[trips.length - 1];
}

/** ParentBus: the live map, the bus pass, an approach alert, stops with live times, and who's on board. */
export default function ParentBus() {
  const { t } = useTranslation();
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

  if (family.isLoading || transport.isLoading || transport.error || !transport.data?.enrolled) {
    return (
      <Screen dock header={<AppBar back title={t('tabs.bus')} />}>
        {transport.error ? <ErrorState error={transport.error} onRetry={transport.refetch} /> : null}
        {family.isLoading || transport.isLoading ? <LoadingCards count={3} /> : null}
        {transport.data && !transport.data.enrolled ? (
          <EmptyState icon="bus" title={t('parent.bus.noBus', { name: family.selected?.first_name ?? '' })} />
        ) : null}
      </Screen>
    );
  }
  return <BusTracker key={studentId} transport={transport.data} studentId={studentId as string} onRefresh={transport.refetch} />;
}

function BusTracker({ transport, studentId, onRefresh }: { transport: Enrolled; studentId: string; onRefresh: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const family = useFamily();
  const client = useQueryClient();
  const toast = useToast();
  const [direction, setDirection] = useState<'pickup' | 'drop'>(defaultTrip(transport.today)?.direction ?? 'pickup');
  const [follow, setFollow] = useState(true);

  const trip = transport.today.find((item) => item.direction === direction);
  const live = useTripLive(trip?.trip_id);
  const route = useRouteShape(transport.route.id, direction);
  const myStop = direction === 'pickup' ? transport.pickup_stop : transport.drop_stop;
  const child = family.selected;

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['transport', studentId] });
    void client.invalidateQueries({ queryKey: ['summary', studentId] });
  };
  const alert = useMutation({
    mutationFn: (minutes: number) => api.setAlertMinutes(studentId, minutes),
    onSuccess: refresh,
    onError: () => toast(t('common.somethingWrong'), 'danger'),
  });
  const absence = useMutation({
    mutationFn: (absent: boolean) => (absent ? api.markNotTravelling(studentId, direction) : api.undoNotTravelling(studentId, direction)),
    onSuccess: refresh,
    onError: () => toast(t('common.somethingWrong'), 'danger'),
  });

  const data = live.data;
  const stops = data?.stops ?? [];
  const mineLive = stops.find((s) => s.id === myStop.id);
  const delay = Math.max(0, data?.delay_minutes ?? 0);
  const etaAt = mineLive?.eta_seconds != null ? new Date(Date.now() + mineLive.eta_seconds * 1000) : null;
  const scheduledAt = mineLive?.scheduled_time ?? myStop.time;
  const leaveAt = trip ? addMinutes(trip.scheduled_start, delay) : null;
  const myIndex = stops.findIndex((s) => s.id === myStop.id);
  const bus = transport.vehicle?.label ?? transport.route.name;
  const alertOn = transport.alert_minutes > 0;
  const alertMinutes = alertOn ? transport.alert_minutes : 10;
  const alertTime = etaAt ? formatTime(new Date(etaAt.getTime() - alertMinutes * 60_000)) : null;
  const mapHeight = Platform.OS === 'web' ? 380 : Math.round(height * 0.44);

  const status = data?.status === 'active'
    ? t('parent.bus.live', { time: formatTime(data.generated_at) })
    : data?.status === 'completed' && data.ended_at
      ? t('parent.bus.finished', { time: formatTime(data.ended_at) })
      : trip
        ? t('parent.bus.notStarted', { time: formatClock(trip.scheduled_start) })
        : t('parent.bus.noTrip');

  const pickup = transport.today.find((x) => x.direction === 'pickup');

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: DOCK_CLEARANCE }} showsVerticalScrollIndicator={false}>
        <View style={{ height: mapHeight }}>
          {route.data ? (
            <BusMap route={route.data} live={data} myStopId={myStop.id} follow={follow} onUserPan={() => setFollow(false)} />
          ) : (
            <Skeleton height={mapHeight} style={{ borderRadius: 0 }} />
          )}
          <View style={[styles.mapBar, { paddingTop: insets.top + 14 }]}>
            <IconButton icon="arrowLeft" size="lg" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.navigate('/parent'))} />
            <View style={{ flex: 1 }} />
            <ThemeToggle />
            <IconButton
              icon="refresh"
              size="lg"
              label={t('parent.bus.refresh')}
              onPress={() => {
                setFollow(true);
                onRefresh();
                void live.refetch?.();
              }}
            />
          </View>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.canvas, boxShadow: `0 -1px 0 ${colors.line}` }]}>
          <View style={[styles.grabber, { backgroundColor: colors.lineStrong }]} />
          <View style={[styles.between, { alignItems: 'flex-end', gap: 12 }]}>
            <View style={{ flexShrink: 1 }}>
              <Text variant="h2" accessibilityRole="header">
                {t('parent.bus.title', { bus, run: direction === 'drop' ? t('parent.home.dropRun') : t('parent.home.pickupRun') })}
              </Text>
              <Text variant="xs" color="muted" num>
                {t('parent.bus.meta', { route: transport.route.name, plate: transport.vehicle?.registration_no ?? '', count: route.data?.stops.length ?? stops.length })}
              </Text>
            </View>
            <View style={[styles.row, { gap: 6, paddingBottom: 2 }]}>
              {data?.status === 'active' ? <View style={[styles.liveDot, { backgroundColor: colors.ok, boxShadow: `0 0 0 3px ${colors.okSoft}` }]} /> : null}
              <Text variant="xs" color="muted" weight={600}>
                {status}
              </Text>
            </View>
          </View>

          {transport.today.length > 1 ? (
            <SegmentedControl
              value={direction}
              onChange={(v) => {
                setDirection(v);
                setFollow(true);
              }}
              options={[
                { value: 'pickup', label: t('parent.bus.pickup') },
                { value: 'drop', label: t('parent.bus.drop') },
              ]}
            />
          ) : null}

          {/* The bus pass */}
          <Ticket
            color="sky"
            style={{ flexDirection: 'row', alignItems: 'stretch' }}>
            <View
              style={{ flex: 1, minWidth: 0, paddingTop: 16, paddingBottom: 16, paddingLeft: 18, paddingRight: 12, gap: 6 }}
              accessible
              accessibilityLabel={t('parent.bus.passLabel', {
                stop: myStop.name,
                time: etaAt ? formatTime(etaAt) : formatClock(scheduledAt),
                late: delay ? t('parent.home.minLate', { count: delay }) : '',
              })}>
              <Text variant="xs" weight={700} rawColor={colors.pBlueInk}>
                {t('parent.bus.passFor', { name: child?.name ?? '' })}
              </Text>
              <Text variant="xs" color="ink2" weight={600}>
                {direction === 'drop' ? t('parent.bus.homeAt', { stop: myStop.name }) : t('parent.bus.pickupAt', { stop: myStop.name })}
              </Text>
              <View style={[styles.row, { alignItems: 'baseline', gap: 6, marginTop: 2 }]}>
                <Text variant="kpi" style={{ fontSize: 40, lineHeight: 42 }}>
                  {etaAt ? clockShort(`${etaAt.getHours()}:${etaAt.getMinutes()}`) : clockShort(scheduledAt)}
                </Text>
                <Text variant="sm" weight={700}>
                  {(etaAt ? etaAt.getHours() : Number(scheduledAt.split(':')[0])) >= 12 ? 'PM' : 'AM'}
                </Text>
              </View>
              <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
                {delay ? <Pill label={t('parent.home.minLate', { count: delay })} tone="warn" /> : <Pill label={t('parent.home.onTime')} tone="ok" />}
                {delay ? (
                  <Text variant="xs" color="muted">
                    {t('parent.bus.was')} <Text variant="xs" color="muted" style={{ textDecorationLine: 'line-through' }}>{formatClock(scheduledAt)}</Text>
                  </Text>
                ) : null}
              </View>
            </View>
            <TearV />
            <View style={{ width: 96, paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Text variant="xxs" color="muted" weight={700} style={{ letterSpacing: 1.3, textTransform: 'uppercase' }}>
                {t('parent.bus.leaves')}
              </Text>
              <Text variant="kpiSm" num style={{ fontSize: 24 }}>
                {leaveAt ? clockShort(leaveAt) : '—'}
              </Text>
              {delay && trip ? (
                <Text variant="xxs" color="muted" weight={600}>
                  {t('parent.bus.was')} <Text variant="xxs" color="muted" style={{ textDecorationLine: 'line-through' }}>{clockShort(trip.scheduled_start)}</Text>
                </Text>
              ) : null}
              {myIndex >= 0 ? (
                <Text variant="xxs" weight={700} rawColor={colors.pBlueInk} style={{ marginTop: 6 }}>
                  {t('parent.bus.stopOf', { index: myIndex + 1, count: stops.length })}
                </Text>
              ) : null}
            </View>
          </Ticket>

          {/* Approach alert */}
          <View style={{ gap: 8 }}>
            {alertOn ? (
              <Button
                title={alertTime ? t('parent.bus.alertOn', { time: alertTime }) : t('parent.bus.alertOnNoTime', { minutes: alertMinutes })}
                icon="bell"
                variant="secondary"
                size="lg"
                fullWidth
                loading={alert.isPending}
                onPress={() => alert.mutate(0)}
                accessibilityHint={t('parent.bus.alertOnHint')}
              />
            ) : (
              <Button title={t('parent.bus.alertOff', { minutes: 10 })} icon="bell" size="lg" fullWidth loading={alert.isPending} onPress={() => alert.mutate(10)} />
            )}
            <Text variant="xs" color="muted" align="center">
              {alertOn ? t('parent.bus.alertOnHint') : alertTime ? t('parent.bus.alertOffHint', { time: formatTime(new Date(etaAt!.getTime() - 10 * 60_000)) }) : ''}
            </Text>
          </View>

          {stops.length ? <StopsLine live={data!} myStopId={myStop.id} bus={bus} childName={child?.first_name ?? ''} direction={direction} /> : null}

          {/* Crew */}
          <View style={{ gap: 10 }}>
            <Kicker>{t('parent.bus.onBoard')}</Kicker>
            <Card variant="flat" pad={0} style={{ flexDirection: 'row' }}>
              {[
                { name: transport.crew.driver_name ?? transport.crew.driver, role: t('parent.bus.driver') },
                { name: transport.crew.attendant_name ?? transport.crew.attendant, role: t('parent.bus.attendant') },
              ]
                .filter((c) => c.name)
                .map((c, i) => (
                  <View key={c.role} style={[styles.row, { flex: 1, gap: 8, padding: 14, paddingRight: 10 }, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.line }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="sm" weight={700} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text variant="xs" color="muted">
                        {c.role}
                      </Text>
                    </View>
                    {transport.call_number ? (
                      <IconButton
                        icon="call"
                        size="lg"
                        variant="brand"
                        style={{ backgroundColor: colors.brandSoft }}
                        iconColor={colors.brandInk}
                        label={t('parent.bus.call', { name: c.name })}
                        onPress={() => void Linking.openURL(`tel:${transport.call_number}`)}
                      />
                    ) : null}
                  </View>
                ))}
            </Card>
            <View style={[styles.row, { gap: 6 }]}>
              <Icon name="shield" size={ICON_SIZE.xs} rawColor={colors.muted} />
              <Text variant="xs" color="muted" style={{ flex: 1 }}>
                {t('parent.bus.private')}
              </Text>
            </View>
          </View>

          {pickup?.status === 'completed' && direction === 'drop' ? (
            <View style={[styles.row, { gap: 14, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line }]}>
              <Stamp tone={pickup.dropped_at && isLate(pickup) ? 'warn' : 'ok'} rotate={-4}>
                {pickup.dropped_at && isLate(pickup) ? t('parent.bus.morningLate') : t('parent.bus.morningOnTime')}
              </Stamp>
              <Text variant="xs" color="ink2" style={{ flex: 1 }}>
                <Trans
                  i18nKey={pickup.boarded_at ? 'parent.bus.morning' : 'parent.bus.morningReached'}
                  values={{
                    boarded: pickup.boarded_at ? formatTime(pickup.boarded_at) : '',
                    reached: formatTime(pickup.dropped_at ?? pickup.ended_at ?? ''),
                  }}
                  components={{ b: <Text variant="xs" weight={700} color="ink" /> }}
                />
              </Text>
            </View>
          ) : null}

          {trip && trip.status !== 'completed' ? (
            <ListRow
              inset={0}
              last
              title={t('parent.bus.notTravelling')}
              subtitle={t('parent.bus.notTravellingHint')}
              right={<Switch value={trip.absent} onChange={(v) => absence.mutate(v)} label={t('parent.bus.notTravelling')} />}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function isLate(trip: TransportTrip): boolean {
  if (!trip.started_at) return false;
  const [h, m] = trip.scheduled_start.split(':').map(Number);
  const started = new Date(trip.started_at);
  return started.getHours() * 60 + started.getMinutes() - (h * 60 + m) > 5;
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(s));
}

/** Stops as a transit line: the bus, the stops still to come up to yours, then how many follow. */
function StopsLine({ live, myStopId, bus, childName, direction }: { live: TripLive; myStopId: string; bus: string; childName: string; direction: 'pickup' | 'drop' }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const stops = live.stops;
  const mine = stops.findIndex((s) => s.id === myStopId);
  const firstOpen = Math.max(0, stops.findIndex((s) => s.status !== 'departed' && s.status !== 'skipped'));
  const from = direction === 'drop' ? Math.min(firstOpen, mine) : Math.max(0, Math.min(firstOpen, mine) - 1);
  const shown = stops.slice(from, mine + 1);
  const after = stops.length - mine - 1;
  const busRow = live.status === 'active' && live.position && shown[0];
  const km = busRow ? haversineKm(live.position!, shown[0]) : 0;

  const time = (s: TripStop) =>
    s.arrived_at ? formatTime(s.arrived_at) : s.eta_seconds != null ? formatTime(new Date(Date.now() + s.eta_seconds * 1000)) : formatClock(s.scheduled_time);

  return (
    <View style={{ gap: 4 }}>
      <Kicker style={{ marginBottom: 6 }}>{t('parent.bus.stopsKicker')}</Kicker>
      {busRow ? (
        <LineRow kind="bus" busTone={live.delay_minutes && live.delay_minutes > 0 ? 'warn' : 'brand'}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700}>
              {direction === 'drop' && firstOpen === 0 ? t('parent.bus.onItsWayIn', { bus }) : t('parent.bus.onItsWay', { bus })}
            </Text>
            <Text variant="xs" color="muted">
              {t('parent.bus.kmFrom', { km: km.toFixed(1), place: shown[0].name })}
            </Text>
          </View>
          <Text variant="xs" weight={700} color={live.delay_minutes && live.delay_minutes > 0 ? 'warn' : 'brandInk'}>
            {t('parent.bus.now')}
          </Text>
        </LineRow>
      ) : null}
      {shown.map((s, i) => {
        const isMine = s.id === myStopId;
        const index = from + i;
        return (
          <LineRow key={s.id} kind={isMine ? 'home' : s.status === 'departed' ? 'past' : 'stop'} first={!busRow && i === 0} last={isMine} tall={isMine}>
            <View style={{ flex: 1, minWidth: 0, gap: isMine ? 4 : 0 }}>
              <Text variant="sm" weight={isMine ? 800 : 700}>
                {s.name}
              </Text>
              {isMine ? (
                <View style={[styles.row, { gap: 8 }]}>
                  <Pill label={t('parent.bus.childStop', { name: childName })} tone="pink" dot={false} />
                  <Text variant="xs" color="muted">
                    {t('parent.bus.sched', { time: formatClock(s.scheduled_time) })}
                  </Text>
                </View>
              ) : (
                <Text variant="xs" color="muted">
                  {index === 0 && direction === 'drop'
                    ? t('parent.bus.departs', { time: formatClock(s.scheduled_time) })
                    : t('parent.bus.stopN', { index: direction === 'drop' ? index : index + 1, time: formatClock(s.scheduled_time) })}
                </Text>
              )}
            </View>
            <Text variant={isMine ? 'h3' : 'sm'} weight={700} num>
              {time(s)}
            </Text>
          </LineRow>
        );
      })}
      {after > 0 ? (
        <LineRow kind="tail" last>
          <Text variant="xs" color="muted">
            {t('parent.bus.moreAfter', { count: after, name: childName })}
          </Text>
        </LineRow>
      ) : null}
    </View>
  );
}

/** One row of the transit line: a marker on the left rail, content with a hairline below. */
function LineRow({
  kind,
  children,
  first,
  last,
  tall,
  busTone = 'brand',
}: {
  kind: 'bus' | 'stop' | 'past' | 'home' | 'tail';
  children: ReactNode;
  first?: boolean;
  last?: boolean;
  tall?: boolean;
  busTone?: 'brand' | 'warn';
}) {
  const { colors } = useTheme();
  const dashed = (color: string) => ({
    width: 4,
    backgroundColor: 'transparent',
    borderLeftWidth: 4,
    borderStyle: 'dashed' as const,
    borderColor: color,
  });
  const markerTop = kind === 'bus' ? 16 : kind === 'home' ? 26 : 23;
  return (
    <View style={[styles.row, { gap: 12, minHeight: kind === 'tail' ? 40 : tall ? 72 : 60, alignItems: 'stretch' }]}>
      <View style={{ width: 30, alignItems: 'center' }}>
        {/* rail above the marker */}
        {kind !== 'bus' && !first ? (
          <View style={[{ position: 'absolute', top: 0, height: kind === 'tail' ? 18 : markerTop + 6, left: 13 }, kind === 'tail' ? dashed(colors.lineStrong) : { width: 4, backgroundColor: colors.brand }]} />
        ) : null}
        {/* rail below the marker */}
        {kind !== 'tail' && !last ? (
          <View style={[{ position: 'absolute', top: markerTop + 6, bottom: 0, left: 13 }, kind === 'bus' ? dashed(colors.brandLine) : { width: 4, backgroundColor: colors.brand }]} />
        ) : null}
        {kind === 'home' ? (
          <View style={{ position: 'absolute', top: markerTop + 18, bottom: 0, left: 13, ...dashed(colors.lineStrong) }} />
        ) : null}
        {kind === 'bus' ? (
          <View
            style={{
              marginTop: markerTop,
              width: 28,
              height: 28,
              borderRadius: 9,
              backgroundColor: busTone === 'warn' ? colors.warn : colors.brand,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 0 4px ${busTone === 'warn' ? colors.warnSoft : colors.brandSoft}`,
            }}>
            <Icon name="bus" size={ICON_SIZE.sm} rawColor={colors.surface} />
          </View>
        ) : kind === 'home' ? (
          <View style={{ marginTop: markerTop, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface, boxShadow: `inset 0 0 0 5px ${colors.pPinkInk}, 0 0 0 4px ${colors.pPink}` }} />
        ) : kind === 'tail' ? null : (
          <View
            style={{
              marginTop: markerTop,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: kind === 'past' ? colors.brand : colors.surface,
              boxShadow: `inset 0 0 0 3px ${colors.brand}`,
            }}
          />
        )}
      </View>
      <View style={[styles.row, { flex: 1, minWidth: 0, gap: 12, paddingVertical: tall ? 12 : 10, justifyContent: 'space-between' }, kind !== 'tail' && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  panel: { marginTop: -28, paddingHorizontal: 20, gap: 18, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  grabber: { width: 40, height: 5, borderRadius: 999, alignSelf: 'center', marginTop: 10, marginBottom: -8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
});

