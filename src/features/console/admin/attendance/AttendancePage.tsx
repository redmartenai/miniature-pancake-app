import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Fragment, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useConsoleQuery } from '@/features/console/api';
import { Col, ConsolePage, Row } from '@/features/console/Page';
import { num } from '@/features/console/format';
import { formatDate, formatTime, monthName, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Button, Card, DateSheet, Highlight, Kicker, SegmentedControl, TearCal, Text, useToast } from '@/ui';

import { adminApi, type StudentsAttendance } from '../api';
import { Dialog } from '../Overlay';
import { dayLabel, HeatGrid } from './HeatGrid';
import { ChronicCard, MissingDialog, Slips } from './Lists';
import { StaffView } from './StaffView';

type View_ = 'students' | 'staff';

/** Console: attendance. `?view=staff` and `?date=YYYY-MM-DD` are kept in the URL. */
export function AttendancePage() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ view?: string; date?: string }>();
  const view: View_ = params.view === 'staff' ? 'staff' : 'students';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? '') ? params.date : undefined;
  const [picking, setPicking] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const students = useConsoleQuery(['admin', 'attendance', date ?? 'today'], () => adminApi.students(date), {
    enabled: view === 'students',
  });
  const staff = useConsoleQuery(['admin', 'attendance-staff', date ?? 'today'], () => adminApi.staffAttendance(date), {
    enabled: view === 'staff',
  });
  const q = view === 'students' ? students : staff;
  const data = students.data;
  const shownDate = (view === 'students' ? students.data?.date : staff.data?.date) ?? date;
  const today = data?.today ?? staff.data?.date;
  const isToday = view === 'students' ? !!data?.is_today : !!staff.data?.is_today;

  const alerts = useMutation({
    mutationFn: adminApi.sendAlerts,
    onSuccess: (res) => {
      setConfirm(false);
      toast(t('console.admin.attendance.alertsSent', { count: res.students, guardians: res.guardians }));
      qc.invalidateQueries({ queryKey: ['console'] });
    },
    onError: (e) => {
      setConfirm(false);
      toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : String(e), 'danger');
    },
  });

  const pending = data?.alerts.pending ?? 0;
  const alertTitle = !data
    ? t('console.admin.attendance.sendAlerts', { count: 0 })
    : !data.alerts.enabled
      ? t('console.admin.attendance.alertsOff')
      : !data.is_today
        ? t('console.admin.attendance.alertsPast')
        : pending
          ? t('console.admin.attendance.sendAlerts', { count: pending })
          : t('console.admin.attendance.alertsDone');

  const subtitle = (() => {
    const r = data?.registers;
    if (view === 'staff') return staff.data ? t('console.admin.attendance.staffView.subtitle', { count: staff.data.marked }) : ' ';
    if (!r) return ' ';
    if (!r.marked) return t('console.admin.attendance.noneMarked');
    const time = r.last_marked_at ? formatTime(r.last_marked_at) : '';
    return r.marked === r.sections
      ? t('console.admin.attendance.allMarked', { count: r.sections, time })
      : t('console.admin.attendance.someMarked', { marked: r.marked, count: r.sections, time });
  })();

  const dateLabel = shownDate
    ? isToday
      ? t('console.admin.attendance.today', { date: formatDate(shownDate) })
      : `${weekdayName(shownDate, true)}, ${formatDate(shownDate)}`
    : '…';

  return (
    <ConsolePage
      title={t('console.admin.attendance.title')}
      crumbs={[{ label: t('console.admin.attendance.crumb'), href: '/console/academics' }]}
      subtitle={subtitle}
      loading={q.isLoading}
      error={q.error}
      onRetry={() => q.refetch()}
      gap={28}
      actions={
        <>
          <SegmentedControl<View_>
            full={false}
            value={view}
            onChange={(v) => router.setParams({ view: v })}
            options={[
              { value: 'students', label: t('console.admin.attendance.students') },
              { value: 'staff', label: t('console.admin.attendance.staff') },
            ]}
          />
          <Button
            title={dateLabel}
            icon="calendar"
            iconRight="chevronDown"
            variant="secondary"
            onPress={() => setPicking(true)}
            accessibilityLabel={t('console.admin.attendance.pickDate')}
          />
          {view === 'students' ? (
            <Button
              title={alertTitle}
              icon="send"
              disabled={!pending || !data?.is_today || !data.alerts.enabled}
              onPress={() => setConfirm(true)}
            />
          ) : null}
        </>
      }>
      {view === 'students' && data ? <Students data={data} /> : null}
      {view === 'staff' && staff.data ? <StaffView key={staff.data.date} data={staff.data} /> : null}
      <DateSheet
        visible={picking}
        onClose={() => setPicking(false)}
        title={t('console.admin.attendance.pickDate')}
        value={shownDate ?? ''}
        max={today}
        onPick={(iso) => {
          setPicking(false);
          router.setParams({ date: iso === today ? '' : iso });
        }}
      />
      <Dialog
        visible={confirm}
        onClose={() => setConfirm(false)}
        title={t('console.admin.attendance.confirmTitle', { count: pending })}
        footer={
          <>
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setConfirm(false)} />
            <Button
              title={t('console.admin.attendance.confirmSend')}
              icon="send"
              loading={alerts.isPending}
              onPress={() => alerts.mutate()}
            />
          </>
        }>
        <Text variant="sm" color="ink2">
          {t('console.admin.attendance.confirmBody')}
        </Text>
      </Dialog>
    </ConsolePage>
  );
}

