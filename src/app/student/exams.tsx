import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { StudentExams } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { downloadFile } from '@/lib/download';
import { clockShort, daysUntil, formatClock, formatDate, monthName, parseDate, weekdayName } from '@/lib/format';
import { useActiveSchool } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  AppBar,
  Button,
  Card,
  Checkbox,
  Diary,
  DiaryHead,
  DiaryRow,
  EmptyState,
  ErrorState,
  Highlight,
  Icon,
  ICON_SIZE,
  Kicker,
  LoadingCards,
  Pill,
  pointer,
  Screen,
  TearCal,
  TearV,
  Text,
  Ticket,
  useToast,
} from '@/ui';

type Paper = NonNullable<StudentExams['papers']>[number];

/** Days between two dates, not counting Sundays. */
function schoolDaysBetween(a: string, b: string): number {
  let n = 0;
  const d = parseDate(a);
  const end = parseDate(b);
  while (d < end) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) n += 1;
  }
  return n;
}

/** "12–23 Oct", or "28 Sep – 3 Oct" across months. */
function range(from: string, to: string): string {
  const a = parseDate(from);
  const b = parseDate(to);
  if (from === to) return formatDate(from);
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${formatDate(to)}` : `${formatDate(from)} – ${formatDate(to)}`;
}

/** StuExams: the countdown, the date sheet, the admit card and a prep checklist. */
export default function StudentExams() {
  const { t } = useTranslation();
  const school = useActiveSchool();
  const family = useFamily();
  const id = family.selected?.id;
  const query = useQuery({ queryKey: ['exams', id], queryFn: () => api.exams(id as string), enabled: !!id });
  const data = query.data;
  const exam = data?.exam;
  const papers = data?.papers ?? [];
  const dates = exam ? range(exam.starts_on, exam.ends_on) : '';

  return (
    <Screen
      gap={18}
      dock
      refreshing={query.isRefetching}
      onRefresh={query.refetch}
      header={<AppBar back={() => router.navigate('/student')} subtitle={exam ? `${exam.name} · ${dates}` : undefined} title={t('student.exams.title')} />}>
      {query.error ? <ErrorState error={query.error} onRetry={query.refetch} /> : null}
      {!data ? <LoadingCards count={3} /> : null}
      {data && !exam ? <EmptyState icon="calendar" title={t('student.exams.none')} /> : null}
      {exam && id ? (
        <>
          <Countdown data={data} term={school?.term ?? null} />
          <DateSheet papers={papers} dates={dates} />
          <DownloadButton path={exam.datesheet} filename={`${exam.name.replace(/\s+/g, '_')}_date_sheet.pdf`} title={t('student.exams.downloadSheet')} />
          <AdmitCard data={data} term={school?.term ?? null} />
          {data.prep?.length ? <Prep items={data.prep} studentId={id} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

/** "Your first paper, English, is in 20 days. Six papers, one every other day." */
function Countdown({ data, term }: { data: StudentExams; term: string | null }) {
  const { t } = useTranslation();
  const exam = data.exam!;
  const papers = data.papers ?? [];
  const first = papers[0];
  if (!first) return null;
  const days = daysUntil(first.date);
  const gaps = papers.slice(1).map((p, i) => schoolDaysBetween(papers[i].date, p.date));
  const rhythm = !gaps.length ? '' : gaps.every((g) => g === 1) ? 'daily' : gaps.every((g) => g === 2) ? 'otherDay' : 'spread';
  const sameSlot = papers.every((p) => p.starts_at === first.starts_at && p.ends_at === first.ends_at && p.room === first.room);
  const count = t(`student.exams.number.${papers.length}`, { defaultValue: String(papers.length) });
  return (
    <View style={{ gap: 12, paddingTop: 4, paddingHorizontal: 2 }}>
      <Kicker>{[t('student.exams.kicker', { name: exam.name }), term].filter(Boolean).join(' · ')}</Kicker>
      <Text style={styles.sentence}>
        <Trans
          i18nKey={days <= 0 ? 'student.exams.today' : 'student.exams.firstIn'}
          values={{ subject: first.subject.name, count: days }}
          components={{ m: <Highlight color="lav" /> }}
        />
        {papers.length > 1 ? ` ${t(`student.exams.rhythm_${rhythm}`, { count: papers.length, number: count.charAt(0).toUpperCase() + count.slice(1) })}` : ''}
      </Text>
      <Text variant="sm" color="ink2">
        {[
          sameSlot ? t('student.exams.everyPaper', { time: `${clockShort(first.starts_at)}–${formatClock(first.ends_at)}`, room: first.room }) : t('student.exams.eachPaper'),
          exam.report_by ? t('student.exams.reportBy', { time: clockShort(exam.report_by) }) : null,
        ]
          .filter(Boolean)
          .join(' ')}
      </Text>
    </View>
  );
}

function Syllabus({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <View style={[styles.row, { gap: 6, flexWrap: 'wrap' }]}>
      {items.map((s) => (
        <Pill key={s} label={s} tone="outline" dot={false} />
      ))}
    </View>
  );
}

function DateSheet({ papers, dates }: { papers: Paper[]; dates: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [first, ...rest] = papers;
  if (!first) return null;
  const sameSlot = papers.every((p) => p.starts_at === first.starts_at && p.ends_at === first.ends_at && p.room === first.room);
  const slot = (p: Paper) => (sameSlot ? null : `${clockShort(p.starts_at)}–${formatClock(p.ends_at)} · ${p.room}`);
  const cal = (p: Paper, size: 'sm' | 'md') => (
    <TearCal size={size} month={monthName(p.date, true)} day={parseDate(p.date).getDate()} dow={weekdayName(p.date, true)} headColor={colors.pLavInk} />
  );
  return (
    <View style={{ gap: 12 }} accessibilityLabel={t('student.exams.dateSheet')}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text variant="h3" accessibilityRole="header">
          {t('student.exams.dateSheet')}
        </Text>
        <Text variant="xs" color="muted" weight={600}>
          {t('student.exams.papersIn', { count: papers.length, dates })}
        </Text>
      </View>
      <Card pastel="lav" pad={16} style={[styles.row, { gap: 16, alignItems: 'flex-start' }]}>
        {cal(first, 'md')}
        <View style={{ flex: 1, minWidth: 0, gap: 8, paddingTop: 2 }}>
          <Text variant="xxs" weight={800} rawColor={colors.pLavInk} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>
            {t('student.exams.firstPaper')}
          </Text>
          <Text variant="h2">{first.subject.name}</Text>
          {slot(first) ? (
            <Text variant="xs" color="ink2" weight={600}>
              {slot(first)}
            </Text>
          ) : null}
          <Syllabus items={first.syllabus} />
        </View>
      </Card>
      <View style={{ paddingHorizontal: 2 }}>
        {rest.map((p, i) => (
          <View key={p.id} style={[styles.row, { gap: 14, paddingTop: 12, paddingBottom: 14, alignItems: 'flex-start' }, i < rest.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
            {cal(p, 'sm')}
            <View style={{ flex: 1, minWidth: 0, gap: 8, paddingTop: 4 }}>
              <View style={[styles.row, { justifyContent: 'space-between', gap: 8 }]}>
                <Text variant="sm" weight={700} style={{ flexShrink: 1 }}>
                  {p.subject.name}
                </Text>
                {i === rest.length - 1 ? (
                  <Text variant="xs" color="muted" weight={600}>
                    {t('student.exams.lastPaper')}
                  </Text>
                ) : null}
              </View>
              {slot(p) ? (
                <Text variant="xs" color="ink2" weight={600} style={{ marginTop: -4 }}>
                  {slot(p)}
                </Text>
              ) : null}
              <Syllabus items={p.syllabus} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function DownloadButton({ path, filename, title, variant, height }: { path: string; filename: string; title: string; variant?: 'secondary'; height?: number }) {
  const { t } = useTranslation();
  const toast = useToast();
  const download = useMutation({
    mutationFn: () => downloadFile(path, filename),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  return (
    <Button
      title={title}
      icon="download"
      size={variant ? 'md' : 'lg'}
      variant={variant}
      height={height}
      fullWidth={!variant}
      loading={download.isPending}
      onPress={() => download.mutate()}
      style={variant ? { alignSelf: 'flex-start' } : undefined}
    />
  );
}

/** The admit card as a ticket: locked until the school releases it. */
function AdmitCard({ data, term }: { data: StudentExams; term: string | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const exam = data.exam!;
  const student = data.student;
  const papers = data.papers ?? [];
  const rooms = [...new Set(papers.map((p) => p.room))];
  const open = exam.admit_card_available;
  const lead = exam.admit_cards_from && papers[0] ? daysUntil(papers[0].date) - daysUntil(exam.admit_cards_from) : null;
  return (
    <View style={{ gap: 12, paddingTop: 6 }}>
      <Kicker>{t('student.exams.admitCard')}</Kicker>
      <Ticket color="lav" style={styles.row}>
        <View style={{ flex: 1, minWidth: 0, paddingTop: 16, paddingBottom: 16, paddingLeft: 18, paddingRight: 10, gap: 10 }}>
          <Text variant="xs" weight={700} rawColor={colors.pLavInk}>
            {[`${exam.name} ${parseDate(exam.starts_on).getFullYear()}`, term].filter(Boolean).join(' · ')}
          </Text>
          {student ? (
            <View>
              <Text variant="h4">{student.name}</Text>
              <Text variant="xs" color="muted">
                {[student.class, t('student.exams.roll', { roll: student.roll_no }), rooms.length === 1 ? rooms[0] : null].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ) : null}
          {open ? (
            <DownloadButton path={exam.admit_card} filename={`${exam.name.replace(/\s+/g, '_')}_admit_card.pdf`} title={t('student.exams.downloadCard')} variant="secondary" height={44} />
          ) : (
            <Button title={t('student.exams.locked')} icon="lock" variant="secondary" height={44} disabled style={{ alignSelf: 'flex-start' }} />
          )}
        </View>
        <TearV />
        <View style={{ width: 96, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 8 }}>
          <Icon name={open ? 'check' : 'lock'} size={ICON_SIZE.md} rawColor={open ? colors.ok : colors.pLavInk} />
          <Text variant="xxs" color="muted" weight={700} align="center" style={{ textTransform: 'uppercase', letterSpacing: 0.9 }}>
            {open ? t('student.exams.ready') : t('student.exams.availableFrom')}
          </Text>
          {!open && exam.admit_cards_from ? (
            <Text variant="sm" weight={800} align="center">
              {`${weekdayName(exam.admit_cards_from, true)} ${formatDate(exam.admit_cards_from)}`}
            </Text>
          ) : null}
        </View>
      </Ticket>
      {!open && lead !== null ? (
        <Text variant="xs" color="muted" style={{ paddingHorizontal: 2 }}>
          {exam.released_by
            ? lead === 7
              ? t('student.exams.releasesWeek', { name: exam.released_by })
              : t('student.exams.releasesDays', { name: exam.released_by, count: lead })
            : t('student.exams.releasesSchool')}{' '}
          {t('student.exams.needIt')}
        </Text>
      ) : null}
    </View>
  );
}

function Prep({ items, studentId }: { items: NonNullable<StudentExams['prep']>; studentId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const key = ['exams', studentId];
  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => api.togglePrep(id, done),
    onMutate: async ({ id, done }) => {
      await client.cancelQueries({ queryKey: key });
      const before = client.getQueryData<StudentExams>(key);
      if (before) client.setQueryData<StudentExams>(key, { ...before, prep: before.prep?.map((p) => (p.id === id ? { ...p, done_at: done ? new Date().toISOString() : null } : p)) });
      return { before };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.before) client.setQueryData(key, ctx.before);
      toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger');
    },
  });
  const done = items.filter((i) => i.done_at).length;
  return (
    <Diary>
      <DiaryHead>
        <Text variant="sm" weight={700} style={{ flex: 1 }} accessibilityRole="header">
          {t('student.exams.prep')}
        </Text>
        <Pill label={t('student.exams.doneOf', { done, total: items.length })} tone="ok" dot={false} style={{ alignSelf: 'center' }} />
      </DiaryHead>
      {items.map((item, i) => {
        const d = parseDate(item.due_date);
        const isDone = !!item.done_at;
        const left = daysUntil(item.due_date);
        const soon = !isDone && left >= 0 && left <= 6;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isDone }}
            accessibilityLabel={`${item.title}, ${formatDate(item.due_date)}`}
            onPress={() => toggle.mutate({ id: item.id, done: !isDone })}
            style={pointer}>
            <DiaryRow when={`${d.getDate()}\n${monthName(item.due_date, true)}`} last={i === items.length - 1} style={{ minHeight: 44 }}>
              <Checkbox checked={isDone} label={item.title} decorative />
              <Text variant="sm" weight={isDone ? 400 : 600} color={isDone ? 'muted' : 'ink'} numberOfLines={1} style={[{ flex: 1 }, isDone && { textDecorationLine: 'line-through' }]}>
                {item.title}
              </Text>
              {soon ? (
                <Text variant="xxs" weight={700} rawColor={colors.warn}>
                  {left === 0 ? t('student.exams.dueToday') : t('student.exams.dueDay', { day: weekdayName(item.due_date, true) })}
                </Text>
              ) : null}
            </DiaryRow>
          </Pressable>
        );
      })}
    </Diary>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  sentence: { fontFamily: fonts.displayMedium, fontSize: 25, lineHeight: 32.5, letterSpacing: -0.5 },
});
