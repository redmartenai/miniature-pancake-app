import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { CardHead } from '@/features/console/Page';
import { DataTable, type Column } from '@/features/console/Table';
import { formatDate, formatInr, monthName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, Icon, ICON_SIZE, Link, pointer, Text, TearV, Ticket } from '@/ui';

import type { FeesPayload } from './api';
import { periodName } from './util';

/* ------------------------------------------------------------------------------------------------ refunds */

export function Refunds({ refunds }: { refunds: FeesPayload['refunds'] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12 }} accessibilityLabel={t('console.operations.fees.refunds.title')}>
      <CardHead
        title={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text variant="h3" accessibilityRole="header">
              {t('console.operations.fees.refunds.title')}
            </Text>
            <Badge value={refunds.length} />
          </View>
        }
        right={
          <Link
            label={t('console.operations.fees.refunds.decide')}
            onPress={() => router.navigate('/console/approvals?kind=refund' as Href)}
          />
        }
      />
      <View style={styles.twoUp}>
        {refunds.map((r) => {
          const days = Math.max(1, Math.floor(r.sla.age_hours / 24));
          const age =
            r.sla.age_hours >= 24
              ? t('console.operations.fees.refunds.days', { count: days })
              : t('console.operations.fees.refunds.hours', { count: r.sla.age_hours });
          return (
            <Pressable
              key={r.approval_id}
              accessibilityRole="link"
              accessibilityLabel={t('console.operations.fees.refunds.open', { student: r.student })}
              onPress={() => router.navigate(`/console/approvals?id=${r.approval_id}` as Href)}
              style={[{ flex: 1, minWidth: 0 }, pointer]}>
              <Ticket style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                <View style={{ flex: 1, minWidth: 0, paddingVertical: 14, paddingHorizontal: 16, gap: 4 }}>
                  <Text variant="xs" weight={700} rawColor={colors.pButterInk}>
                    {t('console.operations.fees.refunds.kicker', { head: r.fee_head.charAt(0).toLowerCase() + r.fee_head.slice(1) })}
                  </Text>
                  <Text variant="kpiSm" style={{ fontSize: 22, lineHeight: 24 }}>
                    {formatInr(r.amount)}
                  </Text>
                  <Text variant="xs" color="ink2" numberOfLines={1}>
                    {t('console.operations.fees.refunds.who', { student: r.student, class: r.class, reason: shortReason(r.reason) })}
                  </Text>
                </View>
                <TearV />
                <View style={styles.stub}>
                  <Text variant="sm" weight={800} num color={r.sla.past ? 'bad' : 'ink'}>
                    {age}
                  </Text>
                  <Text variant="xxs" weight={700} color={r.sla.past ? 'bad' : 'muted'}>
                    {r.sla.past ? t('console.operations.fees.refunds.pastSla') : t('console.operations.fees.refunds.waiting')}
                  </Text>
                </View>
              </Ticket>
            </Pressable>
          );
        })}
        {refunds.length === 1 ? <View style={{ flex: 1 }} /> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="shield" size={ICON_SIZE.xs} rawColor={colors.muted} />
        <Text variant="xs" color="muted">
          {t('console.operations.fees.refunds.note')}
        </Text>
      </View>
    </View>
  );
}

/** The first clause of a reason, lower-cased, for the ticket line ("moved off the bus route"). */
function shortReason(reason: string) {
  const first = reason.split(/[;.]/)[0].trim();
  return first.length > 60 ? `${first.slice(0, 57)}…` : first.charAt(0).toLowerCase() + first.slice(1);
}

/* ------------------------------------------------------------------------------------------------ grade by grade */

