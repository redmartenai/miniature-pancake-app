import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { PrincipalPulse } from '@/api/types';
import { useRefetchOnFocus } from '@/features/common/useRefetchOnFocus';
import { useUnread } from '@/features/common/useUnread';
import { ApprovalCard } from '@/features/principal/ApprovalCard';
import { CoverSheet } from '@/features/principal/CoverSheet';
import { WEB_URL } from '@/lib/config';
import { clockShort, formatClock, formatDate, formatTime, joinNames, monthName, weekdayName } from '@/lib/format';
import { useActiveSchool, useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  AppBar,
  Avatar,
  Button,
  Card,
  Delta,
  ErrorState,
  HeatCell,
  heatLevel,
  Highlight,
  Icon,
  ICON_SIZE,
  IconButton,
  Kicker,
  Link,
  LoadingCards,
  Pill,
  pointer,
  Ribbon,
  RouteLine,
  Screen,
  SectionHead,
  TearCal,
  Text,
  ThemeToggle,
  useToast,
  type RibbonCell,
} from '@/ui';

const GRADE_SHORT: Record<string, string> = { Nursery: 'Nur', LKG: 'LKG', UKG: 'UKG' };

/** "Dr. Anita Rao" → "Dr. Rao"; "Anita Rao" → "Anita". */
function salutation(name: string): string {
  const title = /^(Dr|Mr|Ms|Mrs)\.?\s+/i.exec(name);
  const parts = name.replace(/^(Dr|Mr|Ms|Mrs)\.?\s+/i, '').split(' ');
  return title ? `${title[1]}. ${parts[parts.length - 1]}` : parts[0];
}

/** PMHome ("Pulse"): the school in one screen: who's in, who needs cover, what waits on the principal. */
export default function PrincipalPulseScreen() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const school = useActiveSchool();
  const unread = useUnread();
  const pulse = useQuery({ queryKey: ['pulse'], queryFn: api.pulse, refetchInterval: 60_000 });
  useRefetchOnFocus(pulse.refetch);
  const data = pulse.data;

  return (
    <Screen
      dock
      gap={20}
      refreshing={pulse.isRefetching}
      onRefresh={pulse.refetch}
      header={
        <AppBar
          left={<Avatar initials={user?.initials ?? ''} size="md" tone={1} />}
          subtitle={t('principal.pulse.kicker', { name: user?.full_name ?? '' })}
          title={t('principal.pulse.title', { school: school?.short_name ?? '' })}
          titleVariant="h2"
          theme={false}
          actions={
            <>
              <ThemeToggle />
              <IconButton icon="bell" size="lg" ping={unread.notifications > 0} label={t('parent.home.notifications', { count: unread.notifications })} onPress={() => router.push('/notifications')} />
            </>
          }
        />
      }>
      {pulse.error ? <ErrorState error={pulse.error} onRetry={pulse.refetch} /> : null}
      {!data ? <LoadingCards count={4} /> : null}
      {data ? (
        <>
          <Briefing data={data} name={user?.full_name ?? ''} />
          <Register data={data} />
          <Cover data={data} />
          <Intray data={data} />
          {data.transport ? <Transport data={data} /> : null}
          <Term data={data} />
          <WebHandoff />
        </>
      ) : null}
    </Screen>
  );
}

function Briefing({ data, name }: { data: PrincipalPulse; name: string }) {
  const { t } = useTranslation();
  const now = new Date();
  const hour = now.getHours();
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const reg = data.register;
  const open = data.cover.open;
  const tray = data.intray.total;
  const key = tray && open ? 'both' : tray ? 'tray' : open ? 'cover' : 'clear';
  return (
    <View style={{ gap: 14, paddingTop: 4 }}>
      <Kicker>{t('principal.pulse.briefing', { part: t(`staff.home.${part}`), time: formatTime(now) })}</Kicker>
      <View style={[styles.row, { gap: 16, alignItems: 'flex-start' }]}>
        <TearCal month={monthName(data.now.slice(0, 10), true)} day={now.getDate()} dow={weekdayName(now)} />
        <Text style={styles.sentence}>
          <Trans
            i18nKey={`principal.pulse.brief_${key}`}
            values={{
              greeting: t(`principal.pulse.good_${part}`, { name: salutation(name) }),
              present: reg.present.toLocaleString('en-IN'),
              total: reg.total.toLocaleString('en-IN'),
              requests: t('principal.pulse.requests', { count: tray }),
              periods: t('principal.pulse.periods', { count: open }),
            }}
            components={{ m: <Highlight color="mint" />, p: <Highlight color="pink" />, b: <Highlight /> }}
          />
        </Text>
      </View>
      <View style={[styles.row, { gap: 12 }]}>
        <Button title={t('principal.pulse.openTray')} height={44} onPress={() => router.push('/principal/approvals')} style={{ flex: 1 }} />
        <Text variant="xs" color="muted" weight={600} style={{ flex: 1 }}>
          {data.next_exam ? t('principal.pulse.toExam', { count: data.next_exam.school_days, exam: data.next_exam.name.toLowerCase() }) : ''}
        </Text>
      </View>
    </View>
  );
}

