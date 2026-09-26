import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { Remark } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { useStartChat } from '@/features/parent/useStartChat';
import { formatDate, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { AppBar, Avatar, Button, Dot, EmptyState, ErrorState, Hr, Icon, ICON_SIZE, LoadingCards, pointer, Screen, StickyNote, Tabs, Text, useToast } from '@/ui';

type Filter = 'all' | 'positive' | 'concern' | 'info';

const NOTE_COLOR = { concern: 'peach', positive: 'pink', info: 'sky' } as const;

/** ParentRemarks: teachers' notes as sticky notes; acknowledge them, or reply privately. */
export default function ParentRemarks() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const family = useFamily();
  const child = family.selected;
  const studentId = child?.id;
  const [filter, setFilter] = useState<Filter>('all');
  const remarks = useQuery({ queryKey: ['remarks', studentId], queryFn: () => api.remarks(studentId as string), enabled: !!studentId });
  // Notes still waiting for an acknowledgement come first, then newest first.
  const items = [...(remarks.data?.items ?? [])].sort(
    (a, b) => Number(!!b.requires_ack && !b.acknowledged_at) - Number(!!a.requires_ack && !a.acknowledged_at) || b.created_at.localeCompare(a.created_at),
  );
  const shown = filter === 'all' ? items : items.filter((r) => r.tone === filter);
  const waiting = items.filter((r) => r.requires_ack && !r.acknowledged_at).length;

  return (
    <Screen
      dock
      refreshing={remarks.isRefetching}
      onRefresh={remarks.refetch}
      header={<AppBar back title={t('parent.remarks.title')} subtitle={child ? t('parent.remarks.subtitle', { name: child.first_name, class: child.class.short_label }) : undefined} />}>
      <Tabs
        value={filter}
        onChange={setFilter}
        style={{ gap: 22 }}
        options={[
          { value: 'all', label: t('parent.remarks.all', { count: items.length }) },
          { value: 'positive', label: t('parent.remarks.positive') },
          { value: 'concern', label: t('parent.remarks.concern') },
          { value: 'info', label: t('parent.remarks.info') },
        ]}
      />
      {items.length ? (
        <View style={styles.row8}>
          {waiting ? <Dot rawColor={colors.warn} /> : <Icon name="checkCircle" size={ICON_SIZE.sm} rawColor={colors.ok} />}
          <Text variant="sm" color="ink2" style={{ flex: 1 }}>
            {waiting ? (
              <Trans i18nKey="parent.remarks.waiting" count={waiting} components={{ b: <Text variant="sm" weight={700} color="ink" /> }} />
            ) : (
              t('parent.remarks.caughtUp')
            )}
          </Text>
        </View>
      ) : null}
      {remarks.error ? <ErrorState error={remarks.error} onRetry={remarks.refetch} /> : null}
      {remarks.isLoading ? <LoadingCards count={3} /> : null}
      {remarks.data && !shown.length ? <EmptyState icon="chat" title={t('parent.remarks.empty')} /> : null}
      {shown.map((remark, i) => (
        <RemarkNote key={remark.id} remark={remark} index={i} studentId={studentId as string} />
      ))}
      {items.length ? (
        <>
          <Hr style={{ marginTop: 4 }} />
          <Text variant="xs" color="muted">
            {t('parent.remarks.footer', { name: child?.first_name ?? '' })}
          </Text>
        </>
      ) : null}
    </Screen>
  );
}

function RemarkNote({ remark, index, studentId }: { remark: Remark; index: number; studentId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const chat = useStartChat();
  const ack = useMutation({
    mutationFn: () => api.acknowledgeRemark(remark.id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['remarks', studentId] }),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  const color = NOTE_COLOR[remark.tone] ?? 'butter';
  const ink = color === 'peach' ? colors.pPeachInk : color === 'pink' ? colors.pPinkInk : colors.pBlueInk;
  const pinned = remark.requires_ack && !remark.acknowledged_at;
  const subject = remark.author_subject ?? '';
  const role = remark.author_is_class_teacher
    ? subject
      ? t('parent.remarks.classTeacher', { subject: subject === 'Mathematics' ? 'Maths' : subject })
      : t('parent.remarks.classTeacherOnly')
    : subject;
  const reply = (
    <Button
      title={t('parent.remarks.reply')}
      icon="chat"
      variant="secondary"
      height={44}
      loading={chat.isPending}
      onPress={() => chat.mutate({ studentId, userId: remark.author_id })}
      accessibilityLabel={`${t('parent.remarks.reply')} ${remark.author}`}
    />
  );
  const padding = index === 0 ? { paddingTop: 6, paddingHorizontal: 2 } : index % 2 ? { paddingTop: 18, paddingLeft: 10, paddingRight: 2 } : { paddingTop: 18, paddingLeft: 2, paddingRight: 10 };
  return (
    <View style={padding}>
      <StickyNote
        color={color}
        tilt={index % 2 ? 'r' : 'l'}
        pin={pinned}
        tape={pinned ? undefined : 'center'}
        style={{ paddingTop: pinned ? 34 : 24, gap: 12 }}>
        <View
          style={[styles.between, { gap: 8 }]}
          accessibilityLabel={t('parent.remarks.noteLabel', { tone: t(`parent.remarks.${remark.tone}`), author: remark.author, subject, date: formatDate(remark.created_at) })}>
          <Text variant="xxs" weight={800} rawColor={ink} style={{ letterSpacing: 1.3, textTransform: 'uppercase' }}>
            {t(`parent.remarks.${remark.tone}`)}
          </Text>
          <Text variant="xs" color="ink2" weight={600}>
            {formatDate(remark.created_at)}
          </Text>
        </View>
        <Text style={{ fontSize: 16, lineHeight: 24 }} weight={500} color="ink">
          {remark.body}
        </Text>
        {remark.homework ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/parent/homework')}
            style={[styles.diaryLink, { backgroundColor: colors.pTrack }, pointer]}>
            <Text variant="xs" weight={700} style={{ flex: 1, minWidth: 0 }}>
              {t('parent.remarks.inDiary', {
                title: remark.homework.title,
                date: `${weekdayName(remark.homework.due_date, true)} ${formatDate(remark.homework.due_date)}`,
              })}
            </Text>
            <Icon name="chevronRight" size={ICON_SIZE.sm} rawColor={ink} />
          </Pressable>
        ) : null}
        <View style={[styles.row8, { gap: 10 }]}>
          <Avatar initials={remark.author_initials ?? '?'} size="sm" style={{ backgroundColor: colors.surface }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700}>
              {remark.author}
            </Text>
            {role ? (
              <Text variant="xs" color="ink2">
                {role}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.row8, { gap: 10 }]}>
          {remark.acknowledged_at ? (
            <View style={[styles.row8, { gap: 6, flex: 1 }]}>
              <Icon name="checkCircle" size={ICON_SIZE.sm} rawColor={colors.ok} />
              <Text variant="xs" weight={700} color="ok">
                {t('parent.remarks.acknowledged', { date: formatDate(remark.acknowledged_at) })}
              </Text>
            </View>
          ) : (
            <Button title={t('parent.remarks.acknowledge')} icon="check" height={44} loading={ack.isPending} onPress={() => ack.mutate()} style={{ flex: 1 }} />
          )}
          {reply}
        </View>
      </StickyNote>
    </View>
  );
}

const styles = StyleSheet.create({
  row8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  diaryLink: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingLeft: 12, paddingRight: 10, borderRadius: 10 },
});
