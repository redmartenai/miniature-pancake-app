import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { Homework } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { shortSubject } from '@/features/parent/HomeCards';
import { useStartChat } from '@/features/parent/useStartChat';
import { downloadFile } from '@/lib/download';
import { addDays, daysUntil, fileSize, formatDate, formatTime, isoDate, monthName, parseDate, startOfWeek, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import {
  AppBar,
  Button,
  Card,
  Diary,
  DiaryHead,
  DiaryRow,
  ErrorState,
  Icon,
  ICON_SIZE,
  IconButton,
  Kicker,
  ListRow,
  LoadingCards,
  Paper,
  Pill,
  pointer,
  Screen,
  Stamp,
  Text,
  useToast,
} from '@/ui';

/** ParentHomework: the week's diary page, the next piece opened up with sign-off, worksheets, marked work. */
export default function ParentHomework() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const family = useFamily();
  const child = family.selected;
  const studentId = child?.id;
  // On a Sunday the diary opens on the coming week.
  const [weekOffset, setWeekOffset] = useState(new Date().getDay() === 0 ? 1 : 0);
  const homework = useQuery({ queryKey: ['homework', studentId], queryFn: () => api.homework(studentId as string), enabled: !!studentId });
  const items = homework.data?.items ?? [];

  const monday = addDays(startOfWeek(new Date()), weekOffset * 7);
  const saturday = addDays(monday, 5);
  const nextMonday = addDays(monday, 7);
  const inRange = (h: Homework, from: Date, to: Date) => h.due_date >= isoDate(from) && h.due_date <= isoDate(to);
  const thisWeek = items.filter((h) => inRange(h, monday, saturday));
  const open = items
    .filter((h) => !h.submission && daysUntil(h.due_date) >= 0)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const focus = open[0];
  // "This week" for a parent means the next seven days, not the calendar week.
  const dueThisWeek = open.filter((h) => daysUntil(h.due_date) <= 6);
  const flagged = items.find((h) => h.flagged_by && !h.submission);
  const worksheets = open.filter((h) => h.id !== focus?.id && h.attachments?.length && daysUntil(h.due_date) <= 7);
  const marked = items
    .filter((h) => h.submission?.grade)
    .sort((a, b) => b.submission!.submitted_at.localeCompare(a.submission!.submitted_at))
    .slice(0, 4);

  const days = [...Array(6).keys()].map((i) => addDays(monday, i)).concat([nextMonday]);
  const range = `${monday.getDate()}–${saturday.getDate()} ${monthName(saturday, true)}`;

  const when = focus
    ? daysUntil(focus.due_date) === 0
      ? t('parent.homework.today')
      : daysUntil(focus.due_date) === 1
        ? t('parent.homework.tomorrow')
        : t('parent.homework.onDay', { day: weekdayName(focus.due_date) })
    : '';

  return (
    <Screen
      dock
      gap={18}
      refreshing={homework.isRefetching}
      onRefresh={homework.refetch}
      header={<AppBar back title={t('parent.homework.title')} subtitle={child ? t('parent.homework.subtitle', { name: child.first_name, class: child.class.short_label }) : undefined} />}>
      {homework.error ? <ErrorState error={homework.error} onRetry={homework.refetch} /> : null}
      {homework.isLoading ? <LoadingCards count={3} /> : null}
      {homework.data ? (
        <>
          <Text variant="lg" color="ink2" style={{ paddingHorizontal: 2 }}>
            {dueThisWeek.length ? t('parent.homework.lead', { count: dueThisWeek.length }) : t('parent.homework.leadNone')}
            {focus ? (
              <Trans
                i18nKey="parent.homework.first"
                values={{
                  subject: shortSubject(focus.subject.name),
                  when,
                  period: focus.due_period ? t('parent.homework.inPeriod', { period: focus.due_period.period }) : '',
                }}
                components={{ b: <Text variant="lg" weight={700} color="ink" /> }}
              />
            ) : null}
          </Text>

          <Diary>
            <DiaryHead>
              <Text variant="sm" weight={700} numberOfLines={1} style={{ flex: 1 }} accessibilityLabel={t('parent.homework.diaryLabel', { date: formatDate(monday) })}>
                {t('parent.homework.weekNoNumber', { range })}
              </Text>
              <IconButton icon="chevronLeft" variant="bare" size="lg" label={t('parent.homework.prevWeek')} onPress={() => setWeekOffset((w) => w - 1)} />
              <IconButton icon="chevronRight" variant="bare" size="lg" label={t('parent.homework.nextWeek')} onPress={() => setWeekOffset((w) => w + 1)} />
            </DiaryHead>
            {days.map((day, i) => {
              const iso = isoDate(day);
              const due = items.filter((h) => h.due_date === iso);
              const setToday = items.filter((h) => h.assigned_on === iso && iso === isoDate(new Date()));
              const isToday = iso === isoDate(new Date());
              const label = `${weekdayName(day, true)}\n${day.getDate()}`;
              if (!due.length) {
                return (
                  <DiaryRow key={iso} when={label} last={i === days.length - 1} whenColor={isToday ? colors.brandInk : undefined}>
                    <Text variant="sm" color={setToday.length ? 'ink2' : 'muted'} numberOfLines={1} style={{ flex: 1 }}>
                      {t('parent.homework.nothingDue')}
                      {setToday.length ? t('parent.homework.setToday', { subject: shortSubject(setToday[0].subject.name) }) : ''}
                    </Text>
                    {isToday ? (
                      <Text variant="xxs" weight={700} rawColor={colors.brandInk}>
                        {t('parent.homework.tagToday')}
                      </Text>
                    ) : null}
                  </DiaryRow>
                );
              }
              return due.map((h, j) => {
                const left = daysUntil(h.due_date);
                const tag = h.submission
                  ? { text: t('parent.homework.tagDone'), color: colors.ok }
                  : h.flagged_by
                    ? { text: t('parent.homework.tagFlagged'), color: colors.bad }
                    : i === 6
                      ? { text: t('parent.homework.tagNextWeek'), color: colors.muted }
                      : left === 0
                        ? { text: t('parent.homework.tagToday'), color: colors.brandInk }
                        : left === 1
                          ? { text: t('parent.homework.tagTomorrow'), color: colors.warn }
                          : null;
                return (
                  <DiaryRow key={h.id} when={j === 0 ? label : undefined} last={i === days.length - 1 && j === due.length - 1}>
                    <Text variant="sm" weight={700} style={{ width: 42 }} numberOfLines={1}>
                      {shortSubject(h.subject.name)}
                    </Text>
                    <Text variant="sm" color="ink2" numberOfLines={1} style={{ flex: 1 }}>
                      {h.title}
                    </Text>
                    {tag ? (
                      <Text variant="xxs" weight={700} rawColor={tag.color}>
                        {tag.text}
                      </Text>
                    ) : null}
                  </DiaryRow>
                );
              });
            })}
          </Diary>

          {flagged ? (
            <Pressable accessibilityRole="link" onPress={() => router.push('/parent/remarks')} style={[styles.flag, pointer]}>
              <Icon name="alert" size={ICON_SIZE.sm} rawColor={colors.bad} />
              <Text variant="sm" color="ink2" style={{ flex: 1, minWidth: 0 }}>
                <Trans
                  i18nKey="parent.homework.flaggedLink"
                  values={{ name: flagged.flagged_by, title: flagged.title }}
                  components={{ b: <Text variant="sm" weight={700} color="ink" /> }}
                />
              </Text>
              <Icon name="chevronRight" size={ICON_SIZE.sm} rawColor={colors.faint} />
            </Pressable>
          ) : null}

          {focus && studentId ? <FocusCard homework={focus} studentId={studentId} /> : <Text variant="sm" color="muted">{t('parent.homework.allClear')}</Text>}

          {worksheets.length ? (
            <View style={{ gap: 4 }}>
              <Kicker style={{ marginBottom: 4 }}>{t('parent.homework.worksheets')}</Kicker>
              {worksheets.flatMap((h, i) =>
                (h.attachments ?? []).map((a, j) => (
                  <ListRow
                    key={a.id}
                    inset={0}
                    py={2}
                    style={{ minHeight: 48 }}
                    last={i === worksheets.length - 1 && j === (h.attachments?.length ?? 1) - 1}
                    left={
                      <Text variant="xs" weight={700} color="muted" style={{ width: 30 }}>
                        {shortSubject(h.subject.name)}
                      </Text>
                    }
                    title={
                      <Text variant="sm" weight={600} numberOfLines={1}>
                        {a.name}
                      </Text>
                    }
                    right={<DownloadIcon url={a.url} name={a.name} subject={h.subject.name} />}
                  />
                )),
              )}
            </View>
          ) : null}

          {marked.length ? (
            <View style={{ gap: 16 }}>
              <Kicker>{t('parent.homework.marked')}</Kicker>
              {marked.map((h) => (
                <MarkedPaper key={h.id} homework={h} />
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function DownloadIcon({ url, name, subject }: { url: string; name: string; subject: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const download = useMutation({
    mutationFn: () => downloadFile(url, name),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  return <IconButton icon="download" variant="bare" size="lg" label={`${t('parent.homework.download', { name })}, ${subject}`} onPress={() => download.mutate()} />;
}

/** The next piece of homework, opened up: brief, worksheet, and the parent's sign-off. */
function FocusCard({ homework, studentId }: { homework: Homework; studentId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const chat = useStartChat();
  const sign = useMutation({
    mutationFn: () => api.signHomework(homework.id, studentId),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['homework', studentId] }),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  const left = daysUntil(homework.due_date);
  const due = left === 0 ? t('parent.homework.dueToday') : left === 1 ? t('parent.homework.dueTomorrow') : t('parent.homework.dueOn', { date: formatDate(homework.due_date, { weekday: true }) });
  const teacher = homework.assigned_by ?? '';
  const setOn = homework.assigned_on === isoDate(new Date()) ? t('parent.homework.setTodayAt') : formatDate(homework.assigned_on, { weekday: true });
  const signedBy = homework.signed ? homework.signed.by.split(' ').map((p, i, a) => (i < a.length - 1 ? `${p[0]}.` : p)).join(' ') : '';
  return (
    <Card pastel="peach" pad={18} style={{ gap: 14 }} accessibilityLabel={`${homework.subject.name}, ${due}`}>
      <View style={[styles.row, { gap: 10 }]}>
        <Text variant="xxs" weight={800} rawColor={colors.pPeachInk} style={{ flex: 1, letterSpacing: 1.3, textTransform: 'uppercase' }}>
          {due}
          {homework.due_period ? t('parent.homework.period', { period: homework.due_period.period }) : ''}
        </Text>
        {homework.signed ? <Pill label={t('parent.homework.signed')} tone="ok" /> : <Pill label={t('parent.homework.notSigned')} tone="warn" />}
      </View>
      <View style={{ gap: 4 }}>
        <Text variant="h3">
          {homework.subject.name} · {homework.title}
        </Text>
        <Text variant="xs" color="ink2">
          {t('parent.homework.meta', { teacher, set: setOn, due: formatDate(homework.due_date, { weekday: true }) })}
        </Text>
      </View>
      {homework.description ? (
        <Text variant="sm" color="ink2" style={{ lineHeight: 21 }}>
          {homework.description}
        </Text>
      ) : null}
      {(homework.attachments ?? []).map((a) => (
        <AttachmentButton key={a.id} name={a.name} size={a.size} url={a.url} />
      ))}
      {homework.signed ? (
        <View style={[styles.row, { gap: 14, paddingTop: 4 }]}>
          <Stamp tone="brand" rotate={-6} sub={t('parent.homework.seenBy', { name: signedBy, date: formatDate(homework.signed.at) })} style={{ flexDirection: 'column', gap: 3, paddingVertical: 8, paddingHorizontal: 12 }}>
            {t('parent.homework.seen')}
          </Stamp>
          <Text variant="xs" color="ink2" style={{ flex: 1 }}>
            {t('parent.homework.signedAt', { time: formatTime(homework.signed.at), teacher })}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <View style={[styles.row, { gap: 10 }]}>
            <Button title={t('parent.homework.signAsSeen')} icon="pencil" size="lg" loading={sign.isPending} onPress={() => sign.mutate()} style={{ flex: 1 }} />
            <Button title={t('parent.homework.ask')} icon="chat" variant="secondary" size="lg" loading={chat.isPending} onPress={() => chat.mutate({ studentId, userId: homework.assigned_by_id })} />
          </View>
          <Text variant="xs" color="ink2">
            {t('parent.homework.signHint', { teacher })}
          </Text>
        </View>
      )}
    </Card>
  );
}

function AttachmentButton({ name, size, url }: { name: string; size: number; url: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const download = useMutation({
    mutationFn: () => downloadFile(url, name),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  const ext = name.split('.').pop()?.toUpperCase() ?? '';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('parent.homework.download', { name })}, ${fileSize(size)}`}
      onPress={() => download.mutate()}
      style={[styles.attachment, { backgroundColor: colors.pTrack, borderColor: colors.tear }, pointer]}>
      <Icon name="paperclip" size={ICON_SIZE.md} rawColor={colors.pPeachInk} />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text variant="sm" weight={700} numberOfLines={1}>
          {name}
        </Text>
        <Text variant="xxs" color="muted" weight={600}>
          {[ext, fileSize(size)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="download" size={ICON_SIZE.md} rawColor={colors.ink2} />
      </View>
    </Pressable>
  );
}

function MarkedPaper({ homework }: { homework: Homework }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const sub = homework.submission!;
  const grade = sub.grade ?? '';
  const score = grade.includes('/');
  const download = useMutation({
    mutationFn: () => downloadFile(sub.checked_copy as string, `${homework.subject.name}_checked_copy.pdf`),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  const quote = sub.teacher_remark.replace(/\s*(B\+|A\+|[ABCD]|\d+\/\d+)\s*$/, '').trim();
  return (
    <Paper pad={16} style={score ? { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 } : { gap: 10, paddingBottom: 8 }}>
      <View style={[styles.row, { alignItems: 'flex-start', gap: 12, flex: score ? 1 : undefined }]}>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text variant="xxs" color="muted" weight={700} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>
            {t('parent.homework.kindHomework', { subject: homework.subject.name })}
          </Text>
          <Text variant="sm" weight={700}>
            {homework.title}
          </Text>
          <Text variant="xs" color="muted">
            {t('parent.homework.submittedOn', { teacher: homework.assigned_by ?? '', date: `${weekdayName(sub.submitted_at.slice(0, 10), true)} ${formatDate(parseDate(sub.submitted_at.slice(0, 10)))}` })}
          </Text>
        </View>
        {!score ? (
          <Stamp tone="lav" round rotate={-9} sub={t('parent.homework.grade')} style={{ width: 58, height: 58, borderRadius: 29 }}>
            {grade}
          </Stamp>
        ) : null}
      </View>
      {score ? (
        <Stamp tone="lav" rotate={-6}>
          {grade}
        </Stamp>
      ) : null}
      {!score && quote ? (
        <Text variant="sm" color="ink2" style={{ fontStyle: 'italic', lineHeight: 20 }}>
          “{quote}”
        </Text>
      ) : null}
      {!score && sub.checked_copy ? (
        <Button
          title={t('parent.homework.checkedCopy')}
          icon="download"
          variant="ghost"
          size="sm"
          height={44}
          textColor={colors.brandInk}
          loading={download.isPending}
          onPress={() => download.mutate()}
          style={{ alignSelf: 'flex-start', marginLeft: -10 }}
        />
      ) : null}
    </Paper>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, marginTop: -6, paddingHorizontal: 2 },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8, paddingLeft: 14, paddingRight: 8, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed' },
});
