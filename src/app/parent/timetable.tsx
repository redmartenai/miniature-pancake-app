import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { Period } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { scheduleLocalReminder } from '@/features/notifications/push';
import { shortSubject } from '@/features/parent/HomeCards';
import { addDays, clockShort, formatClock, formatDate, isoDate, startOfWeek, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { AppBar, Bar, Button, Card, ErrorState, Icon, ICON_SIZE, LoadingCards, Pill, pointer, Screen, Text, TileIcon, useToast } from '@/ui';

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const nowMinutes = () => new Date().getHours() * 60 + new Date().getMinutes();

type Item =
  | { kind: 'event'; at: string; icon: 'speaker' | 'cup' | 'bus'; label: string }
  | { kind: 'period'; period: Period; state: 'done' | 'now' | 'todo' };

/** ParentTimetable: a day as a timeline — assembly, periods, breaks, dismissal — and what tomorrow needs. */
export default function ParentTimetable() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const family = useFamily();
  const child = family.selected;
  const studentId = child?.id;
  const timetable = useQuery({ queryKey: ['timetable', studentId], queryFn: () => api.timetable(studentId as string), enabled: !!studentId });
  const homework = useQuery({ queryKey: ['homework', studentId], queryFn: () => api.homework(studentId as string), enabled: !!studentId });
  const transport = useQuery({ queryKey: ['transport', studentId], queryFn: () => api.transport(studentId as string), enabled: !!studentId });

  const today = new Date();
  const monday = startOfWeek(today);
  const todayIndex = today.getDay() === 0 ? 0 : today.getDay() - 1;
  const [day, setDay] = useState(todayIndex);
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const date = addDays(monday, day);
  const isToday = isoDate(date) === isoDate(today);
  const periods = timetable.data?.days.find((d) => d.weekday === day)?.periods ?? [];
  const enrolled = transport.data?.enrolled ? transport.data : null;
  const drop = enrolled?.today.find((trip) => trip.direction === 'drop');
  const busLeaves = drop?.scheduled_start ?? null;

  // The timeline: assembly 20 min before P1, breaks and lunch in the gaps, dismissal after the last period.
  const items: Item[] = [];
  if (periods.length) {
    const first = minutes(periods[0].starts_at);
    items.push({ kind: 'event', at: clock(first - 20), icon: 'speaker', label: t('parent.timetable.assembly', { minutes: 20 }) });
    periods.forEach((p, i) => {
      if (i > 0) {
        const gap = minutes(p.starts_at) - minutes(periods[i - 1].ends_at);
        if (gap >= 10) {
          items.push({
            kind: 'event',
            at: periods[i - 1].ends_at,
            icon: 'cup',
            label: gap >= 30 ? t('parent.timetable.lunch', { minutes: gap }) : t('parent.timetable.break', { minutes: gap }),
          });
        }
      }
      const state: 'done' | 'now' | 'todo' = !isToday
        ? date < today
          ? 'done'
          : 'todo'
        : nowMinutes() >= minutes(p.ends_at)
          ? 'done'
          : nowMinutes() >= minutes(p.starts_at)
            ? 'now'
            : 'todo';
      items.push({ kind: 'period', period: p, state });
    });
    const end = periods[periods.length - 1].ends_at;
    items.push({
      kind: 'event',
      at: end,
      icon: 'bus',
      label: busLeaves && enrolled ? t('parent.timetable.busLeaves', { bus: enrolled.vehicle?.label ?? enrolled.route.name, time: formatClock(busLeaves) }) : t('parent.timetable.dismissal'),
    });
  }

  return (
    <Screen
      dock
      refreshing={timetable.isRefetching}
      onRefresh={timetable.refetch}
      header={<AppBar back title={t('parent.timetable.title')} subtitle={child ? t('parent.timetable.subtitle', { name: child.first_name, class: child.class.short_label }) : undefined} />}>
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

      <View style={{ paddingHorizontal: 2 }}>
        <Text variant="h3">{t('parent.timetable.dayLabel', { day: weekdayName(date), date: formatDate(date) })}</Text>
        <Text variant="xs" color="muted">
          {periods.length
            ? t('parent.timetable.summary', { count: periods.length, from: formatClock(items[0].kind === 'event' ? items[0].at : periods[0].starts_at), to: formatClock(periods[periods.length - 1].ends_at) })
            : t('parent.timetable.noClasses')}
        </Text>
      </View>

      {timetable.error ? <ErrorState error={timetable.error} onRetry={timetable.refetch} /> : null}
      {timetable.isLoading ? <LoadingCards count={3} /> : null}

      {items.length ? (
        <View accessibilityLabel={t('parent.timetable.scheduleLabel', { day: weekdayName(date) })}>
          <View style={[styles.spine, { backgroundColor: colors.line }]} />
          <View style={{ gap: 8 }}>
            {items.map((item, i) => (item.kind === 'event' ? <EventRow key={i} item={item} /> : <PeriodRow key={i} item={item} />))}
          </View>
        </View>
      ) : null}

      {timetable.data ? <TomorrowCard periodsByDay={timetable.data.days} homework={homework.data?.items ?? []} /> : null}
    </Screen>
  );
}

