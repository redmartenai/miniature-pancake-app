import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BarChart } from '@/features/charts/BarChart';
import { LineChart } from '@/features/charts/LineChart';
import { monthName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Pill, Text } from '@/ui';

import { CardHead, LegendItem } from '../../Page';
import type { ReportsData } from '../api';

/** "₹1.86 Cr", "₹31.2 L", "₹60 L" (Indian lakh/crore). */
export function lakhs(v: number, digits = 2): string {
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(digits).replace(/\.?0+$/, '')} Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(v >= 1e6 ? 0 : 1).replace(/\.0$/, '')} L`;
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
}

function niceStep(max: number, steps = 4): number {
  const raw = max / steps;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 3 ? 3 : n <= 5 ? 5 : 10) * mag;
}

export function AttendanceTrend({ data }: { data: ReportsData['charts']['attendance'] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const months = data.months;
  const values = months.flatMap((m) => [m.students, m.staff]).filter((v): v is number => v != null);
  const low = values.length ? Math.min(...values) : 90;
  const yMin = Math.max(0, Math.min(90, Math.floor((low - 1) / 5) * 5));
  const ticks = [yMin, (yMin + 100) / 2, 100];
  const labels = months.map((m) =>
    m.to_date ? t('console.engage.rep.toDate', { month: monthName(m.month, true) }) : monthName(m.month, true),
  );
  const last = <T,>(arr: (T | null)[]) => [...arr].reverse().find((v) => v != null) ?? null;
  const students = last(months.map((m) => m.students));
  const staff = last(months.map((m) => m.staff));
  return (
    <View style={styles.chartCard}>
      <CardHead
        title={t('console.engage.rep.attendanceTrend')}
        subtitle={t('console.engage.rep.attendanceSub')}
        right={
          <View style={styles.legend}>
            <LegendItem color={colors.c1} label={t('console.engage.rep.students')} />
            <LegendItem color={colors.c2} label={t('console.engage.rep.staff')} />
          </View>
        }
      />
      <LineChart
        labels={labels}
        height={220}
        yMin={yMin}
        yMax={100}
        ticks={ticks}
        formatY={(v) => `${v}%`}
        endWidth={80}
        series={[
          {
            key: 'staff',
            color: colors.c2,
            points: months.map((m) => m.staff),
            endLabel: t('console.engage.rep.staff'),
            endSub: staff != null ? `${staff}%` : undefined,
          },
          {
            key: 'students',
            color: colors.c1,
            points: months.map((m) => m.students),
            endLabel: t('console.engage.rep.students'),
            endSub: students != null ? `${students}%` : undefined,
          },
        ]}
        accessibilityLabel={t('console.engage.rep.attendanceA11y', { students: students ?? '—', staff: staff ?? '—' })}
      />
      <Text variant="xs" color="muted" style={{ marginTop: 'auto' }}>
        {yMin > 0 ? t('console.engage.rep.axisNote', { min: yMin }) : t('console.engage.rep.axisZero')}
      </Text>
    </View>
  );
}

export function UnitTests({ data }: { data: ReportsData['charts']['unit_tests'] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const ut2 = data.grades.map((g) => g.ut2).filter((v): v is number => v != null);
  const hi = ut2.length ? Math.max(...ut2) : null;
  const lo = ut2.length ? Math.min(...ut2) : null;
  const w = data.worst;
  return (
    <View style={styles.chartCard}>
      <CardHead
        title={t('console.engage.rep.utTitle')}
        subtitle={t('console.engage.rep.utSub', { from: data.school.ut1 ?? '—', to: data.school.ut2 ?? '—' })}
        right={
          <View style={styles.legend}>
            <LegendItem color={colors.c1} label={t('console.engage.rep.ut1')} />
            <LegendItem color={colors.c2} label={t('console.engage.rep.ut2')} />
          </View>
        }
      />
      <BarChart
        height={240}
        yMax={100}
        ticks={[0, 25, 50, 75, 100]}
        axisWidth={30}
        barWidth={11}
        groupGap={3}
        xTitle={t('console.engage.rep.grade')}
        series={[
          { key: 'ut1', color: colors.c1, label: t('console.engage.rep.ut1') },
          { key: 'ut2', color: colors.c2, label: t('console.engage.rep.ut2') },
        ]}
        data={data.grades.map((g) => ({
          label: g.grade,
          values: [g.ut1, g.ut2],
          top: g.ut2 != null && (g.ut2 === hi || g.ut2 === lo) ? String(Math.round(g.ut2)) : undefined,
        }))}
        accessibilityLabel={t('console.engage.rep.utA11y', {
          from: data.school.ut1 ?? '—',
          to: data.school.ut2 ?? '—',
          improved: data.improved,
          total: data.compared,
        })}
      />
      <View style={[styles.foot, { marginTop: 'auto' }]}>
        <Text variant="xs" color="muted">
          {t('console.engage.rep.improved', { n: data.improved, total: data.compared })}
        </Text>
        {w ? (
          <Pill
            tone="bad"
            label={
              w.subject && w.subject_drop != null
                ? t('console.engage.rep.worstSubject', {
                    grade: w.grade,
                    pts: Math.round(-w.drop),
                    subject: w.subject,
                    spts: Math.round(-w.subject_drop),
                  })
                : t('console.engage.rep.worst', { grade: w.grade, pts: Math.round(-w.drop) })
            }
          />
        ) : (
          <Pill tone="ok" label={t('console.engage.rep.allImproved')} />
        )}
      </View>
    </View>
  );
}

export function FeeCollection({ data, term }: { data: ReportsData['charts']['fees']; term: string | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const top = Math.max(data.target, data.collected, 1) * 1.08;
  const step = niceStep(top);
  const yMax = Math.ceil(top / step) * step;
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
  const first = data.months[0]?.month;
  const last = data.months[data.months.length - 1]?.month;
  return (
    <View style={styles.chartCard}>
      <CardHead
        title={t('console.engage.rep.feeTitle')}
        subtitle={first && last ? t('console.engage.rep.feeSub', { from: monthName(first), to: monthName(last), term: term ?? '' }) : ''}
        right={
          <View style={styles.legend}>
            <LegendItem color={colors.c1} label={t('console.engage.rep.collected')} />
            <LegendItem color={colors.ink2} label={t('console.engage.rep.target')} dashed />
          </View>
        }
      />
      <LineChart
        labels={data.months.map((m) => monthName(m.month, true))}
        height={220}
        yMin={0}
        yMax={yMax}
        ticks={ticks}
        axisWidth={40}
        endWidth={100}
        formatY={(v) => (v === 0 ? '0' : lakhs(v, 1))}
        target={{
          value: data.target,
          label: t('console.engage.rep.targetLabel', { amount: lakhs(data.target), pct: data.target_percent }),
        }}
        series={[
          {
            key: 'collected',
            color: colors.c1,
            area: true,
            dots: false,
            points: data.months.map((m) => m.collected),
            endLabel: lakhs(data.collected),
            endSub: data.gap > 0 ? t('console.engage.rep.toTarget', { amount: lakhs(data.gap, 1) }) : t('console.engage.rep.targetMet'),
          },
        ]}
        accessibilityLabel={t('console.engage.rep.feeA11y', { collected: lakhs(data.collected), target: lakhs(data.target) })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: { flex: 1, gap: 14 },
  legend: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
