import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import { formatDate, isoDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { Button, Card, EmptyState, ErrorState, ListRow, LoadingCards, Pill, Screen, SegmentedControl, Text, TextField, useToast } from '@/ui';
import { Sheet } from '@/ui/Sheet';

function dueOptions() {
  const today = new Date();
  const add = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d;
  };
  const nextMonday = add(((8 - today.getDay()) % 7) || 7);
  return [
    { value: isoDate(add(1)), label: 'Tomorrow' },
    { value: isoDate(add(2)), label: formatDate(add(2), { weekday: true }).split(',')[0] },
    { value: isoDate(nextMonday), label: `Mon ${nextMonday.getDate()}` },
    { value: isoDate(add(7)), label: formatDate(add(7)) },
  ];
}

export default function ClassHomework() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const classes = useQuery({ queryKey: ['teacher-classes'], queryFn: api.teacherClasses });
  const group = classes.data?.classes.find((c) => c.id === id);
  const list = useQuery({ queryKey: ['class-homework', id], queryFn: () => api.classHomework(id) });

  const [open, setOpen] = useState(false);
  const options = dueOptions();
  const [subjectId, setSubjectId] = useState<string>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [due, setDue] = useState(options[0].value);
  const [photos, setPhotos] = useState(true);
  const subject = subjectId ?? group?.subjects[0]?.id;

  const create = useMutation({
    mutationFn: () =>
      api.createHomework(id, { subject_id: subject as string, title: title.trim(), description: description.trim(), due_date: due, accepts_photos: photos }),
    onSuccess: () => {
      setOpen(false);
      setTitle('');
      setDescription('');
      toast(t('teacher.newHomework'));
      void queryClient.invalidateQueries({ queryKey: ['class-homework', id] });
    },
    onError: (error) => toast(error instanceof ApiError ? (error.fieldMessage() ?? error.message) : t('common.somethingWrong'), 'danger'),
  });

  const items = list.data?.items ?? [];

  return (
    <Screen edges={[]} onRefresh={() => void list.refetch()} refreshing={list.isRefetching}>
      <Stack.Screen options={{ title: `${t('homework.title')} · ${group?.short_label ?? ''}` }} />
      <Button title={t('teacher.newHomework')} icon="add-circle-outline" onPress={() => setOpen(true)} disabled={!group?.subjects.length} fullWidth />
      {list.isLoading ? (
        <LoadingCards />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="book-outline" title={t('homework.none')} />
      ) : (
        <Card padded={false}>
          {items.map((item, index) => (
            <ListRow
              key={item.id}
              left={<View style={[styles.bar, { backgroundColor: item.subject.color }]} />}
              title={item.title}
              subtitle={`${item.subject.name} · ${t('homework.due', { date: formatDate(item.due_date, { weekday: true }) })}`}
              right={<Pill label={t('teacher.submissions', { submitted: item.counts?.submitted ?? 0, total: list.data?.class_size ?? 0 })} tone="info" />}
              onPress={() => router.push(`/review/${item.id}`)}
              last={index === items.length - 1}
            />
          ))}
        </Card>
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('teacher.newHomework')}>
        {group && group.subjects.length > 1 ? (
          <SegmentedControl value={subject as string} onChange={setSubjectId} options={group.subjects.map((s) => ({ value: s.id, label: s.name }))} />
        ) : null}
        <TextField label={t('teacher.titleLabel')} value={title} onChangeText={setTitle} maxLength={120} />
        <TextField label={t('teacher.descriptionLabel')} value={description} onChangeText={setDescription} multiline maxLength={2000} />
        <Text variant="label">{t('teacher.dueDate')}</Text>
        <SegmentedControl value={due} onChange={setDue} options={options} />
        <View style={styles.switchRow}>
          <Text variant="body" style={styles.flex}>
            {t('teacher.acceptsPhotos')}
          </Text>
          <Switch value={photos} onValueChange={setPhotos} trackColor={{ true: colors.primary, false: colors.border }} accessibilityLabel={t('teacher.acceptsPhotos')} />
        </View>
        <Button title={t('teacher.create')} onPress={() => create.mutate()} loading={create.isPending} disabled={!title.trim() || !subject} fullWidth />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
