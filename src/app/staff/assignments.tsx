import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { AssignmentCard, AssignmentReview, ReviewSubmission } from '@/api/types';
import { openFile } from '@/lib/download';
import { fileSize, formatDate, formatTime, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  AppBar,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  ICON_SIZE,
  Legend,
  LoadingCards,
  Pill,
  pointer,
  Screen,
  SegmentedControl,
  Text,
  TextField,
  TileIcon,
  useToast,
} from '@/ui';

type Tab = 'review' | 'graded' | 'missing';
const FIRST = 4;

/** StaffAssignments: grade hand-ins against the rubric, return work for a redo, and see who hasn't handed in. */
export default function StaffAssignments() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const list = useQuery({ queryKey: ['teacher-assignments'], queryFn: api.teacherAssignments, enabled: !idParam });
  const fallback = list.data?.assignments.find((a) => a.counts.to_review > 0) ?? list.data?.assignments[0];
  const id = idParam ?? fallback?.id;
  const review = useQuery({ queryKey: ['assignment-review', id], queryFn: () => api.assignmentReview(id as string), enabled: !!id });
  const [tab, setTab] = useState<Tab>('review');
  const [open, setOpen] = useState<string>();
  const [more, setMore] = useState(false);
  const data = review.data;

  useEffect(() => {
    if (data && !open) setOpen(data.to_review[0]?.id);
  }, [data, open]);

  const a = data?.assignment;
  const rows = !data ? [] : tab === 'review' ? data.to_review : tab === 'graded' ? data.graded : [];
  const shown = more ? rows : rows.slice(0, FIRST + (rows[0]?.id === open ? 1 : 0));

  return (
    <Screen
      dock
      gap={16}
      refreshing={review.isRefetching}
      onRefresh={review.refetch}
      header={
        <AppBar
          back={() => (router.canGoBack() ? router.back() : router.navigate('/staff/homework'))}
          subtitle={a ? t('staff.assignments.kicker', { class: a.class.short_label, subject: a.subject.name, kind: t(`staff.assignments.kind_${a.kind}`) }) : undefined}
          title={t('staff.assignments.title')}
          titleVariant="h2"
        />
      }>
      {review.error || list.error ? <ErrorState error={review.error ?? list.error} onRetry={() => void review.refetch()} /> : null}
      {list.data && !id ? <EmptyState icon="award" title={t('staff.assignments.none')} /> : null}
      {id && !data ? <LoadingCards count={3} /> : null}
      {a && data ? (
        <>
          <Summary a={a} />
          <SegmentedControl
            fit
            value={tab}
            onChange={(v) => {
              setTab(v);
              setMore(false);
            }}
            options={[
              { value: 'review', label: t('staff.assignments.toReview'), badge: a.counts.to_review ? <Badge value={a.counts.to_review} /> : undefined },
              { value: 'graded', label: `${t('staff.assignments.graded')} ${data.graded.length}` },
              { value: 'missing', label: `${t('staff.assignments.missing')} ${data.missing.length}` },
            ]}
            style={{ height: 52 }}
          />
          {tab === 'missing' ? (
            <Missing data={data} />
          ) : !rows.length ? (
            <EmptyState icon="check" title={tab === 'review' ? t('staff.assignments.allGraded') : t('staff.assignments.noneGraded')} />
          ) : (
            <>
              {shown
                .filter((s) => s.id === open)
                .map((s) => (
                  <GradeCard key={s.id} a={a} s={s} onClose={() => setOpen(undefined)} onDone={() => setOpen(tab === 'review' ? data.to_review.find((x) => x.id !== s.id)?.id : undefined)} />
                ))}
              {shown.some((s) => s.id !== open) ? (
                <Card pad={0} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
                  {shown
                    .filter((s) => s.id !== open)
                    .map((s, i, all) => (
                      <SubmissionRow key={s.id} a={a} s={s} last={i === all.length - 1 && (more || rows.length <= shown.length)} onOpen={() => setOpen(s.id)} />
                    ))}
                  {!more && rows.length > shown.length ? (
                    <Pressable accessibilityRole="button" onPress={() => setMore(true)} style={[styles.row, { justifyContent: 'center', gap: 6, height: 48 }, pointer]}>
                      <Text variant="sm" weight={600} color="ink2">
                        {tab === 'review' ? t('staff.assignments.moreToReview', { count: rows.length - shown.length }) : t('staff.assignments.moreGraded', { count: rows.length - shown.length })}
                      </Text>
                      <Icon name="chevronDown" size={ICON_SIZE.sm} rawColor={colors.ink2} />
                    </Pressable>
                  ) : null}
                </Card>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function Summary({ a }: { a: AssignmentCard }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const total = Math.max(1, a.counts.expected);
  const parts = [
    { n: a.counts.graded + a.counts.redo, color: colors.ok },
    { n: a.counts.to_review, color: colors.brand },
    { n: a.counts.missing, color: colors.track },
  ];
  return (
    <Card pad={16} style={{ gap: 14 }}>
      <View style={[styles.row, { gap: 14, alignItems: 'flex-start' }]}>
        <TileIcon icon="award" tone="lav" size="lg" />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text variant="h3">{a.title}</Text>
          <Text variant="xs" color="muted">
            {[a.description, t('staff.assignments.marks', { count: a.max_marks }), t('staff.assignments.due', { date: `${weekdayName(a.due_date, true)} ${formatDate(a.due_date)}` })].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('staff.assignments.progressLabel', { graded: a.counts.graded, review: a.counts.to_review, missing: a.counts.missing })}
        style={[styles.row, { height: 8, gap: 2 }]}>
        {parts.map((p, i) => (p.n ? <View key={i} style={{ flex: p.n / total, height: 8, borderRadius: 4, backgroundColor: p.color }} /> : null))}
      </View>
      <View style={[styles.row, { justifyContent: 'space-between', gap: 8 }]}>
        <Legend
          items={[
            { label: t('staff.assignments.graded'), color: colors.ok, shape: 'square' },
            { label: t('staff.assignments.toReview'), color: colors.brand, shape: 'square' },
            { label: t('staff.assignments.missing'), color: colors.track, shape: 'square' },
          ]}
          style={{ columnGap: 12 }}
        />
        <Text variant="xs" color="ink2" weight={600}>
          {a.days_left > 0 ? t('staff.assignments.daysLeft', { count: a.days_left }) : a.days_left === 0 ? t('staff.assignments.dueToday') : t('staff.assignments.closed')}
        </Text>
      </View>
    </Card>
  );
}

function who(s: ReviewSubmission) {
  return s.members.length > 1 ? s.members.join(', ') : (s.student?.name ?? '');
}

function SubmissionRow({ a, s, last, onOpen }: { a: AssignmentCard; s: ReviewSubmission; last: boolean; onOpen: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const file = s.files[0];
  return (
    <View style={[styles.row, { gap: 12, paddingVertical: 12 }, !last && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
      <Avatar initials={s.student?.initials ?? '?'} size="sm" seed={s.student?.name} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="sm" weight={700} numberOfLines={1}>
          {who(s)}
        </Text>
        <View style={[styles.row, { gap: 4 }]}>
          <Icon name="paperclip" size={12} rawColor={colors.muted} />
          <Text variant="xs" color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
            {[file ? file.name + (s.files.length > 1 ? ` +${s.files.length - 1}` : '') : t('staff.assignments.noFiles'), `${formatDate(s.submitted_at)}`].join(' · ')}
          </Text>
        </View>
      </View>
      {s.status === 'submitted' ? (
        <Button title={t('staff.assignments.grade')} variant="secondary" height={44} onPress={onOpen} />
      ) : (
        <Pressable accessibilityRole="button" onPress={onOpen} style={[styles.score, { borderColor: colors.lineStrong }, pointer]}>
          <Text variant="sm" weight={700} num color={s.status === 'redo' ? 'warn' : 'ink'}>
            {s.status === 'redo' ? t('staff.assignments.redo') : `${s.total ?? '–'}`}
          </Text>
          {s.status !== 'redo' ? (
            <Text variant="xxs" color="muted">
              /{a.max_marks}
            </Text>
          ) : null}
        </Pressable>
      )}
    </View>
  );
}

/** The open hand-in: files, rubric scores, total, feedback, and grade or redo. */
function GradeCard({ a, s, onClose, onDone }: { a: AssignmentCard; s: ReviewSubmission; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const [scores, setScores] = useState<Record<string, string>>(Object.fromEntries(a.rubric.map((r) => [r.key, s.scores[r.key] != null ? String(s.scores[r.key]) : ''])));
  const [plain, setPlain] = useState(s.total != null ? String(s.total) : '');
  const [feedback, setFeedback] = useState(s.feedback);
  const values = a.rubric.map((r) => Number(scores[r.key]));
  const complete = a.rubric.length ? a.rubric.every((r) => scores[r.key] !== '' && !Number.isNaN(Number(scores[r.key]))) : plain !== '';
  const bad = a.rubric.find((r) => scores[r.key] !== '' && (Number(scores[r.key]) < 0 || Number(scores[r.key]) > r.max));
  const total = a.rubric.length ? values.reduce((x, y) => x + (Number.isNaN(y) ? 0 : y), 0) : Number(plain) || 0;
  const pct = a.max_marks ? Math.round((total * 100) / a.max_marks) : 0;

  const grade = useMutation({
    mutationFn: (action: 'grade' | 'redo') =>
      api.gradeSubmission(s.id, {
        action,
        feedback: feedback.trim(),
        scores: a.rubric.length ? Object.fromEntries(a.rubric.map((r) => [r.key, Number(scores[r.key])])) : undefined,
        total: a.rubric.length ? undefined : Number(plain),
      }),
    onSuccess: (saved, action) => {
      toast(action === 'grade' ? t('staff.assignments.saved', { name: s.student?.first_name ?? '', grade: saved.grade }) : t('staff.assignments.returned', { name: s.student?.first_name ?? '' }));
      void client.invalidateQueries({ queryKey: ['assignment-review'] });
      void client.invalidateQueries({ queryKey: ['teacher-assignments'] });
      onDone();
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });

  return (
    <Card pad={16} style={{ gap: 14, borderWidth: 1.5, borderColor: colors.brandLine }}>
      <View style={[styles.row, { gap: 12 }]}>
        <Avatar initials={s.student?.initials ?? '?'} size="sm" tone={3} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="sm" weight={700} numberOfLines={1}>
            {who(s)}
          </Text>
          <Text variant="xs" color="muted">
            {t('staff.assignments.submittedOn', { date: `${weekdayName(s.submitted_at.slice(0, 10), true)} ${formatDate(s.submitted_at)}`, time: formatTime(new Date(s.submitted_at)) })}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('staff.assignments.collapse')} onPress={onClose} hitSlop={10} style={pointer}>
          <Icon name="chevronUp" size={ICON_SIZE.md} rawColor={colors.ink2} />
        </Pressable>
      </View>
      {s.files.map((f) => (
        <Pressable
          key={f.id}
          accessibilityRole="button"
          accessibilityLabel={t('staff.assignments.open', { name: f.name })}
          onPress={() => void openFile(f.url, f.name).catch(() => toast(t('common.somethingWrong'), 'danger'))}
          style={[styles.row, styles.file, { backgroundColor: colors.sunken }, pointer]}>
          <Icon name="paperclip" size={ICON_SIZE.sm} rawColor={colors.brandInk} />
          <Text variant="sm" weight={700} numberOfLines={1} style={{ flex: 1 }}>
            {f.name}
          </Text>
          <Text variant="xs" color="muted">
            {fileSize(f.size)}
          </Text>
          <Icon name="eye" size={ICON_SIZE.sm} rawColor={colors.muted} />
        </Pressable>
      ))}
      {a.rubric.length ? (
        <View style={{ gap: 12 }}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text variant="h4">{t('staff.assignments.rubric')}</Text>
            <Text variant="xs" color="muted" weight={600}>
              {t('staff.assignments.max', { count: a.max_marks })}
            </Text>
          </View>
          {a.rubric.map((r) => {
            const invalid = scores[r.key] !== '' && (Number(scores[r.key]) < 0 || Number(scores[r.key]) > r.max || Number.isNaN(Number(scores[r.key])));
            return (
              <View key={r.key} style={[styles.row, { gap: 12 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="sm" weight={700}>
                    {r.label}
                  </Text>
                  {r.hint ? (
                    <Text variant="xs" color="muted">
                      {r.hint}
                    </Text>
                  ) : null}
                </View>
                <ScoreInput value={scores[r.key]} invalid={invalid} label={`${r.label}, ${t('staff.assignments.outOf', { count: r.max })}`} onChange={(v) => setScores((prev) => ({ ...prev, [r.key]: v }))} />
                <Text variant="sm" color="muted" style={{ width: 30 }}>
                  / {r.max}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={[styles.row, { gap: 12 }]}>
          <Text variant="sm" weight={700} style={{ flex: 1 }}>
            {t('staff.assignments.marksLabel')}
          </Text>
          <ScoreInput value={plain} invalid={plain !== '' && (Number(plain) < 0 || Number(plain) > a.max_marks)} label={t('staff.assignments.marksLabel')} onChange={setPlain} />
          <Text variant="sm" color="muted" style={{ width: 30 }}>
            / {a.max_marks}
          </Text>
        </View>
      )}
      <View style={[styles.row, styles.total, { backgroundColor: colors.sunken }]}>
        <Text variant="sm" weight={700} style={{ flex: 1 }}>
          {t('staff.assignments.total')}
        </Text>
        <Text variant="sm" weight={800} num>
          {complete ? total : '–'} / {a.max_marks}
        </Text>
        {complete && !bad ? <Pill label={`${pct}%`} tone="outline" dot={false} /> : null}
      </View>
      <TextField label={t('staff.assignments.feedback')} value={feedback} onChangeText={setFeedback} multiline style={{ minHeight: 96 }} maxLength={1000} placeholder={t('staff.assignments.feedbackPlaceholder')} />
      <Text variant="xs" color="muted" style={{ marginTop: -8 }}>
        {t('staff.assignments.whoSees', { name: s.student?.first_name ?? '' })}
      </Text>
      <View style={[styles.row, { gap: 10 }]}>
        <Button title={t('staff.assignments.returnRedo')} variant="secondary" height={48} disabled={!feedback.trim()} loading={grade.isPending && grade.variables === 'redo'} onPress={() => grade.mutate('redo')} style={{ flex: 1 }} />
        <Button title={t('staff.assignments.saveGrade')} height={48} disabled={!complete || !!bad} loading={grade.isPending && grade.variables === 'grade'} onPress={() => grade.mutate('grade')} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

function ScoreInput({ value, invalid, label, onChange }: { value: string; invalid: boolean; label: string; onChange: (v: string) => void }) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={(v) => onChange(v.replace(/[^0-9.]/g, '').slice(0, 5))}
      keyboardType="decimal-pad"
      accessibilityLabel={label}
      placeholder="–"
      placeholderTextColor={colors.faint}
      style={[styles.scoreInput, { borderColor: invalid ? colors.bad : colors.lineStrong, color: invalid ? colors.bad : colors.ink, backgroundColor: colors.surface }]}
    />
  );
}

function Missing({ data }: { data: AssignmentReview }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!data.missing.length) return <EmptyState icon="check" title={t('staff.assignments.noneMissing')} />;
  return (
    <Card pad={0} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
      {data.missing.map((m, i) => (
        <Pressable
          key={m.id}
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/staff/student', params: { id: m.id } })}
          style={[styles.row, { gap: 12, paddingVertical: 12 }, i < data.missing.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }, pointer]}>
          <Text variant="sm" weight={700} num rawColor={colors.pPinkInk} style={{ width: 26 }}>
            {String(m.roll_no).padStart(2, '0')}
          </Text>
          <Avatar initials={m.initials} size="sm" seed={m.name} />
          <Text variant="sm" weight={600} style={{ flex: 1 }}>
            {m.name}
          </Text>
          <Text variant="xs" color="muted" weight={600}>
            {t('staff.assignments.notYet')}
          </Text>
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  file: { gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 12 },
  total: { gap: 10, minHeight: 44, paddingHorizontal: 14, borderRadius: 12 },
  score: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 1, minWidth: 64, height: 44, paddingHorizontal: 10, borderWidth: 1, borderRadius: 12 },
  scoreInput: { width: 56, height: 48, borderWidth: 1, borderRadius: 12, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 16 },
});
