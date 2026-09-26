import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { AttendanceDay, AttendanceMonth, Preferences } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { ChildChip } from '@/features/parent/ChildChip';
import { LeaveSheet } from '@/features/parent/LeaveSheet';
import { calendarWeeks, markFor } from '@/features/parent/register';
import { formatDate, isoDate, monthName, parseDate } from '@/lib/format';
import { maskPhone } from '@/state/lastAccount';
import { useActiveSchool, useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import {
  AppBar,
  Button,
  Card,
  ErrorState,
  Highlight,
  IconButton,
  Kicker,
  ListRow,
  LoadingCards,
  RegisterDot,
  Screen,
  Sheet,
  Stamp,
  StickyNote,
  Switch,
  Text,
  ThemeToggle,
} from '@/ui';

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** ParentAttendance: the month said plainly, the register, what's behind each mark, and alerts. */
export default function ParentAttendance() {
  const { t } = useTranslation();
  const school = useActiveSchool();
  const user = useSession((s) => s.user);
  const family = useFamily();
  const child = family.selected;
  const studentId = child?.id;
  const thisMonth = isoDate(new Date()).slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [termOpen, setTermOpen] = useState(false);

  const register = useQuery({
    queryKey: ['attendance', studentId, month],
    queryFn: () => api.attendance(studentId as string, month),
    enabled: !!studentId,
  });
  const details = useQuery({ queryKey: ['children-detail'], queryFn: api.childrenDetail, enabled: family.isParent });
  const teacher = details.data?.children.find((c) => c.id === studentId)?.class_teacher ?? '';

  const data = register.data;
  const monthLabel = monthName(`${month}-01`);
  const header = (
    <AppBar
      title={t('parent.attendance.title')}
      subtitle={[school?.term, school?.academic_year].filter(Boolean).join(' · ')}
      theme={false}
      actions={
        <>
          <ChildChip />
          <ThemeToggle />
        </>
      }
    />
  );

  return (
    <Screen header={header} dock gap={20} refreshing={register.isRefetching} onRefresh={register.refetch}>
      {register.error ? <ErrorState error={register.error} onRetry={register.refetch} /> : null}
      {!data ? (
        <LoadingCards count={2} />
      ) : (
        <>
          <View style={{ gap: 12, paddingTop: 4 }}>
            <Kicker>{t('parent.attendance.kicker', { month: monthLabel })}</Kicker>
            <MonthSentence data={data} name={child?.first_name ?? ''} />
          </View>

          <RegisterCard
            data={data}
            month={month}
            canNext={month < thisMonth}
            onPrev={() => setMonth(shiftMonth(month, -1))}
            onNext={() => setMonth(shiftMonth(month, 1))}
            termLabel={school?.term ? t('parent.attendance.wholeTerm', { term: school.term }) : t('parent.attendance.wholeYear')}
            onTerm={() => setTermOpen(true)}
          />

          {family.isParent ? (
            <View style={{ gap: 8 }}>
              <Button title={t('parent.attendance.applyLeave')} icon="calendarPlus" size="lg" fullWidth onPress={() => setLeaveOpen(true)} />
              {teacher ? (
                <Text variant="xs" color="muted" align="center">
                  {t('parent.attendance.goesTo', { name: teacher })}
                </Text>
              ) : null}
            </View>
          ) : null}

          <BehindTheMarks days={data.days} />

          {family.isParent ? <Alerts name={child?.first_name ?? ''} phone={user?.phone ?? ''} /> : null}
        </>
      )}
      {studentId && child ? (
        <LeaveSheet visible={leaveOpen} onClose={() => setLeaveOpen(false)} studentId={studentId} childName={child.first_name} teacher={teacher} />
      ) : null}
      {studentId ? <TermSheet visible={termOpen} onClose={() => setTermOpen(false)} studentId={studentId} title={school?.term ?? ''} /> : null}
    </Screen>
  );
}

/** "Aarav has been in school 18 of 19 days this month, 95%. One day off (fever), one late morning. For the year: 93.4%, 71 of 76 days." */
function MonthSentence({ data, name }: { data: AttendanceMonth; name: string }) {
  const { t } = useTranslation();
  const { present, school_days: days, absent, late, percent } = data.summary;
  const marks = { m: <Highlight color="mint" /> };
  if (!days) {
    return (
      <Text variant="sentence" style={styles.sentence}>
        {t('parent.attendance.sentenceNone')}
      </Text>
    );
  }
  const absentDay = data.days.find((d) => d.status === 'absent' || d.status === 'excused');
  const reason = absent === 1 && (absentDay?.leave?.reason || absentDay?.note) ? ` (${(absentDay?.leave?.reason || absentDay?.note || '').split(/[—,.]/)[0].trim().toLowerCase()})` : '';
  return (
    <Text variant="sentence" style={styles.sentence}>
      <Trans
        i18nKey="parent.attendance.sentence"
        values={{ name, present, days, percent: percent !== null ? `, ${Math.round(percent)}%` : '' }}
        components={marks}
      />
      {absent ? t('parent.attendance.offDays', { count: absent, reason }) : ''}
      {late ? t('parent.attendance.lateDays', { count: late }) : ''}
      {!absent && !late ? t('parent.attendance.perfect') : ''}
      {data.year?.percent != null ? (
        <Trans
          i18nKey="parent.attendance.year"
          values={{ percent: data.year.percent, present: data.year.present, days: data.year.school_days }}
          components={marks}
        />
      ) : null}
    </Text>
  );
}

function RegisterCard({
  data,
  month,
  canNext,
  onPrev,
  onNext,
  termLabel,
  onTerm,
}: {
  data: AttendanceMonth;
  month: string;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  termLabel: string;
  onTerm: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const weeks = calendarWeeks(data.days);
  const today = isoDate(new Date());
  const [y] = month.split('-');
  const title = `${monthName(`${month}-01`)} ${y}`;
  const legend: { mark: 'p' | 'a' | 'l' | 'f' | 'off'; label: string }[] = [
    { mark: 'p', label: t('parent.attendance.present') },
    { mark: 'a', label: t('parent.attendance.absent') },
    { mark: 'l', label: t('parent.attendance.late') },
    { mark: 'f', label: t('parent.attendance.notYet') },
    { mark: 'off', label: t('parent.attendance.sunday') },
  ];
  return (
    <Card pad={12} style={{ paddingTop: 10, paddingBottom: 14, gap: 10 }} accessibilityLabel={t('parent.attendance.registerLabel', { month: title })}>
      <View style={styles.between}>
        <IconButton icon="chevronLeft" variant="bare" size="lg" label={t('parent.attendance.previous', { month: monthName(`${shiftMonth(month, -1)}-01`) })} onPress={onPrev} />
        <View style={{ alignItems: 'center' }}>
          <Text variant="h3">{title}</Text>
          <Text variant="xxs" color="muted" weight={600}>
            {t('parent.attendance.registerSub', { count: data.summary.school_days })}
          </Text>
        </View>
        <IconButton
          icon="chevronRight"
          variant="bare"
          size="lg"
          disabled={!canNext}
          label={t('parent.attendance.next', { month: monthName(`${shiftMonth(month, 1)}-01`) })}
          onPress={onNext}
        />
      </View>
      <View>
        <View style={styles.weekRow}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
            <Text key={d} variant="xxs" color="muted" weight={700} align="center" style={[i === 6 ? styles.sun : styles.cell, { paddingBottom: 6 }]}>
              {d}
            </Text>
          ))}
        </View>
        {weeks.map((week, w) => (
          <View key={w} style={styles.weekRow}>
            {week.map((day, i) => (
              <DayCell key={i} day={day} sunday={i === 6} today={day?.date === today} />
            ))}
          </View>
        ))}
      </View>
      <View style={[styles.legend, { borderTopColor: colors.line }]}>
        {legend.map((l) => (
          <View key={l.label} style={styles.legendItem}>
            <RegisterDot mark={l.mark} />
            <Text variant="xs" color="ink2" weight={600}>
              {l.label}
            </Text>
          </View>
        ))}
      </View>
      <Button title={termLabel} iconRight="chevronRight" variant="ghost" size="sm" height={44} textColor={colors.brandInk} onPress={onTerm} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

function DayCell({ day, sunday, today }: { day: AttendanceDay | null; sunday: boolean; today: boolean }) {
  const { colors } = useTheme();
  const status = day?.status;
  const dateColor = status === 'absent' || status === 'excused' ? colors.bad : status === 'late' ? colors.warn : today ? colors.ink : colors.muted;
  return (
    <View style={[sunday ? styles.sun : styles.cell, styles.dayCell, { borderTopColor: colors.line }]}>
      {day ? (
        <>
          <Text variant="xxs" num weight={today || status === 'absent' || status === 'late' ? 800 : 600} rawColor={dateColor} style={today ? { fontSize: 12 } : undefined}>
            {parseDate(day.date).getDate()}
          </Text>
          <View style={today ? { borderRadius: 7, boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 3.5px ${colors.ok}` } : undefined}>
            <RegisterDot mark={sunday ? 'off' : markFor(day)} large />
          </View>
        </>
      ) : null}
    </View>
  );
}

/** Each absence as a pinned note (with its leave), each late as a row. */
function BehindTheMarks({ days }: { days: AttendanceDay[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const absences = days.filter((d) => d.status === 'absent' || d.status === 'excused');
  const lates = days.filter((d) => d.status === 'late');
  return (
    <View style={{ gap: 14 }}>
      <Kicker>{t('parent.attendance.behind')}</Kicker>
      {!absences.length && !lates.length ? (
        <Text variant="sm" color="muted">
          {t('parent.attendance.nothingThisMonth')}
        </Text>
      ) : null}
      {absences.map((d, i) => {
        const leave = d.leave;
        const stamp = leave?.status === 'approved' ? 'ok' : leave?.status === 'declined' ? 'bad' : 'warn';
        return (
          <View key={d.date} style={{ paddingTop: 4, paddingHorizontal: 6 }}>
            <StickyNote color="mint" pin tilt={i % 2 ? 'r' : 'l'} style={{ paddingTop: 32, gap: 10 }}>
              <View style={[styles.between, { gap: 10 }]}>
                <Text variant="xxs" weight={800} rawColor={colors.pMintInk} style={{ letterSpacing: 1.3, textTransform: 'uppercase' }}>
                  {t('parent.attendance.absentOn', { date: formatDate(d.date, { weekday: true }).replace(',', '') })}
                </Text>
                <Text variant="xs" color="ink2" weight={600}>
                  {leave?.half_day ? t('parent.attendance.halfDay') : t('parent.attendance.fullDay')}
                </Text>
              </View>
              <Text style={{ fontSize: 16, lineHeight: 23 }} weight={600} color="ink">
                {leave?.reason || d.note || t('parent.attendance.noReason')}
              </Text>
              {leave ? (
                <View style={[styles.between, { gap: 12 }]}>
                  <Text variant="xs" color="ink2" style={{ flexShrink: 1 }}>
                    {leave.applied_by ? t('parent.attendance.leaveBy', { name: leave.applied_by }) : ''}
                  </Text>
                  <Stamp tone={stamp} rotate={-6} sub={leave.decided_by ? t('parent.attendance.byTeacher', { name: leave.decided_by }) : undefined} style={{ paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'column', gap: 3 }}>
                    {t(`parent.attendance.${leave.status}`)}
                  </Stamp>
                </View>
              ) : null}
            </StickyNote>
          </View>
        );
      })}
      {lates.map((d) => {
        const time = /(\d{1,2}):(\d{2})/.exec(d.note ?? '');
        const minutes = time ? (Number(time[1]) - 8) * 60 + Number(time[2]) : null;
        const label = formatDate(d.date, { weekday: true });
        return (
          <ListRow
            key={d.date}
            inset={0}
            py={12}
            left={<RegisterDot mark="l" large />}
            title={time ? t('parent.attendance.lateOn', { date: label, time: `${time[1]}:${time[2]} AM` }) : t('parent.attendance.lateOnNoTime', { date: label })}
            subtitle={minutes && minutes > 0 ? t('parent.attendance.lateAfter', { count: minutes }) : undefined}
            right={
              <Text variant="xs" weight={700} color="warn">
                {t('parent.attendance.late')}
              </Text>
            }
            style={{ borderTopWidth: 1, borderTopColor: colors.line }}
          />
        );
      })}
    </View>
  );
}

function Alerts({ name, phone }: { name: string; phone: string }) {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const memberships = useSession((s) => s.memberships);
  const prefs = user?.preferences;
  const save = useMutation({
    mutationFn: (alerts: Partial<Preferences['alerts']>) => api.updateMe({ preferences: { alerts } }),
    onSuccess: ({ user: next }) => void useSession.getState().setProfile(next, memberships),
  });
  const alerts = prefs?.alerts ?? { not_in_by: true, late_arrival: true };
  const row = (key: keyof Preferences['alerts'], title: string, hint: string, last?: boolean) => (
    <ListRow
      inset={0}
      title={title}
      subtitle={hint}
      last={last}
      right={<Switch value={alerts[key]} onChange={(v) => save.mutate({ [key]: v })} label={title} />}
    />
  );
  return (
    <View style={{ gap: 2 }}>
      <Kicker>{t('parent.attendance.tellMe')}</Kicker>
      {row('not_in_by', t('parent.attendance.notInBy'), t('parent.attendance.notInByHint', { name }))}
      {row('late_arrival', t('parent.attendance.lateArrival'), t('parent.attendance.lateArrivalHint', { name }), true)}
      <Text variant="xs" color="muted" style={{ marginTop: 8 }}>
        {t('parent.attendance.alertsTo', { phone: maskPhone(phone) })}
      </Text>
    </View>
  );
}

/** Month-by-month for the term (or year). */
function TermSheet({ visible, onClose, studentId, title }: { visible: boolean; onClose: () => void; studentId: string; title: string }) {
  const { t } = useTranslation();
  const now = new Date();
  const start = now.getMonth() >= 3 ? new Date(now.getFullYear(), 3, 1) : new Date(now.getFullYear() - 1, 3, 1);
  const months: string[] = [];
  for (let d = new Date(start); d <= now; d.setMonth(d.getMonth() + 1)) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const results = useQueries({
    queries: months.map((m) => ({ queryKey: ['attendance', studentId, m], queryFn: () => api.attendance(studentId, m), enabled: visible })),
  });
  return (
    <Sheet visible={visible} onClose={onClose} title={title ? t('parent.attendance.termTitle', { term: title }) : t('parent.attendance.wholeYear')}>
      {months.map((m, i) => {
        const s = results[i].data?.summary;
        return (
          <ListRow
            key={m}
            inset={0}
            py={10}
            title={monthName(`${m}-01`)}
            subtitle={s ? t('parent.home.daysDetail', { absent: s.absent, late: s.late }) : undefined}
            right={
              <Text variant="sm" weight={700} num>
                {s ? `${s.present}/${s.school_days}` : '…'}
              </Text>
            }
            last={i === months.length - 1}
          />
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sentence: { fontSize: 21, lineHeight: 29, letterSpacing: -0.38 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1 },
  sun: { width: 26 },
  dayCell: { height: 46, borderTopWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 8, paddingTop: 10, paddingHorizontal: 4, borderTopWidth: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
