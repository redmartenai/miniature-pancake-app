import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { Submissions } from '@/api/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { Avatar, Button, Card, ErrorState, LoadingCards, Pill, Screen, Text, TextField, useToast } from '@/ui';
import { Sheet } from '@/ui/Sheet';

type Row = Submissions['students'][number];

/** Teachers see who has submitted, look at the photos and mark each one checked or "redo". */
export default function ReviewHomework() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['submissions', id], queryFn: () => api.homeworkSubmissions(id) });
  const [selected, setSelected] = useState<Row | null>(null);
  const [remark, setRemark] = useState('');

  const review = useMutation({
    mutationFn: (status: 'reviewed' | 'redo') => api.reviewSubmission(selected?.submission?.id as string, status, remark),
    onSuccess: () => {
      setSelected(null);
      setRemark('');
      toast(t('homework.reviewed'));
      void queryClient.invalidateQueries({ queryKey: ['submissions', id] });
    },
    onError: () => toast(t('common.somethingWrong'), 'danger'),
  });

  const students = query.data?.students ?? [];
  const submitted = students.filter((s) => s.submission);

  return (
    <Screen edges={[]} onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Stack.Screen options={{ title: query.data?.homework.title ?? t('homework.title') }} />
      {query.isLoading ? (
        <LoadingCards />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <Text variant="caption">{t('teacher.submissions', { submitted: submitted.length, total: students.length })}</Text>
          <Card padded={false}>
            {students.map((row, index) => (
              <View key={row.id} style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.borderSoft }]}>
                <Avatar initials={row.initials} size={34} seed={row.id} />
                <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                  {row.name}
                </Text>
                {row.submission ? (
                  row.submission.status === 'submitted' ? (
                    <Button title={t('teacher.check')} size="sm" variant="soft" onPress={() => setSelected(row)} />
                  ) : (
                    <Pill label={row.submission.status === 'reviewed' ? t('homework.reviewed') : t('homework.redo')} tone={row.submission.status === 'reviewed' ? 'success' : 'warning'} />
                  )
                ) : (
                  <Text variant="caption">{t('teacher.notSubmitted')}</Text>
                )}
              </View>
            ))}
          </Card>
        </>
      )}

      <Sheet visible={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          {(selected?.submission?.photos ?? []).map((uri) => (
            <Image key={uri} source={{ uri }} style={[styles.photo, { borderColor: colors.border }]} contentFit="cover" accessibilityLabel="Homework page" />
          ))}
        </ScrollView>
        <TextField label={t('homework.remark')} placeholder={t('teacher.remarkPlaceholder')} value={remark} onChangeText={setRemark} multiline maxLength={500} />
        <View style={styles.actions}>
          <Button title={t('teacher.askRedo')} variant="secondary" onPress={() => review.mutate('redo')} style={styles.flex} />
          <Button title={t('teacher.markChecked')} icon="checkmark" onPress={() => review.mutate('reviewed')} loading={review.isPending} style={styles.flex} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm + 2, minHeight: 56 },
  flex: { flex: 1 },
  photos: { gap: spacing.xs },
  photo: { width: 150, height: 200, borderRadius: radius.sm, borderWidth: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
