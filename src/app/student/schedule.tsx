import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { Period } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { useTripLive } from '@/features/tracking/useTripLive';
import { addDays, clockShort, formatClock, formatDate, isoDate, startOfWeek, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { AppBar, Bar, Button, Card, ErrorState, Icon, ICON_SIZE, Link, LoadingCards, Pill, pointer, Ribbon, Screen, StickyNote, Text, type RibbonCell } from '@/ui';

const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const nowMins = () => new Date().getHours() * 60 + new Date().getMinutes();
const clock = (total: number) => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

type Row =
  | { kind: 'assembly' | 'break' | 'lunch' | 'home'; at: string; minutes?: number }
  | { kind: 'period'; p: Period; state: 'done' | 'now' | 'todo' };

/** StuTimetable ("Schedule"): the day as a board, with the period on now opened up. */
export default function StudentSchedule() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const family = useFamily();
  const me = family.selected;
  const id = me?.id;
  const timetable = useQuery({ queryKey: ['timetable', id], queryFn: () => api.timetable(id as string), enabled: !!id });
  const transport = useQuery({ queryKey: ['transport', id], queryFn: () => api.transport(id as string), enabled: !!id });
  const homework = useQuery({ queryKey: ['homework', id], queryFn: () => api.homework(id as string), enabled: !!id });
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date();
  const monday = startOfWeek(today);
  const [day, setDay] = useState(today.getDay() === 0 ? 0 : today.getDay() - 1);
  const date = addDays(monday, day);
  const isToday = isoDate(date) === isoDate(today);
  const periods = timetable.data?.days.find((d) => d.weekday === day)?.periods ?? [];
  const enrolled = transport.data?.enrolled ? transport.data : null;
  const drop = enrolled?.today.find((trip) => trip.direction === 'drop');
  const live = useTripLive(drop?.status === 'active' ? drop.trip_id : null);
  const delay = Math.max(0, live.data?.delay_minutes ?? 0);

  const stateOf = (p: Period): 'done' | 'now' | 'todo' =>
    !isToday ? (date < today ? 'done' : 'todo') : nowMins() >= mins(p.ends_at) ? 'done' : nowMins() >= mins(p.starts_at) ? 'now' : 'todo';

  const rows: Row[] = [];
  const cells: RibbonCell[] = [];
  if (periods.length) {
    rows.push({ kind: 'assembly', at: clock(mins(periods[0].starts_at) - 20), minutes: 20 });
    periods.forEach((p, i) => {
      if (i > 0) {
        const gap = mins(p.starts_at) - mins(periods[i - 1].ends_at);
        if (gap >= 10) {
          rows.push({ kind: gap >= 30 ? 'lunch' : 'break', at: periods[i - 1].ends_at, minutes: gap });
          cells.push({ kind: 'break' });
        }
      }
      const state = stateOf(p);
      rows.push({ kind: 'period', p, state });
      cells.push({ kind: 'period', state, label: p.short ?? p.subject.slice(0, 2) });
    });
    rows.push({ kind: 'home', at: periods[periods.length - 1].ends_at });
  }
  const done = rows.filter((r) => r.kind === 'period' && r.state === 'done').length;
  const current = rows.find((r) => r.kind === 'period' && r.state === 'now') as Extract<Row, { kind: 'period' }> | undefined;

  // Tomorrow's first period and anything due then.
  let next = addDays(today, 1);
  if (next.getDay() === 0) next = addDays(next, 1);
  const firstTomorrow = timetable.data?.days.find((d) => d.weekday === (next.getDay() + 6) % 7)?.periods[0];
  const dueTomorrow = homework.data?.items.find((h) => h.due_date === isoDate(next) && !h.submission);

  return (
    <Screen
      dock
      refreshing={timetable.isRefetching}
      onRefresh={timetable.refetch}
      header={<AppBar title={t('student.schedule.title')} subtitle={me ? t('student.schedule.subtitle', { class: me.class.short_label }) : undefined} />}>
      <View accessibilityRole="tablist" style={styles.days}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const d = addDays(monday, i);
          const on = i === day;
          return (
            <Pressable
              key={i}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={formatDate(d, { weekday: true })}
              onPress={() => setDay(i)}
              style={[styles.dayChip, pointer, { backgroundColor: on ? colors.brand : colors.surface, borderColor: on ? colors.brand : colors.lineStrong }]}>
              <Text variant="xxs" weight={700} rawColor={on ? colors.onBrand : colors.ink2}>
                {weekdayName(d, true)}
              </Text>
              <Text num rawColor={on ? colors.onBrand : colors.ink2} style={{ fontFamily: fonts.bold, fontSize: 15, lineHeight: 16 }}>
                {d.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 8 }}>
        <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'baseline' }]}>
          <Text variant="h3">{`${weekdayName(date)}, ${formatDate(date)}`}</Text>
          {periods.length ? (
            <Text variant="xs" color="muted" weight={600}>
              {t('student.schedule.summary', { count: periods.length, time: formatClock(periods[periods.length - 1].ends_at) })}
            </Text>
          ) : null}
        </View>
        {cells.length ? <Ribbon cells={cells} height={28} /> : null}
        {isToday && periods.length ? (
          <Text variant="xs" color="ink2">
            {current
              ? t('student.schedule.progressNow', { count: done, subject: current.p.subject })
              : done === periods.length
                ? t('student.schedule.progressDone')
                : t('student.schedule.progressBefore', { subject: periods[0].subject })}
            {drop && enrolled ? ` ${t(delay ? 'student.schedule.busLate' : 'student.schedule.busLeaves', { bus: enrolled.vehicle?.label ?? enrolled.route.name, minutes: delay, time: formatClock(clock(mins(drop.scheduled_start) + delay)) })}` : ''}
          </Text>
        ) : null}
      </View>

      {timetable.error ? <ErrorState error={timetable.error} onRetry={timetable.refetch} /> : null}
      {timetable.isLoading ? <LoadingCards count={3} /> : null}
      {!timetable.isLoading && !periods.length ? (
        <Text variant="sm" color="muted">
          {t('parent.timetable.noClasses')}
        </Text>
      ) : null}

      {rows.length ? (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <BoardRow key={i} row={r} last={i === rows.length - 1} bus={enrolled && drop ? { label: enrolled.vehicle?.label ?? enrolled.route.name, at: drop.scheduled_start, delay } : null} />
          ))}
        </Card>
      ) : null}

      {firstTomorrow ? (
        <View style={{ paddingTop: 10, paddingHorizontal: 4 }}>
          <StickyNote color="peach" tilt="r" tape="center" style={{ gap: 8 }}>
            <Text variant="xxs" weight={800} rawColor={colors.pPeachInk} style={{ letterSpacing: 1.3, textTransform: 'uppercase' }}>
              {t('student.schedule.tomorrowKicker')}
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 22 }} weight={500} color="ink">
              {t('student.schedule.tomorrowLine', {
                time: formatClock(firstTomorrow.starts_at),
                subject: firstTomorrow.subject === 'Mathematics' ? 'Maths' : firstTomorrow.subject,
                teacher: firstTomorrow.teacher ?? '',
                room: firstTomorrow.room,
              })}
              {dueTomorrow ? ` ${t('student.schedule.dueAtStart', { title: dueTomorrow.title.split(',')[0] })}` : ''}
              {firstTomorrow.note ? ` ${firstTomorrow.note}.` : ''}
            </Text>
            {dueTomorrow ? <Link label={t('student.schedule.openHomework')} onPress={() => router.push('/student/tasks')} /> : null}
          </StickyNote>
        </View>
      ) : null}
    </Screen>
  );
}

