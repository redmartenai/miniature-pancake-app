import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { ExamResult, Results } from '@/api/types';
import { Dumbbell } from '@/features/charts/Dumbbell';
import { useFamily } from '@/features/family/useFamily';
import { ChildChip } from '@/features/parent/ChildChip';
import { downloadFile } from '@/lib/download';
import { formatDate, weekdayName } from '@/lib/format';
import { useActiveSchool } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  AppBar,
  Button,
  Card,
  Delta,
  EmptyState,
  ErrorState,
  Highlight,
  Icon,
  ICON_SIZE,
  Kicker,
  Legend,
  LoadingCards,
  Paper,
  Screen,
  Stamp,
  StickyNote,
  Tabs,
  Text,
  ThemeToggle,
  useToast,
} from '@/ui';

/** ParentResults: the report card for each exam, the PDF, and how each subject moved. */
export default function ParentResults() {
  const { t } = useTranslation();
  const school = useActiveSchool();
  const family = useFamily();
  const studentId = family.selected?.id;
  const results = useQuery({ queryKey: ['results', studentId], queryFn: () => api.results(studentId as string), enabled: !!studentId });
  const exams = results.data ? [...results.data.exams].reverse() : []; // oldest first, like the tabs
  const [selected, setSelected] = useState<string>();
  useEffect(() => {
    if (results.data?.exams[0] && !exams.some((e) => e.id === selected)) setSelected(results.data.exams[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.data]);
  const exam = exams.find((e) => e.id === selected);
  const index = exams.findIndex((e) => e.id === selected);
  const previous = index > 0 ? exams[index - 1] : undefined;
  const upcoming = results.data?.upcoming?.[0];

  const header = (
    <AppBar
      title={t('parent.results.title')}
      subtitle={[school?.term, school?.academic_year].filter(Boolean).join(' · ')}
      theme={false}
      actions={
        <>
          <ChildChip />
          <ThemeToggle />
        </>
      }
    />
  );

  return (
    <Screen header={header} dock gap={18} refreshing={results.isRefetching} onRefresh={results.refetch}>
      {results.error ? <ErrorState error={results.error} onRetry={results.refetch} /> : null}
      {!results.data ? <LoadingCards count={2} /> : null}
      {results.data && !exams.length ? <EmptyState icon="award" title={t('parent.results.none')} /> : null}
      {results.data && exams.length ? (
        <>
          <View style={{ gap: 8 }}>
            <Tabs
              value={selected ?? ''}
              onChange={setSelected}
              options={[
                ...exams.map((e) => ({ value: e.id, label: e.name })),
                ...(upcoming
                  ? [
                      {
                        value: upcoming.id,
                        label: upcoming.name,
                        disabled: true,
                        badge: undefined,
                      },
                    ]
                  : []),
              ]}
              style={{ gap: 24 }}
            />
            {upcoming ? (
              <Text variant="xs" color="muted" style={{ paddingHorizontal: 2 }}>
                {upcoming.results_on
                  ? t('parent.results.upcoming', {
                      name: upcoming.name,
                      date: `${weekdayName(upcoming.held_on, true)} ${formatDate(upcoming.held_on)}`,
                      results: formatDate(upcoming.results_on),
                    })
                  : t('parent.results.upcomingNoResults', { name: upcoming.name, date: formatDate(upcoming.held_on) })}
              </Text>
            ) : null}
          </View>
          {exam ? <ReportCard data={results.data} exam={exam} previous={previous} /> : null}
          {exam && studentId ? <DownloadButton studentId={studentId} exam={exam} name={results.data.student.name} /> : null}
          {exam && previous ? <SubjectMoves exam={exam} previous={previous} /> : null}
          {upcoming?.results_on ? (
            <Card variant="flat" pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderStyle: 'dashed', backgroundColor: 'transparent' }}>
              <LockIcon />
              <Text variant="sm" weight={600} color="ink2" style={{ flex: 1 }}>
                {t('parent.results.arrives', { name: upcoming.name, date: formatDate(upcoming.results_on) })}
              </Text>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function LockIcon() {
  const { colors } = useTheme();
  return <Icon name="lock" size={ICON_SIZE.sm} rawColor={colors.muted} />;
}

function ReportCard({ data, exam, previous }: { data: Results; exam: ExamResult; previous?: ExamResult }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const school = useActiveSchool();
  const prev = new Map((previous?.subjects ?? []).map((s) => [s.subject, s.percent]));
  const gains = exam.subjects.map((s) => (prev.has(s.subject) ? s.percent - (prev.get(s.subject) ?? 0) : -Infinity));
  const best = Math.max(...gains);
  const rows = [...exam.subjects].sort((a, b) => b.percent - a.percent);
  const delta = previous ? Math.round(exam.percent - previous.percent) : null;
  const student = data.student;
  const col = { ut1: 34, ut2: 40, grade: 48, cls: 42 };
  const head = (label: string, width?: number, align: 'left' | 'right' | 'center' = 'right') => (
    <Text variant="xxs" color="muted" weight={700} align={align} style={[styles.th, width ? { width } : { flex: 1 }]}>
      {label}
    </Text>
  );
  return (
    <Paper pad={18} style={{ paddingTop: 20, gap: 14 }}>
      <View
        accessibilityLabel={t('parent.results.reportLabel', { exam: exam.name, name: student.name })}
        style={[styles.paperHead, { borderBottomColor: colors.lineStrong }]}>
        <Text variant="h2" align="center" style={{ fontSize: 20, lineHeight: 23, fontFamily: fonts.displayBold }}>
          {data.school?.name ?? school?.name}
        </Text>
        <Text variant="xxs" color="muted" weight={700} align="center" style={{ letterSpacing: 1.54, textTransform: 'uppercase' }}>
          {t('parent.results.progressReport', { exam: exam.name, year: school?.academic_year ?? '' })}
        </Text>
      </View>
      <View style={[styles.between, { alignItems: 'flex-start', gap: 10 }]}>
        <View style={{ flexShrink: 1 }}>
          <Text variant="sm" weight={700}>
            {student.name}
          </Text>
          <Text variant="xs" color="muted" num>
            {t('parent.results.meta', { class: student.class ?? '', roll: student.roll_no ?? '', adm: student.admission_no ?? '' })}
          </Text>
        </View>
        <Text variant="xs" color="muted" weight={600}>
          {formatDate(exam.held_on, { year: true })}
        </Text>
      </View>
      <View style={[styles.between, { gap: 14, paddingTop: 4, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line }]}>
        <View style={{ flex: 1 }}>
          <View style={[styles.row8, { alignItems: 'baseline' }]}>
            <Text variant="kpi">{Math.round(exam.percent)}%</Text>
            {delta !== null ? <Delta value={t('parent.home.pts', { count: Math.abs(delta) })} direction={delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'} /> : null}
          </View>
          <Text variant="xs" color="muted" style={{ marginTop: 5 }}>
            {previous
              ? t('parent.results.wasBefore', { exam: previous.name, percent: Math.round(previous.percent), average: Math.round(exam.class_average ?? 0) })
              : exam.class_average != null
                ? t('parent.results.classAverageOnly', { average: Math.round(exam.class_average) })
                : ''}
          </Text>
        </View>
        <Stamp tone="lav" round rotate={-9} sub={t('parent.home.grade')}>
          {exam.grade}
        </Stamp>
      </View>

      <View>
        <View style={[styles.tr, { borderBottomWidth: 1, borderBottomColor: colors.lineStrong, paddingBottom: 8 }]}>
          {head(t('parent.results.subject'), undefined, 'left')}
          {previous ? head(shortExam(previous.name), col.ut1) : null}
          {head(shortExam(exam.name), col.ut2)}
          {head(t('parent.results.grade'), col.grade, 'center')}
          {head(t('parent.results.classCol'), col.cls)}
        </View>
        {rows.map((s, i) => {
          const before = prev.get(s.subject);
          const top = previous && s.percent - (before ?? 0) === best && best > 0;
          return (
            <View key={s.subject} style={[styles.tr, { paddingVertical: 9 }, i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="sm" weight={700} numberOfLines={1}>
                  {s.subject}
                </Text>
                {s.teacher ? (
                  <Text variant="xxs" color="muted">
                    {s.teacher}
                  </Text>
                ) : null}
              </View>
              {previous ? (
                <Text variant="sm" color="muted" num align="right" style={{ width: col.ut1 }}>
                  {before !== undefined ? Math.round(before) : '–'}
                </Text>
              ) : null}
              <Text variant="sm" weight={800} num align="right" style={{ width: col.ut2 }}>
                {top ? <Highlight color="pink">{Math.round(s.percent)}</Highlight> : Math.round(s.percent)}
              </Text>
              <Text variant="sm" weight={700} align="center" style={{ width: col.grade }}>
                {s.grade}
              </Text>
              <Text variant="sm" color="muted" num align="right" style={{ width: col.cls }}>
                {s.class_average != null ? Math.round(s.class_average) : '–'}
              </Text>
            </View>
          );
        })}
        <View style={[styles.tr, { borderTopWidth: 1.5, borderTopColor: colors.ink2, paddingTop: 10 }]}>
          <Text variant="sm" weight={800} style={{ flex: 1 }}>
            {t('parent.results.overall')}
          </Text>
          {previous ? (
            <Text variant="sm" color="muted" num align="right" style={{ width: col.ut1 }}>
              {Math.round(previous.percent)}%
            </Text>
          ) : null}
          <Text variant="sm" weight={800} num align="right" style={{ width: col.ut2 }}>
            {Math.round(exam.percent)}%
          </Text>
          <Text variant="sm" weight={800} align="center" style={{ width: col.grade }}>
            {exam.grade}
          </Text>
          <Text variant="sm" color="muted" num align="right" style={{ width: col.cls }}>
            {exam.class_average != null ? `${Math.round(exam.class_average)}%` : '–'}
          </Text>
        </View>
      </View>

      {exam.note ? (
        <View style={{ paddingTop: 12, paddingHorizontal: 4 }}>
          <StickyNote color="lav" tilt="r" tape="center" style={{ paddingTop: 22, paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>
            <Text style={{ fontSize: 14.5, lineHeight: 21.75 }} weight={500} color="ink">
              {exam.note.body}
            </Text>
            {exam.note.author ? (
              <Text variant="xs" weight={700} rawColor={colors.pLavInk}>
                {t('parent.results.classTeacherNote', { name: exam.note.author })}
              </Text>
            ) : null}
          </StickyNote>
        </View>
      ) : null}

      <View style={[styles.row8, { gap: 16, paddingTop: 6 }]}>
        {[
          [t('parent.results.classTeacher'), data.class_teacher],
          [t('parent.results.principal'), data.school?.principal],
        ].map(([label, name]) => (
          <View key={label} style={{ flex: 1, borderTopWidth: 1, borderTopColor: colors.lineStrong, paddingTop: 6 }}>
            <Text variant="xxs" color="muted" weight={700}>
              {label}
            </Text>
            <Text variant="xs" weight={600}>
              {name ?? '—'}
            </Text>
          </View>
        ))}
      </View>
    </Paper>
  );
}

/** "Unit Test 2" → "UT2"; other exam names are shortened to their initials. */
function shortExam(name: string): string {
  const unit = /^Unit Test (\d+)$/i.exec(name);
  if (unit) return `UT${unit[1]}`;
  return name.length <= 5 ? name : name.split(/[\s-]+/).map((w) => w[0]).join('').toUpperCase();
}

function DownloadButton({ studentId, exam, name }: { studentId: string; exam: ExamResult; name: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const download = useMutation({
    mutationFn: () => downloadFile(`/students/${studentId}/results/${exam.id}/report.pdf`, `${name.replace(/\s+/g, '_')}_${exam.name.replace(/\s+/g, '_')}.pdf`),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  return (
    <View style={{ gap: 8 }}>
      <Button title={t('parent.results.download')} icon="download" size="lg" fullWidth loading={download.isPending} onPress={() => download.mutate()} />
      <Text variant="xs" color="muted" align="center">
        {t('parent.results.downloadHint')}
      </Text>
    </View>
  );
}

function SubjectMoves({ exam, previous }: { exam: ExamResult; previous: ExamResult }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const prev = new Map(previous.subjects.map((s) => [s.subject, s.percent]));
  const rows = [...exam.subjects]
    .filter((s) => prev.has(s.subject))
    .sort((a, b) => b.percent - a.percent)
    .map((s) => ({ subject: s.subject, from: prev.get(s.subject) ?? 0, to: s.percent }));
  if (!rows.length) return null;
  const best = rows.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
  const down = rows.filter((r) => r.to < r.from).length;
  const short = (s: string) => (s === 'Computer Science' ? 'Comp. Science' : s);
  return (
    <View style={{ gap: 12, paddingTop: 6 }}>
      <Kicker>{t('parent.results.moved')}</Kicker>
      <View style={[styles.between, { alignItems: 'flex-end', gap: 12 }]}>
        <Text variant="sm" color="ink2" style={{ flex: 1 }}>
          {down ? t('parent.results.someDown', { count: down }) : t('parent.results.allUp')}{' '}
          {best.to > best.from ? (
            <Trans
              i18nKey="parent.results.gainedMost"
              values={{ subject: best.subject }}
              components={{ b: <Text variant="sm" weight={700} color="ink" /> }}
            />
          ) : null}
        </Text>
        <Legend
          items={[
            { label: shortExam(previous.name), color: colors.c1, shape: 'ring' },
            { label: shortExam(exam.name), color: colors.c1, shape: 'dot' },
          ]}
          style={{ columnGap: 12 }}
        />
      </View>
      <Dumbbell
        accessibilityLabel={t('parent.results.chartLabel', { from: previous.name, to: exam.name })}
        rows={rows.map((r) => ({
          label: short(r.subject),
          from: r.from,
          to: r.to,
          highlight: r.subject === best.subject && best.to > best.from,
          note: r.subject === best.subject && best.to > best.from ? t('parent.results.marks', { count: Math.round(r.to - r.from) }) : undefined,
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paperHead: { gap: 4, paddingBottom: 12, borderBottomWidth: 3, borderStyle: 'solid' },
  tr: { flexDirection: 'row', alignItems: 'center' },
  th: { fontSize: 10.5, letterSpacing: 0.84, textTransform: 'uppercase' },
});

