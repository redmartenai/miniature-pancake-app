import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { AssignmentItem, StudentAssignments } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { daysUntil, formatDate, initialsOf, joinNames, monthName, parseDate, weekdayName } from '@/lib/format';
import { appendFiles, pickFiles } from '@/lib/pick';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  AppBar,
  Avatar,
  AvatarFan,
  Button,
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
  Paper,
  pointer,
  Screen,
  Stamp,
  TearCal,
  TearV,
  Text,
  Ticket,
  useToast,
} from '@/ui';

/** StuAssignments: the group project in progress with its milestones, graded work, and what's coming up. */
export default function StudentAssignments() {
  const { t } = useTranslation();
  const family = useFamily();
  const id = family.selected?.id;
  const query = useQuery({ queryKey: ['assignments', id], queryFn: () => api.assignments(id as string), enabled: !!id });
  const data = query.data;
  const empty = data && !data.in_progress.length && !data.graded.length && !data.upcoming.length;
  return (
    <Screen
      gap={18}
      dock
      refreshing={query.isRefetching}
      onRefresh={query.refetch}
      header={<AppBar back={() => router.navigate('/student/tasks')} subtitle={t('student.assignments.kicker')} title={t('student.assignments.title')} />}>
      {query.error ? <ErrorState error={query.error} onRetry={query.refetch} /> : null}
      {!data ? <LoadingCards count={2} /> : null}
      {empty ? <EmptyState icon="folder" title={t('student.assignments.empty')} /> : null}
      {data && id
        ? data.in_progress.map((a, i) => (
            <View key={a.id} style={{ gap: 18 }}>
              {i === 0 || a.group_size > 1 !== data.in_progress[i - 1].group_size > 1 ? (
                <Kicker>{a.group_size > 1 ? t('student.assignments.inProgressGroup') : t('student.assignments.inProgress')}</Kicker>
              ) : null}
              <ProjectFolder item={a} studentId={id} />
            </View>
          ))
        : null}
      {data?.graded.length ? (
        <>
          <Kicker style={{ marginTop: 6 }}>{t('student.assignments.graded', { count: data.graded.length })}</Kicker>
          {data.graded.map((a) => (
            <GradedSlip key={a.id} item={a} />
          ))}
        </>
      ) : null}
      {data?.upcoming.length ? (
        <>
          <Kicker style={{ marginTop: 6 }}>{t('student.assignments.comingUp')}</Kicker>
          {data.upcoming.map((a) => (
            <LockedTicket key={a.id} item={a} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const shortDate = (iso: string) => `${weekdayName(iso, true)} ${formatDate(iso)}`;

/** A project as a manila folder: brief, group, the milestone diary, and the upload. */
function ProjectFolder({ item: a, studentId }: { item: AssignmentItem; studentId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const left = daysUntil(a.due_date);
  const done = a.milestones.filter((m) => m.done_at).length;
  const next = a.milestones.find((m) => !m.done_at);
  const members = [...(a.group?.members ?? [])].sort((x, y) => Number(y.me) - Number(x.me));
  const names = members.map((m, i) => (m.me ? (i ? t('student.assignments.you') : t('student.assignments.youCap')) : m.name));
  const due = parseDate(a.due_date);

  const toggle = useMutation({
    mutationFn: ({ progressId, done: on }: { progressId: string; done: boolean }) => api.toggleMilestone(progressId, on),
    onMutate: async ({ progressId, done: on }) => {
      const key = ['assignments', studentId];
      await client.cancelQueries({ queryKey: key });
      const before = client.getQueryData<StudentAssignments>(key);
      if (before)
        client.setQueryData<StudentAssignments>(key, {
          ...before,
          in_progress: before.in_progress.map((x) =>
            x.id !== a.id ? x : { ...x, milestones: x.milestones.map((m) => (m.progress_id === progressId ? { ...m, done_at: on ? new Date().toISOString() : null } : m)) },
          ),
        });
      return { before };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.before) client.setQueryData(['assignments', studentId], ctx.before);
      toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger');
    },
  });
  const upload = useMutation({
    mutationFn: async () => {
      const files = await pickFiles('photo', 10).catch((e: Error) => {
        throw e.message === 'permission' ? new ApiError(0, 'permission', t('chat.photoPermission')) : e;
      });
      if (!files) return null;
      const form = new FormData();
      form.append('student_id', studentId);
      await appendFiles(form, 'files', files);
      return api.uploadAssignment(a.id, form);
    },
    onSuccess: (saved) => {
      if (!saved) return;
      toast(t('student.assignments.uploaded', { count: saved.submission?.files.length ?? 0 }));
      void client.invalidateQueries({ queryKey: ['assignments', studentId] });
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });

  return (
    <View style={{ paddingTop: 26 }}>
      <View style={[styles.folderTab, { backgroundColor: colors.pPeach, boxShadow: `inset 0 0 0 1px ${colors.lineStrong}` }]}>
        <Text rawColor={colors.pPeachInk} weight={800} style={styles.folderTabText}>
          {a.group_size > 1 ? t('student.assignments.subjectGroup', { subject: a.subject.name, count: a.group_size }) : a.subject.name}
        </Text>
      </View>
      <Paper pad={16} style={{ paddingTop: 18, gap: 16, marginBottom: 10 }}>
        <View style={[styles.row, { alignItems: 'flex-start', gap: 14 }]}>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text accessibilityRole="header" style={styles.projectTitle}>
              {a.title}
            </Text>
            <Text variant="xs" color="muted">
              {[a.teacher, a.subject.name].filter(Boolean).join(' · ')}
            </Text>
            <Text variant="sm" color="ink2" style={{ marginTop: 4 }}>
              <Trans
                i18nKey={left < 0 ? 'student.assignments.overdue' : left === 0 ? 'student.assignments.dueToday' : next ? 'student.assignments.dueInNext' : 'student.assignments.dueIn'}
                values={{ count: left, step: next?.title.toLowerCase() ?? '' }}
                components={{ m: <Highlight style={{ fontWeight: '700' }} /> }}
              />
            </Text>
          </View>
          <View accessible accessibilityLabel={t('student.assignments.dueLabel', { date: formatDate(a.due_date, { weekday: true }) })}>
            <TearCal size="sm" month={monthName(a.due_date, true)} day={due.getDate()} dow={weekdayName(a.due_date, true)} />
          </View>
        </View>

        {members.length ? (
          <View style={[styles.row, { gap: 12 }]}>
            <AvatarFan people={members.map((m, i) => ({ initials: m.initials, tone: m.me ? 1 : ([4, 3, 5, 2, 6] as const)[i % 5] }))} />
            <Text variant="xs" color="ink2" weight={600} style={{ flex: 1, minWidth: 0 }}>
              {joinNames(names)}
            </Text>
          </View>
        ) : null}

        {a.milestones.length ? (
          <Diary>
            <DiaryHead>
              <Text variant="sm" weight={700} style={{ flex: 1 }}>
                {t('student.assignments.milestones')}
              </Text>
              <Text variant="xs" color="muted" weight={700} num>
                {t('student.assignments.doneOf', { done, total: a.milestones.length })}
              </Text>
            </DiaryHead>
            {a.milestones.map((m, i) => {
              const d = parseDate(m.due_date);
              const isDone = !!m.done_at;
              const mine = m.owners.some((o) => o.me);
              const current = m === next && daysUntil(m.due_date) <= 7;
              const owners = joinNames(
                [...m.owners].sort((x, y) => Number(y.me) - Number(x.me)).map((o, k) => (o.me ? (k ? t('student.assignments.you') : t('student.assignments.youCap')) : o.first_name)),
                true,
              );
              const ownerText = [owners || null, current ? t('student.assignments.now') : null].filter(Boolean).join(' · ');
              const canToggle = !!m.progress_id;
              return (
                <Pressable
                  key={m.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isDone, disabled: !canToggle }}
                  accessibilityLabel={[m.title, formatDate(m.due_date), owners].filter(Boolean).join(', ')}
                  disabled={!canToggle || toggle.isPending}
                  onPress={() => m.progress_id && toggle.mutate({ progressId: m.progress_id, done: !isDone })}
                  style={canToggle ? pointer : undefined}>
                  <DiaryRow when={`${d.getDate()}\n${monthName(m.due_date, true)}`} last={i === a.milestones.length - 1} style={{ minHeight: 44 }}>
                    <Checkbox checked={isDone} label={m.title} decorative disabled={!canToggle} />
                    <Text variant="sm" weight={current ? 700 : isDone ? 400 : 500} color={isDone ? 'muted' : 'ink'} numberOfLines={1} style={[{ flex: 1 }, isDone && { textDecorationLine: 'line-through' }]}>
                      {m.title}
                    </Text>
                    <Text variant="xxs" weight={current ? 700 : 600} rawColor={current && mine ? colors.pPeachInk : colors.muted} numberOfLines={1} style={{ flexShrink: 1, maxWidth: '48%' }}>
                      {ownerText}
                    </Text>
                  </DiaryRow>
                </Pressable>
              );
            })}
          </Diary>
        ) : null}

        {a.submission?.files.length ? (
          <Text variant="xs" color="ink2" weight={600}>
            {t('student.assignments.filesIn', { count: a.submission.files.length, date: formatDate(a.submission.submitted_at) })}
          </Text>
        ) : null}
        <View style={{ gap: 8 }}>
          <Button title={t('student.assignments.upload')} icon="upload" height={48} fullWidth loading={upload.isPending} onPress={() => upload.mutate()} />
          <Text variant="xs" color="muted" align="center">
            {a.group_size > 1 ? t('student.assignments.sharedGroup', { teacher: a.teacher ?? '' }) : t('student.assignments.sharedTeacher', { teacher: a.teacher ?? '' })}
          </Text>
        </View>
      </Paper>
    </View>
  );
}

/** Marked work as a returned slip with a score stamp and the teacher's comment. */
function GradedSlip({ item: a }: { item: AssignmentItem }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = a.submission;
  const score = s?.total != null ? `${Number.isInteger(s.total) ? s.total : s.total.toFixed(1)}/${a.max_marks}` : (s?.grade ?? '');
  return (
    <View style={[styles.slip, { backgroundColor: colors.surface, borderColor: colors.lineStrong }]}>
      <View style={[styles.clip, { backgroundColor: colors.muted }]} />
      <View style={[styles.row, { alignItems: 'flex-start', gap: 12 }]}>
        <View style={{ flex: 1, minWidth: 0, gap: 3, paddingTop: 4 }}>
          <Text variant="xxs" weight={800} rawColor={colors.pLavInk} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>
            {a.subject.name}
          </Text>
          <Text variant="h3">{a.title}</Text>
          <Text variant="xs" color="muted">
            {[
              s ? t('student.assignments.handedIn', { date: formatDate(s.submitted_at) }) : null,
              s?.graded_at ? (s.graded_by ? t('student.assignments.markedBy', { date: formatDate(s.graded_at), name: s.graded_by }) : t('student.assignments.marked', { date: formatDate(s.graded_at) })) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <View accessible accessibilityRole="image" accessibilityLabel={t('student.assignments.scoreLabel', { score, grade: s?.grade ?? '' })}>
          <Stamp tone="lav" round sub={s?.grade ? t('student.assignments.gradeSub', { grade: s.grade }) : undefined} style={{ width: 72, height: 72, borderRadius: 36, marginTop: -2, marginRight: 2 }} textStyle={{ fontSize: 17, letterSpacing: -0.3 }}>
            {score}
          </Stamp>
        </View>
      </View>
      {s?.feedback ? (
        <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.lineStrong, paddingTop: 12, gap: 8 }}>
          <Text variant="sm" color="ink2" style={{ lineHeight: 22 }}>
            “{s.feedback}”
          </Text>
          {s.graded_by ? (
            <View style={[styles.row, { gap: 8 }]}>
              <Avatar initials={initialsOf(s.graded_by)} size="xs" tone={6} />
              <Text variant="xs" weight={700}>
                {s.graded_by}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Set but not open yet: a ticket stub that says when it opens. */
function LockedTicket({ item: a }: { item: AssignmentItem }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View accessible accessibilityLabel={t('student.assignments.lockedLabel', { title: a.title, subject: a.subject.name, teacher: a.teacher ?? '', date: a.opens_on ? formatDate(a.opens_on, { weekday: true }) : '' })}>
      <Ticket color="peach" style={styles.row}>
        <View style={{ flex: 1, minWidth: 0, paddingTop: 16, paddingBottom: 16, paddingLeft: 18, paddingRight: 12, gap: 3 }}>
          <Text variant="xxs" weight={800} rawColor={colors.pPeachInk} numberOfLines={1} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>
            {[a.subject.name, a.teacher].filter(Boolean).join(' · ')}
          </Text>
          <Text variant="h4">{a.title}</Text>
          <Text variant="xs" color="ink2">
            {[a.teaser || null, t('student.assignments.detailsWhenOpen')].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <TearV />
        <View style={{ width: 108, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 8 }}>
          <Icon name="lock" size={ICON_SIZE.md} rawColor={colors.pPeachInk} />
          <Text variant="xxs" weight={700} rawColor={colors.pPeachInk} style={{ textTransform: 'uppercase', letterSpacing: 1.1 }}>
            {t('student.assignments.opens')}
          </Text>
          <Text variant="sm" weight={800} num>
            {a.opens_on ? shortDate(a.opens_on) : '—'}
          </Text>
        </View>
      </Ticket>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  folderTab: { position: 'absolute', top: 0, left: 18, height: 30, paddingTop: 6, paddingHorizontal: 14, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  folderTabText: { fontSize: 10.5, lineHeight: 16, letterSpacing: 1.05, textTransform: 'uppercase' },
  projectTitle: { fontFamily: fonts.display, fontSize: 22, lineHeight: 25, letterSpacing: -0.44 },
  slip: { borderWidth: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  clip: { position: 'absolute', top: 9, left: 12, width: 18, height: 3, borderRadius: 2, transform: [{ rotate: '-32deg' }] },
});