function BoardRow({ row, last, bus }: { row: Row; last: boolean; bus: { label: string; at: string; delay: number } | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const border = !last ? { borderBottomWidth: 1, borderBottomColor: colors.line } : null;
  if (row.kind !== 'period') {
    const shaded = row.kind === 'break' || row.kind === 'lunch';
    const label =
      row.kind === 'assembly'
        ? t('student.schedule.assembly')
        : row.kind === 'break'
          ? t('student.schedule.shortBreak')
          : row.kind === 'lunch'
            ? t('student.schedule.lunch')
            : bus
              ? t('student.schedule.homeBus', { bus: bus.label, time: clockShort(clock(mins(bus.at) + bus.delay)) })
              : t('student.schedule.homeTime');
    return (
      <View style={[styles.row, styles.cell, border, shaded && { backgroundColor: colors.subtle, borderStyle: 'dashed', paddingVertical: 10 }]}>
        <Text variant="sm" weight={600} color="ink2" num style={{ width: 52 }}>
          {clockShort(row.at)}
        </Text>
        <Text variant="sm" color="ink2" style={{ flex: 1 }}>
          {label}
        </Text>
        {row.minutes ? (
          <Text variant="xs" color="muted">
            {t('student.schedule.minutes', { count: row.minutes })}
          </Text>
        ) : row.kind === 'home' && bus?.delay ? (
          <Text variant="xs" weight={700} color="warn">
            {t('parent.home.minLate', { count: bus.delay })}
          </Text>
        ) : null}
      </View>
    );
  }
  const { p, state } = row;
  const now = state === 'now';
  const elapsed = Math.max(0, nowMins() - mins(p.starts_at));
  const length = mins(p.ends_at) - mins(p.starts_at);
  return (
    <View style={[styles.cell, border, { gap: 12 }, now && { backgroundColor: colors.selected, paddingVertical: 16 }]}>
      <View style={[styles.row, { alignItems: 'flex-start' }]}>
        <View style={{ width: 52 }}>
          <Text variant="sm" weight={700} num rawColor={now ? colors.brandInk : colors.ink}>
            {clockShort(p.starts_at)}
          </Text>
          <Text variant="xxs" weight={700} rawColor={now ? colors.brandInk : colors.muted}>
            P{p.period}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="sm" weight={700} style={{ fontSize: 15 }}>
            {p.subject}
          </Text>
          <Text variant="xs" color="ink2">
            {now ? [p.teacher, p.room].filter(Boolean).join(' · ') : p.teacher}
          </Text>
        </View>
        {now ? (
          <Pill label={t('student.schedule.now')} tone="ink" style={{ backgroundColor: colors.brand }} />
        ) : (
          <View style={[styles.row, { gap: 10 }]}>
            <Text variant="xs" color="ink2">
              {p.room}
            </Text>
            {state === 'done' ? <Icon name="check" size={ICON_SIZE.sm} rawColor={colors.muted} /> : <View style={{ width: 16 }} />}
          </View>
        )}
      </View>
      {now ? (
        <>
          <Bar value={elapsed} max={length} size="thin" />
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text variant="xs" color="ink2" weight={600}>
              {t('student.schedule.minDone', { count: elapsed })}
            </Text>
            <Text variant="xs" weight={700}>
              {t('parent.timetable.minLeft', { count: Math.max(0, length - elapsed) })}
            </Text>
          </View>
          <Button
            title={t('student.schedule.openMaterial')}
            icon="folder"
            size="md"
            fullWidth
            height={44}
            onPress={() => router.push({ pathname: '/student/material', params: { subject: p.code ?? '' } })}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  days: { flexDirection: 'row', gap: 6 },
  dayChip: { flex: 1, height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  cell: { paddingHorizontal: 16, paddingVertical: 12 },
});

