import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { StaffStudent } from '@/api/types';
import { Dumbbell } from '@/features/charts/Dumbbell';
import { calendarWeeks, markFor } from '@/features/parent/register';
import { formatDate, monthName } from '@/lib/format';
import { useActiveSchool } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  AppBar,
  Avatar,
  Button,
  Card,
  Chip,
  ErrorState,
  Icon,
  IconButton,
  Kicker,
  Legend,
  LoadingCards,
  Pill,
  RegisterDot,
  Screen,
  SegmentedControl,
  StickyNote,
  Text,
  TextField,
  useToast,
} from '@/ui';

const TONES = ['positive', 'concern', 'info'] as const;
type Tone = (typeof TONES)[number];

/** StaffStudents: one student as their teacher sees them, with a quick way to add a remark. */
export default function StaffStudentProfile() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ['staff-student', id], queryFn: () => api.staffStudent(id), enabled: !!id });
  const data = query.data;
  const go = (to: string | null | undefined) => to && router.setParams({ id: to });

  return (
    <Screen
      dock
      gap={18}
      refreshing={query.isRefetching}
      onRefresh={query.refetch}
      header={
        <AppBar
          back={() => (router.canGoBack() ? router.back() : router.navigate('/staff/classes'))}
          subtitle={data ? t('staff.student.position', { class: data.student.class, index: data.position.index, total: data.position.total }) : undefined}
          title={t('staff.student.title')}
          titleVariant="h2"
          theme={false}
          actions={
            data ? (
              <>
                <IconButton icon="chevronLeft" size="lg" disabled={!data.position.previous} label={t('staff.student.previous')} onPress={() => go(data.position.previous)} />
                <IconButton icon="chevronRight" size="lg" disabled={!data.position.next} label={t('staff.student.next')} onPress={() => go(data.position.next)} />
              </>
            ) : null
          }
        />
      }>
      {query.error ? <ErrorState error={query.error} onRetry={query.refetch} /> : null}
      {!data ? <LoadingCards count={3} /> : null}
      {data ? (
        <>
          <IdCard data={data} />
          {data.subject?.exams.length ? <UnitTests data={data} /> : null}
          <View style={[styles.row, { gap: 12, alignItems: 'stretch' }]}>
            <MonthCard data={data} />
            <HomeworkCard data={data} />
          </View>
          <Remarks data={data} />
          <AddRemark data={data} />
        </>
      ) : null}
    </Screen>
  );
}

