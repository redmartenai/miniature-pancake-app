import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { DayCell, PeriodCell, StaffTimetable } from '@/api/types';
import { isPeriod, minutesLeft, staffRibbon } from '@/features/staff/common';
import { clockShort, formatClock, formatTime, joinNames, parseDate, weekdayName } from '@/lib/format';
import { useActiveSchool } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  AppBar,
  Button,
  Card,
  ErrorState,
  Highlight,
  Icon,
  LoadingCards,
  Pill,
  pointer,
  Ribbon,
  Screen,
  Sheet,
  Stamp,
  TearV,
  Text,
  TextField,
  useToast,
} from '@/ui';

/** StaffTimetable: the week at a glance, one day in detail, covers with a handover note. */
export default function StaffTimetableScreen() {
  const { t } = useTranslation();
  const school = useActiveSchool();
  const [date, setDate] = useState<string>();
  const query = useQuery({ queryKey: ['staff-timetable', date ?? 'today'], queryFn: () => api.staffTimetable(date) });
  const data = query.data;
  const selected = data?.day.date;

  return (
    <Screen
      dock
      gap={16}
      refreshing={query.isRefetching}
      onRefresh={query.refetch}
      header={
        <AppBar back={() => (router.canGoBack() ? router.back() : router.navigate('/staff'))} subtitle={school?.term ?? undefined} title={t('staff.timetable.title')} />
      }>
      {query.error ? <ErrorState error={query.error} onRetry={query.refetch} /> : null}
      {!data ? <LoadingCards count={3} /> : null}
      {data ? (
        <>
          <Text variant="body" color="ink2" style={{ lineHeight: 23, paddingHorizontal: 2 }}>
            <Trans
              i18nKey={data.covers_this_week ? 'staff.timetable.weekCovers' : 'staff.timetable.week'}
              values={{ count: data.periods_this_week - data.covers_this_week, classes: joinNames(data.classes), covers: t('staff.home.covers', { count: data.covers_this_week }) }}
              components={{ l: <Highlight color="lav" />, b: <Highlight /> }}
            />
          </Text>
          <DayPicker week={data.week} value={selected ?? data.today} today={data.today} onChange={setDate} />
          <DayCard data={data} />
          <Timeline data={data} />
        </>
      ) : null}
    </Screen>
  );
}

