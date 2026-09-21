import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { api } from '@/api/endpoints';
import { spacing } from '@/theme/tokens';
import { Button, Card, EmptyState, ErrorState, LoadingCards, Pill, Screen, Text } from '@/ui';

export default function StaffClasses() {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: ['teacher-classes'], queryFn: api.teacherClasses });
  const classes = query.data?.classes ?? [];

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Text variant="title">{t('teacher.classes')}</Text>
      {query.isLoading ? (
        <LoadingCards />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : classes.length === 0 ? (
        <EmptyState icon="people-outline" title={t('teacher.staffOnly')} />
      ) : (
        classes.map((group) => (
          <Card key={group.id}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text variant="heading">{group.label}</Text>
                <Text variant="caption">
                  {t('teacher.students', { count: group.student_count })}
                  {group.subjects.length ? ` · ${group.subjects.map((s) => s.name).join(', ')}` : ''}
                </Text>
              </View>
              {group.is_class_teacher ? <Pill label={t('teacher.classTeacher')} tone="primary" /> : null}
            </View>
            <View style={[styles.row, styles.actions]}>
              <Button
                title={group.attendance_marked_today ? t('teacher.attendanceDone') : t('teacher.markAttendance')}
                icon={group.attendance_marked_today ? 'checkmark-circle-outline' : 'checkbox-outline'}
                variant={group.attendance_marked_today ? 'secondary' : 'primary'}
                size="sm"
                onPress={() => router.push(`/class/${group.id}/attendance`)}
                style={styles.flex}
              />
              <Button title={t('teacher.giveHomework')} icon="book-outline" variant="secondary" size="sm" onPress={() => router.push(`/class/${group.id}/homework`)} style={styles.flex} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  actions: { marginTop: spacing.sm },
});