function IdCard({ data }: { data: StaffStudent }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const school = useActiveSchool();
  const toast = useToast();
  const s = data.student;
  const g = data.guardian;
  const chat = useMutation({
    mutationFn: () =>
      api.startConversation({ kind: 'user', user_id: g!.user_id, name: g!.name, initials: g!.initials, subtitle: '', student: { id: s.id, name: s.name, first_name: s.first_name } }),
    onSuccess: (c) => router.push(`/chat/${c.id}`),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  const field = (label: string, value: string | number | null | undefined) => (
    <View style={{ minWidth: '45%' }}>
      <Text variant="xxs" color="muted" weight={700} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text variant="sm" weight={700} num>
        {value ?? '—'}
      </Text>
    </View>
  );
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <View style={[styles.row, { justifyContent: 'space-between', paddingHorizontal: 16, height: 44, backgroundColor: colors.brandSoft }]}>
        <Text variant="xs" weight={700} rawColor={colors.brandInk}>
          {school?.name}
        </Text>
        <Text variant="xxs" weight={800} rawColor={colors.brandInk} style={{ letterSpacing: 1.3, textTransform: 'uppercase' }}>
          {t('staff.student.band', { year: school?.academic_year ?? '' })}
        </Text>
      </View>
      <View style={{ position: 'absolute', top: 6, alignSelf: 'center', width: 40, height: 6, borderRadius: 3, backgroundColor: colors.surface, opacity: 0.8 }} />
      <View style={[styles.row, { padding: 16, gap: 16, alignItems: 'flex-start' }]}>
        <View style={[styles.photo, { backgroundColor: colors.brandSoft, boxShadow: `inset 0 0 0 1px ${colors.brandLine}` }]}>
          <Text rawColor={colors.brandInk} style={{ fontFamily: fonts.display, fontSize: 28 }}>
            {s.initials}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
          <Text variant="h2">{s.name}</Text>
          <View style={[styles.row, { flexWrap: 'wrap', rowGap: 8, columnGap: 12 }]}>
            {field(t('staff.student.class'), s.class)}
            {field(t('staff.student.roll'), s.roll_no)}
            {field(t('staff.student.house'), s.house)}
            {field(t('staff.student.bus'), s.bus ?? t('staff.student.noBus'))}
            {field(t('staff.student.adm'), s.admission_no)}
          </View>
        </View>
      </View>
      {g ? (
        <View style={{ marginHorizontal: 16, paddingVertical: 14, gap: 10, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.lineStrong }}>
          <View style={[styles.row, { gap: 10 }]}>
            <Avatar initials={g.initials} size="sm" tone={5} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="xxs" color="muted" weight={700} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
                {t(`staff.student.rel_${g.relationship}`, { defaultValue: g.relationship })}
              </Text>
              <Text variant="sm" weight={700} numberOfLines={1}>
                {g.name}
              </Text>
              <Text variant="xs" color="muted" num>
                {g.phone}
              </Text>
            </View>
            <Button title={t('staff.student.message')} variant="secondary" height={44} loading={chat.isPending} onPress={() => chat.mutate()} />
          </View>
          <View style={[styles.row, { gap: 6 }]}>
            <Icon name="shield" size={13} rawColor={colors.muted} />
            <Text variant="xs" color="muted">
              {data.is_class_teacher ? t('staff.student.ctView') : t('staff.student.stView')}
            </Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function UnitTests({ data }: { data: StaffStudent }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const exams = data.subject!.exams;
  const [prev, last] = exams.length > 1 ? exams.slice(-2) : [undefined, exams[0]];
  const up = prev ? Math.round(last.percent - prev.percent) : 0;
  const avgUp = prev && last.class_average != null && prev.class_average != null ? Math.round(last.class_average - prev.class_average) : null;
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));
  return (
    <Card pastel="lav" pad={16} style={{ gap: 12 }}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text variant="h4">{t('staff.student.unitTests', { subject: data.subject!.name })}</Text>
        <Text variant="xs" color="muted" weight={600}>
          {t('staff.student.outOf100')}
        </Text>
      </View>
      {prev ? (
        <Text variant="sm" color="ink2">
          {t(up >= 0 ? 'staff.student.wentUp' : 'staff.student.wentDown', { name: data.student.first_name, from: Math.round(prev.percent), to: Math.round(last.percent), count: Math.abs(up) })}
          {avgUp !== null ? ` ${t(avgUp >= 0 ? 'staff.student.avgUp' : 'staff.student.avgDown', { count: Math.abs(avgUp), from: Math.round(prev.class_average!), to: Math.round(last.class_average!) })}` : ''}
        </Text>
      ) : null}
      {prev ? (
        <Dumbbell
          labelWidth={88}
          rowHeight={32}
          accessibilityLabel={t('staff.student.chartLabel')}
          rows={[
            { label: data.student.first_name, from: prev.percent, to: last.percent, highlight: true, note: `${Math.round(last.percent)} ${sign(up)}` },
            ...(avgUp !== null
              ? [{ label: t('staff.student.classAverage', { class: data.student.class }), from: prev.class_average!, to: last.class_average!, note: `${Math.round(last.class_average!)} ${sign(avgUp)}`, color: colors.c2 }]
              : []),
          ]}
        />
      ) : null}
      <Legend
        items={[
          { label: prev?.name ?? '', color: colors.ink, shape: 'ring' },
          { label: last.name, color: colors.ink, shape: 'dot' },
        ]}
        style={{ columnGap: 14 }}
      />
    </Card>
  );
}

function MonthCard({ data }: { data: StaffStudent }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const month = data.attendance;
  const weeks = calendarWeeks(month.days).map((w) => w.slice(0, 6));
  const today = new Date().toISOString().slice(0, 10);
  const absent = month.days.filter((d) => d.status === 'absent' || d.status === 'excused');
  const late = month.days.filter((d) => d.status === 'late');
  return (
    <Card pastel="mint" pad={14} style={{ flex: 1, gap: 10 }}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text variant="xs" weight={700} rawColor={colors.pMintInk}>
          {monthName(`${month.month}-01`)}
        </Text>
        {month.summary.percent != null ? (
          <Text variant="xs" weight={700}>
            {Math.round(month.summary.percent)}%
          </Text>
        ) : null}
      </View>
      <View style={{ gap: 5 }} accessible accessibilityLabel={t('staff.student.monthLabel', { present: month.summary.present, days: month.summary.school_days })}>
        <View style={styles.row}>
          {['M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Text key={i} variant="xxs" color="muted" weight={700} align="center" style={{ flex: 1 }}>
              {d}
            </Text>
          ))}
        </View>
        {weeks
          .filter((w) => w.some(Boolean))
          .map((w, i) => (
            <View key={i} style={styles.row}>
              {w.map((d, k) => (
                <View key={k} style={{ flex: 1, alignItems: 'center' }}>
                  {d ? (
                    <View style={d.date === today ? { borderRadius: 8, boxShadow: `0 0 0 2px ${colors.pMint}, 0 0 0 3.5px ${colors.ok}` } : undefined}>
                      <RegisterDot mark={markFor(d)} />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
      </View>
      <View style={{ marginTop: 'auto' }}>
        <Text variant="kpiSm" style={{ fontSize: 22 }}>
          {t('staff.home.ofTotal', { present: month.summary.present, total: month.summary.school_days })}
        </Text>
        <Text variant="xxs" color="ink2" weight={600}>
          {[
            t('staff.student.days'),
            ...absent.map((d) => t('staff.student.absentOn', { date: formatDate(d.date) })),
            ...late.map((d) => t('staff.student.lateOn', { date: formatDate(d.date) })),
          ].join(' · ')}
        </Text>
      </View>
    </Card>
  );
}

function HomeworkCard({ data }: { data: StaffStudent }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const hw = data.homework;
  return (
    <Card pad={14} style={{ flex: 1, gap: 10 }}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text variant="xs" weight={700} rawColor={colors.pPeachInk}>
          {t('staff.student.homework')}
        </Text>
        <Text variant="xs" color="muted" weight={600}>
          {t('staff.student.term')}
        </Text>
      </View>
      <View style={[styles.row, { flexWrap: 'wrap', gap: 3 }]} accessible accessibilityLabel={t('staff.student.homeworkLabel', { done: hw.handed_in, total: hw.total })}>
        {hw.cells.map((done, i) => (
          <View
            key={i}
            style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: done ? colors.pPeachInk : 'transparent', borderWidth: done ? 0 : 1.5, borderColor: colors.bad }}
          />
        ))}
      </View>
      <View style={{ marginTop: 'auto' }}>
        <Text variant="kpiSm" style={{ fontSize: 22 }}>
          {t('staff.home.ofTotal', { present: hw.handed_in, total: hw.total })}
        </Text>
        <Text variant="xxs" color="ink2" weight={600}>
          {t('staff.student.handedIn', { count: hw.total - hw.handed_in })}
        </Text>
      </View>
    </Card>
  );
}

function Remarks({ data }: { data: StaffStudent }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [first, ...rest] = data.remarks;
  if (!first) return null;
  const pill = (tone: Tone) => <Pill label={t(`staff.student.tone_${tone}`)} tone={tone === 'positive' ? 'ok' : tone === 'concern' ? 'warn' : 'neutral'} dot={false} />;
  const byline = (r: StaffStudent['remarks'][number]) => `${r.mine ? t('staff.student.you') : r.author} · ${formatDate(r.created_at)}`;
  return (
    <View style={{ gap: 14 }}>
      <Kicker>{t('staff.student.remarks', { count: data.remarks.length })}</Kicker>
      <View style={{ paddingHorizontal: 4 }}>
        <StickyNote color="pink" tilt="r" tape="center" style={{ paddingTop: 26, paddingHorizontal: 18, paddingBottom: 16, gap: 12 }}>
          <View style={[styles.row, { justifyContent: 'space-between', gap: 8 }]}>
            {pill(first.tone)}
            <Text variant="xxs" color="muted" weight={600}>
              {first.visibility === 'staff' ? t('staff.student.staffOnly') : t('staff.student.familySees')}
            </Text>
          </View>
          <Text style={{ fontSize: 16, lineHeight: 24 }} weight={500}>
            {first.body}
          </Text>
          <View style={[styles.row, { gap: 8 }]}>
            {first.author_initials ? (
              <Text variant="xxs" weight={800} rawColor={colors.pPinkInk}>
                {first.author_initials}
              </Text>
            ) : null}
            <Text variant="xs" weight={700}>
              {byline(first)}
            </Text>
          </View>
        </StickyNote>
      </View>
      {rest.length ? (
        <View style={[styles.row, { gap: 14, alignItems: 'flex-start', paddingHorizontal: 4 }]}>
          {rest.slice(0, 2).map((r, i) => (
            <View key={r.id} style={{ flex: 1, marginTop: i ? 8 : 0 }}>
              <StickyNote color="pink" tilt={i ? 'r' : 'l'} pin style={{ paddingTop: 28, paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
                {pill(r.tone)}
                <Text variant="sm" style={{ lineHeight: 19 }}>
                  {r.body}
                </Text>
                <Text variant="xs" weight={700}>
                  {byline(r)}
                </Text>
              </StickyNote>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function AddRemark({ data }: { data: StaffStudent }) {
  const { t } = useTranslation();
  const toast = useToast();
  const client = useQueryClient();
  const [tone, setTone] = useState<Tone>('positive');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'family' | 'staff'>('family');
  const post = useMutation({
    mutationFn: () => api.addRemark(data.student.id, body.trim(), tone, visibility),
    onSuccess: () => {
      toast(visibility === 'family' ? t('staff.student.posted', { name: data.student.first_name }) : t('staff.student.postedStaff'));
      setBody('');
      void client.invalidateQueries({ queryKey: ['staff-student', data.student.id] });
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });
  return (
    <Card pad={18} style={{ gap: 14 }}>
      <Text variant="h3">{t('staff.student.addRemark')}</Text>
      <View style={{ gap: 8 }}>
        <Text variant="sm" weight={600} color="ink2">
          {t('staff.student.type')}
        </Text>
        <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
          {TONES.map((k) => (
            <Chip key={k} label={t(`staff.student.tone_${k}`)} selected={tone === k} onPress={() => setTone(k)} style={{ height: 44 }} />
          ))}
        </View>
      </View>
      <TextField
        label={t('staff.student.remark')}
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={300}
        style={{ minHeight: 110 }}
        placeholder={t('staff.student.remarkPlaceholder', { name: data.student.first_name })}
        hint={t('staff.student.chars', { count: body.length })}
      />
      <View style={{ gap: 8 }}>
        <Text variant="sm" weight={600} color="ink2">
          {t('staff.student.visibleTo')}
        </Text>
        <SegmentedControl
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: 'family', label: t('staff.student.parentStudent') },
            { value: 'staff', label: t('staff.student.staffOnlyOption'), icon: 'lock' },
          ]}
        />
      </View>
      <Button title={t('staff.student.post')} icon="send" size="lg" fullWidth disabled={!body.trim()} loading={post.isPending} onPress={() => post.mutate()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  photo: { width: 80, height: 96, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});