function DayPicker({ week, value, today, onChange }: { week: string[]; value: string; today: string; onChange: (d: string) => void }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.row, { padding: 4, gap: 4, borderRadius: 16, backgroundColor: colors.sunken, borderWidth: 1, borderColor: colors.line }]}>
      {week.map((d) => {
        const on = d === value;
        return (
          <Pressable
            key={d}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={weekdayName(d)}
            onPress={() => onChange(d)}
            style={[{ flex: 1, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, on && { backgroundColor: colors.surface, boxShadow: `0 1px 2px rgba(20,26,46,0.08), 0 0 0 1px ${colors.line}` }, pointer]}>
            <Text variant="xs" weight={on ? 700 : 600} rawColor={on ? colors.ink : colors.muted}>
              {weekdayName(d, true)}
            </Text>
            <Text variant="xs" weight={d === today ? 800 : 600} num rawColor={on ? colors.ink : colors.muted}>
              {parseDate(d).getDate()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DayCard({ data }: { data: StaffTimetable }) {
  const { t } = useTranslation();
  const day = data.day;
  const periods = day.cells.filter(isPeriod);
  const isToday = day.date === data.today;
  if (!periods.length)
    return (
      <Card pad={16}>
        <Text variant="sm" color="muted">
          {t('staff.status.noSchool')}
        </Text>
      </Card>
    );
  return (
    <Card pad={16} style={{ gap: 12 }}>
      <View style={[styles.row, { justifyContent: 'space-between', gap: 8 }]}>
        <Text variant="sm" weight={700}>
          {[
            weekdayName(day.date, true),
            [t('staff.home.classes', { count: day.counts.classes }), day.counts.covers ? t('staff.home.covers', { count: day.counts.covers }) : null, day.counts.free ? t('staff.timetable.free', { count: day.counts.free }) : null]
              .filter(Boolean)
              .join(', '),
          ].join(' · ')}
        </Text>
        {isToday ? <Pill label={formatTime(new Date())} tone="brand" /> : null}
      </View>
      <Ribbon cells={staffRibbon(day, t)} height={28} />
    </Card>
  );
}

function Timeline({ data }: { data: StaffTimetable }) {
  const { t } = useTranslation();
  const day = data.day;
  const periods = day.cells.filter(isPeriod);
  if (!periods.length) return null;
  const first = periods[0];
  const assemblyAt = clockMinus(first.starts_at, 20);
  return (
    <View style={{ gap: 8 }}>
      <RuleRow time={clockShort(assemblyAt)} label={t('staff.timetable.assembly', { time: clockShort(first.starts_at) })} />
      {day.cells.map((c, i) => (
        <CellRow key={i} cell={c} isToday={day.date === data.today} />
      ))}
      {day.ends_at ? <RuleRow time={clockShort(day.ends_at)} label={t('staff.timetable.dismissal')} /> : null}
    </View>
  );
}

function clockMinus(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m - minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function RuleRow({ time, label }: { time: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { gap: 12, minHeight: 30 }]}>
      <Text variant="sm" color="ink2" weight={600} num style={styles.time}>
        {time}
      </Text>
      <Text variant="xs" color="muted" weight={600}>
        {label}
      </Text>
      <View style={{ flex: 1, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.lineStrong }} />
    </View>
  );
}

function CellRow({ cell: c, isToday }: { cell: DayCell; isToday: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!isPeriod(c)) {
    return <RuleRow time={clockShort(c.starts_at)} label={t(c.kind === 'lunch' ? 'staff.timetable.lunch' : 'staff.timetable.break', { time: clockShort(c.ends_at) })} />;
  }
  const now = c.state === 'now' && isToday;
  return (
    <View style={[styles.row, { gap: 12, alignItems: 'flex-start' }]}>
      <View style={[styles.time, { paddingTop: 12 }]}>
        <Text variant="sm" weight={700} num rawColor={now ? colors.brandInk : colors.ink}>
          {clockShort(c.starts_at)}
        </Text>
        <Text variant="xxs" color="muted" weight={600}>
          P{c.period}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
        {c.kind === 'cover' ? <Cover cell={c} /> : c.kind === 'free' ? <Free cell={c} now={now} /> : <Taught cell={c} now={now} />}
      </View>
    </View>
  );
}

function Taught({ cell: c, now }: { cell: PeriodCell; now: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const covered = c.kind === 'covered';
  return (
    <View style={[styles.row, styles.block, { backgroundColor: colors.sunken, gap: 14 }, now && { borderWidth: 1.5, borderColor: colors.brand, backgroundColor: colors.brandSoft }]}>
      <Text style={styles.cls}>{c.class?.short_label}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="sm" weight={700} numberOfLines={1}>
          {c.subject}
        </Text>
        <Text variant="xs" color="muted" numberOfLines={1}>
          {[c.room, c.is_my_class ? t('staff.timetable.yourClass') : null, covered ? t('staff.timetable.coveredBy', { name: c.covered_by ?? '' }) : null].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {now ? (
        <Pill label={t('staff.timetable.now')} tone="brand" />
      ) : c.state === 'done' && !covered ? (
        <View style={[styles.row, { gap: 4 }]}>
          <Icon name="check" size={13} rawColor={colors.ok} bold />
          <Text variant="xs" weight={700} color="ok">
            {t('staff.timetable.taught')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Free({ cell: c, now }: { cell: PeriodCell; now: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.row,
        styles.block,
        { gap: 10, borderWidth: 1.5, borderStyle: now ? 'solid' : 'dashed', borderColor: now ? colors.brand : colors.lineStrong, backgroundColor: now ? colors.brandSoft : 'transparent' },
      ]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="sm" weight={700} color={now ? 'ink' : 'ink2'}>
          {t('staff.timetable.freePeriod')}
        </Text>
        <Text variant="xs" color="muted">
          {now ? t('staff.timetable.endsIn', { time: formatClock(c.ends_at), count: minutesLeft(c) }) : t('staff.timetable.staffRoom')}
        </Text>
      </View>
      {now ? <Pill label={t('staff.timetable.now')} tone="brand" /> : null}
    </View>
  );
}

/** A cover period as a lavender ticket: whose class, why, who assigned it; then the handover note. */
function Cover({ cell: c }: { cell: PeriodCell }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const cover = c.cover!;
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(cover.note);
  const save = useMutation({
    mutationFn: () => api.coverNote(cover.id, note.trim()),
    onSuccess: () => {
      toast(t('staff.timetable.noteSent', { name: cover.for_first_name ?? '' }));
      setOpen(false);
      void client.invalidateQueries({ queryKey: ['staff-timetable'] });
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });
  return (
    <>
      <View style={[styles.row, { backgroundColor: colors.pLav, borderRadius: 18, alignItems: 'stretch' }]}>
        <View style={{ flex: 1, minWidth: 0, padding: 16, paddingRight: 8, gap: 4 }}>
          <Text variant="xxs" weight={800} rawColor={colors.pLavInk} style={{ letterSpacing: 1.3, textTransform: 'uppercase' }}>
            {t('staff.timetable.cover')}
          </Text>
          <Text variant="h3" style={{ fontSize: 20 }}>
            {c.class?.short_label} {c.subject}
          </Text>
          <Text variant="xs" color="ink2">
            {t('staff.timetable.coverFor', { name: cover.for ?? '', reason: cover.reason, room: c.room ?? '' })}
          </Text>
          <Text variant="xxs" color="muted" weight={600}>
            {t('staff.timetable.assigned', { name: cover.assigned_by ?? '', time: formatTime(new Date(cover.assigned_at)) })}
          </Text>
        </View>
        <TearV onCard />
        <View style={{ width: 84, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 }}>
          <Text variant="xxs" weight={700} color="ink2" num>
            {`${clockShort(c.starts_at)}–${clockShort(c.ends_at)}`}
          </Text>
          {c.state === 'done' ? (
            <Stamp tone="ok" rotate={-8}>
              {t('staff.timetable.done')}
            </Stamp>
          ) : null}
        </View>
      </View>
      {cover.for ? (
        cover.note ? (
          <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.sunken, gap: 4 }}>
            <Text variant="xxs" color="muted" weight={700} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('staff.timetable.handover', { name: cover.for_first_name ?? '' })}
            </Text>
            <Text variant="sm">{cover.note}</Text>
            <Button title={t('staff.timetable.editNote')} variant="ghost" size="sm" height={36} icon="pencil" onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start' }} />
          </View>
        ) : (
          <Button title={t('staff.timetable.addNote', { name: cover.for_first_name ?? '' })} icon="pencil" height={48} fullWidth onPress={() => setOpen(true)} />
        )
      ) : null}
      <Sheet visible={open} onClose={() => setOpen(false)} title={t('staff.timetable.noteTitle', { name: cover.for_first_name ?? '' })} message={t('staff.timetable.noteBody', { class: c.class?.short_label ?? '' })}>
        <TextField value={note} onChangeText={setNote} multiline maxLength={1000} style={{ minHeight: 120 }} placeholder={t('staff.timetable.notePlaceholder')} />
        <Button title={t('staff.timetable.sendNote')} icon="send" size="lg" fullWidth disabled={!note.trim()} loading={save.isPending} onPress={() => save.mutate()} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  time: { width: 46 },
  block: { minHeight: 64, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14 },
  cls: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.5, minWidth: 44 },
});