function clock(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function EventRow({ item }: { item: Extract<Item, { kind: 'event' }> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { minHeight: 36, gap: 10 }]}>
      <Text variant="xs" color="muted" weight={600} num align="right" style={{ width: 52 }}>
        {clockShort(item.at)}
      </Text>
      <View style={{ width: 12, alignItems: 'center' }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.canvas, borderWidth: 2, borderColor: colors.lineStrong, boxShadow: `0 0 0 3px ${colors.canvas}` }} />
      </View>
      <View style={[styles.row, { flex: 1, minWidth: 0, gap: 8 }]}>
        <Icon name={item.icon} size={ICON_SIZE.sm} rawColor={colors.muted} />
        <Text variant="xs" color="muted" weight={600} style={{ flex: 1 }}>
          {item.label}
        </Text>
      </View>
    </View>
  );
}

function PeriodRow({ item }: { item: Extract<Item, { kind: 'period' }> }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const p = item.period;
  const now = item.state === 'now';
  const where = [p.teacher, p.room].filter(Boolean).join(' · ');
  const elapsed = Math.max(0, nowMinutes() - minutes(p.starts_at));
  const length = minutes(p.ends_at) - minutes(p.starts_at);
  return (
    <View style={[styles.row, { alignItems: 'flex-start', gap: 10 }]}>
      <View style={{ width: 52, alignItems: 'flex-end', paddingTop: now ? 14 : 11 }}>
        <Text variant="xs" weight={700} rawColor={now ? colors.brandInk : colors.ink2} num>
          {clockShort(p.starts_at)}
        </Text>
        <Text variant="xxs" color="muted" num>
          {clockShort(p.ends_at)}
        </Text>
      </View>
      <View style={{ width: 12, alignItems: 'center', paddingTop: now ? 17 : 16 }}>
        <View
          style={
            now
              ? { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.brand, boxShadow: `0 0 0 3px ${colors.canvas}, 0 0 0 6px ${colors.brandSoft}` }
              : { width: 10, height: 10, borderRadius: 5, backgroundColor: item.state === 'done' ? colors.lineStrong : colors.lineStrong, boxShadow: `0 0 0 3px ${colors.canvas}` }
          }
        />
      </View>
      {now ? (
        <Card pad={14} style={{ flex: 1, minWidth: 0, gap: 8, borderColor: colors.brandLine }}>
          <View style={[styles.row, { gap: 8 }]}>
            <Pill label={t('parent.timetable.now')} tone="brand" />
            <Text variant="xs" color="muted" weight={600}>
              {t('parent.timetable.periodN', { period: p.period })}
            </Text>
          </View>
          <View>
            <Text variant="h3">{p.subject}</Text>
            {where ? (
              <Text variant="xs" color="muted">
                {where}
              </Text>
            ) : null}
          </View>
          <Bar value={elapsed} max={length} size="thin" />
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text variant="xs" color="ink2" weight={600}>
              {t('parent.timetable.minIn', { count: elapsed })}
            </Text>
            <Text variant="xs" weight={700}>
              {t('parent.timetable.minLeft', { count: Math.max(0, length - elapsed) })}
            </Text>
          </View>
        </Card>
      ) : (
        <Card variant="flat" pad={0} style={[styles.row, { flex: 1, minWidth: 0, paddingVertical: 10, paddingHorizontal: 14, gap: 10 }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700} color="ink2" numberOfLines={1}>
              {p.subject}
            </Text>
            {where ? (
              <Text variant="xs" color="muted" numberOfLines={1}>
                {where}
              </Text>
            ) : null}
          </View>
          <Text variant="xs" weight={700} color="muted">
            {t('parent.timetable.periodShort', { period: p.period })}
          </Text>
        </Card>
      )}
    </View>
  );
}

/** Tomorrow's first period, what to bring, homework due, and an evening reminder. */
function TomorrowCard({ periodsByDay, homework }: { periodsByDay: { weekday: number; periods: Period[] }[]; homework: { title: string; due_date: string; subject: { name: string }; due_period?: { period: number } | null; submission: unknown }[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  // The next school day after today (Saturday → Monday).
  let next = addDays(new Date(), 1);
  if (next.getDay() === 0) next = addDays(next, 1);
  const weekday = (next.getDay() + 6) % 7;
  const periods = periodsByDay.find((d) => d.weekday === weekday)?.periods ?? [];
  const first = periods[0];
  const note = periods.find((p) => p.note)?.note;
  const due = homework.find((h) => h.due_date === isoDate(next) && !h.submission);
  const isTomorrow = isoDate(next) === isoDate(addDays(new Date(), 1));
  const remind = useMutation({
    mutationFn: async () => {
      const at = new Date();
      at.setHours(20, 0, 0, 0);
      const body = first ? t('parent.timetable.tomorrowStarts', { day: t('parent.timetable.tomorrowWord'), subject: first.subject, time: formatClock(first.starts_at) }) : '';
      return scheduleLocalReminder(at, t('parent.timetable.reminderTitle'), [body, note].filter(Boolean).join(' · '));
    },
    onSuccess: (ok) => toast(ok ? t('parent.timetable.reminderSet') : t('parent.timetable.reminderUnavailable'), ok ? 'success' : 'info'),
  });
  if (!first) return null;
  const pastEight = new Date().getHours() >= 20;
  return (
    <Card pad={16} style={{ gap: 14 }}>
      <View style={[styles.row, { alignItems: 'flex-start', gap: 12 }]}>
        <TileIcon icon="calendar" />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text variant="xs" color="muted" weight={600}>
            {formatDate(next, { weekday: true })}
          </Text>
          <Text variant="sm" weight={700}>
            {t('parent.timetable.tomorrowStarts', {
              day: isTomorrow ? t('parent.timetable.tomorrowWord') : weekdayName(next),
              subject: first.subject,
              time: formatClock(first.starts_at),
            })}
          </Text>
          {note ? (
            <View style={[styles.row, { gap: 6 }]}>
              <Icon name="briefcase" size={ICON_SIZE.sm} rawColor={colors.ink2} />
              <Text variant="xs" color="ink2" weight={600}>
                {note}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {due ? (
        <Card variant="flat" pad={0} onPress={() => router.push('/parent/homework')} style={[styles.row, { paddingVertical: 10, paddingHorizontal: 12, gap: 10, minHeight: 44 }]}>
          <Icon name="edit" size={ICON_SIZE.sm} rawColor={colors.brandInk} />
          <Text variant="xs" weight={700} style={{ flex: 1, minWidth: 0 }} numberOfLines={1}>
            {due.due_period
              ? t('parent.timetable.homeworkDue', { subject: shortSubject(due.subject.name), title: due.title.split(',')[0], period: due.due_period.period })
              : t('parent.timetable.homeworkDueDay', { subject: shortSubject(due.subject.name), title: due.title.split(',')[0] })}
          </Text>
          <Icon name="chevronRight" size={ICON_SIZE.sm} rawColor={colors.faint} />
        </Card>
      ) : null}
      {!pastEight ? <Button title={t('parent.timetable.remind')} icon="bell" height={48} fullWidth loading={remind.isPending} onPress={() => remind.mutate()} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  days: { flexDirection: 'row', gap: 6 },
  dayChip: { flex: 1, height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  spine: { position: 'absolute', left: 67, top: 18, bottom: 18, width: 2, borderRadius: 2 },
});
