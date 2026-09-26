import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { AttendanceStatus, RosterEntry } from '@/api/types';
import { RollDots } from '@/features/staff/common';
import { formatDate, formatTime, weekdayName } from '@/lib/format';
import { newClientId } from '@/lib/ids';
import { useTheme } from '@/theme/ThemeProvider';
import { AppBar, Button, Chip, EmptyState, ErrorState, Icon, ICON_SIZE, LoadingCards, Paper, pointer, RegisterDot, Screen, StickyNote, Text, useToast } from '@/ui';

type Mark = 'present' | 'absent' | 'late';
const FIRST_ROWS = 14;

/** StaffAttendance: the morning roll call. Everyone starts present; tap A or L for the exceptions, then submit. */
export default function StaffAttendance() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { class: classParam } = useLocalSearchParams<{ class?: string }>();
  const classes = useQuery({ queryKey: ['staff-classes'], queryFn: api.staffClasses });
  // Default to the class the teacher is class teacher of.
  const fallback = classes.data?.classes.find((c) => c.is_class_teacher) ?? classes.data?.classes[0];
  const classId = classParam ?? fallback?.id;
  const roster = useQuery({ queryKey: ['roster', classId], queryFn: () => api.classRoster(classId as string), enabled: !!classId });
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [expanded, setExpanded] = useState(false);
  const toast = useToast();
  const client = useQueryClient();

  useEffect(() => {
    if (!roster.data) return;
    setMarks(Object.fromEntries(roster.data.students.map((s) => [s.id, toMark(s.status)])));
    setExpanded(false);
  }, [roster.data]);

  const students = roster.data?.students ?? [];
  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0 };
    for (const s of students) c[marks[s.id] ?? 'present'] += 1;
    return c;
  }, [students, marks]);
  const locked = !!roster.data?.locked;
  const changed = students.some((s) => toMark(s.status) !== (marks[s.id] ?? 'present'));

  const submit = useMutation({
    mutationFn: () =>
      api.markAttendance(
        classId as string,
        students.filter((s) => (marks[s.id] ?? 'present') !== 'present').map((s) => ({ student_id: s.id, status: marks[s.id] })),
        newClientId(),
      ),
    onSuccess: (summary) => {
      toast(t('staff.attendance.saved', { present: summary.present, total: summary.total }));
      void client.invalidateQueries({ queryKey: ['roster', classId] });
      void client.invalidateQueries({ queryKey: ['staff-home'] });
      void client.invalidateQueries({ queryKey: ['staff-classes'] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });

  const label = roster.data?.class.short_label ?? fallback?.short_label ?? '';
  const today = new Date();
  const shown = expanded ? students : students.slice(0, FIRST_ROWS);
  const restAllPresent = students.slice(FIRST_ROWS).every((s) => (marks[s.id] ?? 'present') === 'present');

  const footer = roster.data ? (
    <View style={[styles.row, { gap: 12 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="sm" weight={700}>
          {t('staff.attendance.presentCount', { count: counts.present + counts.late })}
        </Text>
        <Text variant="xs" color="muted">
          {t('staff.attendance.awayCount', { absent: counts.absent, late: counts.late })}
        </Text>
      </View>
      <Button
        title={roster.data.marked ? (changed ? t('staff.attendance.saveChanges') : t('staff.attendance.submitted')) : t('staff.attendance.submit')}
        size="lg"
        disabled={locked || (roster.data.marked && !changed)}
        loading={submit.isPending}
        onPress={() => submit.mutate()}
      />
    </View>
  ) : null;

  return (
    <Screen
      gap={16}
      footer={footer}
      refreshing={roster.isRefetching}
      onRefresh={roster.refetch}
      header={
        <AppBar
          back={() => (router.canGoBack() ? router.back() : router.navigate('/staff'))}
          subtitle={[label, `${weekdayName(today, true)} ${formatDate(today)}`, t('staff.attendance.morningRoll')].filter(Boolean).join(' · ')}
          title={t('staff.attendance.title')}
        />
      }>
      {/* A class teacher lands on their own register; subject teachers pick a class. */}
      {!classParam && !classes.data?.classes.some((c) => c.is_class_teacher) && (classes.data?.classes.length ?? 0) > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          {classes.data!.classes.map((c) => (
            <Chip key={c.id} label={c.short_label} selected={c.id === classId} onPress={() => router.setParams({ class: c.id })} style={{ height: 40 }} />
          ))}
        </ScrollView>
      ) : null}
      {classes.error || roster.error ? <ErrorState error={classes.error ?? roster.error} onRetry={() => void roster.refetch()} /> : null}
      {classes.data && !classId ? <EmptyState icon="users" title={t('staff.classes.none')} /> : null}
      {!roster.data && classId ? <LoadingCards count={3} /> : null}
      {roster.data ? (
        <Paper pad={0} style={{ overflow: 'hidden', marginBottom: 8 }}>
          <View style={{ padding: 16, paddingBottom: 12, gap: 10 }}>
            <View style={[styles.row, { justifyContent: 'space-between', gap: 12 }]}>
              <View style={{ flexShrink: 1 }}>
                <Text variant="xxs" color="muted" weight={700} style={{ letterSpacing: 1.3, textTransform: 'uppercase' }}>
                  {t('staff.attendance.rollCall')}
                </Text>
                <Text variant="h4">{t('staff.attendance.onRoll', { class: label, count: students.length })}</Text>
              </View>
              <Button
                title={t('staff.attendance.allPresent')}
                icon="check"
                variant="secondary"
                size="sm"
                height={40}
                disabled={locked}
                onPress={() => setMarks(Object.fromEntries(students.map((s) => [s.id, 'present' as Mark])))}
              />
            </View>
            <RollDots rolls={students.map((s) => ({ status: marks[s.id] ?? 'present' }))} perRow={20} gap={3} rowGap={5} />
            <View style={[styles.row, { gap: 14 }]}>
              {(['present', 'absent', 'late'] as const).map((k) => (
                <View key={k} style={[styles.row, { gap: 6 }]}>
                  <RegisterDot mark={k === 'present' ? 'p' : k === 'absent' ? 'a' : 'l'} />
                  <Text variant="xs" color="ink2">
                    <Text variant="xs" weight={700} color="ink">
                      {counts[k]}
                    </Text>{' '}
                    {t(`staff.attendance.${k}`).toLowerCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <TableHead count={Math.min(FIRST_ROWS, students.length)} expanded={expanded} total={students.length} />
          {shown.map((s) => (
            <RollRow key={s.id} student={s} mark={marks[s.id] ?? 'present'} locked={locked} onChange={(m) => setMarks((prev) => ({ ...prev, [s.id]: m }))} />
          ))}
          {students.length > FIRST_ROWS && !expanded ? (
            <Pressable accessibilityRole="button" onPress={() => setExpanded(true)} style={[styles.row, styles.more, pointer]}>
              <Text variant="sm" weight={600} color="ink2">
                {t('staff.attendance.showRest', { from: FIRST_ROWS + 1, to: students.length })}
                {restAllPresent ? ` · ${t('staff.attendance.allPresentShort')}` : ''}
              </Text>
              <Icon name="chevronDown" size={ICON_SIZE.sm} rawColor={colors.ink2} />
            </Pressable>
          ) : null}
        </Paper>
      ) : null}
      {roster.data ? (
        <View style={{ paddingTop: 10, paddingRight: 56, paddingLeft: 8 }}>
          <StickyNote color="mint" tilt="l" tape="center" style={[styles.row, { gap: 10, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 14 }]}>
            <Icon name="shield" size={ICON_SIZE.sm} rawColor={colors.pMintInk} />
            <Text variant="xs" weight={600} color="ink" style={{ flex: 1 }}>
              {locked
                ? t('staff.attendance.lockedNote', { time: roster.data.cutoff, at: roster.data.marked_at ? formatTime(new Date(roster.data.marked_at)) : '' })
                : t('staff.attendance.cutoffNote', { time: cutoffLabel(roster.data.cutoff) })}
            </Text>
          </StickyNote>
        </View>
      ) : null}
    </Screen>
  );
}

const toMark = (status: AttendanceStatus | null): Mark => (status === 'absent' || status === 'excused' ? 'absent' : status === 'late' || status === 'half_day' ? 'late' : 'present');

/** "10:00" → "10:00 AM". */
function cutoffLabel(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function TableHead({ count, expanded, total }: { count: number; expanded: boolean; total: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, height: 34 }]}>
      <Text variant="xxs" color="muted" weight={700} align="center" style={[styles.no, styles.th, { borderRightColor: colors.lineStrong }]}>
        {t('staff.attendance.no')}
      </Text>
      <Text variant="xxs" color="muted" weight={700} style={[styles.th, { flex: 1, paddingLeft: 14 }]}>
        {t('staff.attendance.nameRolls', { to: expanded ? total : count })}
      </Text>
      <Text variant="xxs" color="muted" weight={700} align="center" style={[styles.th, { width: 150 }]}>
        P · A · L
      </Text>
    </View>
  );
}

function RollRow({ student: s, mark, locked, onChange }: { student: RosterEntry; mark: Mark; locked: boolean; onChange: (m: Mark) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const bg = mark === 'absent' ? colors.pPink : mark === 'late' ? colors.pPeach : undefined;
  const statusColor = mark === 'absent' ? colors.bad : mark === 'late' ? colors.warn : colors.muted;
  const options: { key: Mark; letter: string; bg: string; ink: string }[] = [
    { key: 'present', letter: 'P', bg: colors.okSoft, ink: colors.ok },
    { key: 'absent', letter: 'A', bg: colors.badSoft, ink: colors.bad },
    { key: 'late', letter: 'L', bg: colors.pPeach, ink: colors.warn },
  ];
  return (
    <View style={[styles.row, { minHeight: 63, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: bg }]}>
      <Text variant="sm" weight={700} num align="center" rawColor={colors.pPinkInk} style={[styles.no, { borderRightColor: colors.lineStrong, alignSelf: 'stretch', textAlignVertical: 'center', paddingTop: 20 }]}>
        {String(s.roll_no).padStart(2, '0')}
      </Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push({ pathname: '/staff/student', params: { id: s.id } })}
        style={[{ flex: 1, minWidth: 0, paddingLeft: 14, paddingVertical: 10 }, pointer]}>
        <Text variant="sm" weight={700} numberOfLines={1}>
          {s.name}
        </Text>
        <Text variant="xs" weight={mark === 'present' ? 500 : 700} rawColor={statusColor}>
          {t(`staff.attendance.${mark}`)}
        </Text>
      </Pressable>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('staff.attendance.markFor', { name: s.name })}
        style={[styles.row, styles.pal, { backgroundColor: colors.surface, borderColor: colors.lineStrong }]}>
        {options.map((o) => {
          const on = mark === o.key;
          return (
            <Pressable
              key={o.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: locked }}
              accessibilityLabel={t(`staff.attendance.${o.key}`)}
              disabled={locked}
              onPress={() => onChange(o.key)}
              style={[styles.palOption, on && { backgroundColor: o.bg }, !locked && pointer]}>
              <Text variant="sm" weight={700} rawColor={on ? o.ink : colors.ink2}>
                {o.letter}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  no: { width: 46, borderRightWidth: 1 },
  th: { letterSpacing: 0.9, textTransform: 'uppercase' },
  pal: { width: 142, height: 48, marginRight: 8, borderRadius: 24, borderWidth: 1, padding: 3, gap: 2 },
  palOption: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  more: { justifyContent: 'center', gap: 6, height: 48 },
});
