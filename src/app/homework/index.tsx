import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { api } from '@/api/endpoints';
import type { Homework } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { dueText } from '@/features/family/homework';
import { Card, EmptyState, ErrorState, ListRow, LoadingCards, Pill, Screen, SectionHeader } from '@/ui';

export default function HomeworkList() {
  const { t } = useTranslation();
  const family = useFamily();
  const studentId = family.selected?.id;
  const query = useQuery({
    queryKey: ['homework', studentId],
    queryFn: () => api.homework(studentId as string),
    enabled: !!studentId,
  });
  const items = query.data?.items ?? [];
  const todo = items.filter((h) => !h.submission || h.submission.status === 'redo');
  const done = items.filter((h) => h.submission && h.submission.status !== 'redo');

  const section = (title: string, list: Homework[]) =>
    list.length ? (
      <>
        <SectionHeader title={title} />
        <Card padded={false}>
          {list.map((item, index) => {
            const due = dueText(item, t);
            return (
              <ListRow
                key={item.id}
                left={<View style={{ width: 5, alignSelf: 'stretch', borderRadius: 3, backgroundColor: item.subject.color }} />}
                title={item.title}
                subtitle={item.subject.name}
                right={<Pill label={due.text} tone={due.tone} />}
                onPress={() => router.push(`/homework/${item.id}`)}
                last={index === list.length - 1}
              />
            );
          })}
        </Card>
      </>
    ) : null;

  return (
    <Screen edges={[]} onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Stack.Screen options={{ title: `${t('homework.title')} · ${family.selected?.first_name ?? ''}` }} />
      {query.isLoading ? (
        <LoadingCards />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="book-outline" title={t('homework.none')} />
      ) : (
        <>
          {section(t('homework.toDo'), todo)}
          {section(t('homework.doneSection'), done)}
        </>
      )}
    </Screen>
  );
}
