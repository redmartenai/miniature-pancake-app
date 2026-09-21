import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { AttendanceDay } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { monthLabel, parseDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, toneColors, type Tone } from '@/theme/tokens';
import { Card, ErrorState, Icon, LoadingCards, Screen, StatTile, Text } from '@/ui';

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const TONE: Record<string, Tone> = { present: 'success', absent: 'danger', late: 'warning', half_day: 'warning', excused: 'info' };

export default function AttendanceScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const family = useFamily();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(thisMonth);
  const studentId = family.selected?.id;
  const query = useQuery({
    queryKey: ['attendance', studentId, month],
    queryFn: () => api.attendance(studentId as string, month),
    enabled: !!studentId,
  });

  const days = query.data?.days ?? [];
  const leading = days.length ? (parseDate(days[0].date).getDay() + 6) % 7 : 0;
  const cells: (AttendanceDay | null)[] = [...Array.from({ length: leading }, () => null), ...days];
  const summary = query.data?.summary;

  return (
    <Screen edges={[]} onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Stack.Screen options={{ title: `${t('attendance.title')} · ${family.selected?.first_name ?? ''}` }} />
      <View style={styles.monthRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonth((m) => shiftMonth(m, -1))} hitSlop={12} style={styles.arrow}>
          <Icon name="chevron-back" size={22} color="primary" />
        </Pressable>
        <Text variant="heading" accessibilityRole="header">
          {monthLabel(month)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          disabled={month >= thisMonth}
          onPress={() => setMonth((m) => shiftMonth(m, 1))}
          hitSlop={12}
          style={[styles.arrow, month >= thisMonth && { opacity: 0.3 }]}>
          <Icon name="chevron-forward" size={22} color="primary" />
        </Pressable>
      </View>

      {query.isLoading ? (
        <LoadingCards count={2} />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <View style={styles.stats}>
            <StatTile label={t('attendance.percent')} value={summary?.percent !== null && summary ? `${summary.percent}%` : '—'} tone="primary" icon="stats-chart-outline" />
            <StatTile label={t('attendance.schoolDays')} value={String(summary?.school_days ?? 0)} icon="calendar-outline" />
          </View>
          <View style={styles.stats}>
            <StatTile label={t('attendance.absent')} value={String(summary?.absent ?? 0)} tone="danger" icon="close-circle-outline" />
            <StatTile label={t('attendance.late')} value={String(summary?.late ?? 0)} tone="warning" icon="alarm-outline" />
          </View>
          <Card>
            <View style={styles.grid}>
              {WEEK.map((d, i) => (
                <View key={`h${i}`} style={styles.cell}>
                  <Text variant="caption" align="center">
                    {d}
                  </Text>
                </View>
              ))}
              {cells.map((day, index) => {
                if (!day) return <View key={`b${index}`} style={styles.cell} />;
                const tone = TONE[day.status];
                const { fg, bg } = tone ? toneColors(colors, tone) : { fg: colors.textMuted, bg: 'transparent' };
                const label = t(`attendance.${day.status}`);
                return (
                  <View key={day.date} style={styles.cell} accessible accessibilityLabel={`${parseDate(day.date).getDate()} ${monthLabel(month)}${label ? `, ${label}` : ''}`}>
                    <View style={[styles.day, { backgroundColor: bg }, day.status === 'upcoming' && { opacity: 0.35 }]}>
                      <Text variant="label" rawColor={tone ? fg : colors.text}>
                        {parseDate(day.date).getDate()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={styles.legend}>
              {(['present', 'absent', 'late', 'excused'] as const).map((status) => {
                const { fg, bg } = toneColors(colors, TONE[status]);
                return (
                  <View key={status} style={styles.legendItem}>
                    <View style={[styles.swatch, { backgroundColor: bg, borderColor: fg }]} />
                    <Text variant="caption">{t(`attendance.${status}`)}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  day: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 4, borderWidth: 1 },
});