function Register({ data }: { data: PrincipalPulse }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const grades = data.register.by_grade;
  const low = data.lowest;
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push('/principal/attendance')} style={[{ gap: 10 }, pointer]}>
      <Kicker>{t('principal.pulse.register')}</Kicker>
      <View
        accessible
        accessibilityLabel={t('principal.pulse.registerLabel', { list: grades.map((g) => `${g.grade} ${Math.round(g.percent ?? 0)}`).join(', ') })}
        style={{ gap: 6 }}>
        <View style={[styles.row, { gap: 3 }]}>
          {grades.map((g) => (
            <HeatCell
              key={g.grade}
              value={g.percent}
              level={heatLevel(g.percent)}
              height={36}
              style={[{ borderRadius: 6 }, low?.grade === g.grade && { boxShadow: `0 0 0 2px ${colors.canvas}, 0 0 0 3.5px ${colors.bad}` }]}
            />
          ))}
        </View>
        <View style={[styles.row, { gap: 3 }]}>
          {grades.map((g) => (
            <Text key={g.grade} align="center" weight={700} rawColor={low?.grade === g.grade ? colors.bad : colors.muted} style={{ flex: 1, fontSize: 9.5, lineHeight: 10 }}>
              {GRADE_SHORT[g.grade] ?? g.grade}
            </Text>
          ))}
        </View>
      </View>
      {low ? (
        <Text variant="sm" color="ink2" style={{ lineHeight: 21 }}>
          <Trans
            i18nKey={low.section && low.best_percent != null && low.best_date ? 'principal.pulse.lowestWhy' : 'principal.pulse.lowest'}
            values={{
              grade: low.grade,
              section: low.section ?? '',
              pct: Math.round(low.section_percent ?? low.percent),
              best: Math.round(low.best_percent ?? 0),
              date: low.best_date ? formatDate(low.best_date) : '',
            }}
            components={{ b: <Text variant="sm" weight={700} color="ink" /> }}
          />
          {data.chronic ? ` ${t('principal.pulse.chronic', { count: data.chronic })}` : ''}
        </Text>
      ) : null}
      {data.chronic ? <Link label={t('principal.pulse.seeChronic', { count: data.chronic })} onPress={() => router.push('/principal/attendance')} /> : null}
    </Pressable>
  );
}

