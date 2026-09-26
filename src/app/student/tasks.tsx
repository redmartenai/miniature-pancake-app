import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { Homework } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { shortSubject } from '@/features/parent/HomeCards';
import { downloadFile } from '@/lib/download';
import { daysUntil, fileSize, formatClock, formatDate, parseDate, weekdayName } from '@/lib/format';
import { newClientId } from '@/lib/ids';
import { appendFiles, pickFiles } from '@/lib/pick';
import { useTheme } from '@/theme/ThemeProvider';
import {
  AppBar,
  Badge,
  Button,
  Card,
  Diary,
  DiaryHead,
  DiaryRow,
  EmptyState,
  ErrorState,
  Icon,
  ICON_SIZE,
  Kicker,
  ListRow,
  LoadingCards,
  Paper,
  Pill,
  pointer,
  Screen,
  SegmentedControl,
  Stamp,
  Text,
  useToast,
} from '@/ui';

type Tab = 'todo' | 'submitted' | 'graded';

/** StuHomework ("Tasks"): the homework diary; open a task to hand it in; marked work comes back stamped. */
export default function StudentTasks() {
  const { t } = useTranslation();
  const { open: openParam } = useLocalSearchParams<{ open?: string }>();
  const family = useFamily();
  const me = family.selected;
  const id = me?.id;
  const homework = useQuery({ queryKey: ['homework', id], queryFn: () => api.homework(id as string), enabled: !!id });
  const assignments = useQuery({ queryKey: ['assignments', id], queryFn: () => api.assignments(id as string), enabled: !!id });
  const [tab, setTab] = useState<Tab>('todo');
  const items = homework.data?.items ?? [];
  const todo = items.filter((h) => !h.submission && daysUntil(h.due_date) >= -7).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const submitted = items.filter((h) => h.submission && h.submission.status !== 'reviewed');
  const graded = items.filter((h) => h.submission?.status === 'reviewed').sort((a, b) => b.submission!.submitted_at.localeCompare(a.submission!.submitted_at));
  const [open, setOpen] = useState<string | undefined>(openParam);
  useEffect(() => {
    if (openParam) setOpen(openParam);
    else if (!open && todo[0]) setOpen(todo[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openParam, homework.data]);
  const project = assignments.data?.in_progress[0];
  const range = todo.length ? `${weekdayName(todo[0].due_date, true)} ${parseDate(todo[0].due_date).getDate()} – ${weekdayName(todo[todo.length - 1].due_date, true)} ${formatDate(todo[todo.length - 1].due_date)}` : '';
  const shown = tab === 'todo' ? todo : tab === 'submitted' ? submitted : graded;

  return (
    <Screen
      dock
      refreshing={homework.isRefetching}
      onRefresh={homework.refetch}
      header={<AppBar title={t('student.tasks.title')} subtitle={me ? t('student.schedule.subtitle', { class: me.class.short_label }) : undefined} />}>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'todo', label: t('student.tasks.todo'), badge: todo.length ? <Badge value={todo.length} /> : undefined },
          { value: 'submitted', label: `${t('student.tasks.submitted')} ${submitted.length}` },
          { value: 'graded', label: `${t('student.tasks.graded')} ${graded.length}` },
        ]}
        style={{ height: 52 }}
      />
      {homework.error ? <ErrorState error={homework.error} onRetry={homework.refetch} /> : null}
      {homework.isLoading ? <LoadingCards count={3} /> : null}
      {homework.data && !shown.length ? <EmptyState icon="check" title={t(`student.tasks.empty_${tab}`)} /> : null}

      {shown.length && tab !== 'graded' ? (
        <Diary>
          <DiaryHead>
            <Text variant="sm" weight={700} style={{ flex: 1 }}>
              {t('student.tasks.diary')}
            </Text>
            {tab === 'todo' && range ? (
              <Text variant="xs" color="muted" weight={600}>
                {range}
              </Text>
            ) : null}
          </DiaryHead>
          {shown.map((h, i) => (
            <DiaryLine key={h.id} homework={h} open={open === h.id} onToggle={() => setOpen(open === h.id ? undefined : h.id)} last={i === shown.length - 1} />
          ))}
        </Diary>
      ) : null}

      {open && tab !== 'graded' && id ? (() => {
        const h = shown.find((x) => x.id === open);
        return h ? <TaskCard homework={h} studentId={id} onClose={() => setOpen(undefined)} /> : null;
      })() : null}

      {(tab === 'todo' || tab === 'graded') && graded.length ? (
        <View style={{ gap: 14, paddingTop: 8 }}>
          <Kicker>{t('student.tasks.marked')}</Kicker>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 6, paddingRight: 8 }}>
            {graded.slice(0, tab === 'graded' ? 20 : 3).map((h, i) => (
              <MarkedCard key={h.id} homework={h} index={i} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {project ? (
        <ListRow
          inset={0}
          last
          title={t('student.tasks.projects')}
          subtitle={t('student.tasks.projectLine', { title: project.title, size: project.group_size, date: `${weekdayName(project.due_date, true)} ${formatDate(project.due_date)}` })}
          onPress={() => router.push('/student/assignments')}
          style={{ borderTopWidth: 1, borderTopColor: 'transparent' }}
        />
      ) : null}
    </Screen>
  );
}

function statusOf(h: Homework, t: (k: string, o?: Record<string, unknown>) => string): { text: string; tone: 'warn' | 'info' | 'bad' | 'muted' | 'ok' } {
  if (h.submission?.status === 'redo') return { text: t('student.tasks.redo'), tone: 'bad' };
  if (h.submission) return { text: h.submission.in_notebook ? t('student.tasks.inNotebook') : t('student.tasks.handedIn'), tone: 'ok' };
  if (h.flagged_by) return { text: t('student.tasks.incomplete'), tone: 'warn' };
  const left = daysUntil(h.due_date);
  if (left < 0) return { text: t('student.tasks.late'), tone: 'bad' };
  if (left === 0) return { text: t('student.home.today'), tone: 'warn' };
  if (left === 1) return { text: t('student.home.tomorrowWord'), tone: 'warn' };
  return { text: t('student.tasks.notStarted'), tone: 'muted' };
}

function DiaryLine({ homework: h, open, onToggle, last }: { homework: Homework; open: boolean; onToggle: () => void; last: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = statusOf(h, t);
  const color = s.tone === 'warn' ? colors.warn : s.tone === 'info' ? colors.info : s.tone === 'bad' ? colors.bad : s.tone === 'ok' ? colors.ok : colors.muted;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={pointer}>
      <DiaryRow when={weekdayName(h.due_date, true)} last={last} style={{ minHeight: 44 }}>
        <Text variant="sm" weight={700} style={{ width: 42 }} numberOfLines={1}>
          {shortSubject(h.subject.name)}
        </Text>
        <Text variant="sm" color="ink2" numberOfLines={1} style={{ flex: 1 }}>
          {h.title}
        </Text>
        <Text variant="xxs" weight={700} rawColor={color}>
          {s.text}
        </Text>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={ICON_SIZE.sm} rawColor={colors.muted} />
      </DiaryRow>
    </Pressable>
  );
}

/** One piece of homework opened up: brief, worksheet, upload or "done in notebook". */
function TaskCard({ homework: h, studentId, onClose }: { homework: Homework; studentId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['homework', studentId] });
    void client.invalidateQueries({ queryKey: ['summary', studentId] });
  };
  const upload = useMutation({
    mutationFn: async (kind: 'photo' | 'pdf') => {
      const files = await pickFiles(kind).catch((e: Error) => {
        throw e.message === 'permission' ? new ApiError(0, 'permission', t('chat.photoPermission')) : e;
      });
      if (!files) return null;
      const form = new FormData();
      form.append('student_id', studentId);
      form.append('client_id', newClientId());
      await appendFiles(form, 'photos', files);
      return api.submitHomework(h.id, form);
    },
    onSuccess: (saved) => {
      if (!saved) return;
      toast(t('student.tasks.sent', { teacher: h.assigned_by ?? '' }));
      refresh();
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });
  const done = useMutation({
    mutationFn: () => api.homeworkDone(h.id, studentId),
    onSuccess: () => {
      toast(t('student.tasks.markedDone'));
      refresh();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  const left = daysUntil(h.due_date);
  const due =
    left === 0
      ? t('student.tasks.dueToday', { time: h.due_period ? formatClock(h.due_period.starts_at) : '' })
      : left === 1
        ? t('student.tasks.dueTomorrow', { time: h.due_period ? formatClock(h.due_period.starts_at) : '' })
        : t('student.tasks.dueOn', { date: `${weekdayName(h.due_date, true)} ${formatDate(h.due_date)}` });
  return (
    <Card pastel="peach" pad={18} style={{ gap: 14 }} accessibilityLabel={`${h.subject.name}, ${h.title}`}>
      <View style={[styles.row, { alignItems: 'flex-start', gap: 10 }]}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text variant="xxs" weight={800} rawColor={colors.pPeachInk} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>
            {h.subject.name}
            {h.assigned_by ? ` · ${h.assigned_by}` : ''}
          </Text>
          <Text variant="h2">{h.title}</Text>
          <Text variant="xs" color="muted">
            {t('student.tasks.setOn', { date: `${weekdayName(h.assigned_on, true)} ${formatDate(h.assigned_on)}` })}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('student.tasks.collapse')} onPress={onClose} hitSlop={10} style={pointer}>
          <Icon name="chevronUp" size={ICON_SIZE.md} rawColor={colors.ink2} />
        </Pressable>
      </View>
      {!h.submission ? <Pill label={due} tone={left <= 1 ? 'warn' : 'neutral'} /> : <Pill label={statusOf(h, t).text} tone="ok" />}
      {h.description ? (
        <Text variant="sm" color="ink2" style={{ lineHeight: 21 }}>
          {h.description}
        </Text>
      ) : null}
      {(h.attachments ?? []).map((a) => (
        <Pressable
          key={a.id}
          accessibilityRole="button"
          accessibilityLabel={t('parent.homework.download', { name: a.name })}
          onPress={() => void downloadFile(a.url, a.name).catch(() => toast(t('common.somethingWrong'), 'danger'))}
          style={[styles.row, styles.file, { backgroundColor: colors.surface }, pointer]}>
          <Icon name="document" size={ICON_SIZE.md} rawColor={colors.pPeachInk} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700} numberOfLines={1}>
              {a.name}
            </Text>
            <Text variant="xxs" color="muted" weight={600}>
              {['PDF', fileSize(a.size), h.assigned_by ? t('student.tasks.from', { name: h.assigned_by }) : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Icon name="download" size={ICON_SIZE.md} rawColor={colors.ink2} />
        </Pressable>
      ))}
      {!h.submission || h.submission.status === 'redo' ? (
        <>
          {h.accepts_photos ? (
            <View style={[styles.drop, { borderColor: colors.tear, backgroundColor: colors.pTrack }]}>
              <Icon name="upload" size={ICON_SIZE.lg} rawColor={colors.pPeachInk} />
              <Text variant="sm" weight={700} align="center">
                {t('student.tasks.dropTitle')}
              </Text>
              <Text variant="xs" color="muted" align="center">
                {t('student.tasks.dropHint')}
              </Text>
              <Button title={t('student.tasks.upload')} icon="upload" size="lg" fullWidth loading={upload.isPending && upload.variables === 'photo'} onPress={() => upload.mutate('photo')} />
              <Button title={t('student.tasks.uploadPdf')} variant="ghost" size="sm" height={40} textColor={colors.brandInk} loading={upload.isPending && upload.variables === 'pdf'} onPress={() => upload.mutate('pdf')} />
            </View>
          ) : null}
          <Button title={t('student.tasks.doneInNotebook')} icon="check" variant="secondary" size="md" height={44} fullWidth loading={done.isPending} onPress={() => done.mutate()} />
          <Text variant="xs" color="muted" align="center">
            {t('student.tasks.notebookHint', { teacher: h.assigned_by ?? '' })}
          </Text>
        </>
      ) : null}
    </Card>
  );
}

function MarkedCard({ homework: h, index }: { homework: Homework; index: number }) {
  const { t } = useTranslation();
  const grade = h.submission?.grade ?? '';
  const score = grade.includes('/');
  return (
    <Paper pad={0} style={{ width: 118, paddingVertical: 12, paddingHorizontal: 10, gap: 6, transform: [{ rotate: ['-1.2deg', '0.8deg', '-0.5deg'][index % 3] }], marginTop: index % 2 ? 4 : 0 }}>
      <Text variant="xxs" color="muted" weight={700} style={{ letterSpacing: 0.9, textTransform: 'uppercase' }}>
        {h.subject.name === 'Mathematics' ? 'Maths' : h.subject.name}
      </Text>
      <Text variant="xs" weight={700} numberOfLines={2} style={{ minHeight: 32 }}>
        {h.title.replace(/^.*·\s*/, '')}
      </Text>
      <Stamp tone="lav" round rotate={-6} style={{ width: 52, height: 52, borderRadius: 26, alignSelf: 'center', marginVertical: 4 }}>
        {score ? grade.replace(/\s/g, '') : grade || t('student.tasks.checked')}
      </Stamp>
      <Text variant="xxs" color="muted" weight={600}>
        {h.submission ? `${weekdayName(h.submission.submitted_at.slice(0, 10), true)} ${formatDate(h.submission.submitted_at)}` : ''}
      </Text>
    </Paper>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  file: { gap: 12, padding: 12, paddingRight: 14, borderRadius: 12 },
  drop: { alignItems: 'center', gap: 8, padding: 18, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed' },
});
