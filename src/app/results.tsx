import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import { ScoreBar, TrendChart } from '@/features/charts/TrendChart';
import { useFamily } from '@/features/family/useFamily';
import { formatDate } from '@/lib/format';
import { spacing } from '@/theme/tokens';
import { Card, EmptyState, ErrorState, LoadingCards, Pill, Screen, SectionHeader, SegmentedControl, Text } from '@/ui';

export default function ResultsScreen() {
  const { t } = useTranslation();
  const family = useFamily();
  const studentId = family.selected?.id;
  const query = useQuery({ queryKey: ['results', studentId], queryFn: () => api.results(studentId as string), enabled: !!studentId });
  const [examId, setExamId] = useState<string>();
  const exams = query.data?.exams ?? [];
  const exam = exams.find((e) => e.id === examId) ?? exams[0];

  return (
    <Screen edges={[]} onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Stack.Screen options={{ title: `${t('results.title')} · ${family.selected?.first_name ?? ''}` }} />
      {query.isLoading ? (
        <LoadingCards />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !exam ? (
        <EmptyState icon="ribbon-outline" title={t('results.none')} />
      ) : (
        <>
          {exams.length > 1 ? (
            <SegmentedControl value={exam.id} onChange={setExamId} options={exams.map((e) => ({ value: e.id, label: e.name }))} />
          ) : null}
          <Card tone="soft">
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text variant="caption">
                  {t('results.overall')} · {formatDate(exam.held_on, { year: true })}
                </Text>
                <Text variant="display">{exam.percent}%</Text>
                <Text variant="body" color="textMuted">
                  {exam.total} / {exam.max_total}
                </Text>
              </View>
              <View style={styles.grade}>
                <Text variant="caption">Grade</Text>
                <Text variant="display" color="primary">
                  {exam.grade}
                </Text>
              </View>
            </View>
          </Card>

          {query.data && query.data.trend.length > 1 ? (
            <Card>
              <Text variant="subheading">{t('results.trend')}</Text>
              <TrendChart points={query.data.trend.map((p) => ({ label: p.exam, value: p.percent }))} />
            </Card>
          ) : null}

          <SectionHeader title={t('results.subjects')} />
          <Card>
            {exam.subjects.map((subject, index) => (
              <View
                key={subject.subject}
                style={[styles.subject, index > 0 && styles.divider]}
                accessible
                accessibilityLabel={`${subject.subject}: ${subject.marks} out of ${subject.max_marks}, grade ${subject.grade}${subject.class_average !== null ? `, ${t('results.classAverage', { value: subject.class_average })}` : ''}`}>
                <View style={styles.row}>
                  <Text variant="subheading" style={styles.flex}>
                    {subject.subject}
                  </Text>
                  <Text variant="bodyStrong">
                    {subject.marks}/{subject.max_marks}
                  </Text>
                  <Pill label={subject.grade} tone={subject.percent >= 80 ? 'success' : subject.percent >= 50 ? 'info' : 'warning'} />
                </View>
                <ScoreBar percent={subject.percent} average={subject.class_average} color={subject.color} />
                {subject.class_average !== null ? <Text variant="caption">{t('results.classAverage', { value: subject.class_average })}</Text> : null}
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  grade: { alignItems: 'center' },
  subject: { gap: 8, paddingVertical: spacing.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: 'rgba(128,128,128,0.15)' },
});
