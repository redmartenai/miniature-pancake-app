import { router } from 'expo-router';
import { useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { AttendanceMonth, ExamResult, Homework, StudentExams, StudentSummary } from '@/api/types';
import { markFor, ribbonCells } from '@/features/parent/register';
import { clockShort, daysUntil, formatDate, isoDate, monthName, parseDate, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Card, Delta, Dot, Kicker, Link, Paper, pointer, RegisterDot, Ribbon, Stamp, StickyNote, TearCal, Text } from '@/ui';

/** "Now: Art with Farah Khan · till 2:30", the ribbon, and what's first tomorrow. */
export function NowCard({ summary, tomorrow }: { summary: StudentSummary; tomorrow?: { subject: string; starts_at: string } | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { ribbon } = summary.today;
  const current = ribbon.current;
  const next = ribbon.next;
  const minutesLeft = current ? Math.max(0, minutesOf(current.ends_at) - nowMinutes()) : 0;
  return (
    <Card pad={16} style={{ gap: 12, paddingBottom: 14 }} onPress={() => router.push('/student/schedule')}>
      <View style={styles.between}>
        <View style={[styles.row, { gap: 8, flexShrink: 1 }]}>
          <Dot rawColor={current ? colors.brand : colors.faint} />
          <Text variant="sm" weight={700} numberOfLines={1} style={{ flexShrink: 1 }}>
            {current
              ? t('student.home.now', { subject: current.subject, teacher: current.teacher ?? '' })
              : next
                ? t('student.home.next', { subject: next.subject, time: clockShort(next.starts_at) })
                : ribbon.periods
                  ? t('student.home.dayDone')
                  : t('student.home.noSchool')}
          </Text>
        </View>
        {current ? (
          <Text variant="xs" color="muted" weight={600}>
            {t('student.home.till', { time: clockShort(current.ends_at) })}
          </Text>
        ) : null}
      </View>
      {ribbon.periods ? <Ribbon cells={ribbonCells(ribbon)} /> : null}
      <View style={[styles.between, { borderTopWidth: 1, borderTopColor: colors.line, borderStyle: 'dashed', paddingTop: 10 }]}>
        <Text variant="xs" color="muted" weight={600}>
          {current ? t('student.home.roomLeft', { room: current.room, minutes: minutesLeft }) : ''}
        </Text>
        {tomorrow ? (
          <Text variant="xs" weight={700}>
            {t('student.home.tomorrow', { time: clockShort(tomorrow.starts_at), subject: shortName(tomorrow.subject) })}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const nowMinutes = () => new Date().getHours() * 60 + new Date().getMinutes();
const shortName = (s: string) => (s === 'Mathematics' ? 'Maths' : s);

/** This week's homework as three sticky notes, the rest in a line, and an upload shortcut. */
export function HomeworkNotes({ items }: { items: Homework[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const open = items
    .filter((h) => !h.submission && daysUntil(h.due_date) >= 0 && daysUntil(h.due_date) <= 7)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  if (!open.length) return null;
  const notes = open.slice(0, 3);
  const rest = open.slice(3);
  const tilts: ('l' | undefined | 'r')[] = ['l', undefined, 'r'];
  return (
    <View style={{ gap: 12 }}>
      <Kicker right={<Link label={t('student.home.allCount', { count: open.length })} onPress={() => router.push('/student/tasks')} />}>
        {t('student.home.homeworkWeek')}
      </Kicker>
      <View style={[styles.row, { gap: 10, alignItems: 'flex-start', paddingTop: 12, paddingHorizontal: 2 }]}>
        {notes.map((h, i) => {
          const left = daysUntil(h.due_date);
          const when = left === 0 ? t('student.home.today') : left === 1 ? t('student.home.tomorrowWord') : `${weekdayName(h.due_date, true)} ${parseDate(h.due_date).getDate()}`;
          const status = h.flagged_by ? t('student.home.markedIncomplete') : h.description.split(/[.;]/)[0].slice(0, 40);
          return (
            <Pressable key={h.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/student/tasks', params: { open: h.id } })} style={[{ flex: 1, marginTop: i === 1 ? 6 : i === 2 ? 2 : 0 }, pointer]}>
              <StickyNote color="peach" tilt={tilts[i]} tape={i === 1 ? undefined : i === 2 ? 'right' : 'center'} pin={i === 1} style={{ paddingTop: 22, paddingHorizontal: 12, paddingBottom: 12, minHeight: 146, gap: 5 }}>
                <Text variant="xxs" weight={800} rawColor={colors.pPeachInk} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>
                  {shortName(h.subject.name)}
                </Text>
                <Text variant="sm" weight={700} style={{ lineHeight: 17 }} numberOfLines={3}>
                  {h.title}
                </Text>
                <Text variant="xs" color="muted" style={{ flex: 1 }} numberOfLines={2}>
                  {status}
                </Text>
                <Text variant="xs" weight={left <= 1 ? 800 : 700} rawColor={left <= 1 ? colors.warn : colors.ink}>
                  {when}
                </Text>
              </StickyNote>
            </Pressable>
          );
        })}
      </View>
      {rest.length ? (
        <Text variant="xs" color="muted" style={{ paddingHorizontal: 2 }}>
          {t('student.home.alsoOnList', {
            items: rest.map((h) => `${h.subject.name} ${h.title.split('·')[0].trim().toLowerCase()}, ${t('student.home.due', { date: `${weekdayName(h.due_date, true)} ${formatDate(h.due_date)}` })}`).join('; '),
          })}
        </Text>
      ) : null}
    </View>
  );
}

/** Tear-off calendar counting down to the next exam. */
export function ExamCountdown({ exams }: { exams: StudentExams }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const first = exams.papers?.[0];
  if (!exams.exam || !first) return <View style={{ flex: 1 }} />;
  const days = daysUntil(first.date);
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/student/exams')} style={[{ flex: 1, gap: 10 }, pointer]}>
      <TearCal month={monthName(first.date, true)} day={parseDate(first.date).getDate()} dow={weekdayName(first.date)} headColor={colors.pLavInk} style={{ width: 88 }} />
      <View>
        <Text variant="kpiSm" style={{ fontSize: 22 }}>
          {days}{' '}
          <Text variant="sm" weight={600}>
            {t('student.home.daysUnit', { count: days })}
          </Text>
        </Text>
        <Text variant="xs" color="ink2">
          {t('student.home.toExams', { exam: exams.exam.name.toLowerCase(), subject: first.subject.name })}
        </Text>
      </View>
    </Pressable>
  );
}

/** The latest report card as a small sheet with a grade stamp. */
export function ResultPaper({ exams }: { exams: ExamResult[] }) {
  const { t } = useTranslation();
  const [latest, previous] = exams;
  if (!latest) return <View style={{ flex: 1 }} />;
  const delta = previous ? Math.round(latest.percent - previous.percent) : null;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/student/results')} style={[{ flex: 1 }, pointer]}>
      <Paper pad={14} style={{ gap: 8 }}>
        <Text variant="xxs" color="muted" weight={700} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>
          {latest.name}
        </Text>
        <View style={[styles.between, { alignItems: 'center' }]}>
          <Text variant="kpi" style={{ fontSize: 28 }}>
            {Math.round(latest.percent)}%
          </Text>
          <Stamp tone="lav" round sub={t('parent.home.grade')} style={{ width: 52, height: 52, borderRadius: 26 }}>
            {latest.grade}
          </Stamp>
        </View>
        {delta !== null ? <Delta value={t('student.home.ptsSince', { count: Math.abs(delta), exam: shortExam(previous!.name) })} direction={delta >= 0 ? 'up' : 'down'} /> : null}
        {latest.class_average != null ? (
          <Text variant="xxs" color="muted" weight={600}>
            {t('student.home.classAverage', { percent: Math.round(latest.class_average), date: formatDate(latest.held_on) })}
          </Text>
        ) : null}
      </Paper>
    </Pressable>
  );
}

export function shortExam(name: string): string {
  const unit = /^Unit Test (\d+)$/i.exec(name);
  return unit ? `UT${unit[1]}` : name;
}

/** The month as one strip of register dots, with the current streak bracketed. */
export function RegisterStrip({ month }: { month: AttendanceMonth }) {
  const { t } = useTranslation();
  const strip = useRef<ScrollView>(null);
  const { colors } = useTheme();
  const todayIso = isoDate(new Date());
  // Up to today: the strip is a record, not a calendar.
  const days = month.days.filter((d) => d.date <= todayIso);
  // Streak: consecutive present/late days counting back from the latest marked day.
  const marked = month.days.filter((d) => ['present', 'late', 'absent', 'excused', 'half_day'].includes(d.status));
  let streak = 0;
  for (let i = marked.length - 1; i >= 0 && ['present', 'late', 'half_day'].includes(marked[i].status); i -= 1) streak += 1;
  const lastAbsent = [...marked].reverse().find((d) => d.status === 'absent' || d.status === 'excused');
  const { present, school_days: total, percent } = month.summary;
  const reason = lastAbsent?.leave?.reason || lastAbsent?.note;

  // Bracket the streak: from its first day to the latest marked day, measured in dot widths.
  const GAP = 6;
  const widths = days.map((d) => (parseDate(d.date).getDay() === 0 ? 5 : 14));
  const lefts = widths.map((_, i) => widths.slice(0, i).reduce((a, w) => a + w + GAP, 0));
  const first = streak ? marked[marked.length - streak].date : null;
  const last = streak ? marked[marked.length - 1].date : null;
  const from = first ? days.findIndex((d) => d.date === first) : -1;
  const to = last ? days.findIndex((d) => d.date === last) : -1;
  const bracket = streak >= 3 && from >= 0 && to >= from ? { left: lefts[from], width: lefts[to] + widths[to] - lefts[from] } : null;

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/student/attendance')} style={[{ gap: 10 }, pointer]}>
      <Kicker
        right={
          percent !== null ? (
            <Text variant="xs" weight={700} color="ok">
              {Math.round(percent)}%
            </Text>
          ) : undefined
        }>
        {t('student.home.register', { month: monthName(`${month.month}-01`) })}
      </Kicker>
      <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} onContentSizeChange={() => strip.current?.scrollToEnd({ animated: false })} contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 4 }}>
        <View style={{ gap: 6 }}>
          <View style={[styles.row, { gap: GAP }]}>
            {days.map((d) => (
              <View key={d.date} style={d.date === todayIso ? { borderRadius: 8, boxShadow: `0 0 0 2px ${colors.canvas}, 0 0 0 3.5px ${colors.ok}` } : undefined}>
                <RegisterDot mark={parseDate(d.date).getDay() === 0 ? 'off' : markFor(d)} large />
              </View>
            ))}
          </View>
          {bracket ? (
            <View style={{ marginLeft: bracket.left, width: Math.max(bracket.width, 110), alignItems: 'center', gap: 4 }}>
              <View style={{ alignSelf: 'stretch', width: bracket.width, height: 8, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: colors.ok, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />
              <Text variant="xs" weight={700} color="ok" style={{ alignSelf: bracket.width >= 110 ? 'center' : 'flex-start' }}>
                {t('student.home.streak', { count: streak })}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <Text variant="sm" color="ink2">
        <Trans
          i18nKey={lastAbsent && reason ? 'student.home.registerSentenceSince' : 'student.home.registerSentence'}
          values={{ present, days: total, reason: (reason ?? '').split(/[—,.]/)[0].trim().toLowerCase(), date: lastAbsent ? formatDate(lastAbsent.date) : '' }}
          components={{ b: <Text variant="sm" weight={700} color="ink" /> }}
        />
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
