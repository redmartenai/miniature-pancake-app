import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { AttendanceMonth, ExamResult, Homework, StudentSummary, StudentTransport } from '@/api/types';
import { useRouteShape, useTripLive } from '@/features/tracking/useTripLive';
import { clockShort, daysUntil, formatDate, formatInr, formatTime, monthName, parseDate, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Button,
  Card,
  Delta,
  Diary,
  DiaryHead,
  DiaryRow,
  Dot,
  Highlight,
  Icon,
  ICON_SIZE,
  Paper,
  Pill,
  pointer,
  RegisterDot,
  Ribbon,
  RouteLine,
  Stamp,
  StickyNote,
  Tear,
  TearCal,
  TearV,
  Text,
  Ticket,
} from '@/ui';

import { markFor, ribbonCells, schoolWeeks } from './register';

/* ------------------------------------------------------------- the day */

/** The school day as a strip: check-in, the period ribbon, what's on now, and home time. */
export function DayStripCard({ summary }: { summary: StudentSummary }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { check_in: checkIn, ribbon, home } = summary.today;
  const current = ribbon.current;
  const done = ribbon.cells.filter((c) => c.kind === 'period' && c.state === 'done').length;

  let status = t('parent.home.notMarked');
  let dot = colors.faint;
  if (!ribbon.periods) status = t('parent.home.noSchool');
  else if (checkIn?.status === 'absent' || checkIn?.status === 'excused') {
    status = t('parent.home.absentToday');
    dot = colors.bad;
  } else if (checkIn?.status === 'late' && checkIn.at) {
    status = t('parent.home.lateToday', { time: formatTime(checkIn.at) });
    dot = colors.warn;
  } else if (checkIn?.at) {
    status = t('parent.home.inSchoolSince', { time: formatTime(checkIn.at) });
    dot = colors.ok;
  } else if (checkIn) {
    status = t('parent.home.presentToday');
    dot = colors.ok;
  }

  let line: ReactNode = null;
  if (current) {
    line = (
      <Text variant="sm" color="ink2" numberOfLines={1} style={{ flexShrink: 1 }}>
        <Text variant="sm" weight={700} color="ink">
          {current.teacher ? t('parent.home.withTeacher', { subject: current.subject, teacher: current.teacher }) : current.subject}
        </Text>
        {' · '}
        {t('parent.home.till', { time: clockShort(current.ends_at) })}
      </Text>
    );
  } else if (ribbon.next) {
    line = (
      <Text variant="sm" color="ink2" numberOfLines={1} style={{ flexShrink: 1 }}>
        {t('parent.home.nextUp', { subject: ribbon.next.subject, time: clockShort(ribbon.next.starts_at) })}
      </Text>
    );
  } else if (ribbon.periods) {
    line = (
      <Text variant="sm" color="ink2">
        {t('parent.home.dayOver')}
      </Text>
    );
  }

  return (
    <Card pad={16} style={{ paddingBottom: 14, gap: 12 }} onPress={() => router.push('/parent/timetable')} accessibilityLabel={status}>
      <View style={styles.between}>
        <View style={styles.row8}>
          <Dot rawColor={dot} ring={dot === colors.ok ? colors.okSoft : dot === colors.bad ? colors.badSoft : undefined} />
          <Text variant="sm" weight={700}>
            {status}
          </Text>
        </View>
        {home ? (
          <Text variant="xs" color="muted" weight={600}>
            {home.bus}
          </Text>
        ) : null}
      </View>
      {ribbon.periods ? (
        <Ribbon
          cells={ribbonCells(ribbon)}
          accessibilityLabel={t('parent.home.periodsLabel', {
            done,
            now: current ? t('parent.home.nowPeriod', { subject: current.subject }) : '',
          })}
        />
      ) : null}
      <View style={[styles.between, { gap: 10 }]}>
        {line}
        {home ? (
          <Text variant="xs" color="muted" weight={600}>
            {t('parent.home.homeAround', { time: formatTime(home.eta_at) })}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------- register */

/** September at a glance: M–S register dots, 18 of 19. Today gets a ring. */
export function MonthRegisterCard({ month }: { month: AttendanceMonth }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const weeks = schoolWeeks(month.days);
  const today = new Date().toDateString();
  const { present, school_days: days, absent, late, percent } = month.summary;
  const label = monthName(`${month.month}-01`);
  return (
    <Card
      pastel="mint"
      pad={16}
      style={{ flex: 1, gap: 12 }}
      onPress={() => router.push('/parent/attendance')}
      accessibilityLabel={t('parent.home.registerLabel', { month: label, present, days })}>
      <View style={styles.between}>
        <Text variant="xs" weight={700} rawColor={colors.pMintInk}>
          {label}
        </Text>
        {percent !== null ? (
          <Text variant="xs" weight={700} num>
            {Math.round(percent)}%
          </Text>
        ) : null}
      </View>
      <View style={{ gap: 7 }}>
        <View style={styles.weekRow}>
          {['M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Text key={i} variant="xxs" color="muted" weight={700} align="center" style={{ width: 14 }}>
              {d}
            </Text>
          ))}
        </View>
        {weeks.map((week, w) => (
          <View key={w} style={styles.weekRow}>
            {week.map((day, i) => (
              <View key={i} style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
                {day ? (
                  <View
                    style={
                      parseDate(day.date).toDateString() === today
                        ? { borderRadius: 7, boxShadow: `0 0 0 2px ${colors.pMint}, 0 0 0 3.5px ${colors.ok}` }
                        : undefined
                    }>
                    <RegisterDot mark={markFor(day)} large />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </View>
      <View>
        <Text variant="kpiSm" style={{ fontSize: 22, lineHeight: 24 }}>
          {t('parent.home.ofDays', { present, days })}
        </Text>
        <Text variant="xxs" color="muted" weight={600} style={{ marginTop: 3 }}>
          {t('parent.home.daysDetail', { absent, late })}
        </Text>
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------- fees */

export function FeeTicketCard({ invoice }: { invoice: StudentSummary['next_invoice'] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!invoice) {
    return (
      <Ticket style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
        <Stamp>{t('parent.home.allPaid')}</Stamp>
      </Ticket>
    );
  }
  const left = daysUntil(invoice.due_date);
  const when =
    left > 0 ? t('parent.home.daysLeft', { count: left }) : left === 0 ? t('parent.home.dueToday') : t('parent.home.overdueBy', { count: -left });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${invoice.title}, ${formatInr(invoice.amount)}, ${t('parent.home.due', { date: formatDate(invoice.due_date) })}`}
      onPress={() => router.push('/parent/fees')}
      style={[{ flex: 1 }, pointer]}>
      <Ticket style={{ flex: 1 }}>
        <View style={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 10, gap: 6 }}>
          <Text variant="xs" weight={700} rawColor={colors.pButterInk}>
            {invoice.title.replace(/ tuition$/i, ' fee')}
          </Text>
          <Text variant="kpiSm" style={{ fontSize: 25, lineHeight: 27 }}>
            {formatInr(invoice.amount)}
          </Text>
          <Text variant="xxs" color="muted" weight={600} numberOfLines={2}>
            {invoice.heads.length > 1 ? t('parent.home.feeDescription') : invoice.heads[0] ?? ''}
          </Text>
        </View>
        <Tear />
        <View style={{ paddingTop: 8, paddingHorizontal: 16, paddingBottom: 16, gap: 10, flex: 1, justifyContent: 'space-between' }}>
          <View>
            <Text variant="sm" weight={700}>
              {t('parent.home.due', { date: formatDate(invoice.due_date) })}
            </Text>
            <Text variant="xxs" weight={600} rawColor={left < 0 ? colors.bad : colors.muted}>
              {when}
            </Text>
          </View>
          <Button title={t('parent.home.payNow')} size="sm" fullWidth height={36} decorative />
        </View>
      </Ticket>
    </Pressable>
  );
}

/* ------------------------------------------------------------- bus */

/** The bus pass: time at your stop, a route line from school to home, and when it leaves. */
export function BusPassCard({ summary, transport }: { summary: StudentSummary; transport?: StudentTransport }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const home = summary.today.home;
  const bus = summary.bus;
  const enrolled = transport?.enrolled ? transport : undefined;
  const dropTrip = enrolled?.today.find((trip) => trip.direction === 'drop');
  const pickupTrip = enrolled?.today.find((trip) => trip.direction === 'pickup');
  const activeTrip = [pickupTrip, dropTrip].find((trip) => trip?.status === 'active');
  const direction: 'pickup' | 'drop' = activeTrip?.direction ?? (pickupTrip && pickupTrip.status === 'scheduled' ? 'pickup' : 'drop');
  const live = useTripLive(activeTrip?.trip_id);
  const shape = useRouteShape(enrolled?.route.id, direction);
  if (!bus.enrolled || !home || !enrolled) return null;

  const trip = direction === 'drop' ? dropTrip : pickupTrip;
  const myStop = direction === 'drop' ? enrolled.drop_stop : enrolled.pickup_stop;
  const delay = Math.max(0, live.data?.delay_minutes ?? home.delay_minutes ?? 0);
  const myStopLive = live.data?.stops.find((s) => s.id === myStop.id);
  const etaAt = myStopLive?.eta_seconds != null ? new Date(Date.now() + myStopLive.eta_seconds * 1000).toISOString() : direction === 'drop' ? home.eta_at : null;

  // School → two stops on the way → your stop.
  const stops = shape.data?.stops ?? [];
  const schoolIndex = stops.findIndex((s) => s.id === shape.data?.school_stop_id);
  const ordered = direction === 'drop' && schoolIndex > 0 ? [...stops].reverse() : stops;
  const mine = ordered.findIndex((s) => s.id === myStop.id);
  const between = mine > 0 ? ordered.slice(1, mine) : [];
  const picks = between.length >= 2 ? [between[Math.floor(between.length / 3)], between[Math.floor((2 * between.length) / 3)]] : between;
  const labels = [direction === 'drop' ? t('parent.home.school') : (ordered[0]?.name ?? ''), ...picks.map((s) => s.name.split(' ')[0]), myStop.name.replace(/ (Residency|Circle|Colony)/, '')];
  const positions = labels.map((_, i) => 0.05 + (0.89 * i) / Math.max(1, labels.length - 1));
  const departed = live.data ? live.data.stops.filter((s) => s.status === 'departed').length : 0;
  const busAt = live.data && mine > 0 ? Math.min(0.94, 0.05 + (0.89 * departed) / mine) : 0.05;

  const leaveAt = trip ? addMinutes(trip.scheduled_start, delay) : null;
  const running = live.data?.status === 'active';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${home.bus}: ${etaAt ? formatTime(etaAt) : ''} ${t('parent.home.atYourStop')}`}
      onPress={() => router.push('/parent/bus')}
      style={pointer}>
      <Ticket color="sky" style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        <View style={{ flex: 1, minWidth: 0, paddingTop: 16, paddingRight: 14, paddingBottom: 14, paddingLeft: 16, gap: 10 }}>
          <View style={styles.between}>
            <Text variant="xs" weight={700} rawColor={colors.pBlueInk}>
              {t('parent.home.busRun', { bus: home.bus, run: direction === 'drop' ? t('parent.home.dropRun') : t('parent.home.pickupRun') })}
            </Text>
            {delay > 0 ? <Pill label={t('parent.home.minLate', { count: delay })} tone="warn" /> : <Pill label={t('parent.home.onTime')} tone="ok" />}
          </View>
          <View style={[styles.row8, { alignItems: 'baseline' }]}>
            <Text variant="kpi" style={{ fontSize: 30, lineHeight: 32 }}>
              {etaAt ? formatTime(etaAt) : clockShort(myStop.time)}
            </Text>
            <Text variant="xs" color="muted" weight={600}>
              {t('parent.home.atYourStop')}
            </Text>
          </View>
          <RouteLine
            progress={running ? busAt : 0}
            bus={busAt}
            stops={positions.map((at, i) => ({ at, kind: i === positions.length - 1 ? 'home' : i === 0 ? 'past' : 'stop' }))}
            busTone={delay > 0 ? 'warn' : 'brand'}
          />
          <View style={styles.between}>
            {labels.map((label, i) => (
              <Text
                key={`${label}-${i}`}
                variant="xxs"
                weight={600}
                rawColor={i === labels.length - 1 ? colors.pPinkInk : colors.muted}
                numberOfLines={2}
                style={{ maxWidth: 70, textAlign: i === 0 ? 'left' : i === labels.length - 1 ? 'right' : 'center' }}>
                {label}
              </Text>
            ))}
          </View>
        </View>
        <TearV />
        <View style={{ width: 70, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 8 }}>
          <Text variant="xxs" color="muted" weight={700} style={{ textTransform: 'uppercase', letterSpacing: 1.1 }}>
            {t('parent.home.leaves')}
          </Text>
          <Text variant="sm" weight={800} num>
            {leaveAt ? clockShort(leaveAt) : '—'}
          </Text>
          <Text variant="xxs" weight={700} rawColor={colors.pBlueInk}>
            {t('parent.home.track')}
          </Text>
        </View>
      </Ticket>
    </Pressable>
  );
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/* ------------------------------------------------------------- report */

/** The latest report card, subject by subject against the exam before it. */
export function ReportPaperCard({ exams }: { exams: ExamResult[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [latest, previous] = exams;
  if (!latest) return null;
  const prev = new Map((previous?.subjects ?? []).map((s) => [s.subject, s.percent]));
  const rows = [...latest.subjects].sort((a, b) => b.percent - a.percent);
  const gains = rows.map((s) => (prev.has(s.subject) ? s.percent - (prev.get(s.subject) ?? 0) : 0));
  const best = Math.max(...gains);
  const delta = previous ? Math.round(latest.percent - previous.percent) : null;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/parent/results')} style={pointer}>
      <Paper pad={18} style={{ gap: 12, paddingBottom: 16 }}>
        <View style={[styles.between, { alignItems: 'flex-start' }]}>
          <View>
            <Text variant="xxs" color="muted" weight={700} style={{ textTransform: 'uppercase', letterSpacing: 1.3 }}>
              {t('parent.home.reportTitle', { exam: latest.name })}
            </Text>
            <View style={[styles.row8, { alignItems: 'baseline', marginTop: 6 }]}>
              <Text variant="kpi">{Math.round(latest.percent)}%</Text>
              {delta !== null ? <Delta value={t('parent.home.pts', { count: Math.abs(delta) })} direction={delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'} /> : null}
            </View>
            {latest.class_average != null ? (
              <Text variant="xs" color="muted" style={{ marginTop: 4 }}>
                {t('parent.home.classAverage', { percent: Math.round(latest.class_average), date: formatDate(latest.held_on) })}
              </Text>
            ) : null}
          </View>
          <Stamp tone="lav" round sub={t('parent.home.grade')} style={{ marginTop: 2 }}>
            {latest.grade}
          </Stamp>
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
          {rows.map((s, i) => {
            const before = prev.get(s.subject);
            const highlight = previous && gains[i] === best && best > 0;
            return (
              <View key={s.subject} style={[styles.markRow, i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line, borderStyle: 'dashed' }]}>
                <Text variant="sm" style={{ flex: 1 }} numberOfLines={1}>
                  {s.subject}
                </Text>
                {before !== undefined ? (
                  <>
                    <Text variant="xs" color="muted" num align="right" style={{ width: 34 }}>
                      {Math.round(before)}
                    </Text>
                    <Svg width={16} height={8}>
                      <Path d="M1 4h12M10 1l3 3-3 3" fill="none" stroke={colors.faint} strokeWidth={1.4} />
                    </Svg>
                  </>
                ) : null}
                <Text variant="sm" weight={800} num align="right" style={{ width: 26 }}>
                  {highlight ? <Highlight color="pink">{Math.round(s.percent)}</Highlight> : Math.round(s.percent)}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={styles.between}>
          <Text variant="xs" color="muted" weight={600}>
            {previous ? t('parent.home.comparison', { from: previous.name, to: latest.name }) : latest.name}
          </Text>
          <Text variant="xs" weight={700} rawColor={colors.brandInk}>
            {t('parent.home.fullReport')}
          </Text>
        </View>
      </Paper>
    </Pressable>
  );
}

/* ------------------------------------------------------------- remark */

export function RemarkNoteCard({ remark, onReply }: { remark: NonNullable<StudentSummary['latest_remark']>; onReply: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const color = remark.tone === 'concern' ? 'peach' : remark.tone === 'info' ? 'sky' : 'pink';
  return (
    <View style={{ paddingTop: 10, paddingHorizontal: 6 }}>
      <StickyNote color={color} tilt="l" tape="center" style={{ gap: 10 }}>
        <Pressable accessibilityRole="link" onPress={() => router.push('/parent/remarks')} style={pointer}>
          <Text style={{ fontSize: 15, lineHeight: 23 }} weight={500} color="ink">
            {remark.body}
          </Text>
        </Pressable>
        <View style={styles.between}>
          <View style={styles.row8}>
            <Avatar initials={remark.author_initials} size="xs" tone={3} />
            <Text variant="xs" weight={700}>
              {remark.author} · {formatDate(remark.created_at)}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`${t('parent.home.reply')} ${remark.author}`} onPress={onReply} hitSlop={10} style={pointer}>
            <Text variant="xs" weight={700} rawColor={colors.pPinkInk}>
              {t('parent.home.reply')}
            </Text>
          </Pressable>
        </View>
      </StickyNote>
    </View>
  );
}

/* ------------------------------------------------------------- diary */

/** This week's homework as a ruled diary page. */
export function DiaryWeekCard({ items }: { items: Homework[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const open = items.filter((h) => !h.submission).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const graded = items.filter((h) => h.submission?.grade).sort((a, b) => (b.submission!.submitted_at).localeCompare(a.submission!.submitted_at))[0];
  const dueThisWeek = open.filter((h) => daysUntil(h.due_date) >= 0 && daysUntil(h.due_date) <= 6);
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/parent/homework')} style={[{ marginTop: 6 }, pointer]}>
      <Diary>
        <DiaryHead>
          <Text variant="sm" weight={700} style={{ flex: 1 }}>
            {t('parent.home.diaryTitle')}
          </Text>
          {dueThisWeek.length ? <Pill label={t('parent.home.dueCount', { count: dueThisWeek.length })} tone="warn" dot={false} /> : null}
        </DiaryHead>
        {open.length === 0 ? (
          <DiaryRow>
            <Text variant="sm" color="muted">
              {t('parent.home.noHomework')}
            </Text>
          </DiaryRow>
        ) : null}
        {open.slice(0, 4).map((h) => {
          const left = daysUntil(h.due_date);
          const tag = h.flagged_by ? (
            <Text variant="xxs" weight={700} color="bad">
              {t('parent.home.flagged')}
            </Text>
          ) : left === 1 ? (
            <Text variant="xxs" weight={700} color="warn">
              {t('parent.home.tomorrow')}
            </Text>
          ) : left === 0 ? (
            <Text variant="xxs" weight={700} color="warn">
              {t('parent.home.today')}
            </Text>
          ) : null;
          return (
            <DiaryRow key={h.id} when={weekdayName(h.due_date, true)}>
              <Text variant="sm" weight={700} style={{ width: 42 }} numberOfLines={1}>
                {shortSubject(h.subject.name)}
              </Text>
              <Text variant="sm" color="ink2" numberOfLines={1} style={{ flex: 1 }}>
                {h.title}
              </Text>
              {tag}
            </DiaryRow>
          );
        })}
        {graded ? (
          <DiaryRow last>
            <Text variant="xs" color="muted" style={{ flex: 1 }}>
              {t('parent.home.graded', {
                subject: graded.subject.name,
                grade: graded.submission!.grade,
                day: weekdayName(graded.submission!.submitted_at.slice(0, 10)),
              })}
            </Text>
          </DiaryRow>
        ) : null}
      </Diary>
    </Pressable>
  );
}

/** "Mathematics" → "Maths", "English" → "Eng", "Social Studies" → "SS". */
export function shortSubject(name: string): string {
  const map: Record<string, string> = {
    Mathematics: 'Maths',
    English: 'Eng',
    Science: 'Sci',
    'Social Studies': 'SS',
    'Computer Science': 'CS',
    Hindi: 'Hindi',
    'Physical Education': 'PE',
  };
  return map[name] ?? name.split(' ')[0];
}

/* ------------------------------------------------------------- notice */

export function NoticeCard({ event, to = '/parent/notifications' }: { event: NonNullable<StudentSummary['next_event']>; to?: string }) {
  const { colors } = useTheme();
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : null;
  const title = event.title.split(' · ')[0];
  return (
    <Card
      pad={16}
      onPress={() => router.push(to as never)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderStyle: 'dashed', boxShadow: 'none' }}
      accessibilityLabel={`${title}, ${formatDate(start, { weekday: true })}`}>
      <TearCal size="sm" month={monthName(start, true)} day={start.getDate()} dow={weekdayName(start, true)} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text variant="sm" weight={700}>
          {title}
        </Text>
        <Text variant="xs" color="muted" numberOfLines={2}>
          {formatTime(start)}
          {end ? `–${formatTime(end)}` : ''} · {event.body}
        </Text>
      </View>
      <Icon name="chevronRight" size={ICON_SIZE.sm} rawColor={colors.faint} />
    </Card>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekRow: { flexDirection: 'row', gap: 8 },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 32 },
});

