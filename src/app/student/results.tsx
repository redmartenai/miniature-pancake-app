import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { ExamResult, Results } from '@/api/types';
import { Dumbbell } from '@/features/charts/Dumbbell';
import { useFamily } from '@/features/family/useFamily';
import { shortExam } from '@/features/student/HomeCards';
import { downloadFile } from '@/lib/download';
import { formatDate } from '@/lib/format';
import { useActiveSchool } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { AppBar, Button, Chip, Delta, EmptyState, ErrorState, Highlight, Legend, LoadingCards, Paper, Screen, Stamp, Text, useToast } from '@/ui';

/** StuResults: pick an exam, read the report card, download it, and see how each subject moved. */
export default function StudentResults() {
  const { t } = useTranslation();
  const school = useActiveSchool();
  const family = useFamily();
  const me = family.selected;
  const id = me?.id;
  const results = useQuery({ queryKey: ['results', id], queryFn: () => api.results(id as string), enabled: !!id });
  const exams = results.data ? [...results.data.exams].reverse() : []; // oldest first
  const [selected, setSelected] = useState<string>();
  useEffect(() => {
    if (results.data?.exams[0] && !exams.some((e) => e.id === selected)) setSelected(results.data.exams[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.data]);
  const index = exams.findIndex((e) => e.id === selected);
  const exam = exams[index];
  const previous = index > 0 ? exams[index - 1] : undefined;
  const upcoming = results.data?.upcoming ?? [];

  return (
    <Screen
      dock
      gap={18}
      refreshing={results.isRefetching}
      onRefresh={results.refetch}
      header={<AppBar title={t('student.results.title')} subtitle={[me ? t('student.home.classLabel', { class: me.class.short_label }) : null, school?.academic_year].filter(Boolean).join(' · ')} />}>
      {results.error ? <ErrorState error={results.error} onRetry={results.refetch} /> : null}
      {!results.data ? <LoadingCards count={2} /> : null}
      {results.data && !exams.length ? <EmptyState icon="award" title={t('parent.results.none')} /> : null}
      {results.data && exam ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
            {exams.map((e) => (
              <Chip key={e.id} label={e.name} selected={e.id === selected} onPress={() => setSelected(e.id)} style={{ height: 44 }} />
            ))}
            {upcoming.map((u) => (
              <Chip
                key={u.id}
                label={u.name}
                icon="lock"
                disabled
                accessibilityLabel={u.results_on ? t('student.results.lockedOn', { name: u.name, date: formatDate(u.results_on) }) : t('student.results.locked', { name: u.name })}
                style={{ height: 44 }}
              />
            ))}
          </ScrollView>
          <ReportCard data={results.data} exam={exam} previous={previous} />
          {id ? <DownloadButton studentId={id} exam={exam} name={results.data.student.name} /> : null}
          {previous ? <SubjectMoves exam={exam} previous={previous} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

const out = (marks: number) => (Number.isInteger(marks) ? String(marks) : marks.toFixed(1));

function ReportCard({ data, exam, previous }: { data: Results; exam: ExamResult; previous?: ExamResult }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const school = useActiveSchool();
  const before = new Map((previous?.subjects ?? []).map((s) => [s.subject, s]));
  const delta = previous ? Math.round(exam.percent - previous.percent) : null;
  const student = data.student;
  const col = { prev: 48, now: 48, grade: 58 };
  const th = (label: string, width?: number) => (
    <Text variant="xxs" color="muted" weight={700} align={width ? 'right' : 'left'} style={[styles.th, width ? { width } : { flex: 1 }]}>
      {label}
    </Text>
  );
  const meta = [student.name, student.class, student.roll_no ? t('student.results.roll', { roll: student.roll_no }) : null, exam.published_on ? t('student.results.published', { date: formatDate(exam.published_on) }) : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <View accessibilityLabel={t('student.results.cardLabel', { exam: exam.name })}>
    <Paper pad={18} style={{ paddingBottom: 16, gap: 14, marginBottom: 8 }}>
      <View>
        <Text variant="xxs" color="muted" weight={700} style={{ textTransform: 'uppercase', letterSpacing: 1.3 }}>
          {t('student.results.kicker', { school: data.school?.name ?? school?.name ?? '' })}
        </Text>
        <Text variant="h3" style={{ marginTop: 6 }}>
          {exam.name}
        </Text>
        <Text variant="xs" color="muted">
          {meta}
        </Text>
      </View>
      <View style={[styles.between, { gap: 12, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }]}>
        <View style={{ flex: 1 }}>
          <View style={[styles.row, { gap: 8, alignItems: 'baseline' }]}>
            <Text variant="kpi">{Math.round(exam.percent)}%</Text>
            {delta !== null ? <Delta value={t('parent.home.pts', { count: Math.abs(delta) })} direction={delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'} /> : null}
          </View>
          <Text variant="xs" color="muted" style={{ marginTop: 5 }}>
            {[
              previous ? t('student.results.was', { exam: shortExam(previous.name), percent: Math.round(previous.percent) }) : null,
              exam.class_average != null ? t('student.results.classAverage', { percent: Math.round(exam.class_average) }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <Stamp tone="lav" round sub={t('parent.home.grade')} style={{ marginRight: 4 }}>
          {exam.grade}
        </Stamp>
      </View>

      <View>
        <View style={[styles.row, { paddingBottom: 8 }]}>
          {th(t('parent.results.subject'))}
          {previous ? th(shortExam(previous.name), col.prev) : null}
          {th(shortExam(exam.name), col.now)}
          {th(t('parent.results.grade'), col.grade)}
        </View>
        {exam.subjects.map((s) => {
          const was = before.get(s.subject);
          return (
            <View key={s.subject} style={[styles.row, { height: 34, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.lineStrong }]}>
              <Text variant="sm" style={{ flex: 1, fontSize: 13.5 }} numberOfLines={1}>
                {s.subject}
              </Text>
              {previous ? (
                <Text variant="sm" color="muted" num align="right" style={{ width: col.prev, fontSize: 13.5 }}>
                  {was ? out(was.marks) : '–'}
                </Text>
              ) : null}
              <Text variant="sm" weight={800} num align="right" style={{ width: col.now, fontSize: 13.5 }}>
                {out(s.marks)}
              </Text>
              <Text variant="sm" weight={700} align="right" style={{ width: col.grade, fontSize: 13.5 }}>
                {s.grade}
              </Text>
            </View>
          );
        })}
        <View style={[styles.row, { height: 36, borderTopWidth: 1.5, borderTopColor: colors.ink2 }]}>
          <Text variant="sm" weight={700} style={{ flex: 1, fontSize: 13.5 }}>
            {t('student.results.total')}{' '}
            <Text variant="xs" color="muted" weight={600}>
              / {out(exam.max_total)}
            </Text>
          </Text>
          {previous ? (
            <Text variant="sm" color="muted" weight={600} num align="right" style={{ width: col.prev, fontSize: 13.5 }}>
              {out(previous.total)}
            </Text>
          ) : null}
          <Text variant="sm" weight={800} num align="right" style={{ width: col.now, fontSize: 13.5 }}>
            {out(exam.total)}
          </Text>
          <Text variant="sm" weight={800} align="right" style={{ width: col.grade, fontSize: 13.5 }}>
            {exam.grade}
          </Text>
        </View>
      </View>

      {exam.note ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, gap: 6 }}>
          <Text variant="xxs" color="muted" weight={700} style={{ textTransform: 'uppercase', letterSpacing: 1.3 }}>
            {t('student.results.remark')}
          </Text>
          <Text variant="sm" color="ink" style={{ fontStyle: 'italic', lineHeight: 20, fontFamily: fonts.italic }}>
            “{exam.note.body}”
          </Text>
          {exam.note.author ? (
            <Text variant="xs" weight={700}>
              {[exam.note.author, exam.note.on ? formatDate(exam.note.on) : null].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Paper>
    </View>
  );
}

function DownloadButton({ studentId, exam, name }: { studentId: string; exam: ExamResult; name: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const download = useMutation({
    mutationFn: () => downloadFile(`/students/${studentId}/results/${exam.id}/report.pdf`, `${name.replace(/\s+/g, '_')}_${exam.name.replace(/\s+/g, '_')}.pdf`),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  return <Button title={t('student.results.download')} icon="download" size="lg" fullWidth loading={download.isPending} onPress={() => download.mutate()} />;
}

function SubjectMoves({ exam, previous }: { exam: ExamResult; previous: ExamResult }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const prev = new Map(previous.subjects.map((s) => [s.subject, s.percent]));
  const rows = exam.subjects
    .filter((s) => prev.has(s.subject))
    .sort((a, b) => b.percent - a.percent)
    .map((s) => ({ subject: s.subject, from: prev.get(s.subject) ?? 0, to: s.percent }));
  if (!rows.length) return null;
  const strongest = rows[0];
  const weakest = rows[rows.length - 1];
  const jump = rows.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
  const gain = Math.round(jump.to - jump.from);
  const b = (color: 'lav' | 'pink') => <Highlight color={color} style={{ fontWeight: '700', color: colors.ink }} />;
  return (
    <View style={{ gap: 12, paddingTop: 10 }}>
      <View style={[styles.between, { alignItems: 'flex-end', gap: 12 }]}>
        <View style={{ flexShrink: 1 }}>
          <Text variant="h3">
            {previous.name} → {exam.name}
          </Text>
          <Text variant="xs" color="muted">
            {t('student.results.movesSub')}
          </Text>
        </View>
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
          label: r.subject,
          from: r.from,
          to: r.to,
          highlight: r === strongest || (r === jump && gain > 0),
          note: r === strongest ? String(Math.round(r.to)) : r === jump && gain > 0 ? t('student.results.gain', { count: gain }) : undefined,
        }))}
      />
      <Text variant="sm" color="ink2" style={{ lineHeight: 22 }}>
        <Trans
          i18nKey={
            weakest === strongest
              ? 'student.results.takeawayOne'
              : weakest === jump && gain > 0
                ? 'student.results.takeawayJump'
                : gain > 0
                  ? 'student.results.takeawayOther'
                  : 'student.results.takeaway'
          }
          values={{
            best: `${strongest.subject}, ${Math.round(strongest.to)}`,
            focus: `${weakest.subject}, ${Math.round(weakest.to)}`,
            jump: jump.subject,
            count: gain,
            exam: shortExam(previous.name),
          }}
          components={{ best: b('lav'), focus: b('pink'), b: <Text variant="sm" weight={700} color="ink" /> }}
        />
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  th: { fontSize: 10.5, letterSpacing: 0.84, textTransform: 'uppercase' },
});
