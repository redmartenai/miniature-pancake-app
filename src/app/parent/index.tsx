import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import { useRefetchOnFocus } from '@/features/common/useRefetchOnFocus';
import { useUnread } from '@/features/common/useUnread';
import { useFamily } from '@/features/family/useFamily';
import {
  BusPassCard,
  DayStripCard,
  DiaryWeekCard,
  FeeTicketCard,
  MonthRegisterCard,
  NoticeCard,
  RemarkNoteCard,
  ReportPaperCard,
} from '@/features/parent/HomeCards';
import { useStartChat } from '@/features/parent/useStartChat';
import { isoDate, longDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { AppBar, AvatarFan, EmptyState, ErrorState, Icon, ICON_SIZE, IconButton, LoadingCards, pointer, Screen, Text, ThemeToggle } from '@/ui';

/** ParentHome: one child's day at school — register, fees, bus, marks, notes, diary, what's next. */
export default function ParentHome() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const unread = useUnread();
  const family = useFamily();
  const child = family.selected;
  const studentId = child?.id;
  const month = isoDate(new Date()).slice(0, 7);
  const chat = useStartChat();

  const summary = useQuery({
    queryKey: ['summary', studentId],
    queryFn: () => api.summary(studentId as string),
    enabled: !!studentId,
    refetchInterval: (q) => (q.state.data?.bus.enrolled && q.state.data.bus.status === 'active' ? 15_000 : 120_000),
  });
  const register = useQuery({ queryKey: ['attendance', studentId, month], queryFn: () => api.attendance(studentId as string, month), enabled: !!studentId });
  const results = useQuery({ queryKey: ['results', studentId], queryFn: () => api.results(studentId as string), enabled: !!studentId });
  const homework = useQuery({ queryKey: ['homework', studentId], queryFn: () => api.homework(studentId as string), enabled: !!studentId });
  const transport = useQuery({ queryKey: ['transport', studentId], queryFn: () => api.transport(studentId as string), enabled: !!studentId });
  useRefetchOnFocus(summary.refetch);

  const refresh = () => {
    void family.refetch();
    void summary.refetch();
    void register.refetch();
    void results.refetch();
    void homework.refetch();
    void transport.refetch();
  };

  const others = family.students.filter((s) => s.id !== child?.id);
  const header = (
    <AppBar
      align="flex-start"
      theme={false}
      titleNode={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={child ? t('parent.home.switchChild', { name: child.first_name, class: child.class.short_label }) : undefined}
          onPress={() => router.push('/parent/children')}
          style={[styles.who, pointer]}>
          {child ? <AvatarFan people={[{ initials: child.initials, tone: 1 }, ...others.map((o) => ({ initials: o.initials, tone: 4 as const }))]} /> : null}
          <View style={{ flexShrink: 1, gap: 2 }}>
            <Text variant="xs" color="muted" weight={600}>
              {longDate()}
            </Text>
            <View style={styles.row4}>
              <Text variant="appbarTitle" style={{ fontSize: 23, lineHeight: 26 }} numberOfLines={1}>
                {child ? t('parent.home.daysTitle', { name: child.first_name }) : ''}
              </Text>
              {family.students.length > 1 ? <Icon name="chevronDown" size={ICON_SIZE.sm} rawColor={colors.muted} /> : null}
            </View>
          </View>
        </Pressable>
      }
      actions={
        <>
          <ThemeToggle />
          <IconButton
            icon="bell"
            size="lg"
            ping={unread.notifications > 0}
            label={t('parent.home.notifications', { count: unread.notifications })}
            onPress={() => router.push('/parent/notifications')}
          />
        </>
      }
    />
  );

  const data = summary.data;
  return (
    <Screen header={header} dock gap={18} refreshing={summary.isRefetching} onRefresh={refresh}>
      {family.error ? <ErrorState error={family.error} onRetry={family.refetch} /> : null}
      {!family.isLoading && !family.students.length ? <EmptyState icon="users" title={t('parent.home.noChildren')} /> : null}
      {summary.error ? <ErrorState error={summary.error} onRetry={summary.refetch} /> : null}
      {!data ? (
        family.students.length || family.isLoading ? <LoadingCards count={4} /> : null
      ) : (
        <>
          <DayStripCard summary={data} />
          <View style={styles.twoUp}>
            {register.data ? <MonthRegisterCard month={register.data} /> : <View style={{ flex: 1 }} />}
            <FeeTicketCard invoice={data.next_invoice} />
          </View>
          <BusPassCard summary={data} transport={transport.data} />
          {results.data ? <ReportPaperCard exams={results.data.exams} /> : null}
          {data.latest_remark ? (
            <RemarkNoteCard
              remark={data.latest_remark}
              onReply={() => studentId && chat.mutate({ studentId, userId: data.latest_remark?.author_id })}
            />
          ) : null}
          {homework.data ? <DiaryWeekCard items={homework.data.items} /> : null}
          {data.next_event ? <NoticeCard event={data.next_event} /> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  row4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  twoUp: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
});