export function GradeByGrade({ data }: { data: FeesPayload }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const g = data.grades;
  const avg = data.percent ?? 0;
  const rows = g.rows;
  const half = Math.ceil((rows.length + 1) / 2);
  const left = rows.slice(0, half);
  const right = rows.slice(half);
  const label = (key: string) =>
    key === 'pre' ? t('console.operations.fees.grades.pre') : t('console.operations.fees.grades.grade', { grade: key });
  const line = (r: FeesPayload['grades']['rows'][number], last: boolean) => {
    const under = g.under.includes(r.key);
    const pct = r.percent ?? 0;
    return (
      <View
        key={r.key}
        style={[styles.gradeRow, { borderBottomColor: colors.line, borderBottomWidth: last ? 0 : 1 }]}
        accessible
        accessibilityLabel={t('console.operations.fees.grades.label', { grade: label(r.key), percent: pct })}>
        <Text variant="sm" weight={600} style={{ width: 84 }}>
          {label(r.key)}
        </Text>
        <View style={{ flex: 1 }}>
          <View style={[styles.track, { backgroundColor: colors.pButter }]}>
            <View
              style={{
                width: `${Math.min(100, pct)}%`,
                height: '100%',
                borderRadius: 999,
                backgroundColor: under ? colors.warn : colors.pButterInk,
              }}
            />
          </View>
          <View style={[styles.tick, { left: `${avg}%`, backgroundColor: colors.ink2 }]} />
        </View>
        <Text variant="sm" weight={700} num color={under ? 'warn' : 'ink'} style={{ width: 46, textAlign: 'right' }}>
          {pct.toFixed(1)}%
        </Text>
      </View>
    );
  };
  const under = g.under;
  return (
    <Card pad={22} style={{ gap: 16 }}>
      <CardHead
        title={t('console.operations.fees.grades.title')}
        subtitle={t('console.operations.fees.grades.subtitle', { period: periodName(t, data.period), percent: avg.toFixed(1) })}
        right={
          <Text variant="xs" weight={700} color={under.length ? 'warn' : 'ok'}>
            {under.length
              ? t('console.operations.fees.grades.under', { count: under.length, threshold: g.threshold })
              : t('console.operations.fees.grades.noneUnder', { threshold: g.threshold })}
          </Text>
        }
      />
      <View style={{ flexDirection: 'row', gap: 32 }}>
        <View style={{ flex: 1 }}>{left.map((r, i) => line(r, i === left.length - 1))}</View>
        <View style={{ flex: 1 }}>
          {right.map((r) => line(r, false))}
          <View style={styles.gradeRow}>
            <Text variant="sm" weight={800} style={{ width: 84 }}>
              {t('console.operations.fees.grades.all')}
            </Text>
            <Text variant="xs" color="muted" style={{ flex: 1 }}>
              {t('console.operations.fees.grades.ofTotal', { collected: lakh(data.collected), billed: lakh(data.billed) })}
            </Text>
            <Text variant="sm" weight={800} num style={{ width: 46, textAlign: 'right' }}>
              {avg.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>
      {under.length && data.overdue.students ? (
        <Text variant="xs" color="muted">
          {t('console.operations.fees.grades.note', {
            grades: joinGrades(under.map((k) => (k === 'pre' ? t('console.operations.fees.grades.pre') : k))),
            count: g.under_overdue_students,
            total: data.overdue.students,
          })}
        </Text>
      ) : null}
    </Card>
  );
}

function lakh(v: string) {
  return `₹${(Number(v) / 1e5).toFixed(1)} L`;
}

/** ["8","9","10","11"] → "8 to 11" when consecutive, else "8, 10 and 11". */
function joinGrades(keys: string[]) {
  const nums = keys.map(Number);
  if (keys.length > 2 && nums.every((n, i) => i === 0 || n === nums[i - 1] + 1)) return `${keys[0]}–${keys[keys.length - 1]}`;
  return keys.length > 1 ? `${keys.slice(0, -1).join(', ')} & ${keys[keys.length - 1]}` : keys[0];
}

/* ------------------------------------------------------------------------------------------------ structure */

type StructureRow = NonNullable<FeesPayload['structure']>['rows'][number];

export function Structure({ structure }: { structure: FeesPayload['structure'] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!structure) {
    return (
      <Card pad={20}>
        <Text variant="sm" color="muted">
          {t('console.operations.fees.structure.none')}
        </Text>
      </Card>
    );
  }
  const head = (h: string) => t(`console.operations.fees.structure.head.${h as 'tuition'}`, { defaultValue: h });
  const columns: Column<StructureRow>[] = [
    {
      key: 'band',
      title: t('console.operations.fees.structure.grades'),
      flex: 1.1,
      render: (r) => (
        <Text variant="sm" weight={700} style={{ fontSize: 13.5 }}>
          {r.band}
        </Text>
      ),
    },
    ...structure.heads.map<Column<StructureRow>>((h) => ({
      key: h,
      title: head(h),
      flex: 1,
      align: 'right',
      render: (r) => (r.amounts[h] ? formatInr(r.amounts[h]) : '—'),
    })),
  ];
  const schedule = structure.schedule
    .map((s) => {
      const name =
        s === structure.schedule[0]
          ? head(s.head)
          : t(`console.operations.fees.structure.headLower.${s.head as 'tuition'}`, { defaultValue: s.head });
      const dates = s.dates.map((d) => formatDate(d)).join(', ');
      const text =
        s.dates.length === 1
          ? t('console.operations.fees.structure.once', { head: name, month: monthName(s.dates[0]) })
          : s.dates.length === 2
            ? t('console.operations.fees.structure.terms', { head: name, dates })
            : s.dates.length === 4
              ? t('console.operations.fees.structure.quarters', { head: name })
              : t('console.operations.fees.structure.parts', { head: name, count: s.dates.length, dates });
      return text + (s.optional ? t('console.operations.fees.structure.optional') : '');
    })
    .join(' · ');
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <CardHead
        style={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: 14 }}
        title={t('console.operations.fees.structure.title', { year: structure.academic_year })}
        subtitle={t('console.operations.fees.structure.subtitle')}
        right={
          structure.locked ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="lock" size={ICON_SIZE.xs} rawColor={colors.muted} />
              <Text variant="xxs" color="muted" weight={600}>
                {t('console.operations.fees.structure.locked')}
              </Text>
            </View>
          ) : null
        }
      />
      <DataTable columns={columns} rows={structure.rows} rowKey={(r) => r.band} />
      <View style={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.line }}>
        <Text variant="xs" color="muted">
          {schedule}.
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  twoUp: { flexDirection: 'row', gap: 20 },
  stub: { width: 92, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 8 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 38 },
  track: { height: 6, borderRadius: 999, overflow: 'hidden' },
  tick: { position: 'absolute', top: -5, bottom: -5, width: 1.5, marginLeft: -0.75 },
});
