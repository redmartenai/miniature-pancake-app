import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { AttendanceStatus } from '@/api/types';
import { newClientId } from '@/lib/ids';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, toneColors, type Tone } from '@/theme/tokens';
import { Avatar, Button, Card, ErrorState, LoadingCards, Screen, Text, useToast } from '@/ui';

type Mark = 'present' | 'absent' | 'late';
const OPTIONS: { value: Mark; short: string; tone: Tone }[] = [
  { value: 'present', short: 'P', tone: 'success' },
  { value: 'absent', short: 'A', tone: 'danger' },
  { value: 'late', short: 'L', tone: 'warning' },
];

/** Everyone starts present; the teacher only taps the exceptions. Saving alerts those families. */
export default function MarkAttendance() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const roster = useQuery({ queryKey: ['roster', id], queryFn: () => api.classRoster(id) });
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  // One id per screen visit: a retried save is recognised by the server.
  const [clientId] = useState(newClientId);

  const statusOf = (studentId: string, saved: AttendanceStatus | null): Mark =>
    marks[studentId] ?? (saved === 'absent' || saved === 'late' ? saved : 'present');

  const students = roster.data?.students ?? [];
  const counts = students.reduce(
    (acc, s) => {
      acc[statusOf(s.id, s.status)] += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0 } as Record<Mark, number>,
  );

  const save = useMutation({
    mutationFn: () =>
      api.markAttendance(
        id,
        students
          .map((s) => ({ student_id: s.id, status: statusOf(s.id, s.status) }))
          .filter((entry) => entry.status !== 'present'),
        clientId,
      ),
    onSuccess: () => {
      toast(t('teacher.saved'));
      void queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
      void queryClient.invalidateQueries({ queryKey: ['roster', id] });
      router.back();
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : t('common.somethingWrong'), 'danger'),
  });

  return (
    <Screen
      edges={[]}
      footer={
        <View style={styles.footer}>
          <Text variant="label" color="textMuted" style={styles.flex}>
            {t('teacher.absentees', { absent: counts.absent, late: counts.late })}
          </Text>
          <Button title={t('teacher.saveAttendance')} icon="checkmark-done" onPress={() => save.mutate()} loading={save.isPending} disabled={!students.length} />
        </View>
      }>
      <Stack.Screen options={{ title: roster.data?.class.label ?? t('teacher.markAttendance') }} />
      {roster.isLoading ? (
        <LoadingCards />
      ) : roster.error ? (
        <ErrorState error={roster.error} onRetry={() => void roster.refetch()} />
      ) : (
        <>
          <Button
            title={t('teacher.allPresent')}
            icon="people-outline"
            variant="soft"
            size="sm"
            onPress={() => setMarks(Object.fromEntries(students.map((s) => [s.id, 'present' as Mark])))}
          />
          <Card padded={false}>
            {students.map((student, index) => {
              const current = statusOf(student.id, student.status);
              return (
                <View key={student.id} style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.borderSoft }]}>
                  <Text variant="caption" style={styles.roll}>
                    {student.roll_no}
                  </Text>
                  <Avatar initials={student.initials} size={34} seed={student.id} />
                  <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                    {student.name}
                  </Text>
                  <View style={styles.toggle} accessibilityRole="radiogroup" accessibilityLabel={student.name}>
                    {OPTIONS.map((option) => {
                      const selected = current === option.value;
                      const { fg, bg } = toneColors(colors, option.tone);
                      return (
                        <Pressable
                          key={option.value}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          accessibilityLabel={t(`attendance.${option.value}`)}
                          onPress={() => setMarks((m) => ({ ...m, [student.id]: option.value }))}
                          style={[
                            styles.option,
                            { borderColor: selected ? fg : colors.border, backgroundColor: selected ? bg : colors.surface },
                          ]}>
                          <Text variant="label" rawColor={selected ? fg : colors.textMuted}>
                            {option.short}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, minHeight: 58 },
  roll: { width: 20, textAlign: 'right' },
  flex: { flex: 1 },
  toggle: { flexDirection: 'row', gap: 6 },
  option: { width: 40, height: 40, borderRadius: radius.sm, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
