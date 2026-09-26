import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { formatClock } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, ErrorState, Pill, Sheet, Skeleton, Text } from '@/ui';

import { useManagedRoutes } from './api';

const T = 'console.operations.transport.routesSheet';

/** "Manage routes": every route with its bus, crew, riders and stops. Read-only here; the transport desk edits routes. */
export function RoutesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const q = useManagedRoutes(visible);
  const routes = q.data?.routes ?? [];
  const riders = routes.reduce((n, r) => n + r.riders, 0);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t(`${T}.title`)}
      message={q.data ? t(`${T}.message`, { routes: routes.length, riders }) : undefined}>
      {q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : null}
      {!q.data && !q.error ? <Skeleton height={240} style={{ borderRadius: 14 }} /> : null}
      {q.data ? (
        <ScrollView style={styles.scroll} contentContainerStyle={{ gap: 10 }}>
          {routes.map((r) => (
            <View key={r.id} style={[styles.route, { borderColor: colors.line, backgroundColor: colors.surface }]}>
              <View style={styles.row}>
                <Text variant="sm" weight={700} style={{ flex: 1 }}>
                  {r.name}
                  {r.vehicle ? ` · ${r.vehicle.label} · ${r.vehicle.registration_no}` : ''}
                </Text>
                <Pill label={t(`${T}.riders`, { count: r.riders })} tone="brand" dot={false} />
              </View>
              <Text variant="xs" color="muted">
                {r.driver || r.attendant ? t(`${T}.crew`, { driver: r.driver ?? '—', attendant: r.attendant ?? '—' }) : t(`${T}.noCrew`)} ·{' '}
                {t(`${T}.km`, { km: r.length_km })} ·{' '}
                {t(`${T}.times`, { pickup: formatClock(r.pickup_start), drop: formatClock(r.drop_start) })}
              </Text>
              <View style={styles.stops}>
                {r.stops.map((s, i) => (
                  <Text key={s.id} variant="xs" color={s.is_school ? 'ink' : 'ink2'} weight={s.is_school ? 700 : 500}>
                    {i > 0 ? '→ ' : ''}
                    {s.name}
                    {s.riders ? ` (${s.riders})` : ''}
                  </Text>
                ))}
              </View>
            </View>
          ))}
          {q.data.spare_vehicles.length ? (
            <View style={[styles.route, { borderColor: colors.line, backgroundColor: colors.subtle }]}>
              <Text variant="eyebrow">{t(`${T}.spare`)}</Text>
              <Text variant="sm" color="ink2">
                {q.data.spare_vehicles.map((v) => `${v.label} · ${v.registration_no}`).join(', ')}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
      <View style={styles.foot}>
        <Text variant="xs" color="muted" style={{ flex: 1 }}>
          {t(`${T}.readOnly`)}
        </Text>
        <Button title={t(`${T}.close`)} variant="secondary" onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 520 },
  route: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stops: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 6, rowGap: 2 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
