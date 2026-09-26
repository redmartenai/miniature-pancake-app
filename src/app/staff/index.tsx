import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { StaffHome } from '@/api/types';
import { useRefetchOnFocus } from '@/features/common/useRefetchOnFocus';
import { useUnread } from '@/features/common/useUnread';
import { minutesLeft, RollDots, shortExam, staffRibbon, statusTitle } from '@/features/staff/common';
import { OpsHome } from '@/features/staff/OpsHome';
import { formatClock, formatDate, formatTime, monthName, parseDate, weekdayName } from '@/lib/format';
import { useActiveSchool, useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  AppBar,
  Avatar,
  AvatarStack,
  Badge,
  Button,
  Card,
  Chip,
  ErrorState,
  Highlight,
  Icon,
  ICON_SIZE,
  IconButton,
  Kicker,
  Link,
  LoadingCards,
  Paper,
  pointer,
  Ribbon,
  Screen,
  StickyNote,
  TearCal,
  Text,
  ThemeToggle,
  useToast,
} from '@/ui';

/** StaffHome for teachers; other staff (transport desk, accounts, office) keep the operations home. */
export default function StaffHomeScreen() {
  const role = useSession((s) => s.role);
  return role === 'teacher' ? <TeacherHome /> : <OpsHome />;
}

function TeacherHome() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const school = useActiveSchool();
  const unread = useUnread();
  const home = useQuery({ queryKey: ['staff-home'], queryFn: api.staffHome, refetchInterval: 60_000 });
  useRefetchOnFocus(home.refetch);
  const data = home.data;
  const today = new Date();

  const header = (
    <AppBar
      left={<Avatar initials={user?.initials ?? ''} size="md" tone={2} />}
      subtitle={[`${weekdayName(today, true)} ${formatDate(today)}`, school?.term].filter(Boolean).join(' · ')}
      title={data ? statusTitle(data.day, t) : ' '}
      titleVariant="h2"
      theme={false}
      actions={
        <>
          <ThemeToggle />
          <IconButton icon="bell" size="lg" ping={unread.notifications > 0} label={t('parent.home.notifications', { count: unread.notifications })} onPress={() => router.push('/notifications')} />
        </>
      }
    />
  );

  return (
    <Screen header={header} dock gap={18} refreshing={home.isRefetching} onRefresh={home.refetch}>
      {home.error ? <ErrorState error={home.error} onRetry={home.refetch} /> : null}
      {!data ? <LoadingCards count={4} /> : null}
      {data ? (
        <>
          <Briefing data={data} />
          <TodayCard data={data} />
          <View style={[styles.row, { gap: 12, alignItems: 'stretch' }]}>
            <MarkingPile data={data} />
            <RegisterCard data={data} />
          </View>
          {data.marks ? <MarksDue data={data} /> : null}
          {data.notice ? <Notice data={data} /> : null}
          <AlsoWaiting data={data} />
        </>
      ) : null}
    </Screen>
  );
}

/** "The 6-C cover is done and 36 of 38 were in 6-B on time. Still on your desk: 31 submissions and the last 4 marks for 7-C." */
function Briefing({ data }: { data: StaffHome }) {
  const { t } = useTranslation();
  const now = new Date();
  const hour = now.getHours();
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const cover = data.covers_done[0];
  const reg = data.register;
  const marksLeft = data.marks ? data.marks.total - data.marks.entered : 0;
  const subs = data.pile?.total_to_review ?? 0;
  const m = { m: <Highlight color="mint" />, b: <Highlight />, l: <Highlight color="lav" /> };
  const first = reg?.marked
    ? cover
      ? 'staff.home.brief.coverAndRegister'
      : 'staff.home.brief.register'
    : reg
      ? cover
        ? 'staff.home.brief.coverUnmarked'
        : 'staff.home.brief.unmarked'
      : cover
        ? 'staff.home.brief.cover'
        : null;
  const desk = subs && marksLeft ? 'staff.home.brief.desk' : subs ? 'staff.home.brief.deskSubs' : marksLeft ? 'staff.home.brief.deskMarks' : 'staff.home.brief.clear';
  return (
    <View style={{ gap: 10, paddingTop: 4, paddingHorizontal: 2 }}>
      <Kicker>{t('staff.home.briefing', { part: t(`staff.home.${part}`), time: formatTime(now) })}</Kicker>
      <Text style={styles.sentence}>
        {first ? (
          <Trans
            i18nKey={first}
            values={{ cover: cover?.class ?? '', on: reg?.on_time ?? 0, total: reg?.total ?? 0, class: reg?.class.short_label ?? '' }}
            components={m}
          />
        ) : null}
        {first ? ' ' : ''}
        <Trans i18nKey={desk} values={{ count: subs, marks: marksLeft, class: data.marks?.class.short_label ?? '' }} components={m} />
      </Text>
    </View>
  );
}

