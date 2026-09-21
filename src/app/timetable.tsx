import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import { useFamily } from '@/features/family/useFamily';
import { formatClock } from '@/lib/format';
import { spacing } from '@/theme/tokens';
import { Card, EmptyState, ErrorState, LoadingCards, Screen, SegmentedControl, Text } from '@/ui';

export default function TimetableScreen() {
  const { t } = useTranslation();
  const family = useFamily();
  const studentId = family.selected?.id;
  const query = useQuery({ queryKey: ['timetable', studentId], queryFn: () => api.timetable(studentId as string), enabled: !!studentId });
  const [day, setDay] = useState<number>();
  const today = query.data?.today ?? 0;
  const selected = day ?? (today > 5 ? 0 : today);
  const periods = query.data?.days.find((d) => d.weekday === selected)?.periods ?? [];

  return (
    <Screen edges={[]} onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Stack.Screen options={{ title: `${t('timetable.title')} · ${query.data?.class ?? ''}` }} />
      {query.isLoading ? (
        <LoadingCards />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <SegmentedControl
            value={selected}
            onChange={setDay}
            options={(query.data?.days ?? []).map((d) => ({ value: d.weekday, label: d.name.slice(0, 3), accessibilityLabel: d.name }))}
          />
          {periods.length === 0 ? (
            <EmptyState icon="cafe-outline" title={t('timetable.none')} />
          ) : (
            <Card padded={false}>
              {periods.map((period, index) => (
                <View key={period.period} style={[styles.row, index > 0 && styles.divider]} accessible accessibilityLabel={`${formatClock(period.starts_at)}, ${period.subject}, ${period.teacher ?? ''}, ${period.room}`}>
                  <View style={styles.time}>
                    <Text variant="label">{formatClock(period.starts_at)}</Text>
                    <Text variant="caption">{formatClock(period.ends_at)}</Text>
                  </View>
                  <View style={[styles.bar, { backgroundColor: period.color }]} />
                  <View style={styles.flex}>
                    <Text variant="subheading">{period.subject}</Text>
                    <Text variant="caption">
                      {[period.teacher, period.room].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: 'rgba(128,128,128,0.15)' },
  time: { width: 72 },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  flex: { flex: 1 },
});
