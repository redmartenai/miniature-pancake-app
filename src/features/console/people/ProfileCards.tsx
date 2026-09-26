import type { TFunction } from 'i18next';
import { useMutation } from '@tanstack/react-query';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BarChart } from '@/features/charts/BarChart';
import { CardHead, Swatch } from '@/features/console/Page';
import { formatInr } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  AvatarStack,
  Avatar,
  Bar,
  Card,
  Delta,
  Hr,
  Icon,
  ICON_SIZE,
  IconButton,
  Link,
  Pill,
  pointer,
  Text,
  TileIcon,
  useToast,
  Vr,
  Well,
  type IconName,
  type PillTone,
  type TileTone,
} from '@/ui';

import { peopleApi, type Interaction, type Profile } from './api';
import { clock, dayMonth, daysFrom, dowDayMonth, errorText, ToolbarButton } from './kit';

const SHORT: Record<string, string> = {
  MATH: 'Maths',
  CS: 'Computer',
  SST: 'Social St.',
  PE: 'P.E.',
  ENG: 'English',
  SCI: 'Science',
  HIN: 'Hindi',
  ECO: 'Economics',
};
export const shortSubject = (code: string, name: string) => SHORT[code] ?? name;
const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/* ------------------------------------------------------------------------------------------------ attendance */

