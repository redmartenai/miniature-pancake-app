import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { CoverBoard, PrincipalAttendance } from '@/api/types';
import { useRefetchOnFocus } from '@/features/common/useRefetchOnFocus';
import { CoverSheet } from '@/features/principal/CoverSheet';
import { formatDate, formatTime, isoDate, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import {
  AppBar,
  Avatar,
  Button,
  Card,
  DateSheet,
  Delta,
  ErrorState,
  Icon,
  ICON_SIZE,
  IconButton,
  Legend,
  LoadingCards,
  Pill,
  Screen,
  SectionHead,
  SegmentedControl,
  Sheet,
  Text,
  TextField,
  ThemeToggle,
  useToast,
} from '@/ui';

const LOW = 92;

/** PMAttendance: students by grade, chronic absentees, staff by wing, and who's on leave (with cover). */
export default function PrincipalAttendanceScreen() {
  const { t } = useTranslation();
  const [scope, setScope] = useState<'students' | 'staff'>('students');
  const [date, setDate] = useState<string>();
  const [picking, setPicking] = useState(false);
  const query = useQuery({ queryKey: ['principal-attendance', date ?? 'today'], queryFn: () => api.principalAttendance(date) });
  useRefetchOnFocus(query.refetch);
  const data = query.data;
  const day = data?.date ?? isoDate(new Date());

  return (
    <Screen
      dock
      gap={16}
      refreshing={query.isRefetching}
      onRefresh={query.refetch}
      header={
        <AppBar
          subtitle={[`${weekdayName(day, true)}, ${formatDate(day)}`, data ? t('principal.attendance.updated', { time: formatTime(new Date(data.updated_at)) }) : null].filter(Boolean).join(' · ')}
          title={t('principal.attendance.title')}
          theme={false}
          actions={
            <>
              <ThemeToggle />
              <IconButton icon="calendar" size="lg" label={t('principal.attendance.pickDate')} onPress={() => setPicking(true)} />
            </>
          }
        />
      }>
      <SegmentedControl
        value={scope}
        onChange={setScope}
        options={[
          { value: 'students', label: t('principal.attendance.students'), icon: 'users' },
          { value: 'staff', label: t('principal.attendance.staff'), icon: 'briefcase' },
        ]}
        style={{ height: 52 }}
      />
      {query.error ? <ErrorState error={query.error} onRetry={query.refetch} /> : null}
      {!data ? <LoadingCards count={3} /> : null}
      {data && scope === 'students' ? <Students data={data} /> : null}
      {data && scope === 'staff' ? <Staff data={data} /> : null}
      {data?.cover ? <OnLeave board={data.cover} teachers={data.staff.teachers} /> : null}
      <DateSheet visible={picking} onClose={() => setPicking(false)} title={t('principal.attendance.pickDate')} value={day} max={isoDate(new Date())} onPick={setDate} />
    </Screen>
  );
}

function Summary({
  label,
  percent,
  count,
  total,
  parts,
  delta,
  foot,
}: {
  label: string;
  percent: number | null;
  count: number;
  total: number;
  parts: { label: string; value: number; color: string }[];
  delta?: number | null;
  foot: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card pastel="blue" pad={18} style={{ gap: 14 }}>
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
        <View>
          <Text variant="xs" color="muted" weight={600}>
            {label}
          </Text>
          <View style={[styles.row, { gap: 8, alignItems: 'baseline', marginTop: 6 }]}>
            <Text variant="kpi">{percent != null ? `${percent}%` : '—'}</Text>
            <Text variant="sm" color="muted" weight={600} num>
              {t('principal.attendance.of', { count: count.toLocaleString('en-IN'), total: total.toLocaleString('en-IN') })}
            </Text>
          </View>
        </View>
        {delta != null ? (
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Delta value={t('staff.classes.pts', { count: Math.abs(delta) })} direction={delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'} />
            <Text variant="xxs" color="muted" weight={600}>
              {t('principal.attendance.vsAvg')}
            </Text>
          </View>
        ) : null}
      </View>
      <View accessible accessibilityRole="image" accessibilityLabel={parts.map((p) => `${p.value} ${p.label}`).join(', ')} style={[styles.row, { gap: 3, height: 10 }]}>
        {parts
          .filter((p) => p.value)
          .map((p, i, all) => (
            <View
              key={p.label}
              style={{
                flex: p.value,
                minWidth: 4,
                height: 10,
                backgroundColor: p.color,
                borderTopLeftRadius: i === 0 ? 999 : 0,
                borderBottomLeftRadius: i === 0 ? 999 : 0,
                borderTopRightRadius: i === all.length - 1 ? 999 : 0,
                borderBottomRightRadius: i === all.length - 1 ? 999 : 0,
              }}
            />
          ))}
      </View>
      <View style={styles.row}>
        {parts.map((p) => (
          <View key={p.label} style={{ flex: 1 }}>
            <View style={[styles.row, { gap: 6 }]}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.color }} />
              <Text variant="xs" color="muted" weight={600}>
                {p.label}
              </Text>
            </View>
            <Text variant="h3" num style={{ marginTop: 2 }}>
              {p.value.toLocaleString('en-IN')}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ height: 1, backgroundColor: colors.pHr }} />
      <View style={[styles.row, { gap: 8 }]}>
        <Icon name="checkCircle" size={ICON_SIZE.sm} rawColor={colors.ok} />
        <Text variant="xs" color="muted" weight={600}>
          {foot}
        </Text>
      </View>
    </Card>
  );
}

function Bars({ title, rows, mark, markLabel, rightLabel }: { title: string; rows: { label: string; percent: number | null; right: number }[]; mark: number | null; markLabel: string; rightLabel: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card pad={16} style={{ gap: 10, paddingBottom: 12 }}>
      <Text variant="h3">{title}</Text>
      <Legend
        items={[
          { label: t('principal.attendance.pctPresent'), color: colors.c1, shape: 'square' },
          { label: t('principal.attendance.below', { pct: LOW }), color: colors.warn, shape: 'square' },
          { label: markLabel, color: colors.ink2, shape: 'square' },
        ]}
        style={{ columnGap: 14 }}
      />
      <View style={[styles.row, { gap: 10, marginTop: 2 }]}>
        <Text variant="xxs" color="muted" weight={700} style={[styles.caps, { width: 72 }]}>
          {t('principal.attendance.grade')}
        </Text>
        <Text variant="xxs" color="muted" weight={700} style={[styles.caps, { flex: 1 }]}>
          {t('principal.attendance.present')}
        </Text>
        <Text variant="xxs" color="muted" weight={700} align="right" style={[styles.caps, { width: 96 }]}>
          {rightLabel}
        </Text>
      </View>
      {rows.map((r) => {
        const pct = r.percent ?? 0;
        return (
          <View key={r.label} style={[styles.row, { gap: 10, paddingVertical: 7 }]}>
            <Text variant="sm" weight={600} style={{ width: 72 }}>
              {r.label}
            </Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.track }}>
                <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: pct < LOW ? colors.warn : colors.c1 }} />
              </View>
              {mark != null ? <View style={{ position: 'absolute', left: `${mark}%`, top: -5, width: 2, height: 16, marginLeft: -1, borderRadius: 1, backgroundColor: colors.ink2 }} /> : null}
            </View>
            <Text variant="sm" weight={700} num align="right" style={{ width: 50 }}>
              {r.percent != null ? `${r.percent.toFixed(1)}%` : '—'}
            </Text>
            <Text variant="sm" color="muted" num align="right" style={{ width: 36 }}>
              {r.right}
            </Text>
          </View>
        );
      })}
    </Card>
  );
}