function Students({ data }: { data: StudentsAttendance }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [missingIn, setMissingIn] = useState<string[] | null>(null);
  const roll = data.roll;
  const when = data.is_today
    ? t('console.admin.attendance.whenToday')
    : t('console.admin.attendance.whenPast', { date: formatDate(data.date) });
  const flagged = data.insight.flagged;
  const shown = flagged.slice(0, 2);

  return (
    <>
      <Row align="flex-start">
        <Col span={8}>
          <Sentence data={data} when={when} />
        </Col>
        <Col span={4}>
          <Missing data={data} />
        </Col>
      </Row>

      <Card pad={22} style={{ gap: 18 }}>
        <View style={[styles.row, { justifyContent: 'space-between', gap: 12 }]}>
          <View style={{ gap: 2 }}>
            <Text variant="h3" accessibilityRole="header">
              {t('console.admin.attendance.register')}
            </Text>
            <Text variant="xs" color="muted">
              {t('console.admin.attendance.registerSub')}
            </Text>
          </View>
          <HeatLegend />
        </View>
        <View style={[styles.row, { alignItems: 'flex-start', gap: 40 }]}>
          {data.heat.groups.map((g) => {
            const low = g.sections.reduce<{ label: string; pct: number } | null>((m, s) => {
              const v = s.values[s.values.length - 1];
              return v !== null && (!m || v < m.pct) ? { label: s.label, pct: v } : m;
            }, null);
            const name = (grade: string | null) =>
              grade && /^\d+$/.test(grade) ? t('console.admin.attendance.gradeName', { grade }) : (grade ?? '');
            const head = t('console.admin.attendance.groupHead', { from: name(g.from), to: name(g.to), count: g.sections.length });
            return (
              <View key={g.key} style={{ flex: 1, minWidth: 0, gap: 10 }}>
                <Kicker>{head}</Kicker>
                <HeatGrid
                  days={data.heat.days}
                  sections={g.sections}
                  lastIsToday={data.is_today}
                  label={t('console.admin.attendance.gridLabel', { group: head, low: low?.label ?? '—', pct: low?.pct ?? '—' })}
                />
              </View>
            );
          })}
        </View>
        <View style={[styles.row, { gap: 12, paddingTop: 14, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong }]}>
          <Text variant="sm" color="ink2" style={{ flex: 1 }}>
            {shown.length ? (
              <>
                {shown.map((f, i) => (
                  <Fragment key={f.label}>
                    {i ? ' ' : ''}
                    <Trans
                      i18nKey={f.run >= 2 ? 'console.admin.attendance.insightRun' : 'console.admin.attendance.insightDrop'}
                      values={{
                        section: f.label,
                        count: f.run,
                        pct: f.today,
                        when,
                        peak: f.peak ?? '—',
                        peakDate: f.peak_date ? formatDate(f.peak_date) : '—',
                      }}
                      components={{ b: <Text style={{ fontFamily: fonts.bold, color: colors.ink }} /> }}
                    />
                  </Fragment>
                ))}
                {flagged.length > shown.length
                  ? ` ${t('console.admin.attendance.insightAlso', {
                      when,
                      sections: flagged
                        .slice(shown.length)
                        .map((f) => `${f.label} (${f.today}%)`)
                        .join(', '),
                    })}`
                  : ''}
                {data.insight.floor !== null ? ` ${t('console.admin.attendance.insightFloor', { pct: data.insight.floor })}` : ''}
              </>
            ) : (
              t('console.admin.attendance.insightClear', { when })
            )}
          </Text>
          {shown.length ? (
            <Button
              title={t('console.admin.attendance.whoIsMissingIn', {
                sections: flagged
                  .slice(0, 2)
                  .map((f) => f.label)
                  .join(t('console.admin.attendance.and')),
              })}
              variant="secondary"
              size="sm"
              onPress={() => setMissingIn(flagged.slice(0, 2).map((f) => f.label))}
            />
          ) : null}
        </View>
      </Card>

      <Row align="flex-start" gap={28}>
        <Col span={7}>
          <ChronicCard rows={data.chronic} days={data.heat.days} canAct={data.is_today} />
        </Col>
        <Col span={5}>
          <Slips slips={data.corrections} canAct />
        </Col>
      </Row>
      {missingIn ? <MissingDialog date={data.date} sections={missingIn} onClose={() => setMissingIn(null)} /> : null}
    </>
  );
}