/** The month calendar: present / late / absent / holiday / upcoming, today ringed. */
export function MonthCalendar({ att, today }: { att: Profile['attendance']; today: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const first = new Date(`${att.month}-01T00:00:00`);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const cells: (Profile['attendance']['calendar'][number] | null)[] = [...Array(lead).fill(null), ...att.calendar];
  while (cells.length % 7) cells.push(null);
  const style = (state: string) => {
    switch (state) {
      case 'present':
        return { backgroundColor: colors.okSoft, color: colors.ok };
      case 'late':
        return { backgroundColor: colors.warnSoft, color: colors.warn, boxShadow: `inset 0 0 0 1.5px ${colors.warn}` };
      case 'absent':
        return { backgroundColor: colors.badSoft, color: colors.bad, boxShadow: `inset 0 0 0 1.5px ${colors.bad}` };
      case 'holiday':
        return { backgroundColor: colors.sunken, color: colors.muted };
      default:
        return { borderWidth: 1, borderStyle: 'dashed' as const, borderColor: colors.lineStrong, color: colors.muted };
    }
  };
  const counts = att.calendar.reduce<Record<string, number[]>>((acc, c) => {
    (acc[c.state] ??= []).push(Number(c.date.slice(8)));
    return acc;
  }, {});
  const label = t('console.people.profile.att.calendarLabel', {
    month: first.toLocaleString('en-IN', { month: 'long' }),
    absent: (counts.absent ?? []).join(', ') || '—',
    late: (counts.late ?? []).join(', ') || '—',
  });
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.grid} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {WEEK.map((d) => (
          <Text key={d} variant="xxs" color="muted" weight={700} style={styles.gridCell} align="center">
            {t(`console.people.profile.att.dow.${d}`)}
          </Text>
        ))}
      </View>
      <View style={[styles.grid, { rowGap: 6 }]} accessible accessibilityRole="image" accessibilityLabel={label}>
        {cells.map((c, i) => {
          if (!c) return <View key={`e${i}`} style={styles.gridCell} />;
          const s = style(c.state);
          const isToday = c.date === today;
          const { color, ...box } = s;
          return (
            <View key={c.date} style={styles.gridCell}>
              <View style={[styles.day, box, isToday && { boxShadow: `0 0 0 2px ${colors.surface}, 0 0 0 4px ${color}` }]}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 12.5, color, fontVariant: ['tabular-nums'] }}>
                  {Number(c.date.slice(8))}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function CalendarLegend() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const items: { key: string; bg: string; border?: string; dashed?: boolean }[] = [
    { key: 'present', bg: colors.okSoft, border: colors.ok },
    { key: 'late', bg: colors.warnSoft, border: colors.warn },
    { key: 'absent', bg: colors.badSoft, border: colors.bad },
    { key: 'holiday', bg: colors.sunken },
    { key: 'upcoming', bg: 'transparent', dashed: true },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      {items.map((it) => (
        <View key={it.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {it.dashed ? (
            <View
              style={{ width: 10, height: 10, borderRadius: 3, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong }}
            />
          ) : (
            <Swatch color={it.bg} border={it.border} />
          )}
          <Text variant="xs" color="ink2">
            {t(`console.people.profile.att.${it.key}`)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** One line of the exceptions list: "Absent · Wed 9 Sep · Fever · leave approved by …". */
export function ExceptionLine({ e }: { e: Profile['attendance']['log'][number] }) {
  const { t } = useTranslation();
  const detail = [
    e.note,
    e.leave
      ? t(`console.people.profile.att.leave.${e.leave.status === 'approved' ? 'approved' : 'other'}`, { by: e.leave.decided_by ?? '' })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={styles.excRow}>
      <Pill label={t(`console.people.profile.att.${e.status}`)} tone={e.status === 'absent' ? 'bad' : 'warn'} dot={false} />
      <Text variant="xs" weight={700} num>
        {dowDayMonth(e.date)}
      </Text>
      <Text variant="xs" color="ink2" numberOfLines={1} style={{ flex: 1 }}>
        {detail || t('console.people.profile.att.noNote')}
      </Text>
    </View>
  );
}

export function AttendanceCard({ p, today, onFullLog }: { p: Profile; today: string; onFullLog: () => void }) {
  const { t } = useTranslation();
  const att = p.attendance;
  const monthName = new Date(`${att.month}-01T00:00:00`).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const recent = att.log.filter((e) => e.date.startsWith(att.month));
  return (
    <Card pad={22} style={{ gap: 16, flex: 1 }}>
      <CardHead
        title={t('console.people.profile.att.title')}
        subtitle={t('console.people.profile.att.subtitle', { month: monthName })}
        right={<Link label={t('console.people.profile.att.fullLog')} onPress={onFullLog} />}
      />
      <View style={{ flexDirection: 'row', gap: 22, alignItems: 'stretch' }}>
        <View style={{ gap: 6 }}>
          <View style={styles.baseline}>
            <Text variant="kpi">{att.month_stats.percent === null ? '—' : `${Math.round(att.month_stats.percent)}%`}</Text>
            <Text variant="sm" color="muted">
              {t('console.people.profile.att.thisMonth')}
            </Text>
          </View>
          <Text variant="xs" color="muted">
            {t('console.people.profile.att.monthLine', {
              onTime: att.month_stats.on_time,
              late: att.month_stats.late,
              absent: att.month_stats.absent,
            })}
          </Text>
        </View>
        <Vr />
        <View style={{ gap: 6 }}>
          <View style={styles.baseline}>
            <Text variant="kpiSm">{att.ytd.percent === null ? '—' : `${att.ytd.percent}%`}</Text>
            <Text variant="sm" color="muted">
              {t('console.people.profile.att.ytd')}
            </Text>
          </View>
          <Text variant="xs" color="muted">
            {t('console.people.profile.att.ytdLine', { present: att.ytd.present, days: att.ytd.days, target: att.ytd.target })}
          </Text>
        </View>
      </View>
      <MonthCalendar att={att} today={today} />
      <CalendarLegend />
      {recent.length ? (
        <Well pad={0} style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
          {recent.map((e, i) => (
            <View key={e.date}>
              {i ? <Hr /> : null}
              <ExceptionLine e={e} />
            </View>
          ))}
        </Well>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------------------------------------ academics */

export function AcademicsChart({ p, height = 260 }: { p: Profile; height?: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const a = p.academics;
  if (!a.subjects.length) return null;
  const top = Math.max(...a.subjects.map((s) => s.latest));
  const low = Math.min(...a.subjects.map((s) => s.latest));
  const avg = a.latest_class_average;
  const data = a.subjects.map((s) => ({
    label: shortSubject(s.code, s.subject),
    values: [s.previous, s.latest],
    top: s.latest === top || s.latest === low ? String(Math.round(s.latest)) : undefined,
  }));
  const summary = a.subjects.map((s) => `${s.subject} ${s.previous ?? '—'} → ${s.latest}`).join(', ');
  return (
    <View>
      <BarChart
        data={data}
        series={[
          { key: 'prev', color: colors.c1, label: a.previous_name ?? '' },
          { key: 'latest', color: colors.c2, label: a.latest_name ?? '' },
        ]}
        height={height}
        yMax={100}
        ticks={[0, 25, 50, 75, 100]}
        axisWidth={28}
        barWidth={20}
        groupGap={4}
        refLine={avg !== null ? { value: avg, color: colors.muted } : undefined}
        accessibilityLabel={t('console.people.profile.acad.chartLabel', { summary, avg: avg ?? '—' })}
      />
      <View style={{ flexDirection: 'row', marginLeft: 38, marginRight: 8, marginTop: -8 }}>
        {a.subjects.map((s) => (
          <Text key={s.code} variant="xxs" color="muted" weight={600} align="center" style={{ flex: 1 }}>
            {s.change === null ? '' : `${s.change > 0 ? '+' : ''}${Math.round(s.change)}`}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function AcademicsCard({ p }: { p: Profile }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const a = p.academics;
  const change = a.latest_percent !== null && a.previous_percent !== null ? Math.round(a.latest_percent - a.previous_percent) : null;
  const w = a.watch;
  return (
    <Card pad={22} style={{ gap: 14, flex: 1 }}>
      <CardHead
        title={t('console.people.profile.acad.title')}
        subtitle={
          a.latest_name
            ? t('console.people.profile.acad.subtitle', {
                prev: a.previous_name ?? '',
                latest: a.latest_name,
                short: shortExam(a.latest_name),
                date: a.latest_published_on ? dayMonth(a.latest_published_on) : '',
              })
            : t('console.people.profile.acad.none')
        }
        right={
          a.subjects.length ? (
            <View
              style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap', maxWidth: 280, justifyContent: 'flex-end' }}>
              <Legend color={colors.c1} label={a.previous_name ?? ''} />
              <Legend color={colors.c2} label={a.latest_name ?? ''} />
              {a.latest_class_average !== null ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 16, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.muted }} />
                  <Text variant="xs" color="muted" weight={600}>
                    {t('console.people.profile.acad.avg', {
                      cls: p.class.label,
                      exam: shortExam(a.latest_name ?? ''),
                      avg: Math.round(a.latest_class_average),
                    })}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : undefined
        }
      />
      <AcademicsChart p={p} />
      {a.latest_percent !== null ? (
        <View style={{ flexDirection: 'row', alignItems: 'stretch', marginTop: 'auto' }}>
          <View style={{ flex: 1, gap: 6, paddingRight: 20 }}>
            <Text variant="eyebrow" color="muted">
              {t('console.people.profile.acad.overall', { exam: shortExam(a.latest_name ?? '') })}
            </Text>
            <View style={styles.baseline}>
              <Text variant="kpiSm">{Math.round(a.latest_percent)}%</Text>
              <Pill label={t('console.people.profile.acad.gradeLabel', { grade: a.latest_grade })} tone="ok" />
            </View>
          </View>
          <Vr />
          <View style={{ flex: 1, gap: 6, paddingHorizontal: 20 }}>
            <Text variant="eyebrow" color="muted">
              {t('console.people.profile.acad.since', { exam: a.previous_name ?? '' })}
            </Text>
            <View style={styles.baseline}>
              <Text variant="kpiSm">{a.previous_percent === null ? '—' : `${Math.round(a.previous_percent)}%`}</Text>
              {change !== null ? (
                <Delta
                  value={t('console.people.profile.acad.pts', { count: Math.abs(change) })}
                  direction={change > 0 ? 'up' : change < 0 ? 'down' : 'flat'}
                />
              ) : null}
            </View>
          </View>
          <Vr />
          <View style={{ flex: 1.3, gap: 6, paddingLeft: 20 }}>
            <Text variant="eyebrow" color="muted">
              {t('console.people.profile.acad.watch')}
            </Text>
            <Text variant="sm" color="ink2">
              {w
                ? [
                    w.biggest_gain === w.lowest && w.gain
                      ? t('console.people.profile.acad.watchBoth', {
                          subject: w.lowest,
                          score: Math.round(w.lowest_percent),
                          gain: Math.round(w.gain),
                        })
                      : t('console.people.profile.acad.watchLow', { subject: w.lowest, score: Math.round(w.lowest_percent) }),
                    a.next_exam
                      ? t('console.people.profile.acad.next', { name: a.next_exam.name, date: dowDayMonth(a.next_exam.held_on) })
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                : '—'}
            </Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

export function shortExam(name: string): string {
  const m = /^Unit Test (\d+)$/.exec(name);
  return m ? `UT${m[1]}` : name;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Swatch color={color} />
      <Text variant="xs" color="muted" weight={600}>
        {label}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------ remarks */

export function RemarkList({ items, limit }: { items: Profile['remarks']; limit?: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const shown = limit ? items.slice(0, limit) : items;
  const tone = (r: Profile['remarks'][number]) =>
    r.tone === 'positive'
      ? { dot: colors.ok, ring: colors.okSoft, pill: 'ok' as PillTone }
      : r.tone === 'concern'
        ? { dot: colors.warn, ring: colors.warnSoft, pill: 'warn' as PillTone }
        : { dot: colors.info, ring: colors.infoSoft, pill: 'neutral' as PillTone };
  if (!shown.length)
    return (
      <Text variant="sm" color="muted">
        {t('console.people.profile.remarks.none')}
      </Text>
    );
  return (
    <View>
      {shown.map((r, i) => {
        const c = tone(r);
        const last = i === shown.length - 1;
        const meta = [
          r.subject,
          r.author_role === 'class_teacher' ? t('console.people.profile.remarks.classTeacher') : null,
          dayMonth(r.created_at),
          r.seen_at
            ? t(r.requires_ack ? 'console.people.profile.remarks.acked' : 'console.people.profile.remarks.seen', {
                date: dayMonth(r.seen_at),
              })
            : r.visibility === 'family'
              ? t('console.people.profile.remarks.unseen')
              : t('console.people.profile.remarks.staffOnly'),
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <View key={r.id} style={{ flexDirection: 'row', gap: 14, alignItems: 'stretch' }}>
            <View style={{ width: 12, alignItems: 'center' }}>
              <View
                style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: c.dot, boxShadow: `0 0 0 4px ${c.ring}` }}
              />
              {!last ? <View style={{ flex: 1, width: 2, borderRadius: 2, marginTop: 8, backgroundColor: colors.line }} /> : null}
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 6, paddingBottom: last ? 0 : 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="sm" weight={700}>
                  {r.author}
                </Text>
                <Pill label={t(`console.people.profile.remarks.tone.${r.tone}`)} tone={c.pill} dot={false} />
              </View>
              <Text variant="sm" color="ink2" style={{ lineHeight: 20 }}>
                “{r.body}”
              </Text>
              <Text variant="xxs" color="muted" weight={600}>
                {meta}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function RemarksCard({ p, onAdd, onAll }: { p: Profile; onAdd: () => void; onAll: () => void }) {
  const { t } = useTranslation();
  return (
    <Card pastel="pink" pad={22} style={{ gap: 16, flex: 1 }}>
      <CardHead
        title={t('console.people.profile.remarks.title')}
        subtitle={t('console.people.profile.remarks.subtitle')}
        right={<ToolbarButton size="sm" icon="plus" label={t('console.people.profile.remarks.add')} onPress={onAdd} />}
      />
      <RemarkList items={p.remarks} limit={3} />
      {p.remarks.length > 3 ? <Link label={t('console.people.profile.remarks.all', { count: p.remarks.length })} onPress={onAll} /> : null}
    </Card>
  );
}

/* ------------------------------------------------------------------------------------------------ fees */

export function useFeeReminder(p: Profile) {
  const { t } = useTranslation();
  const toast = useToast();
  return useMutation({
    mutationFn: () => peopleApi.feeReminder(p.id),
    onSuccess: (res) => toast(t('console.people.profile.fees.reminded', { count: res.sent_to, invoice: res.invoice })),
    onError: (e) => toast(errorText(e, t('console.people.failed')), 'danger'),
  });
}

export function FeesCard({ p, onLedger }: { p: Profile; onLedger: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = p.fees;
  const remind = useFeeReminder(p);
  const paid = Number(f.paid);
  const due = Number(f.outstanding);
  const family = f.family_due;
  const siblings = family?.children.filter((c) => c.id !== p.id) ?? [];
  return (
    <Card pastel="butter" pad={22} style={{ gap: 16, flex: 1 }}>
      <CardHead
        title={t('console.people.profile.fees.title', { year: p.academic_year ?? '' })}
        subtitle={t('console.people.profile.fees.subtitle', { amount: formatInr(f.annual), heads: f.categories.join(', ') })}
        right={<Link label={t('console.people.profile.fees.ledger')} onPress={onLedger} />}
      />
      <View style={{ gap: 10 }}>
        <View style={styles.baseline}>
          <Text variant="kpiSm">{formatInr(f.outstanding)}</Text>
          <Text variant="sm" color="muted">
            {t('console.people.profile.fees.outstanding')}
          </Text>
        </View>
        <View
          style={{ flexDirection: 'row', gap: 2, height: 10 }}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('console.people.profile.fees.barLabel', {
            paid: formatInr(paid),
            annual: formatInr(f.annual),
            due: formatInr(due),
          })}>
          {paid > 0 ? (
            <View
              style={{
                flex: paid,
                backgroundColor: colors.brand,
                borderTopLeftRadius: 999,
                borderBottomLeftRadius: 999,
                borderTopRightRadius: due ? 0 : 999,
                borderBottomRightRadius: due ? 0 : 999,
              }}
            />
          ) : null}
          {due > 0 ? (
            <View
              style={{
                flex: due,
                backgroundColor: colors.pTrack,
                borderTopRightRadius: 999,
                borderBottomRightRadius: 999,
                borderTopLeftRadius: paid ? 0 : 999,
                borderBottomLeftRadius: paid ? 0 : 999,
              }}
            />
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Swatch color={colors.brand} />
            <Text variant="xs" weight={700} color="ink2">
              {t('console.people.profile.fees.paid', { amount: formatInr(f.paid), count: f.receipts })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Swatch color={colors.pTrack} />
            <Text variant="xs" weight={600} color="muted">
              {t('console.people.profile.fees.due', { amount: formatInr(f.outstanding) })}
            </Text>
          </View>
        </View>
      </View>
      {f.next ? (
        <Well pad={14} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TileIcon icon="receipt" tone="warn" size="sm" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="sm" weight={700}>
                {`${f.next.title} · ${formatInr(f.next.amount)}`}
              </Text>
              <Text variant="xs" color="muted">
                {t('console.people.profile.fees.dueOn', { date: dowDayMonth(f.next.due_date) })}
              </Text>
            </View>
            <Pill
              label={
                f.next.days < 0
                  ? t('console.people.profile.fees.late', { count: -f.next.days })
                  : f.next.days === 0
                    ? t('console.people.profile.fees.today')
                    : t('console.people.profile.fees.inDays', { count: f.next.days })
              }
              tone={f.next.days < 0 ? 'bad' : 'warn'}
            />
          </View>
          {f.upcoming.length ? <Hr /> : null}
          {f.upcoming.map((u) => (
            <View key={u.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text
                variant="xs"
                color="ink2">{`${u.title} · ${dayMonth(u.due_date)}${u.due_date.slice(0, 4) !== f.next!.due_date.slice(0, 4) ? ` ${u.due_date.slice(0, 4)}` : ''}`}</Text>
              <Text variant="xs" weight={700} num>
                {formatInr(u.amount)}
              </Text>
            </View>
          ))}
        </Well>
      ) : (
        <Well pad={14}>
          <Text variant="sm" color="ink2">
            {t('console.people.profile.fees.clear')}
          </Text>
        </Well>
      )}
      {family || f.last_payment ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Icon name="users" size={ICON_SIZE.sm} rawColor={colors.muted} />
          <Text variant="xs" color="ink2" style={{ flex: 1 }}>
            {[
              family && siblings.length
                ? t('console.people.profile.fees.family', {
                    date: dayMonth(family.on),
                    total: formatInr(family.total),
                    with: siblings.map((s) => `${s.name} (${s.class}, ${formatInr(s.amount)})`).join(', '),
                  })
                : '',
              f.last_payment
                ? t('console.people.profile.fees.last', {
                    amount: formatInr(f.last_payment.amount),
                    date: f.last_payment.paid_at ? dayMonth(f.last_payment.paid_at) : '',
                    receipt: f.last_payment.receipt_no ?? '',
                  })
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          </Text>
        </View>
      ) : null}
      <ToolbarButton
        size="sm"
        icon="bell"
        label={t('console.people.profile.fees.remind')}
        onPress={() => remind.mutate()}
        busy={remind.isPending}
        disabled={!f.next}
        hint={!f.next ? t('console.people.profile.fees.nothingDue') : undefined}
        style={{ marginTop: 'auto', alignSelf: 'flex-start' }}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------------------------------------ homework */

const HW_ICON: Record<string, IconName> = {
  MATH: 'edit',
  ENG: 'book',
  SST: 'pin',
  SCI: 'layers',
  HIN: 'pencil',
  CS: 'grid',
  ART: 'pencil',
};

export function dueLabel(t: TFunction, iso: string): { text: string; soon: boolean } {
  const d = daysFrom(iso);
  if (d === 0) return { text: t('console.people.profile.hw.today'), soon: true };
  if (d === 1 || (d === 2 && new Date().getDay() === 6)) return { text: t('console.people.profile.hw.tomorrow'), soon: true };
  return { text: dowDayMonth(iso), soon: false };
}

export function HomeworkCard({ p }: { p: Profile }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const h = p.homework;
  return (
    <Card pastel="peach" pad={22} style={{ gap: 14, flex: 1 }}>
      <CardHead
        title={t('console.people.profile.hw.title')}
        subtitle={t('console.people.profile.hw.subtitle')}
        right={<Pill label={t('console.people.profile.hw.open', { count: h.open.length })} />}
      />
      <View style={{ gap: 10 }}>
        <View style={styles.baseline}>
          <Text variant="kpiSm">{`${h.on_time} / ${h.assigned}`}</Text>
          <Text variant="sm" color="muted">
            {t('console.people.profile.hw.onTime')}
          </Text>
        </View>
        <Bar value={h.on_time} max={Math.max(1, h.assigned)} accessibilityLabel={`${h.percent ?? 0}%`} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="xs" color="muted" weight={600}>
            {t('console.people.profile.hw.line', { pct: h.percent ?? 0, count: h.late })}
          </Text>
          {h.incomplete ? (
            <Text variant="xs" weight={700} rawColor={colors.warn}>
              {t('console.people.profile.hw.incomplete', { count: h.incomplete })}
            </Text>
          ) : null}
        </View>
      </View>
      {h.flag ? (
        <View style={[styles.flag, { backgroundColor: colors.warnSoft }]}>
          <Icon name="alert" size={ICON_SIZE.sm} rawColor={colors.warn} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700}>
              {h.flag.title}
            </Text>
            <Text variant="xs" color="ink2">
              {t('console.people.profile.hw.flag', { by: h.flag.by, date: dowDayMonth(h.flag.due_date) })}
            </Text>
          </View>
        </View>
      ) : null}
      <View>
        {h.open.slice(0, 4).map((item, i) => {
          const due = dueLabel(t, item.due_date);
          return (
            <View key={item.id} style={[styles.listItem, i ? { borderTopWidth: 1, borderTopColor: colors.pHr } : null]}>
              <TileIcon icon={HW_ICON[item.code] ?? 'book'} tone="neutral" size="sm" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="sm" weight={700} numberOfLines={1}>
                  {item.subject}
                </Text>
                <Text variant="xs" color="muted" numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
              {due.soon ? (
                <Pill label={due.text} tone="brand" dot={false} />
              ) : (
                <Text variant="xs" weight={600} color="ink2" num>
                  {due.text}
                </Text>
              )}
            </View>
          );
        })}
        {!h.open.length ? (
          <Text variant="sm" color="muted">
            {t('console.people.profile.hw.none')}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------------------------------------------ interactions */

function minutesText(t: TFunction, m: number): string {
  return m >= 90
    ? t('console.people.profile.int.hours', { count: Math.round(m / 60) })
    : t('console.people.profile.int.minutes', { count: m });
}

export function InteractionRow({ e, first }: { e: Interaction; first: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const at = new Date(e.at);
  const dow = at.toLocaleString('en-IN', { weekday: 'short' });
  const icon: { name: IconName; tone: TileTone } =
    e.kind === 'meeting'
      ? { name: e.upcoming ? 'calendar' : 'users', tone: e.upcoming ? 'info' : 'neutral' }
      : e.kind === 'thread'
        ? { name: 'chat', tone: 'pink' }
        : e.kind === 'ack'
          ? { name: 'bell', tone: 'warn' }
          : { name: 'calendarX', tone: 'neutral' };
  const sub =
    e.kind === 'meeting'
      ? `${dow} · ${e.upcoming ? t('console.people.profile.int.upcoming') : t('console.people.profile.int.inPerson')}`
      : e.kind === 'thread'
        ? `${dow} · ${t('console.people.profile.int.messages', { count: e.count ?? 0 })}`
        : e.kind === 'ack'
          ? `${dow} · ${t('console.people.profile.int.app')}`
          : `${dow} · ${t('console.people.profile.int.days', { count: e.days ?? 1 })}`;
  const detail =
    e.kind === 'meeting'
      ? t('console.people.profile.int.meetingDetail', { time: clock(e.at), where: e.detail || '—' })
      : e.kind === 'thread'
        ? [e.detail, e.reply_minutes != null ? t('console.people.profile.int.replied', { time: minutesText(t, e.reply_minutes) }) : '']
            .filter(Boolean)
            .join(' · ')
        : e.kind === 'ack'
          ? t('console.people.profile.int.ackDetail', { what: e.detail, time: clock(e.at) })
          : e.detail;
  const status: { label: string; tone: PillTone } =
    e.kind === 'meeting'
      ? e.status === 'booked'
        ? { label: t('console.people.profile.int.status.booked'), tone: 'info' }
        : e.status === 'cancelled'
          ? { label: t('console.people.profile.int.status.cancelled'), tone: 'bad' }
          : { label: t('console.people.profile.int.status.attended'), tone: 'neutral' }
      : e.kind === 'thread'
        ? e.status === 'replied'
          ? { label: t('console.people.profile.int.status.replied'), tone: 'ok' }
          : { label: t('console.people.profile.int.status.open'), tone: 'warn' }
        : e.kind === 'ack'
          ? { label: t('console.people.profile.int.status.seen'), tone: 'neutral' }
          : e.status === 'resolved'
            ? { label: t('console.people.profile.int.status.resolved'), tone: 'ok' }
            : { label: t(`console.people.profile.int.status.${e.status === 'open' ? 'open' : 'declined'}`), tone: 'warn' };
  const title =
    e.kind === 'thread'
      ? t('console.people.profile.int.thread')
      : e.kind === 'ack'
        ? t('console.people.profile.int.ack')
        : e.kind === 'leave'
          ? t('console.people.profile.int.leave')
          : e.title;
  return (
    <View style={[styles.intRow, !first && { borderTopWidth: 1, borderTopColor: colors.line }]}>
      <View style={{ width: 74, gap: 1, paddingTop: 2 }}>
        <Text variant="sm" weight={700} num>
          {dayMonth(e.at)}
        </Text>
        <Text variant="xxs" color="muted" weight={600}>
          {sub}
        </Text>
      </View>
      <TileIcon icon={icon.name} tone={icon.tone} size="sm" />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="sm" weight={700}>
            {title}
          </Text>
          {e.with ? (
            <Text variant="xs" color="muted">
              {`· ${e.with}`}
            </Text>
          ) : null}
        </View>
        <Text variant="xs" color="ink2" numberOfLines={2}>
          {detail}
        </Text>
      </View>
      <Pill label={status.label} tone={status.tone} />
    </View>
  );
}

export function InteractionsCard({ p, onOpen, limit = 5 }: { p: Profile; onOpen: () => void; limit?: number }) {
  const { t } = useTranslation();
  const g = p.guardians[0];
  const items = p.interactions.slice(0, limit);
  return (
    <Card pad={22} style={{ gap: 6, flex: 1 }}>
      <CardHead
        style={{ marginBottom: 4 }}
        title={t('console.people.profile.int.title')}
        subtitle={t('console.people.profile.int.subtitle', { name: g?.name ?? '—' })}
        right={<Link label={t('console.people.profile.int.openThread')} onPress={onOpen} />}
      />
      {items.map((e, i) => (
        <InteractionRow key={`${e.kind}${e.at}${i}`} e={e} first={i === 0} />
      ))}
      {!items.length ? (
        <Text variant="sm" color="muted">
          {t('console.people.profile.int.none')}
        </Text>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------------------------------------ transport */

export function TransportCard({ p, onTrack }: { p: Profile; onTrack: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tr = p.transport;
  if (!tr)
    return (
      <Card pad={22} style={{ gap: 12, flex: 1 }}>
        <CardHead title={t('console.people.profile.tr.title')} />
        <Text variant="sm" color="muted">
          {t('console.people.profile.tr.none')}
        </Text>
      </Card>
    );
  const total = tr.stops;
  const late = tr.delay_minutes && tr.delay_minutes > 0 ? tr.delay_minutes : null;
  return (
    <Card pad={22} style={{ gap: 16, flex: 1 }}>
      <CardHead
        title={t('console.people.profile.tr.title')}
        subtitle={t('console.people.profile.tr.subtitle', { route: tr.route.name, bus: tr.vehicle ?? '—' })}
        right={
          late ? (
            <Pill label={t('console.people.profile.tr.late', { count: late })} tone="warn" />
          ) : tr.drop?.status === 'live' ? (
            <Pill label={t('console.people.profile.tr.onTime')} tone="ok" />
          ) : undefined
        }
      />
      <Well pad={0} style={{ paddingVertical: 14, paddingHorizontal: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="xs" weight={600} color="muted">
            {t('console.people.profile.tr.school')}
          </Text>
          <Text variant="xs" weight={600} color="muted">
            {t('console.people.profile.tr.stopOf', { n: tr.stop_no, total })}
          </Text>
        </View>
        <View
          style={{ height: 14, justifyContent: 'center' }}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('console.people.profile.tr.stopOf', { n: tr.stop_no, total })}>
          <View style={{ position: 'absolute', left: 6, right: 6, height: 2, borderRadius: 2, backgroundColor: colors.lineStrong }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {Array.from({ length: total + 1 }, (_, i) => {
              // Drop order: the school first, then the stops from the last pickup back.
              const stopNo = total - i + 1;
              const mine = i > 0 && stopNo === tr.stop_no;
              const school = i === 0;
              const size = mine ? 12 : school ? 8 : 5;
              return (
                <View
                  key={i}
                  style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: mine || school ? colors.brand : colors.faint,
                    boxShadow: mine ? `0 0 0 3px ${colors.brandSoft}` : undefined,
                  }}
                />
              );
            })}
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Text variant="sm" weight={700} numberOfLines={1} style={{ flexShrink: 1 }}>
            {tr.stop}
          </Text>
          <Text variant="xs" color="muted">
            {t('console.people.profile.tr.stopN', { n: tr.stop_no })}
          </Text>
        </View>
      </Well>
      <View>
        <View style={styles.listItem}>
          <TileIcon icon={tr.boarded_at ? 'check' : 'clock'} tone={tr.boarded_at ? 'ok' : 'neutral'} size="sm" />
          <View style={{ flex: 1 }}>
            <Text variant="sm" weight={700}>
              {t('console.people.profile.tr.pickup')}
            </Text>
            <Text variant="xs" color="muted">
              {tr.boarded_at
                ? t('console.people.profile.tr.boarded', { at: clock(tr.pickup_at), boarded: clock(tr.boarded_at) })
                : t('console.people.profile.tr.scheduled', { at: clock(tr.pickup_at) })}
            </Text>
          </View>
        </View>
        <View style={[styles.listItem, { borderTopWidth: 1, borderTopColor: colors.line }]}>
          <TileIcon icon="clock" tone={late ? 'warn' : 'neutral'} size="sm" />
          <View style={{ flex: 1 }}>
            <Text variant="sm" weight={700}>
              {t('console.people.profile.tr.drop', { at: clock(tr.drop_leaves) })}
            </Text>
            <Text variant="xs" color="muted">
              {t('console.people.profile.tr.eta', { at: clock(tr.drop_eta) })}
              {tr.drop?.eta ? (
                <Text variant="xs" weight={700} rawColor={late ? colors.warn : colors.ok}>
                  {` → ${t('console.people.profile.tr.live', { at: clock(tr.drop.eta) })}`}
                </Text>
              ) : null}
            </Text>
          </View>
        </View>
        {tr.driver ? (
          <View style={[styles.listItem, { borderTopWidth: 1, borderTopColor: colors.line }]}>
            <AvatarStack>
              {[
                <Avatar key="d" initials={tr.driver.initials} size="sm" tone={5} />,
                ...(tr.attendant ? [<Avatar key="a" initials={tr.attendant.initials} size="sm" tone={6} />] : []),
              ]}
            </AvatarStack>
            <View style={{ flex: 1 }}>
              <Text variant="sm" weight={700}>
                {t('console.people.profile.tr.driver', { name: tr.driver.name })}
              </Text>
              {tr.attendant ? (
                <Text variant="xs" color="muted">
                  {t('console.people.profile.tr.attendant', { name: tr.attendant.name })}
                </Text>
              ) : null}
            </View>
            <IconButton
              icon="phone"
              size="sm"
              label={t('console.people.profile.tr.call', { name: tr.driver.name })}
              onPress={() => void Linking.openURL(`tel:${tr.driver!.phone}`)}
            />
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="link"
        onPress={onTrack}
        style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.block,
          pointer,
          { borderColor: colors.lineStrong, backgroundColor: hovered ? colors.subtle : colors.surface, marginTop: 'auto' },
        ]}>
        <Icon name="pin" size={ICON_SIZE.sm} rawColor={colors.ink} />
        <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }}>{t('console.people.profile.tr.track')}</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  gridCell: { width: `${100 / 7}%`, paddingHorizontal: 3 },
  day: { height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  excRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  flag: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  intRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  block: { height: 32, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
