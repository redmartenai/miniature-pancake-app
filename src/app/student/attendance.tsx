import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { AttendanceDay, AttendanceMonth, CheckIn } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { useStartChat } from '@/features/parent/useStartChat';
import { calendarWeeks, markFor } from '@/features/parent/register';
import { formatClock, formatDate, isoDate, monthName, parseDate, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { AppBar, Button, Card, ErrorState, Highlight, IconButton, Kicker, LoadingCards, RegisterDot, Screen, Stamp, StickyNote, Text } from '@/ui';

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const inSchool = (d: AttendanceDay) => ['present', 'late', 'half_day'].includes(d.status);
const marked = (d: AttendanceDay) => ['present', 'late', 'half_day', 'absent', 'excused'].includes(d.status);
const short = (date: string) => `${weekdayName(date, true)} ${formatDate(date)}`;
/** "8:07" from a late note like "Arrived 8:07". */
const lateTime = (d: AttendanceDay) => {
  const m = /(\d{1,2}):(\d{2})/.exec(d.note ?? '');
  return m ? formatClock(`${m[1]}:${m[2]}`) : null;
};

/** StuAttendance: read-only. The month in a sentence, the register, the streak, and who to ask if it's wrong. */
export default function StudentAttendance() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const family = useFamily();
  const me = family.selected;
  const id = me?.id;
  const thisMonth = isoDate(new Date()).slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const register = useQuery({ queryKey: ['attendance', id, month], queryFn: () => api.attendance(id as string, month), enabled: !!id });
  const summary = useQuery({ queryKey: ['summary', id], queryFn: () => api.summary(id as string), enabled: !!id });
  const classes = useQuery({ queryKey: ['student-classes', id], queryFn: () => api.studentClasses(id as string), enabled: !!id });
  const teacher = classes.data?.subjects.find((s) => s.is_class_teacher);
  const chat = useStartChat();
  const data = register.data;
  const current = month === thisMonth;

  return (
    <Screen
      gap={18}
      dock
      refreshing={register.isRefetching}
      onRefresh={register.refetch}
      header={
        <AppBar
          back={() => router.navigate('/student')}
          subtitle={[t('student.attendance.readOnly'), me ? t('student.home.classLabel', { class: me.class.short_label }) : null].filter(Boolean).join(' · ')}
          title={t('student.attendance.title')}
        />
      }>
      {register.error ? <ErrorState error={register.error} onRetry={register.refetch} /> : null}
      {!data ? <LoadingCards count={2} /> : null}
      {data ? (
        <>
          <View style={{ gap: 10, paddingTop: 4, paddingHorizontal: 2 }}>
            {current && summary.data ? <TodayLine checkIn={summary.data.today.check_in} /> : null}
            <Sentence data={data} current={current} />
          </View>
          <RegisterCard data={data} month={month} canNext={month < thisMonth} onPrev={() => setMonth(shiftMonth(month, -1))} onNext={() => setMonth(shiftMonth(month, 1))} />
          <Streak days={data.days} />
          <LeaveNotes days={data.days} />
          <View style={{ gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line }}>
            <Text variant="sm" color="ink2">
              <Trans
                i18nKey={teacher ? 'student.attendance.wrong' : 'student.attendance.wrongNoTeacher'}
                values={{ name: teacher?.teacher ?? '' }}
                components={{ b: <Text variant="sm" weight={700} color="ink" /> }}
              />
            </Text>
            {teacher && id ? (
              <Button
                title={t('student.attendance.message', { name: teacher.teacher })}
                icon="chat"
                size="lg"
                fullWidth
                loading={chat.isPending}
                onPress={() => chat.mutate({ studentId: id, userId: teacher.teacher_id })}
              />
            ) : null}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function TodayLine({ checkIn }: { checkIn: CheckIn }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!checkIn) return null;
  const tone = checkIn.status === 'present' ? colors.ok : checkIn.status === 'late' ? colors.warn : checkIn.status === 'absent' || checkIn.status === 'excused' ? colors.bad : colors.faint;
  const soft = checkIn.status === 'present' ? colors.okSoft : checkIn.status === 'late' ? colors.warnSoft : checkIn.status === 'absent' ? colors.badSoft : colors.sunken;
  const time = checkIn.at ? formatClock(new Date(checkIn.at).toTimeString().slice(0, 5)) : '';
  const text =
    checkIn.status === 'present' || checkIn.status === 'late'
      ? t(checkIn.source === 'bus' ? 'student.attendance.todayBus' : 'student.attendance.todayRegister', { status: t(`student.attendance.status_${checkIn.status}`), time })
      : t(`student.attendance.today_${checkIn.status}`, { defaultValue: t('student.attendance.todayNotYet') });
  return (
    <View style={[styles.row, { gap: 8 }]}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone, boxShadow: `0 0 0 4px ${soft}` }} />
      <Text variant="xs" weight={700}>
        {text}
      </Text>
    </View>
  );
}

/** "You've been in school 18 of 19 days this September. That's 95%. Your one day off was …" */
function Sentence({ data, current }: { data: AttendanceMonth; current: boolean }) {
  const { t } = useTranslation();
  const { present, school_days: days, percent } = data.summary;
  const month = monthName(`${data.month}-01`);
  const absences = data.days.filter((d) => d.status === 'absent' || d.status === 'excused');
  const lates = data.days.filter((d) => d.status === 'late');
  const reason = (d: AttendanceDay) => (d.leave?.reason || d.note || '').split(/[—,.]/)[0].trim().toLowerCase();
  const parts: string[] = [];
  if (percent !== null) parts.push(t('student.attendance.thatIs', { percent: Math.round(percent) }));
  if (absences.length === 1) {
    const r = reason(absences[0]);
    parts.push(r ? t('student.attendance.oneOffReason', { reason: r, date: short(absences[0].date) }) : t('student.attendance.oneOff', { date: short(absences[0].date) }));
  } else if (absences.length > 1) parts.push(t('student.attendance.daysOff', { count: absences.length }));
  if (lates.length === 1) {
    const time = lateTime(lates[0]);
    parts.push(
      time
        ? t(absences.length ? 'student.attendance.andLateOnceAt' : 'student.attendance.lateOnceAt', { date: short(lates[0].date), time })
        : t(absences.length ? 'student.attendance.andLateOnce' : 'student.attendance.lateOnce', { date: short(lates[0].date) }),
    );
  } else if (lates.length > 1) parts.push(t(absences.length ? 'student.attendance.andLateTimes' : 'student.attendance.lateTimes', { count: lates.length }));
  else if (absences.length) parts.push('.');
  if (!absences.length && !lates.length && days) parts.push(t('student.attendance.perfect'));
  return (
    <>
      <Text style={styles.sentence}>
        {days ? (
          <Trans
            i18nKey={current ? 'student.attendance.sentence' : 'student.attendance.sentencePast'}
            values={{ present, days, month }}
            components={{ m: <Highlight color="mint" /> }}
          />
        ) : (
          t('student.attendance.noDays', { month })
        )}
      </Text>
      {parts.length ? (
        <Text variant="sm" color="ink2">
          {parts.join('')}
        </Text>
      ) : null}
    </>
  );
}

function RegisterCard({ data, month, canNext, onPrev, onNext }: { data: AttendanceMonth; month: string; canNext: boolean; onPrev: () => void; onNext: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const weeks = calendarWeeks(data.days).map((w) => w.slice(0, 6));
  const today = isoDate(new Date());
  const name = monthName(`${month}-01`);
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const legend: { mark: 'p' | 'a' | 'l' | 'f'; label: string }[] = [
    { mark: 'p', label: t('parent.attendance.present') },
    { mark: 'l', label: t('parent.attendance.late') },
    { mark: 'a', label: t('parent.attendance.absent') },
    { mark: 'f', label: t('student.attendance.toCome') },
  ];
  return (
    <Card pastel="mint" pad={16} style={{ gap: 12 }}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={{ flexShrink: 1 }}>
          <Text variant="h3">{t('student.attendance.register', { month: name })}</Text>
          <Text variant="xs" color="muted">
            {t('student.attendance.registerSub')}
          </Text>
        </View>
        <View style={[styles.row, { marginRight: -8 }]}>
          <IconButton icon="chevronLeft" variant="bare" size="lg" label={t('parent.attendance.previous', { month: monthName(`${shiftMonth(month, -1)}-01`) })} onPress={onPrev} />
          <IconButton icon="chevronRight" variant="bare" size="lg" disabled={!canNext} label={t('parent.attendance.next', { month: monthName(`${shiftMonth(month, 1)}-01`) })} onPress={onNext} />
        </View>
      </View>
      <View accessible accessibilityRole="image" accessibilityLabel={t('student.attendance.gridLabel', { month: name, present: data.summary.present, days: data.summary.school_days })}>
        <View style={styles.row}>
          {days.map((d) => (
            <Text key={d} variant="xxs" color="muted" weight={700} align="center" style={{ flex: 1 }}>
              {t(`student.attendance.dow.${d}`)}
            </Text>
          ))}
        </View>
        {weeks
          .filter((w) => w.some(Boolean))
          .map((week, w) => (
            <View key={w} style={[styles.row, { marginTop: 2 }]}>
              {week.map((day, i) => (
                <DayCell key={i} day={day} today={day?.date === today} />
              ))}
            </View>
          ))}
      </View>
      <View style={[styles.row, { flexWrap: 'wrap', columnGap: 14, rowGap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.pHr }]}>
        {legend.map((l) => (
          <View key={l.mark} style={[styles.row, { gap: 6 }]}>
            <RegisterDot mark={l.mark} />
            <Text variant="xs" color="ink2" weight={600}>
              {l.label}
            </Text>
          </View>
        ))}
      </View>
      {data.year?.school_days ? (
        <Text variant="xs" color="muted">
          <Trans
            i18nKey="student.attendance.yearSoFar"
            values={{ present: data.year.present, days: data.year.school_days, percent: data.year.percent }}
            components={{ b: <Text variant="xs" weight={700} color="ink2" /> }}
          />
        </Text>
      ) : null}
    </Card>
  );
}

function DayCell({ day, today }: { day: AttendanceDay | null; today: boolean }) {
  const { colors } = useTheme();
  const status = day?.status;
  const color = status === 'absent' || status === 'excused' ? colors.bad : status === 'late' ? colors.warn : today ? colors.ink : colors.muted;
  const strong = today || status === 'absent' || status === 'excused' || status === 'late';
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 6 }}>
      {day ? (
        <>
          <Text variant="xxs" num weight={strong ? 800 : 600} rawColor={color}>
            {parseDate(day.date).getDate()}
          </Text>
          <View style={today ? { borderRadius: 8, boxShadow: `0 0 0 2px ${colors.pMint}, 0 0 0 3.5px ${colors.ok}` } : undefined}>
            <RegisterDot mark={markFor(day)} large />
          </View>
        </>
      ) : null}
    </View>
  );
}

