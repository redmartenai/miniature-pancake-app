import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { AssignmentCard, TeacherHomework } from '@/api/types';
import { addDays, daysUntil, fileSize, formatDate, isoDate, weekdayName } from '@/lib/format';
import { appendFiles, type PickedFile } from '@/lib/pick';
import { useTheme } from '@/theme/ThemeProvider';
import {
  AppBar,
  Bar,
  Button,
  Card,
  Chip,
  DateField,
  EmptyState,
  Icon,
  ICON_SIZE,
  IconButton,
  LoadingCards,
  Pill,
  pointer,
  Screen,
  SectionHead,
  Switch,
  Text,
  TextField,
  TileIcon,
  useToast,
} from '@/ui';

/** StaffHomework: set homework for one of your classes, and see how the recent ones are going. */
export default function StaffHomework() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { class: classParam } = useLocalSearchParams<{ class?: string }>();
  const toast = useToast();
  const client = useQueryClient();
  const classes = useQuery({ queryKey: ['staff-classes'], queryFn: api.staffClasses });
  const recent = useQuery({ queryKey: ['teacher-homework'], queryFn: api.teacherHomework });
  const projects = useQuery({ queryKey: ['teacher-assignments'], queryFn: api.teacherAssignments });
  const list = classes.data?.classes ?? [];
  const [classId, setClassId] = useState<string>();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [due, setDue] = useState(isoDate(nextSchoolDay(2)));
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [notify, setNotify] = useState(true);
  const [photos, setPhotos] = useState(true);

  useEffect(() => {
    if (!classId && list.length) setClassId(classParam ?? (list.find((c) => c.is_class_teacher) ?? list[0]).id);
  }, [list, classId, classParam]);
  const chosen = list.find((c) => c.id === classId);
  const subject = chosen?.subject;

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if ((a.size ?? 0) > 10 * 1024 * 1024) return toast(t('staff.homework.tooBig'), 'danger');
    setFiles((prev) => [...prev, { uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream', file: a.file, size: a.size }]);
  };

  const assign = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('subject_id', subject!.id);
      form.append('title', title.trim());
      form.append('description', body.trim());
      form.append('due_date', due);
      form.append('accepts_photos', String(photos));
      form.append('notify_parents', String(notify));
      await appendFiles(form, 'attachments', files);
      return api.createHomeworkWithFiles(classId as string, form);
    },
    onSuccess: () => {
      toast(t('staff.homework.assigned', { class: chosen?.short_label ?? '' }));
      setTitle('');
      setBody('');
      setFiles([]);
      void client.invalidateQueries({ queryKey: ['teacher-homework'] });
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });

  const left = daysUntil(due);
  const toReview = (projects.data?.assignments ?? []).filter((a) => a.counts.to_review > 0);

  return (
    <Screen
      dock
      gap={18}
      refreshing={recent.isRefetching}
      onRefresh={recent.refetch}
      header={
        <AppBar
          back={() => (router.canGoBack() ? router.back() : router.navigate('/staff'))}
          subtitle={[subject?.name, t('staff.homework.kicker')].filter(Boolean).join(' · ')}
          title={t('staff.homework.title')}
        />
      }>
      {!classes.data ? <LoadingCards count={2} /> : null}
      {classes.data && !list.length ? <EmptyState icon="layers" title={t('staff.classes.none')} /> : null}
      {chosen ? (
        <Card pad={18} style={{ gap: 16 }}>
          <View style={{ gap: 8 }}>
            <Text variant="sm" weight={600} color="ink2">
              {t('staff.homework.assignTo')}
            </Text>
            <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
              {list.map((c) => (
                <Chip key={c.id} label={c.short_label} icon={c.id === classId ? 'check' : undefined} selected={c.id === classId} onPress={() => setClassId(c.id)} style={{ height: 44, paddingHorizontal: 16 }} />
              ))}
            </View>
            <Text variant="xs" color="muted">
              {t('staff.homework.selected', { count: chosen.student_count })}
            </Text>
          </View>
          <View style={{ gap: 7 }}>
            <Text variant="sm" weight={600} color="ink2">
              {t('staff.homework.subject')}
            </Text>
            <View style={[styles.row, styles.locked, { backgroundColor: colors.sunken, borderColor: colors.lineStrong }]}>
              <Icon name="lock" size={ICON_SIZE.sm} rawColor={colors.muted} />
              <Text variant="body" style={{ flex: 1 }}>
                {subject?.name}
              </Text>
              <Text variant="xs" color="muted" weight={600}>
                {t('staff.homework.yourSubject')}
              </Text>
            </View>
          </View>
          <TextField label={t('staff.homework.titleLabel')} value={title} onChangeText={setTitle} placeholder={t('staff.homework.titlePlaceholder')} maxLength={120} />
          <TextField label={t('staff.homework.instructions')} value={body} onChangeText={setBody} placeholder={t('staff.homework.instructionsPlaceholder')} multiline style={{ minHeight: 96 }} maxLength={2000} />
          <View style={{ gap: 7 }}>
            <Text variant="sm" weight={600} color="ink2">
              {t('staff.homework.attachment')}
            </Text>
            <View style={[styles.row, { gap: 10 }]}>
              <View style={{ flex: 1, gap: 8 }}>
                {files.map((f, i) => (
                  <View key={i} style={[styles.row, styles.file, { backgroundColor: colors.sunken }]}>
                    <Icon name="document" size={ICON_SIZE.sm} rawColor={colors.brandInk} />
                    <Text variant="sm" weight={600} numberOfLines={1} style={{ flex: 1 }}>
                      {f.name}
                    </Text>
                    {f.size ? (
                      <Text variant="xs" color="muted">
                        {fileSize(f.size)}
                      </Text>
                    ) : null}
                    <IconButton icon="close" variant="bare" size="sm" label={t('staff.homework.remove', { name: f.name })} onPress={() => setFiles((prev) => prev.filter((_, k) => k !== i))} />
                  </View>
                ))}
                {!files.length ? (
                  <Text variant="xs" color="muted" style={{ paddingVertical: 12 }}>
                    {t('staff.homework.noAttachment')}
                  </Text>
                ) : null}
              </View>
              <IconButton icon="paperclip" size="lg" label={t('staff.homework.attach')} onPress={() => void pick()} />
            </View>
          </View>
          <DateField
            label={t('staff.homework.due')}
            value={due}
            onChange={setDue}
            min={isoDate(new Date())}
            withYear
            trailing={
              <Text variant="xs" color="muted" weight={600}>
                {left === 0 ? t('staff.homework.today') : left === 1 ? t('staff.homework.tomorrow') : t('staff.homework.inDays', { count: left })}
              </Text>
            }
          />
          <View style={{ height: 1, backgroundColor: colors.line }} />
          <ToggleRow title={t('staff.homework.notify')} hint={t('staff.homework.notifyHint', { count: chosen.student_count, class: chosen.short_label })} value={notify} onChange={setNotify} />
          <ToggleRow title={t('staff.homework.photos')} hint={t('staff.homework.photosHint')} value={photos} onChange={setPhotos} />
          <Button title={t('staff.homework.assign')} icon="send" size="lg" fullWidth disabled={!title.trim() || !subject} loading={assign.isPending} onPress={() => assign.mutate()} />
        </Card>
      ) : null}

      {toReview.length ? (
        <>
          <SectionHead title={t('staff.homework.projects')} />
          <Card pad={0} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
            {toReview.map((a, i) => (
              <ProjectRow key={a.id} a={a} last={i === toReview.length - 1} />
            ))}
          </Card>
        </>
      ) : null}

      <SectionHead
        title={t('staff.homework.recent')}
        action={
          <Text variant="xs" color="muted" weight={600}>
            {t('staff.homework.thisWeek')}
          </Text>
        }
      />
      {recent.data && !recent.data.items.length ? <EmptyState icon="edit" title={t('staff.homework.none')} /> : null}
      {recent.data?.items.length ? (
        <Card pad={0} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
          {recent.data.items.slice(0, 6).map((h, i, all) => (
            <RecentRow key={h.id} h={h} last={i === all.length - 1} />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

function nextSchoolDay(offset: number): Date {
  let d = addDays(new Date(), offset);
  if (d.getDay() === 0) d = addDays(d, 1);
  return d;
}

function ToggleRow({ title, hint, value, onChange }: { title: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={[styles.row, { gap: 12 }, pointer]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="sm" weight={700}>
          {title}
        </Text>
        <Text variant="xs" color="muted">
          {hint}
        </Text>
      </View>
      <Switch value={value} label={title} decorative />
    </Pressable>
  );
}

function RecentRow({ h, last }: { h: TeacherHomework; last: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const review = h.counts.to_review;
  return (
    <View style={[{ paddingVertical: 14, gap: 10 }, !last && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
      <View style={[styles.row, { gap: 12, alignItems: 'flex-start' }]}>
        <TileIcon icon="edit" tone={h.open ? 'brand' : 'peach'} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="sm" weight={700} numberOfLines={1}>
            {h.title.replace('Exercise', 'Ex')}
          </Text>
          <Text variant="xs" color="muted">
            {h.class.short_label} · {h.open ? t('staff.homework.dueOn', { date: `${weekdayName(h.due_date, true)} ${formatDate(h.due_date)}` }) : t('staff.homework.closedOn', { date: `${weekdayName(h.due_date, true)} ${formatDate(h.due_date)}` })}
          </Text>
        </View>
        {h.open ? <Pill label={t('staff.homework.open')} tone="info" dot={false} /> : review ? <Pill label={t('staff.homework.toReview', { count: review })} tone="warn" dot={false} /> : <Pill label={t('staff.homework.closed')} dot={false} />}
      </View>
      <View style={[styles.row, { gap: 12, paddingLeft: 52 }]}>
        <Bar value={h.counts.submitted} max={h.class_size || 1} size="thin" style={{ flex: 1 }} accessibilityLabel={t('staff.homework.submitted', { count: h.counts.submitted, total: h.class_size })} />
        <Text variant="xs" weight={700} num>
          {t('staff.homework.submitted', { count: h.counts.submitted, total: h.class_size })}
        </Text>
        {review && !h.open ? <Button title={t('staff.homework.review')} variant="secondary" height={44} onPress={() => router.push(`/review/${h.id}`)} /> : null}
      </View>
    </View>
  );
}

function ProjectRow({ a, last }: { a: AssignmentCard; last: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/staff/assignments', params: { id: a.id } })}
      style={[styles.row, { gap: 12, paddingVertical: 14 }, !last && { borderBottomWidth: 1, borderBottomColor: colors.line }, pointer]}>
      <TileIcon icon="award" tone="lav" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="sm" weight={700} numberOfLines={1}>
          {a.title}
        </Text>
        <Text variant="xs" color="muted">
          {a.class.short_label} · {t('staff.homework.dueOn', { date: `${weekdayName(a.due_date, true)} ${formatDate(a.due_date)}` })}
        </Text>
      </View>
      <Pill label={t('staff.homework.toReview', { count: a.counts.to_review })} tone="warn" dot={false} />
      <Icon name="chevronRight" size={ICON_SIZE.sm} rawColor={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  locked: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, gap: 10 },
  file: { minHeight: 48, borderRadius: 12, paddingLeft: 14, paddingRight: 4, gap: 10 },
});