function Students({ data }: { data: PrincipalAttendance }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = data.students;
  const delta = s.percent != null && s.average_20 != null ? Math.round((s.percent - s.average_20) * 10) / 10 : null;
  const foot =
    s.sections_marked === s.sections
      ? t('principal.attendance.allMarked', { count: s.sections, time: s.last_marked_at ? formatTime(new Date(s.last_marked_at)) : '' })
      : t('principal.attendance.someMarked', { done: s.sections_marked, total: s.sections });
  return (
    <>
      <Summary
        label={t('principal.attendance.studentsPresent')}
        percent={s.percent}
        count={s.present}
        total={s.total}
        delta={delta}
        parts={[
          { label: t('principal.attendance.presentLabel'), value: s.present, color: colors.ok },
          { label: t('principal.attendance.late'), value: s.late, color: colors.warn },
          { label: t('principal.attendance.absent'), value: s.absent, color: colors.bad },
        ]}
        foot={foot}
      />
      <Bars
        title={t('principal.attendance.byGrade')}
        mark={s.percent}
        markLabel={t('principal.attendance.school', { pct: s.percent ?? 0 })}
        rightLabel={t('principal.attendance.absentCol')}
        rows={s.by_grade.map((g) => ({
          label: g.grade === 'pre_primary' ? t('principal.attendance.prePrimary') : t('principal.attendance.gradeN', { grade: g.grade }),
          percent: g.percent,
          right: g.absent,
        }))}
      />
      <Chronic data={data} />
    </>
  );
}

