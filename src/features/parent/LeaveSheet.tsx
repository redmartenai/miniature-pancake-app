import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { LeaveApplication } from '@/api/types';
import { addDays, formatDate, isoDate, weekdayName } from '@/lib/format';
import { Button, Chip, Sheet, Switch, Text, TextField, useToast } from '@/ui';

/** School days (Mon–Sat) from a week ago to two weeks ahead: the dates a family can ask leave for. */
function leaveDays(): Date[] {
  const days: Date[] = [];
  for (let offset = -7; offset <= 14; offset += 1) {
    const d = addDays(new Date(), offset);
    if (d.getDay() !== 0) days.push(d);
  }
  return days;
}

export function LeaveSheet({
  visible,
  onClose,
  studentId,
  childName,
  teacher,
}: {
  visible: boolean;
  onClose: () => void;
  studentId: string;
  childName: string;
  teacher: string;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const client = useQueryClient();
  const days = useMemo(leaveDays, []);
  const todayIso = isoDate(new Date());
  const [from, setFrom] = useState(todayIso);
  const [to, setTo] = useState(todayIso);
  const [kind, setKind] = useState<LeaveApplication['kind']>('sick');
  const [reason, setReason] = useState('');
  const [halfDay, setHalfDay] = useState(false);
  const [error, setError] = useState<string>();

  const apply = useMutation({
    mutationFn: () => api.applyLeave(studentId, { from_date: from, to_date: to < from ? from : to, kind, reason: reason.trim(), half_day: halfDay && from === to }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['attendance', studentId] });
      void client.invalidateQueries({ queryKey: ['leave', studentId] });
      toast(t('parent.attendance.sent', { teacher }));
      setReason('');
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong')),
  });

  const dateChips = (value: string, onPick: (v: string) => void, min?: string) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {days
        .filter((d) => !min || isoDate(d) >= min)
        .map((d) => {
          const iso = isoDate(d);
          return (
            <Chip
              key={iso}
              label={`${weekdayName(d, true)} ${d.getDate()}`}
              selected={iso === value}
              onPress={() => onPick(iso)}
              accessibilityLabel={formatDate(d, { weekday: true })}
            />
          );
        })}
    </ScrollView>
  );

  return (
    <Sheet visible={visible} onClose={onClose} title={t('parent.attendance.leaveTitle')} message={t('parent.attendance.leaveFor', { name: childName, teacher })}>
      <View style={{ gap: 8 }}>
        <Text variant="xs" weight={650} color="ink2">
          {t('parent.attendance.from')}
        </Text>
        {dateChips(from, (v) => {
          setFrom(v);
          if (to < v) setTo(v);
        })}
        <Text variant="xs" weight={650} color="ink2">
          {t('parent.attendance.to')}
        </Text>
        {dateChips(to, setTo, from)}
      </View>
      <View style={{ gap: 8 }}>
        <Text variant="xs" weight={650} color="ink2">
          {t('parent.attendance.kind')}
        </Text>
        <View style={styles.row}>
          {(['sick', 'family', 'other'] as const).map((k) => (
            <Chip key={k} label={t(`parent.attendance.kind${k[0].toUpperCase()}${k.slice(1)}` as 'parent.attendance.kindSick')} selected={kind === k} onPress={() => setKind(k)} />
          ))}
        </View>
      </View>
      <TextField
        label={t('parent.attendance.reason')}
        placeholder={t('parent.attendance.reasonPlaceholder')}
        value={reason}
        onChangeText={(v) => {
          setReason(v);
          setError(undefined);
        }}
        maxLength={300}
        error={error}
      />
      {from === to ? (
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text variant="sm" weight={600}>
            {t('parent.attendance.halfDayLabel')}
          </Text>
          <Switch value={halfDay} onChange={setHalfDay} label={t('parent.attendance.halfDayLabel')} />
        </View>
      ) : null}
      <Button title={t('parent.attendance.submit')} size="lg" fullWidth loading={apply.isPending} disabled={!reason.trim()} onPress={() => apply.mutate()} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingRight: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
