import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { api } from '@/api/endpoints';
import { useRefetchOnFocus } from '@/features/common/useRefetchOnFocus';
import { useUnread } from '@/features/common/useUnread';
import { useFamily } from '@/features/family/useFamily';
import { NoticeCard } from '@/features/parent/HomeCards';
import { ExamCountdown, HomeworkNotes, NowCard, RegisterStrip, ResultPaper } from '@/features/student/HomeCards';
import { formatDate, isoDate, weekdayName } from '@/lib/format';
import { AppBar, Avatar, Button, ErrorState, IconButton, LoadingCards, Screen, ThemeToggle } from '@/ui';

/** StuHome: now and next, this week's homework, the exam countdown, the latest result, the register. */
export default function StudentHome() {
  const { t } = useTranslation();
  const unread = useUnread();
  const family = useFamily();
  const me = family.selected;
  const id = me?.id;
  const month = isoDate(new Date()).slice(0, 7);
  const summary = useQuery({ queryKey: ['summary', id], queryFn: () => api.summary(id as string), enabled: !!id });
  const homework = useQuery({ queryKey: ['homework', id], queryFn: () => api.homework(id as string), enabled: !!id });
  const results = useQuery({ queryKey: ['results', id], queryFn: () => api.results(id as string), enabled: !!id });
  const exams = useQuery({ queryKey: ['exams', id], queryFn: () => api.exams(id as string), enabled: !!id });
  const register = useQuery({ queryKey: ['attendance', id, month], queryFn: () => api.attendance(id as string, month), enabled: !!id });
  const timetable = useQuery({ queryKey: ['timetable', id], queryFn: () => api.timetable(id as string), enabled: !!id });
  useRefetchOnFocus(summary.refetch);

  // First period of the next school day.
  const next = new Date();
  next.setDate(next.getDate() + 1);
  if (next.getDay() === 0) next.setDate(next.getDate() + 1);
  const firstTomorrow = timetable.data?.days.find((d) => d.weekday === (next.getDay() + 6) % 7)?.periods[0];
  // The soonest-due homework that's handed in as photos.
  const nextUpload = homework.data?.items.filter((h) => !h.submission && h.accepts_photos && h.due_date >= isoDate(new Date())).sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  const refresh = () => [summary, homework, results, exams, register].forEach((q) => void q.refetch());
  const header = (
    <AppBar
      left={me ? <Avatar initials={me.initials} size="md" tone={1} /> : null}
      subtitle={me ? `${weekdayName(new Date(), true)}, ${formatDate(new Date())} · ${t('student.home.classLabel', { class: me.class.short_label })}` : undefined}
      title={me ? t('student.home.hi', { name: me.first_name }) : ''}
      theme={false}
      actions={
        <>
          <ThemeToggle />
          <IconButton icon="bell" size="lg" ping={unread.notifications > 0} label={t('parent.home.notifications', { count: unread.notifications })} onPress={() => router.push('/student/notifications')} />
        </>
      }
    />
  );

  return (
    <Screen header={header} dock gap={18} refreshing={summary.isRefetching} onRefresh={refresh}>
      {family.error ? <ErrorState error={family.error} onRetry={family.refetch} /> : null}
      {summary.error ? <ErrorState error={summary.error} onRetry={summary.refetch} /> : null}
      {!summary.data ? (
        <LoadingCards count={4} />
      ) : (
        <>
          <NowCard summary={summary.data} tomorrow={firstTomorrow ? { subject: firstTomorrow.subject, starts_at: firstTomorrow.starts_at } : null} />
          {homework.data ? <HomeworkNotes items={homework.data.items} /> : null}
          {nextUpload ? (
            <Button
              title={t('student.home.upload', { subject: nextUpload.subject.name === 'Mathematics' ? 'Maths' : nextUpload.subject.name })}
              icon="upload"
              size="lg"
              fullWidth
              onPress={() => router.push({ pathname: '/student/tasks', params: { open: nextUpload.id } })}
            />
          ) : null}
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
            {exams.data ? <ExamCountdown exams={exams.data} /> : <View style={{ flex: 1 }} />}
            {results.data ? <ResultPaper exams={results.data.exams} /> : <View style={{ flex: 1 }} />}
          </View>
          {register.data ? <RegisterStrip month={register.data} /> : null}
          {summary.data.next_event ? <NoticeCard event={summary.data.next_event} to="/student/notifications" /> : null}
        </>
      )}
    </Screen>
  );
}