function Chronic({ data }: { data: PrincipalAttendance }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const [writing, setWriting] = useState(false);
  const list = data.chronic;
  const [body, setBody] = useState('');
  const send = useMutation({
    mutationFn: () => api.messageAbsentees(list.map((c) => c.id), body.trim()),
    onSuccess: (r) => {
      toast(t('principal.attendance.sent', { count: r.sent_to }));
      setWriting(false);
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });
  if (!list.length) return null;
  return (
    <>
      <SectionHead title={t('principal.attendance.chronic')} action={<Pill label={t('principal.attendance.chronicPill', { count: list.length })} tone="bad" />} />
      <Card pad={0} style={{ paddingTop: 4, paddingHorizontal: 16, paddingBottom: 16 }}>
        {list.map((c, i) => (
          <View key={c.id} style={[styles.row, { gap: 12, paddingVertical: 12 }, i < list.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
            <Avatar initials={c.initials} size="sm" seed={c.name} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="sm" weight={700} numberOfLines={1}>
                {c.name}
              </Text>
              <Text variant="xs" color="muted" numberOfLines={1}>
                {[c.class, t('principal.attendance.days', { count: c.days }), c.reason_given ? t('principal.attendance.onLeave') : t('principal.attendance.noReason')].join(' · ')}
              </Text>
            </View>
            {c.guardian ? (
              <IconButton icon="phone" size="lg" label={t('principal.attendance.call', { name: c.guardian.name, child: c.name })} onPress={() => void Linking.openURL(`tel:${c.guardian!.phone}`)} />
            ) : null}
          </View>
        ))}
        <Button
          title={t('principal.attendance.messageAll', { count: list.length })}
          icon="chat"
          variant="secondary"
          height={44}
          fullWidth
          onPress={() => {
            setBody(t('principal.attendance.template'));
            setWriting(true);
          }}
        />
      </Card>
      <Sheet visible={writing} onClose={() => setWriting(false)} title={t('principal.attendance.messageTitle', { count: list.length })} message={t('principal.attendance.messageBody')}>
        <TextField value={body} onChangeText={setBody} multiline maxLength={500} style={{ minHeight: 120 }} />
        <Button title={t('principal.attendance.send')} icon="send" size="lg" fullWidth disabled={!body.trim()} loading={send.isPending} onPress={() => send.mutate()} />
      </Sheet>
    </>
  );
}

function Staff({ data }: { data: PrincipalAttendance }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = data.staff;
  return (
    <>
      <Summary
        label={t('principal.attendance.teachersPresent')}
        percent={s.percent}
        count={s.present}
        total={s.teachers}
        parts={[
          { label: t('principal.attendance.presentLabel'), value: s.present, color: colors.ok },
          { label: t('principal.attendance.onLeaveLabel'), value: s.on_leave, color: colors.info },
        ]}
        foot={t('principal.attendance.support', { present: s.support_present, total: s.support })}
      />
      <Bars
        title={t('principal.attendance.byWing')}
        mark={s.percent}
        markLabel={t('principal.attendance.allStaff', { pct: s.percent ?? 0 })}
        rightLabel={t('principal.attendance.onLeaveCol')}
        rows={s.by_wing.map((w) => ({ label: t(`principal.attendance.wing_${w.wing}`), percent: w.percent, right: w.on_leave }))}
      />
    </>
  );
}

function OnLeave({ board, teachers }: { board: CoverBoard; teachers: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  if (!board.on_leave.length) return null;
  return (
    <>
      <SectionHead
        title={t('principal.attendance.staffOnLeave')}
        action={
          <Text variant="xs" color="muted" weight={600}>
            {t('principal.attendance.ofTeachers', { count: board.on_leave.length, total: teachers })}
          </Text>
        }
      />
      <Card pad={0} style={{ paddingTop: 4, paddingHorizontal: 16, paddingBottom: 16, gap: 4 }}>
        {board.on_leave.map((l, i) => (
          <View key={l.id} style={[styles.row, { gap: 12, paddingVertical: 12 }, i < board.on_leave.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
            <Avatar initials={l.initials} size="sm" seed={l.name} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="sm" weight={700} numberOfLines={1}>
                {l.name}
              </Text>
              <Text variant="xs" color="muted" numberOfLines={1}>
                {[l.subject, t(`principal.leaveKind.${l.leave_kind}`).toLowerCase() + ' ' + t('principal.attendance.leave')].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {l.uncovered ? <Pill label={t('principal.attendance.uncovered', { count: l.uncovered })} tone="warn" /> : <Pill label={t('principal.attendance.covered')} tone="ok" />}
          </View>
        ))}
        {board.open ? (
          <View style={[styles.row, { gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.sunken, marginTop: 8 }]}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.pPeach, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="clock" size={ICON_SIZE.sm} rawColor={colors.pPeachInk} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="sm" weight={700}>
                {t('principal.attendance.uncoveredTotal', { count: board.open })}
              </Text>
              <Text variant="xs" color="muted">
                {t('principal.attendance.freeToCover', { count: board.free_teachers })}
              </Text>
            </View>
            <Button title={t('principal.attendance.assign')} height={44} onPress={() => setOpen(true)} />
          </View>
        ) : null}
      </Card>
      <CoverSheet board={board} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  caps: { letterSpacing: 0.7, textTransform: 'uppercase' },
});
