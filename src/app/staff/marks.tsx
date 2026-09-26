import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { MarkSheetDetail } from '@/api/types';
import { shortExam } from '@/features/staff/common';
import { formatTime, monthName, parseDate, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { AppBar, Button, EmptyState, ErrorState, Highlight, Icon, ICON_SIZE, LoadingCards, Paper, Pill, pointer, Screen, StickyNote, TearCal, Text, useToast } from '@/ui';

const FIRST_ROWS = 12;
type Draft = Record<string, string>; // "" empty · "AB" absent · "34" marks

/** StaffMarks: type marks for one exam paper. It autosaves as a draft; submit sends it to the exam cell for review. */
export default function StaffMarks() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { sheet: sheetParam, class: classParam } = useLocalSearchParams<{ sheet?: string; class?: string }>();
  const sheets = useQuery({ queryKey: ['teacher-marks'], queryFn: api.teacherMarks, enabled: !sheetParam });
  const open = (sheets.data?.sheets ?? []).filter((s) => s.status === 'open');
  const sheetId = sheetParam ?? (classParam ? open.find((s) => s.class.id === classParam)?.id : open[0]?.id);
  const query = useQuery({ queryKey: ['marksheet', sheetId], queryFn: () => api.markSheet(sheetId as string), enabled: !!sheetId });
  const client = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);
  const dirty = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheet = query.data;

  useEffect(() => {
    if (!sheet) return;
    setDraft((prev) => {
      const next: Draft = {};
      for (const s of sheet.students) next[s.id] = dirty.current.has(s.id) ? (prev[s.id] ?? '') : s.absent ? 'AB' : s.marks != null ? String(s.marks) : '';
      return next;
    });
    // Mark sheets load once per visit; keep local edits while a save is in flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet?.id]);

  const save = useMutation({
    mutationFn: (ids: string[]) =>
      api.saveMarks(
        sheetId as string,
        ids.map((id) => {
          const v = (draft[id] ?? '').trim().toUpperCase();
          return v === 'AB' ? { student_id: id, absent: true } : { student_id: id, marks: v === '' ? null : Number(v) };
        }),
      ),
    onSuccess: (next, ids) => {
      ids.forEach((id) => dirty.current.delete(id));
      client.setQueryData(['marksheet', sheetId], next);
      setErrors((prev) => {
        const out = { ...prev };
        ids.forEach((id) => delete out[id]);
        return { ...out, ...(next.errors ?? {}) };
      });
      void client.invalidateQueries({ queryKey: ['teacher-marks'] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  const submit = useMutation({
    mutationFn: () => api.submitMarks(sheetId as string),
    onSuccess: (next) => {
      client.setQueryData(['marksheet', sheetId], next);
      void client.invalidateQueries({ queryKey: ['teacher-marks'] });
      void client.invalidateQueries({ queryKey: ['staff-home'] });
      void client.invalidateQueries({ queryKey: ['staff-classes'] });
      toast(t('staff.marks.submitted'));
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    const ids = [...dirty.current];
    if (ids.length) save.mutate(ids);
  };
  const edit = (id: string, value: string) => {
    const v = value.toUpperCase().startsWith('A') ? 'AB' : value.replace(/[^0-9.]/g, '').slice(0, 5);
    setDraft((prev) => ({ ...prev, [id]: v }));
    dirty.current.add(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 1200);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Local checks show instantly; the server's answer replaces them on save.
  const localError = (id: string): string | undefined => {
    const v = draft[id];
    if (!sheet || !v || v === 'AB') return errors[id];
    const n = Number(v);
    if (Number.isNaN(n)) return t('staff.marks.number');
    if (n > sheet.max_marks) return t('staff.marks.overMax', { max: sheet.max_marks });
    return errors[id];
  };
  const students = sheet?.students ?? [];
  const entered = students.filter((s) => (draft[s.id] ?? '') !== '').length;
  const errorCount = students.filter((s) => localError(s.id)).length;
  const left = students.length - entered;
  const shown = expanded ? students : students.slice(0, FIRST_ROWS);
  const rest = students.slice(FIRST_ROWS);
  const restEntered = rest.filter((s) => (draft[s.id] ?? '') !== '').length;

  const footer = sheet?.editable ? (
    <View style={{ gap: 10 }}>
      <View style={[styles.row, { justifyContent: 'center', gap: 6 }]}>
        {errorCount ? <Icon name="alert" size={14} rawColor={colors.bad} /> : null}
        <Text variant="xs" color="muted" align="center">
          {errorCount ? (
            <Text variant="xs" weight={700} color="bad">
              {t('staff.marks.errors', { count: errorCount })}
            </Text>
          ) : null}
          {errorCount && left ? ' · ' : ''}
          {left ? t('staff.marks.left', { count: left }) : errorCount ? '' : t('staff.marks.allIn')}
        </Text>
      </View>
      <View style={[styles.row, { gap: 10 }]}>
        <Button title={t('staff.marks.saveDraft')} variant="secondary" size="lg" loading={save.isPending} onPress={flush} />
        <Button
          title={t('staff.marks.submit')}
          size="lg"
          disabled={!!left || !!errorCount || save.isPending}
          loading={submit.isPending}
          onPress={() => submit.mutate()}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  ) : null;

  return (
    <Screen
      gap={16}
      footer={footer}
      header={
        <AppBar
          back={() => {
            flush();
            router.canGoBack() ? router.back() : router.navigate('/staff/classes');
          }}
          subtitle={sheet ? `${sheet.class.short_label} · ${sheet.subject.name}` : undefined}
          title={t('staff.marks.title')}
        />
      }>
      {query.error || sheets.error ? <ErrorState error={query.error ?? sheets.error} onRetry={() => void query.refetch()} /> : null}
      {sheets.data && !sheetId ? <EmptyState icon="edit" title={t('staff.marks.none')} message={t('staff.marks.noneHint')} /> : null}
      {sheetId && !sheet ? <LoadingCards count={3} /> : null}
      {sheet ? (
        <>
          <Head sheet={sheet} saving={save.isPending} />
          <Summary sheet={sheet} entered={entered} />
          <Paper pad={0} style={{ overflow: 'hidden', marginBottom: 8 }}>
            <MetaRow sheet={sheet} />
            <TableHead max={sheet.max_marks} />
            {shown.map((s) => (
              <MarkRow
                key={s.id}
                roll={s.roll_no}
                name={s.name}
                value={draft[s.id] ?? ''}
                max={sheet.max_marks}
                percent={dirty.current.has(s.id) ? null : s.percent}
                grade={dirty.current.has(s.id) ? null : s.grade}
                error={localError(s.id)}
                editable={sheet.editable}
                onChange={(v) => edit(s.id, v)}
                onBlur={flush}
              />
            ))}
            {rest.length && !expanded ? (
              <Pressable accessibilityRole="button" onPress={() => setExpanded(true)} style={[styles.row, { justifyContent: 'center', gap: 6, height: 48 }, pointer]}>
                <Text variant="sm" weight={600} color="ink2">
                  {t('staff.marks.showRest', { from: FIRST_ROWS + 1, to: students.length, entered: restEntered, left: rest.length - restEntered })}
                </Text>
                <Icon name="chevronDown" size={ICON_SIZE.sm} rawColor={colors.ink2} />
              </Pressable>
            ) : null}
          </Paper>
          <View style={{ paddingTop: 10, paddingLeft: 48, paddingRight: 24 }}>
            <StickyNote color="lav" tilt="r" tape="right" style={[styles.row, { gap: 10, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 14 }]}>
              <Icon name="lock" size={ICON_SIZE.sm} rawColor={colors.pLavInk} />
              <Text variant="xs" weight={600} style={{ flex: 1 }}>
                {sheet.editable ? t('staff.marks.afterPublish') : sheet.status === 'published' ? t('staff.marks.published') : t('staff.marks.withExamCell')}
              </Text>
            </StickyNote>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function Head({ sheet, saving }: { sheet: MarkSheetDetail; saving: boolean }) {
  const { t } = useTranslation();
  const due = sheet.due_on;
  const status = sheet.status === 'open' ? (due ? t('staff.marks.draftDue', { day: weekdayName(due, true) }) : t('staff.marks.draft')) : t(`staff.marks.status_${sheet.status}`);
  return (
    <View style={[styles.row, { gap: 14, alignItems: 'flex-start' }]}>
      {due ? <TearCal size="sm" month={monthName(due, true)} day={parseDate(due).getDate()} dow={weekdayName(due, true)} /> : null}
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
          <Pill label={status} tone={sheet.status === 'open' ? 'warn' : sheet.status === 'submitted' ? 'info' : 'ok'} dot={false} />
          <Text variant="xs" color="muted" weight={600}>
            {saving ? t('staff.marks.saving') : sheet.saved_at ? t('staff.marks.autosaved', { time: formatTime(new Date(sheet.saved_at)) }) : ''}
          </Text>
        </View>
        <Text variant="h4" accessibilityRole="header">
          {`${sheet.exam.name} · ${sheet.subject.name} · ${sheet.class.short_label}`}
        </Text>
        <Text variant="xs" color="muted">
          {t('staff.marks.meta', { max: sheet.max_marks, count: sheet.total })}
        </Text>
      </View>
    </View>
  );
}

/** "30 of 34 entered. So far the class averages 29.6 of 40 — that's 74%, a B+." */
function Summary({ sheet, entered }: { sheet: MarkSheetDetail; entered: number }) {
  const { t } = useTranslation();
  return (
    <Text variant="body" color="ink2" style={{ lineHeight: 22 }}>
      <Text variant="body" weight={700} color="ink">
        {t('staff.marks.entered', { entered, total: sheet.total })}
      </Text>{' '}
      {sheet.average != null && sheet.percent != null ? (
        <Trans
          i18nKey="staff.marks.averages"
          values={{ average: sheet.average, max: sheet.max_marks, percent: Math.round(sheet.percent), grade: sheet.grade ?? '' }}
          components={{ h: <Highlight color="lav" /> }}
        />
      ) : null}
    </Text>
  );
}

function MetaRow({ sheet }: { sheet: MarkSheetDetail }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const cell = (label: string, value: string, flex: number, last?: boolean) => (
    <View style={[{ flex, paddingVertical: 10, paddingHorizontal: 14 }, !last && { borderRightWidth: 1, borderRightColor: colors.line }]}>
      <Text variant="xxs" color="muted" weight={700} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text variant="sm" weight={700}>
        {value}
      </Text>
    </View>
  );
  return (
    <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
      {cell(t('staff.marks.class'), sheet.class.short_label, 1)}
      {cell(t('staff.marks.paper'), `${shortExam(sheet.exam.name)} ${sheet.subject.name === 'Mathematics' ? 'Maths' : sheet.subject.name}`, 1.6)}
      {cell(t('staff.marks.outOf'), String(sheet.max_marks), 1, true)}
    </View>
  );
}

function TableHead({ max }: { max: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const th = { letterSpacing: 0.9, textTransform: 'uppercase' as const };
  return (
    <View style={[styles.row, { height: 34, borderBottomWidth: 1, borderBottomColor: colors.line }]}>
      <Text variant="xxs" color="muted" weight={700} align="center" style={[styles.no, th, { borderRightColor: colors.lineStrong }]}>
        {t('staff.attendance.no')}
      </Text>
      <Text variant="xxs" color="muted" weight={700} style={[th, { flex: 1, paddingLeft: 12 }]}>
        {t('staff.marks.student')}
      </Text>
      <Text variant="xxs" color="muted" weight={700} align="center" style={[th, { width: 76 }]}>
        / {max}
      </Text>
      <Text variant="xxs" color="muted" weight={700} align="right" style={[th, { width: 46 }]}>
        %
      </Text>
      <Text variant="xxs" color="muted" weight={700} align="right" style={[th, { width: 40, paddingRight: 12 }]}>
        {t('staff.marks.gr')}
      </Text>
    </View>
  );
}

function MarkRow({
  roll,
  name,
  value,
  max,
  percent,
  grade,
  error,
  editable,
  onChange,
  onBlur,
}: {
  roll: number;
  name: string;
  value: string;
  max: number;
  percent: number | null;
  grade: string | null;
  error?: string;
  editable: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const absent = value === 'AB';
  const empty = value === '';
  const pct = useMemo(() => {
    if (percent != null) return Math.round(percent);
    const n = Number(value);
    return value && !absent && !Number.isNaN(n) && n <= max ? Math.round((n * 100) / max) : null;
  }, [percent, value, absent, max]);
  return (
    <View style={[{ borderBottomWidth: 1, borderBottomColor: colors.line }, error ? { backgroundColor: colors.pPink } : null]}>
      <View style={[styles.row, { minHeight: 58 }]}>
        <View style={[styles.no, styles.row, { justifyContent: 'center', gap: 3, alignSelf: 'stretch', borderRightColor: colors.lineStrong }]}>
          {error ? <Icon name="flag" size={12} rawColor={colors.bad} /> : null}
          <Text variant="sm" weight={700} num rawColor={colors.pPinkInk}>
            {String(roll).padStart(2, '0')}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, paddingLeft: 12 }}>
          <Text variant="sm" weight={700} numberOfLines={1}>
            {name}
          </Text>
          {absent ? (
            <Text variant="xs" color="muted">
              {t('staff.marks.absentOnDay')}
            </Text>
          ) : null}
        </View>
        <View style={{ width: 76, alignItems: 'center' }}>
          <TextInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            editable={editable}
            keyboardType="default"
            autoCapitalize="characters"
            accessibilityLabel={t('staff.marks.inputLabel', { name, max })}
            placeholder="–"
            placeholderTextColor={colors.faint}
            style={[
              styles.input,
              { color: error ? colors.bad : colors.ink, backgroundColor: absent ? colors.sunken : colors.surface, borderColor: error ? colors.bad : colors.lineStrong },
              empty && { borderStyle: 'dashed' },
              error && { borderWidth: 2 },
              absent && { color: colors.muted },
            ]}
          />
        </View>
        <Text variant="sm" color="ink2" num align="right" style={{ width: 46 }}>
          {pct != null && !error ? `${pct}%` : '—'}
        </Text>
        <Text variant="sm" weight={700} align="right" style={{ width: 40, paddingRight: 12 }}>
          {grade && !error ? grade : '—'}
        </Text>
      </View>
      {error ? (
        <View style={[styles.row, { gap: 6, paddingLeft: 58, paddingBottom: 10, marginTop: -6 }]}>
          <Icon name="alert" size={13} rawColor={colors.bad} />
          <Text variant="xs" weight={600} color="bad">
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  no: { width: 46, borderRightWidth: 1 },
  input: { width: 64, height: 44, borderWidth: 1, borderRadius: 12, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 16 },
});