function Cover({ data }: { data: PrincipalPulse }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const board = data.cover;
  if (!board.on_leave.length) return null;
  const cells: RibbonCell[] = [];
  let prevEnd: string | null = null;
  for (const p of board.periods) {
    if (prevEnd && p.starts_at > prevEnd) cells.push({ kind: 'break' });
    const gap = p.open > 0 && p.state !== 'done';
    cells.push({ kind: 'period', state: gap ? 'gap' : p.state === 'now' ? 'now' : p.state === 'done' ? 'done' : 'todo', label: `P${p.period}` });
    prevEnd = p.ends_at;
  }
  const openPeriods = board.periods.filter((p) => p.open > 0 && p.state !== 'done');
  return (
    <Card pad={16} style={{ gap: 12 }}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text variant="h3">{t('principal.cover.today')}</Text>
        {board.open ? <Pill label={t('principal.cover.open', { count: board.open })} tone="bad" /> : <Pill label={t('principal.cover.allDone')} tone="ok" />}
      </View>
      <Text variant="xs" color="muted" style={{ marginTop: -6 }}>
        {t('principal.cover.onLeave', { names: joinNames(board.on_leave.map((l) => l.name)), count: board.on_leave.length })}
      </Text>
      <Ribbon cells={cells} height={28} labelColor={(c) => (c.kind === 'period' && c.state === 'gap' ? colors.bad : undefined)} />
      {openPeriods.length ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
          {openPeriods.map((p, i) => (
            <View key={p.period} style={[styles.row, { paddingVertical: 11, alignItems: 'flex-start', gap: 8 }, i < openPeriods.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
              <Text variant="xs" weight={800} color="bad" num style={{ width: 54 }}>
                {p.state === 'now' ? t('principal.cover.pNow', { period: p.period }) : `P${p.period} ${clockShort(p.starts_at)}`}
              </Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="sm" weight={700}>
                  {p.slots.filter((s) => !s.covered_by).map((s) => `${s.class} ${s.subject === 'Physical Education' ? 'PE' : s.subject}`).join(' · ')}
                </Text>
                <Text variant="xs" color="muted" numberOfLines={1}>
                  {p.free.length ? t('principal.cover.free', { names: p.free.slice(0, 3).map((f) => f.name).join(', ') }) : t('principal.cover.nobodyFree')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {board.open ? <Button title={t('principal.cover.assign', { count: board.open })} variant="secondary" height={44} fullWidth onPress={() => setOpen(true)} /> : null}
      <CoverSheet board={board} visible={open} onClose={() => setOpen(false)} />
    </Card>
  );
}

function Intray({ data }: { data: PrincipalPulse }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const top = data.intray.top;
  return (
    <View style={{ gap: 12 }}>
      <SectionHead
        title={t('principal.pulse.intray')}
        action={data.intray.total ? <Link label={t('principal.pulse.all', { count: data.intray.total })} onPress={() => router.push('/principal/approvals')} /> : undefined}
      />
      {top ? (
        <ApprovalCard item={top} variant="pulse" />
      ) : (
        <Card variant="flat" pad={16}>
          <Text variant="sm" color="muted">
            {t('principal.pulse.trayEmpty')}
          </Text>
        </Card>
      )}
      {data.intray.next.length ? (
        <View style={{ gap: 6, paddingHorizontal: 4 }}>
          {data.intray.next.map((n, i) => (
            <Text key={n.id} variant="xs" color="muted">
              {i === 0 ? (
                <Text variant="xs" weight={700} rawColor={colors.ink2}>
                  {t('principal.pulse.next')}{' '}
                </Text>
              ) : null}
              {`${n.name} · ${n.summary}`}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Transport({ data }: { data: PrincipalPulse }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tr = data.transport!;
  const late = tr.delay_minutes > 0;
  const stops = tr.stops.slice(0, 6);
  const done = tr.status === 'completed';
  const past = tr.stops.filter((s) => s.status === 'departed' || s.status === 'skipped').length;
  return (
    <Card
      pad={16}
      style={{ gap: 10 }}
      onPress={() => router.push({ pathname: '/principal/broadcast', params: { preset: 'route', routeId: tr.route_id, route: tr.route, delay: String(tr.delay_minutes), leaves: tr.leaves_at } })}
      accessibilityLabel={t('principal.transport.label', { route: tr.route, count: tr.delay_minutes })}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text variant="sm" weight={700}>
          {t('principal.transport.title', { route: tr.route, run: t(`principal.transport.${tr.direction}`) })}
        </Text>
        {done ? (
          <Pill label={t('principal.transport.done')} tone="ok" />
        ) : late ? (
          <Pill label={t('principal.transport.late', { count: tr.delay_minutes })} tone="warn" />
        ) : (
          <Pill label={t('principal.transport.onTime')} tone="ok" />
        )}
      </View>
      <RouteLine
        stops={stops.map((_s, i) => ({ at: 0.04 + (i * 0.92) / Math.max(1, stops.length - 1), kind: i < Math.max(1, past) ? 'past' : 'stop' }))}
        progress={past / Math.max(1, stops.length)}
        bus={0.08 + (past * 0.88) / Math.max(1, stops.length)}
        busTone={late ? 'warn' : 'brand'}
      />
      <View style={[styles.row, { justifyContent: 'space-between', gap: 10 }]}>
        <Text variant="xs" color="muted" weight={600}>
          {tr.status === 'scheduled' ? t('principal.transport.atSchool', { time: formatClock(tr.leaves_at) }) : tr.status === 'active' ? t('principal.transport.onRoad') : t('principal.transport.finished')}
        </Text>
        {late && !done ? (
          <Text variant="xs" weight={700} rawColor={colors.brandInk}>
            {t('principal.transport.tell')}
          </Text>
        ) : null}
      </View>
      <Text variant="xxs" color="muted" weight={600} style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
        {[t('principal.transport.out', { out: tr.buses_out, total: tr.buses_total }), tr.idle_vehicle ? t('principal.transport.idle', { bus: tr.idle_vehicle }) : null].filter(Boolean).join(' · ')}
      </Text>
    </Card>
  );
}

const crore = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` : `₹${Math.round(n).toLocaleString('en-IN')}`);

function Term({ data }: { data: PrincipalPulse }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = data.fees;
  const e = data.exams;
  const pct = f.percent ?? 0;
  const target = f.target?.percent ?? 90;
  const delta = e && e.previous != null && e.average != null ? Math.round((e.average - e.previous) * 10) / 10 : null;
  return (
    <View style={{ gap: 4 }}>
      <Kicker style={{ marginBottom: 8 }}>{t('principal.pulse.termSoFar', { term: f.term ?? t('principal.pulse.thisTerm') })}</Kicker>
      <View style={{ gap: 8, paddingTop: 4, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'baseline' }]}>
          <Text variant="sm">
            <Text variant="sm" weight={700}>
              {crore(Number(f.collected))}
            </Text>{' '}
            <Text variant="sm" color="muted">
              {t('principal.pulse.ofFees', { total: crore(Number(f.billed)) })}
            </Text>
          </Text>
          {Number(f.overdue) > 0 ? (
            <Text variant="xs" weight={700} color="bad" num>
              {t('principal.pulse.overdue', { amount: crore(Number(f.overdue)) })}
            </Text>
          ) : null}
        </View>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('principal.pulse.feeLabel', { pct, target })}
          style={{ height: 10, borderRadius: 5, backgroundColor: colors.pButter }}>
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(100, pct)}%`, borderRadius: 5, backgroundColor: colors.pButterInk }} />
          <View style={{ position: 'absolute', left: `${target}%`, top: -4, bottom: -4, width: 2, borderRadius: 1, backgroundColor: colors.ink }} />
        </View>
        <Text variant="xxs" color="muted" weight={600}>
          {t('principal.pulse.feeLine', { pct, target, date: f.target?.by ? formatDate(f.target.by) : '' })}
        </Text>
      </View>
      {e && e.average != null ? (
        <View style={[styles.row, { gap: 12, paddingTop: 12, alignItems: 'flex-start' }]}>
          <Text variant="sm" style={{ flex: 1, lineHeight: 21 }}>
            <Trans
              i18nKey={e.previous == null ? 'principal.pulse.examLineOnly' : e.average >= e.previous ? 'principal.pulse.examLineUp' : 'principal.pulse.examLineDown'}
              values={{ exam: e.exam, avg: e.average, prev: e.previous ?? '' }}
              components={{ b: <Text variant="sm" weight={700} /> }}
            />
            {e.lowest_grade && e.lowest != null ? (
              <Text variant="sm" color="muted">
                {' '}
                {t('principal.pulse.examLow', { grade: e.lowest_grade, pct: Math.round(e.lowest) })}
              </Text>
            ) : null}
          </Text>
          {delta !== null ? <Delta value={String(Math.abs(delta))} direction={delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function WebHandoff() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const go = () => {
    if (Platform.OS === 'web') router.push('/console' as never);
    else if (WEB_URL) void Linking.openURL(`${WEB_URL}/console`);
    else toast(t('principal.pulse.webHint'));
  };
  return (
    <Pressable accessibilityRole="link" onPress={go} style={[styles.row, styles.handoff, { borderColor: colors.lineStrong }, pointer]}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text variant="sm" weight={700}>
          {t('principal.pulse.web')}
        </Text>
        <Text variant="xs" color="muted">
          {t('principal.pulse.webSub')}
        </Text>
      </View>
      <Icon name="arrowUpRight" size={ICON_SIZE.md} rawColor={colors.ink2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  sentence: { flex: 1, minWidth: 0, fontFamily: fonts.displayMedium, fontSize: 19, lineHeight: 26, letterSpacing: -0.3 },
  handoff: { gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', minHeight: 44 },
});