function Sentence({ data, when }: { data: StudentsAttendance; when: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const roll = data.roll;
  const diff = roll.percent !== null && roll.previous_percent !== null ? roll.percent - roll.previous_percent : 0;
  const prevDay = data.is_today && roll.previous_date ? t('console.admin.attendance.yesterday') : weekdayName(roll.previous_date);
  const compareKey =
    Math.abs(diff) < 0.2
      ? 'compareSame'
      : diff < 0
        ? diff <= -2
          ? 'compareWellUnder'
          : 'compareUnder'
        : diff >= 2
          ? 'compareWellOver'
          : 'compareOver';
  const grades = roll.late_grades.length
    ? t('console.admin.attendance.lateGrades', { grades: roll.late_grades.join(t('console.admin.attendance.and')) })
    : '';
  const rollAt = data.registers.roll_at ?? data.registers.last_marked_at;
  const d = data.date;
  return (
    <View style={[styles.row, { alignItems: 'flex-start', gap: 28, paddingTop: 4 }]}>
      <TearCal month={monthName(d, true)} day={Number(d.slice(8, 10))} dow={weekdayName(d)} />
      <View style={{ flex: 1, gap: 14, paddingTop: 2 }}>
        <Kicker>{t('console.admin.attendance.kicker', { time: rollAt ? formatTime(rollAt) : '—' })}</Kicker>
        <Text style={[styles.sentence, { color: colors.ink }]}>
          <Trans
            i18nKey={roll.unexplained ? 'console.admin.attendance.sentence' : 'console.admin.attendance.sentenceNoGaps'}
            values={{
              present: num(roll.in_school),
              total: num(roll.marked_total),
              when,
              compare: t(`console.admin.attendance.${compareKey}`, { day: prevDay, pct: roll.previous_percent ?? '—' }),
              unexplained: num(roll.unexplained),
              absent: num(roll.absent),
              late: t('console.admin.attendance.late', { count: roll.late }),
              grades,
            }}
            components={{ m: <Highlight color="mint" />, p: <Highlight color="pink" />, b: <Highlight /> }}
          />
        </Text>
      </View>
    </View>
  );
}

function Missing({ data }: { data: StudentsAttendance }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const r = data.roll;
  const tt = data.teachers;
  const names =
    tt.on_leave.length > 1
      ? `${tt.on_leave.slice(0, -1).join(', ')}${t('console.admin.attendance.and')}${tt.on_leave[tt.on_leave.length - 1]}`
      : tt.on_leave[0];
  const rows = [
    { key: 'leave', color: colors.pMintInk, label: t('console.admin.attendance.onLeave'), value: r.explained, bad: false },
    {
      key: 'none',
      color: colors.bad,
      label: data.alerts.sent && !data.alerts.pending ? t('console.admin.attendance.noReasonSent') : t('console.admin.attendance.noReason'),
      value: r.unexplained,
      bad: r.unexplained > 0,
    },
    { key: 'late', color: colors.warn, label: t('console.admin.attendance.lateRow'), value: r.late, bad: false },
  ];
  return (
    <Card
      pad={0}
      style={{ paddingVertical: 18, paddingHorizontal: 20, gap: 12 }}
      accessibilityLabel={t('console.admin.attendance.missing')}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text variant="h4" accessibilityRole="header">
          {t('console.admin.attendance.missing')}
        </Text>
        <Text variant="xs" color="muted" weight={600} num>
          {num(r.absent)} · {r.absent_percent ?? 0}%
        </Text>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('console.admin.attendance.missingBar', { explained: r.explained, unexplained: r.unexplained })}
        style={[styles.row, { gap: 2, height: 10 }]}>
        {r.explained ? (
          <View
            style={{
              flex: r.explained,
              height: 10,
              backgroundColor: colors.pMintInk,
              borderTopLeftRadius: 999,
              borderBottomLeftRadius: 999,
              borderTopRightRadius: r.unexplained ? 0 : 999,
              borderBottomRightRadius: r.unexplained ? 0 : 999,
            }}
          />
        ) : null}
        {r.unexplained ? (
          <View
            style={{
              flex: r.unexplained,
              height: 10,
              backgroundColor: colors.bad,
              borderTopRightRadius: 999,
              borderBottomRightRadius: 999,
              borderTopLeftRadius: r.explained ? 0 : 999,
              borderBottomLeftRadius: r.explained ? 0 : 999,
            }}
          />
        ) : null}
        {!r.absent ? <View style={{ flex: 1, height: 10, borderRadius: 999, backgroundColor: colors.track }} /> : null}
      </View>
      <View>
        {rows.map((row) => (
          <View key={row.key} style={[styles.row, { gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderColor: colors.line }]}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: row.color }} />
            <Text variant="sm" style={{ flex: 1 }}>
              {row.label}
            </Text>
            <Text variant="sm" weight={700} num rawColor={row.bad ? colors.bad : colors.ink}>
              {num(row.value)}
            </Text>
          </View>
        ))}
        <Text variant="xs" color="muted" style={{ paddingTop: 9 }}>
          {tt.on_leave.length
            ? t('console.admin.attendance.teachersLine', {
                in: tt.in,
                total: tt.total,
                names,
                verb: tt.on_leave.length > 1 ? t('console.admin.attendance.areVerb') : t('console.admin.attendance.isVerb'),
              })
            : t('console.admin.attendance.teachersAllIn', { total: tt.total })}
        </Text>
      </View>
    </Card>
  );
}

export function HeatLegend() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const box = { width: 14, height: 14, borderRadius: 4 };
  const items = [
    { bg: colors.hx3, label: t('console.admin.attendance.legend97') },
    { bg: colors.hx2, label: t('console.admin.attendance.legend94') },
    { bg: colors.hx1, label: t('console.admin.attendance.legend90') },
    { bg: colors.badSoft, border: colors.bad, label: t('console.admin.attendance.legendLow') },
  ];
  return (
    <View style={[styles.row, { gap: 12 }]}>
      {items.map((i) => (
        <View key={i.label} style={[styles.row, { gap: 6 }]}>
          <View style={[box, { backgroundColor: i.bg }, i.border ? { boxShadow: `inset 0 0 0 1.5px ${i.border}` } : null]} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, color: colors.muted }}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

export { dayLabel };

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  sentence: { fontFamily: fonts.displayMedium, fontSize: 27, lineHeight: 36, letterSpacing: -0.6 },
});