/** "In school 11 days in a row since Thu 10 Sep, and on time every morning since Tue 15 Sep." */
function Streak({ days }: { days: AttendanceDay[] }) {
  const { t } = useTranslation();
  const done = days.filter(marked);
  let run = 0;
  let since: string | undefined;
  for (let i = done.length - 1; i >= 0 && inSchool(done[i]); i -= 1) {
    run += 1;
    since = done[i].date;
  }
  let onTimeSince: string | undefined;
  for (let i = done.length - 1; i >= 0 && done[i].status === 'present'; i -= 1) onTimeSince = done[i].date;
  if (run < 2 || !since) return null;
  return (
    <View style={{ gap: 10, paddingTop: 4, paddingHorizontal: 2 }}>
      <Kicker>{t('student.attendance.streak')}</Kicker>
      <Text variant="sm" color="ink2">
        <Trans
          i18nKey={onTimeSince && onTimeSince !== since ? 'student.attendance.streakOnTime' : 'student.attendance.streakLine'}
          values={{ count: run, since: short(since), onTime: onTimeSince ? short(onTimeSince) : '' }}
          components={{ m: <Highlight color="mint" style={{ fontWeight: '700' }} /> }}
        />
      </Text>
    </View>
  );
}

/** Each absence as the leave note that covered it. */
function LeaveNotes({ days }: { days: AttendanceDay[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const absences = days.filter((d) => d.status === 'absent' || d.status === 'excused');
  return (
    <>
      {absences.map((d, i) => {
        const leave = d.leave;
        const reason = leave?.reason || d.note;
        const tone = leave?.status === 'approved' ? 'ok' : leave?.status === 'declined' ? 'bad' : 'warn';
        return (
          <View key={d.date} style={{ paddingTop: 10, paddingRight: 34, paddingLeft: 8, paddingBottom: 4 }}>
            <StickyNote color="mint" pin tilt={i % 2 ? 'l' : 'r'} style={{ gap: 8 }}>
              <Text variant="xxs" weight={800} rawColor={colors.pMintInk} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>
                {t('student.attendance.absentOn', { date: short(d.date) })}
              </Text>
              <Text style={{ fontSize: 15, lineHeight: 22.5 }} weight={500} color="ink">
                {reason ? `${reason.split(/[—.]/)[0].trim()}${t('student.attendance.stayedHome')}` : t('student.attendance.noReason')}
                {leave ? ` ${leave.decided_by ? t(`student.attendance.leave_${leave.status}_by`, { name: leave.decided_by }) : t(`student.attendance.leave_${leave.status}`)}` : ''}
              </Text>
              {leave ? (
                <View style={[styles.row, { justifyContent: 'space-between', gap: 10, paddingTop: 2 }]}>
                  <Text variant="xs" color="muted" weight={600} style={{ flexShrink: 1 }}>
                    {t(`student.attendance.counts_${leave.status}`)}
                  </Text>
                  <Stamp tone={tone} rotate={-6}>
                    {t(`parent.attendance.${leave.status}`)}
                  </Stamp>
                </View>
              ) : null}
            </StickyNote>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  sentence: { fontFamily: fonts.displayMedium, fontSize: 25, lineHeight: 32.5, letterSpacing: -0.5 },
});