function TodayCard({ data }: { data: StaffHome }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const day = data.day;
  const current = day.current;
  const periods = day.cells.filter((c) => 'period' in c).length;
  const tomorrow = data.tomorrow;
  return (
    <Card pad={16} style={{ paddingBottom: 14, gap: 12 }} onPress={() => router.push('/staff/timetable')} accessibilityLabel={t('staff.home.todayLabel')}>
      <View style={[styles.row, { justifyContent: 'space-between', gap: 10 }]}>
        <Text variant="sm" weight={700}>
          {periods
            ? t('staff.home.todaySummary', {
                day: weekdayName(parseDate(day.date)),
                classes: t('staff.home.classes', { count: day.counts.classes }),
                covers: day.counts.covers ? `, ${t('staff.home.covers', { count: day.counts.covers })}` : '',
              })
            : t('staff.status.noSchool')}
        </Text>
        {current ? (
          <Text variant="xs" color="muted" weight={600}>
            {t('staff.home.minLeft', { period: current.period, count: minutesLeft(current) })}
          </Text>
        ) : null}
      </View>
      {periods ? <Ribbon cells={staffRibbon(day, t)} height={28} /> : null}
      {tomorrow ? (
        <View style={[styles.row, { gap: 10, paddingTop: 12, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.lineStrong, alignItems: 'flex-start' }]}>
          <Text variant="xxs" color="muted" weight={700} numberOfLines={1} style={{ width: 78, textTransform: 'uppercase', letterSpacing: 1, paddingTop: 2 }}>
            {t('staff.home.tomorrow')}
          </Text>
          <Text variant="sm" color="ink2" style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700} color="ink">
              {t('staff.home.tomorrowFirst', { period: tomorrow.period, time: formatClock(tomorrow.starts_at).replace(' AM', '').replace(' PM', ''), class: tomorrow.class?.short_label ?? '', subject: shortSubject(tomorrow.subject) })}
            </Text>
            {[tomorrow.room, tomorrow.due ? t('staff.home.due', { title: tomorrow.due.split(/[,(]/)[0].trim().replace(/^Exercise\b/, 'Ex') }) : null].filter(Boolean).map((s) => ` · ${s}`)}
          </Text>
          <Icon name="chevronRight" size={ICON_SIZE.sm} rawColor={colors.muted} />
        </View>
      ) : null}
    </Card>
  );
}

const shortSubject = (s?: string) => (s === 'Mathematics' ? 'Maths' : (s ?? ''));

function MarkingPile({ data }: { data: StaffHome }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const pile = data.pile;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={pile ? t('staff.home.pileLabel', { count: pile.to_review, title: pile.title, class: pile.class.short_label }) : t('staff.home.pileEmpty')}
      onPress={() => router.push('/staff/homework')}
      style={[{ flex: 1 }, pointer]}>
      <Paper pad={14} style={{ paddingTop: 20, gap: 8, marginBottom: 10, flex: 1 }}>
        <View style={{ position: 'absolute', top: -6, right: 16 }}>
          <Icon name="paperclip" size={ICON_SIZE.md} rawColor={colors.muted} />
        </View>
        <Text variant="xxs" weight={800} rawColor={colors.pPeachInk} style={{ textTransform: 'uppercase', letterSpacing: 1.3 }}>
          {t('staff.home.pile')}
        </Text>
        {pile ? (
          <>
            <View style={[styles.row, { gap: 6, alignItems: 'baseline' }]}>
              <Text variant="kpi">{pile.to_review}</Text>
              <Text variant="xs" color="ink2" weight={600}>
                {t('staff.home.toReview')}
              </Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text variant="sm" weight={700} numberOfLines={1}>
                {pile.title.replace('Exercise', 'Ex')} · {pile.class.short_label}
              </Text>
              <Text variant="xxs" color="muted" weight={600} numberOfLines={2}>
                {[pile.description.split('.')[0], t('staff.home.closed', { day: weekdayName(pile.due_date, true) })].join(' · ')}
              </Text>
            </View>
            <View style={{ marginTop: 'auto' }}>
              <Link label={t('staff.home.startMarking')} onPress={() => router.push('/staff/homework')} />
            </View>
          </>
        ) : (
          <Text variant="sm" color="muted">
            {t('staff.home.pileEmpty')}
          </Text>
        )}
      </Paper>
    </Pressable>
  );
}

