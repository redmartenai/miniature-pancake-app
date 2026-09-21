import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { api } from '@/api/endpoints';
import type { StudentSummary } from '@/api/types';
import { TrendChart } from '@/features/charts/TrendChart';
import { useRefetchOnFocus } from '@/features/common/useRefetchOnFocus';
import { useUnread } from '@/features/common/useUnread';
import { BusCard } from '@/features/family/BusCard';
import { ChildSwitcher } from '@/features/family/ChildSwitcher';
import { useFamily } from '@/features/family/useFamily';
import { formatDate, formatInr, greetingKey, relativeTime } from '@/lib/format';
import { useActiveSchool, useSession } from '@/state/session';
import { spacing } from '@/theme/tokens';
import type { Tone } from '@/theme/tokens';
import { Card, EmptyState, ErrorState, IconButton, ListRow, LoadingCards, Pill, Screen, SectionHeader, StatTile, Text } from '@/ui';

export default function FamilyHome() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const school = useActiveSchool();
  const unread = useUnread();
  const family = useFamily();
  const studentId = family.selected?.id;

  const summary = useQuery({
    queryKey: ['summary', studentId],
    queryFn: () => api.summary(studentId as string),
    enabled: !!studentId,
    refetchInterval: (q) => (q.state.data?.bus.enrolled && q.state.data.bus.status === 'active' ? 15_000 : 120_000),
  });
  const announcements = useQuery({ queryKey: ['announcements', school?.id], queryFn: api.announcements });

  const refreshing = summary.isRefetching || announcements.isRefetching;
  const refresh = () => {
    if (studentId) void summary.refetch();
    void announcements.refetch();
    void family.refetch();
  };
  useRefetchOnFocus(refresh);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="caption">{school?.name}</Text>
          <Text variant="title">
            {t(greetingKey())}, {user?.first_name}
          </Text>
        </View>
        <IconButton icon="notifications-outline" label={t('home.notifications')} badge={unread.notifications} onPress={() => router.push('/notifications')} />
      </View>

      <ChildSwitcher students={family.students} selectedId={studentId} onSelect={family.select} />

      {family.isLoading || (summary.isLoading && !!studentId) ? (
        <LoadingCards count={4} />
      ) : family.error ? (
        <ErrorState error={family.error} onRetry={refresh} />
      ) : summary.error ? (
        <ErrorState error={summary.error} onRetry={refresh} />
      ) : summary.data ? (
        <SummaryCards data={summary.data} />
      ) : (
        <EmptyState icon="people-outline" title={t('common.somethingWrong')} />
      )}

      {announcements.data?.items.length ? (
        <>
          <SectionHeader title={t('home.announcements')} action={{ label: t('common.seeAll'), onPress: () => router.push('/announcements') }} />
          <Card padded={false}>
            {announcements.data.items.slice(0, 2).map((item, index, list) => (
              <ListRow
                key={item.id}
                icon={item.kind === 'transport' ? 'bus-outline' : item.kind === 'holiday' ? 'sunny-outline' : item.kind === 'safety' ? 'warning-outline' : 'megaphone-outline'}
                iconTone={item.kind === 'safety' ? 'danger' : 'accent'}
                title={item.title}
                subtitle={`${relativeTime(item.published_at)}${item.requires_ack && !item.acknowledged ? ` · ${t('announcements.needsAck')}` : ''}`}
                onPress={() => router.push('/announcements')}
                last={index === list.length - 1}
              />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function SummaryCards({ data }: { data: StudentSummary }) {
  const { t } = useTranslation();
  const today = data.attendance.today;
  const attendanceTone: Tone = today === 'present' ? 'success' : today === 'absent' ? 'danger' : today === 'late' ? 'warning' : 'neutral';
  const attendanceLabel =
    today === 'present' ? t('home.present') : today === 'absent' ? t('home.absent') : today === 'late' ? t('home.late') : t('home.notMarked');
  const due = Number(data.fees.total_due);

  return (
    <>
      <BusCard bus={data.bus} />

      <View style={styles.grid}>
        <StatTile
          icon="calendar-outline"
          tone={attendanceTone}
          label={t('home.attendanceToday')}
          value={attendanceLabel}
          hint={data.attendance.term_percent !== null ? t('home.termAttendance', { percent: data.attendance.term_percent }) : undefined}
          onPress={() => router.push('/attendance')}
        />
        <StatTile
          icon="wallet-outline"
          tone={due > 0 ? (data.fees.overdue ? 'danger' : 'warning') : 'success'}
          label={t('home.feesDue')}
          value={due > 0 ? formatInr(due) : t('home.noFeesDue')}
          hint={
            data.fees.next_due_date
              ? data.fees.overdue
                ? t('home.overdueSince', { date: formatDate(data.fees.next_due_date) })
                : t('home.dueBy', { date: formatDate(data.fees.next_due_date) })
              : undefined
          }
          onPress={() => router.push('/fees')}
        />
      </View>
      <View style={styles.grid}>
        <StatTile
          icon="book-outline"
          tone={data.homework.pending ? 'accent' : 'success'}
          label={t('home.homework')}
          value={data.homework.pending ? t('home.homeworkPending', { count: data.homework.pending }) : t('home.homeworkNone')}
          hint={data.homework.next ? `${data.homework.next.subject} · ${formatDate(data.homework.next.due_date)}` : undefined}
          onPress={() => router.push('/homework')}
        />
        <StatTile
          icon="ribbon-outline"
          tone="primary"
          label={t('home.latestResult')}
          value={data.latest_result ? `${data.latest_result.percent}%` : '—'}
          hint={data.latest_result ? `${data.latest_result.exam} · ${data.latest_result.grade}` : undefined}
          onPress={() => router.push('/results')}
        />
      </View>

      {data.latest_remark ? (
        <Card>
          <View style={styles.remarkTop}>
            <Pill
              label={t('home.teacherNote', { name: data.latest_remark.author })}
              tone={data.latest_remark.tone === 'concern' ? 'warning' : 'success'}
              icon="chatbox-ellipses-outline"
            />
          </View>
          <Text variant="body" style={styles.remark}>
            “{data.latest_remark.body}”
          </Text>
          <Text variant="caption">{relativeTime(data.latest_remark.created_at)}</Text>
        </Card>
      ) : null}

      {data.trend.length > 1 ? (
        <Card onPress={() => router.push('/results')} accessibilityLabel={t('home.progress')}>
          <Text variant="subheading">{t('home.progress')}</Text>
          <TrendChart points={data.trend.map((p) => ({ label: p.exam, value: p.percent }))} height={140} />
        </Card>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
  grid: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  remarkTop: { flexDirection: 'row' },
  remark: { marginTop: spacing.xs, marginBottom: spacing.xxs, fontSize: 16, lineHeight: 24 },
});