function RegisterCard({ data }: { data: StaffHome }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const reg = data.register;
  if (!reg) return <View style={{ flex: 1 }} />;
  const away = [...reg.absent.map((a) => t('staff.home.absentName', { name: a.first_name })), ...reg.late.map((a) => t('staff.home.lateName', { name: a.first_name }))];
  return (
    <Card
      pastel="mint"
      pad={14}
      style={{ flex: 1, gap: 10, marginBottom: 10 }}
      onPress={() => router.push({ pathname: '/staff/attendance', params: { class: reg.class.id } })}
      accessibilityLabel={t('staff.home.registerLabel', { class: reg.class.short_label })}>
      <Text variant="xs" weight={700} rawColor={colors.pMintInk}>
        {t('staff.home.register', { class: reg.class.short_label })}
      </Text>
      {reg.marked ? (
        <>
          <RollDots rolls={reg.rolls} perRow={10} />
          <View>
            <Text variant="kpiSm" style={{ fontSize: 22 }}>
              {t('staff.home.ofTotal', { present: reg.on_time, total: reg.total })}
            </Text>
            {away.length ? (
              <Text variant="xxs" color="ink2" weight={600} style={{ marginTop: 4 }} numberOfLines={2}>
                {away.join(' · ')}
              </Text>
            ) : null}
            {reg.marked_at ? (
              <Text variant="xxs" color="muted" weight={600} style={{ marginTop: 2 }}>
                {t('staff.home.markedAt', { time: formatTime(new Date(reg.marked_at)) })}
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <Text variant="sm" color="ink2">
            {t('staff.home.notMarked')}
          </Text>
          <Button title={t('staff.home.markNow')} height={40} decorative />
        </>
      )}
    </Card>
  );
}

function MarksDue({ data }: { data: StaffHome }) {
  const { t } = useTranslation();
  const sheet = data.marks!;
  const due = sheet.due_on;
  return (
    <Card pastel="lav" pad={14} style={[styles.row, { gap: 12 }]}>
      {due ? <TearCal size="sm" month={monthName(due, true)} day={parseDate(due).getDate()} dow={weekdayName(due, true)} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="sm" weight={700} accessibilityRole="header">
          {t('staff.home.marksTitle', { exam: shortExam(sheet.exam.name), class: sheet.class.short_label })}
        </Text>
        <Text variant="xs" color="ink2">
          {t('staff.home.marksProgress', { entered: sheet.entered, total: sheet.total, left: sheet.total - sheet.entered })}
        </Text>
      </View>
      <Button title={t('staff.home.enterMarks')} height={44} onPress={() => router.push({ pathname: '/staff/marks', params: { sheet: sheet.id } })} />
    </Card>
  );
}

/** The principal's notice, pinned: confirm it right here. */
function Notice({ data }: { data: StaffHome }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const n = data.notice!;
  const ack = useMutation({
    mutationFn: () => api.acknowledge(n.id),
    onSuccess: () => {
      toast(t('staff.home.confirmed'));
      void client.invalidateQueries({ queryKey: ['staff-home'] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  return (
    <View style={{ paddingTop: 8, paddingHorizontal: 4 }}>
      <StickyNote color="pink" pin tilt="r" style={{ paddingTop: 30, paddingHorizontal: 18, paddingBottom: 16, gap: 10 }}>
        <View style={[styles.row, { justifyContent: 'space-between', gap: 10 }]}>
          <View style={[styles.row, { gap: 8, flexShrink: 1 }]}>
            <Avatar initials={n.author_initials} size="xs" tone={1} />
            <Text variant="xs" weight={700} numberOfLines={1}>
              {[n.author, formatTime(new Date(n.published_at))].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Text variant="xxs" weight={800} rawColor={colors.pPinkInk} style={{ textTransform: 'uppercase', letterSpacing: 1.3 }}>
            {t(`staff.home.noticeKind.${n.kind}`, { defaultValue: n.kind })}
          </Text>
        </View>
        <Text variant="h4" accessibilityRole="header">
          {n.title}
        </Text>
        <Text variant="sm" color="ink" style={{ lineHeight: 22 }}>
          {n.body}
        </Text>
        <View style={[styles.row, { gap: 14, marginTop: 2 }]}>
          {n.requires_ack ? (
            n.acknowledged ? (
              <Text variant="sm" weight={700} color="ok">
                {t('staff.home.confirmedLabel')}
              </Text>
            ) : (
              <Button title={t('staff.home.confirm')} icon="check" variant="secondary" height={44} loading={ack.isPending} onPress={() => ack.mutate()} />
            )
          ) : null}
          <Link label={t('staff.home.viewRoster')} onPress={() => router.push('/staff/documents')} />
        </View>
      </StickyNote>
    </View>
  );
}

function AlsoWaiting({ data }: { data: StaffHome }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const leave = data.casual_left;
  const ptm = data.ptm;
  return (
    <View style={{ gap: 4, paddingTop: 4 }}>
      <Kicker>{t('staff.home.alsoWaiting')}</Kicker>
      {data.parents.count ? (
        <Pressable accessibilityRole="link" onPress={() => router.push('/staff/messages')} style={[styles.row, styles.item, { borderBottomColor: colors.line }, pointer]}>
          <AvatarStack>
            {data.parents.initials.map((i, k) => (
              <Avatar key={k} initials={i} size="sm" tone={([5, 3, 4] as const)[k % 3]} />
            ))}
          </AvatarStack>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700} numberOfLines={1}>
              {t('staff.home.parentsWrote', { count: data.parents.count })}
            </Text>
            <Text variant="xs" color="muted" numberOfLines={1}>
              {data.parents.names.join(', ')}
            </Text>
          </View>
          <Badge value={data.parents.count} />
        </Pressable>
      ) : null}
      {ptm.count && ptm.date ? (
        <Pressable accessibilityRole="link" onPress={() => router.push('/staff/messages')} style={[styles.row, styles.item, { borderBottomColor: colors.line }, pointer]}>
          <View style={{ width: 55, alignItems: 'center' }}>
            <Text variant="xxs" weight={800} rawColor={colors.pPinkInk} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>
              {weekdayName(new Date(ptm.date), true)}
            </Text>
            <Text variant="sm" weight={800} num>
              {formatDate(new Date(ptm.date))}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700} numberOfLines={1}>
              {t('staff.home.ptmRequests', { count: ptm.count })}
            </Text>
            <Text variant="xs" color="muted" numberOfLines={1}>
              {ptm.title}
            </Text>
          </View>
          <Icon name="chevronRight" size={ICON_SIZE.sm} rawColor={colors.muted} />
        </Pressable>
      ) : null}
      <View style={[styles.row, { gap: 8, paddingTop: 8, flexWrap: 'wrap' }]}>
        <Chip label={t('staff.home.setHomework')} onPress={() => router.push('/staff/homework')} style={{ height: 44 }} />
        <Chip label={t('staff.home.applyLeave')} count={t('staff.home.casualLeft', { count: leave })} onPress={() => router.push('/staff/leave')} style={{ height: 44 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { gap: 12, paddingVertical: 12, paddingHorizontal: 2, borderBottomWidth: 1 },
  sentence: { fontFamily: fonts.displayMedium, fontSize: 21, lineHeight: 29.4, letterSpacing: -0.4 },
});
