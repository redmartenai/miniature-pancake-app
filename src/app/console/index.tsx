import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { ApprovalItem, LeaveDetails } from '@/api/types';
import { Dumbbell } from '@/features/charts/Dumbbell';
import { MonthBlocks } from '@/features/charts/Stacked';
import { useConsoleQuery } from '@/features/console/api';
import { dashboardApi, type Dashboard } from '@/features/console/dashboard/api';
import { inrShort, num, salutation } from '@/features/console/format';
import { CardHead, Col, ConsolePage, Row } from '@/features/console/Page';
import { CoverSheet } from '@/features/principal/CoverSheet';
import { clockShort, formatDate, formatTime, monthName, relativeTime, weekdayName } from '@/lib/format';
import { useActiveSchool, useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  Avatar,
  Badge,
  Button,
  Card,
  HeatCell,
  heatLevel,
  Highlight,
  Icon,
  ICON_SIZE,
  Kicker,
  Link,
  Pill,
  Ribbon,
  RouteLine,
  Stamp,
  TearCal,
  Text,
  useToast,
  type RibbonCell,
} from '@/ui';

const GRADE_SHORT: Record<string, string> = { Nursery: 'Nur', LKG: 'LKG', UKG: 'UKG' };

/** PDashboard: the school today: briefing, register heat grid, cover, UT trend, in-tray, buses and fees. */
export default function ConsoleDashboard() {
  const { t } = useTranslation();
  const q = useConsoleQuery(['dashboard'], dashboardApi.get, { refetchInterval: 60_000 });
  const data = q.data;
  return (
    <ConsolePage title={t('console.shell.nav.dashboard')} head={<></>} gap={28} loading={q.isLoading} error={q.error} onRetry={q.refetch}>
      {data ? (
        <>
          <Row>
            <Col span={8}>
              <Briefing data={data} />
            </Col>
            <Col span={4}>
              <ComingUp data={data} />
            </Col>
          </Row>
          <Row align="stretch">
            <Col span={8}>
              <Register data={data} />
            </Col>
            <Col span={4}>
              <Cover data={data} />
            </Col>
          </Row>
          <Row>
            <Col span={6}>
              <UtTrend data={data} />
            </Col>
            <Col span={3}>
              <Intray data={data} />
            </Col>
            <Col span={3}>
              <Buses data={data} />
            </Col>
          </Row>
          <FeeBand data={data} />
        </>
      ) : null}
    </ConsolePage>
  );
}

function dayPart(d: Date): 'morning' | 'afternoon' | 'evening' {
  const h = d.getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

function Briefing({ data }: { data: Dashboard }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const name = useSession((s) => s.user?.full_name ?? '');
  const school = useActiveSchool();
  const now = new Date();
  const part = dayPart(now);
  const today = new Date(`${data.today}T00:00:00`);
  const tray = data.intray.total;
  const open = data.cover.open;
  const hl = { m: <Highlight color="mint" />, p: <Highlight color="pink" />, b: <Highlight /> };
  return (
    <View style={styles.briefing}>
      <TearCal month={monthName(today, true)} day={today.getDate()} dow={weekdayName(today)} />
      <View style={{ flex: 1, gap: 14, paddingTop: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, maxWidth: 560 }}>
          <Kicker>{t('console.dashboard.briefing', { part: t(`console.dashboard.part.${part}`), time: formatTime(now) })}</Kicker>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        </View>
        {data.register.total === 0 ? (
          <>
            <Text style={[styles.display, { color: colors.ink }]}>
              {t('console.dashboard.welcome', { school: school?.name ?? '', name: salutation(name) })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <Button
                title={t('console.dashboard.addStudents')}
                icon="userPlus"
                onPress={() => router.navigate('/console/students' as Href)}
              />
              <Button
                title={t('console.dashboard.addStaff')}
                icon="briefcase"
                variant="secondary"
                onPress={() => router.navigate('/console/staff' as Href)}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.display, { color: colors.ink }]}>
              {t(`console.dashboard.good.${part}`, { name: salutation(name) })}{' '}
              <Trans
                i18nKey="console.dashboard.inSchool"
                values={{ present: num(data.register.present), total: num(data.register.total) }}
                components={hl}
              />{' '}
              {tray ? (
                <Trans i18nKey="console.dashboard.tray" count={tray} values={{ count: tray }} components={hl} />
              ) : (
                t('console.dashboard.trayNone')
              )}
              {', '}
              {open ? (
                <Trans i18nKey="console.dashboard.cover" count={open} values={{ count: open }} components={hl} />
              ) : (
                t('console.dashboard.coverNone')
              )}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <Button title={t('console.dashboard.openTray')} onPress={() => router.navigate('/console/approvals' as Href)} />
              <Button
                title={t('console.dashboard.assignCover')}
                icon="clock"
                variant="secondary"
                onPress={() => router.navigate('/console/timetable' as Href)}
              />
              {data.next_exam ? (
                <Text variant="xs" color="muted" weight={600} style={{ marginLeft: 6 }}>
                  {t('console.dashboard.toExams', { count: data.next_exam.school_days })}
                </Text>
              ) : null}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function ComingUp({ data }: { data: Dashboard }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card pad={0} style={{ paddingVertical: 18, paddingHorizontal: 20, gap: 4 }}>
      <View style={[styles.between, { marginBottom: 6 }]}>
        <Text variant="h4" accessibilityRole="header">
          {t('console.dashboard.comingUp')}
        </Text>
        <Link icon={null} label={t('console.dashboard.calendar')} onPress={() => router.navigate('/console/communication' as Href)} />
      </View>
      {data.coming_up.length === 0 ? (
        <Text variant="xs" color="muted" style={{ paddingVertical: 10 }}>
          {t('console.dashboard.nothingComing')}
        </Text>
      ) : (
        data.coming_up.map((item, i) => {
          const d = new Date(`${item.date}T00:00:00`);
          let title = '';
          let sub = '';
          if (item.kind === 'fees') {
            title = item.title_term ? t('console.dashboard.feesDue', { term: item.title_term }) : t('console.dashboard.feesDueSimple');
            sub = item.outstanding_term
              ? t('console.dashboard.outstanding', { amount: inrShort(item.outstanding), term: item.outstanding_term })
              : t('console.dashboard.outstandingSimple', { amount: inrShort(item.outstanding) });
          } else if (item.kind === 'exam') {
            title = t('console.dashboard.examsBegin', { name: item.title });
            sub = t('console.dashboard.papers', { papers: item.papers, days: item.days });
          } else {
            title = item.title;
            sub = [
              item.ends
                ? t('console.dashboard.eventTime', { from: clockShort(item.starts), to: clockShort(item.ends) })
                : clockShort(item.starts),
              item.booked ? t('console.dashboard.slotsBooked', { count: item.booked }) : '',
            ]
              .filter(Boolean)
              .join(' · ');
          }
          return (
            <View key={`${item.kind}${item.date}`} style={[styles.comingRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
              <TearCal size="sm" month={monthName(d, true)} day={d.getDate()} dow={weekdayName(d, true)} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="sm" weight={700} numberOfLines={1}>
                  {title}
                </Text>
                <Text variant="xs" color="muted" numberOfLines={1}>
                  {sub}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </Card>
  );
}

function Register({ data }: { data: Dashboard }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const reg = data.register;
  const call = reg.call;
  const lowest = Object.values(reg.cells)
    .filter((c) => c.percent != null && c.percent < 90)
    .sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0))
    .map((c) => `${c.label} ${Math.round(c.percent ?? 0)}%`);
  const lastMarked = reg.last_marked_at ? formatTime(reg.last_marked_at) : '';
  const hx = (level: 0 | 1 | 2 | 3) => ({ 3: colors.hx3, 2: colors.hx2, 1: colors.hx1, 0: colors.badSoft })[level];
  const legend: { level: 0 | 1 | 2 | 3; label: string }[] = [
    { level: 3, label: t('console.dashboard.legend97') },
    { level: 2, label: t('console.dashboard.legend94') },
    { level: 1, label: t('console.dashboard.legend90') },
    { level: 0, label: t('console.dashboard.legendLow') },
  ];
  const chronic = call ? call.chronic_in_sections || call.chronic : 0;
  return (
    <Card pad={22} style={{ gap: 16, flex: 1 }}>
      <CardHead
        title={t('console.dashboard.register')}
        subtitle={
          reg.sections_marked === 0
            ? t('console.dashboard.noRegisters')
            : reg.sections_marked >= reg.sections && lastMarked
              ? t('console.dashboard.registerSub', { marked: reg.sections_marked, time: lastMarked })
              : t('console.dashboard.registerSubPartial', { marked: reg.sections_marked, total: reg.sections })
        }
        right={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {legend.map((l) => (
              <View key={l.level} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    backgroundColor: hx(l.level),
                    boxShadow: l.level === 0 ? `inset 0 0 0 1.5px ${colors.bad}` : undefined,
                  }}
                />
                <Text style={[styles.legend, { color: colors.muted }]}>{l.label}</Text>
              </View>
            ))}
          </View>
        }
      />
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('console.dashboard.registerLabel', {
          list: lowest.length ? t('console.dashboard.lowestList', { list: lowest.join(', ') }) : '',
        })}
        style={{ gap: 5 }}>
        <View style={styles.gridRow}>
          <View style={{ width: 22 }} />
          {reg.grades.map((g) => (
            <Text key={g} style={[styles.gradeHead, { color: colors.muted }]}>
              {GRADE_SHORT[g] ?? g}
            </Text>
          ))}
        </View>
        {reg.letters.map((letter) => (
          <View key={letter} style={styles.gridRow}>
            <Text variant="xs" color="muted" weight={700} style={{ width: 22 }}>
              {letter}
            </Text>
            {reg.grades.map((g) => {
              const cell = reg.cells[`${g}|${letter}`];
              return <HeatCell key={g} value={cell?.percent ?? null} level={heatLevel(cell?.percent)} height={40} />;
            })}
          </View>
        ))}
      </View>
      <View style={[styles.callRow, { borderTopColor: colors.lineStrong }]}>
        {call ? (
          <>
            <Stamp tone="bad" rotate={-4}>
              {t('console.dashboard.callToday')}
            </Stamp>
            <Text variant="sm" color="ink2" style={{ flex: 1 }}>
              {call.from_percent != null && call.from_date && call.from_percent > call.percent ? (
                <Trans
                  i18nKey="console.dashboard.slipped"
                  values={{
                    section: call.section,
                    from: Math.round(call.from_percent),
                    to: Math.round(call.percent),
                    date: formatDate(call.from_date),
                  }}
                  components={{ b: <Text variant="sm" weight={700} color="ink" /> }}
                />
              ) : (
                <Trans
                  i18nKey="console.dashboard.isAt"
                  values={{ section: call.section, pct: Math.round(call.percent) }}
                  components={{ b: <Text variant="sm" weight={700} color="ink" /> }}
                />
              )}
              {call.also[0] ? (
                <Trans
                  i18nKey="console.dashboard.alsoAt"
                  values={{ section: call.also[0].label, pct: Math.round(call.also[0].percent) }}
                  components={{ b: <Text variant="sm" weight={700} color="ink" /> }}
                />
              ) : null}
              {'. '}
              {call.chronic_in_sections
                ? t('console.dashboard.chronicBoth', { count: call.chronic_in_sections })
                : call.chronic
                  ? t('console.dashboard.chronicAll', { count: call.chronic })
                  : ''}
            </Text>
            <Button
              title={chronic ? t('console.dashboard.seeThe', { count: chronic }) : t('console.shell.nav.attendance')}
              icon="phone"
              variant="secondary"
              size="sm"
              onPress={() => router.navigate('/console/attendance' as Href)}
            />
          </>
        ) : (
          <Text variant="sm" color="ink2">
            {reg.sections_marked ? t('console.dashboard.allFine') : t('console.dashboard.noRegisters')}
          </Text>
        )}
      </View>
    </Card>
  );
}

function Cover({ data }: { data: Dashboard }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const schoolId = useSession((s) => s.schoolId);
  const board = useQuery({ queryKey: ['cover', schoolId], queryFn: api.coverBoard, enabled: open });
  const c = data.cover;
  const cells: RibbonCell[] = [];
  let prevEnd: string | null = null;
  for (const p of c.periods) {
    if (prevEnd && p.starts_at > prevEnd) cells.push({ kind: 'break' });
    const gap = p.open > 0 && p.state !== 'done';
    cells.push({
      kind: 'period',
      state: gap ? 'gap' : p.state === 'now' ? 'now' : p.state === 'done' ? 'done' : 'todo',
      label: `P${p.period}`,
    });
    prevEnd = p.ends_at;
  }
  const names = c.on_leave;
  return (
    <Card pad={22} style={{ gap: 14, flex: 1 }}>
      <CardHead
        title={t('console.dashboard.coverToday')}
        right={
          c.open ? (
            <Pill tone="bad" label={t('console.dashboard.open', { count: c.open })} />
          ) : names.length && !c.missed ? (
            <Pill tone="ok" label={t('console.dashboard.allCovered')} />
          ) : null
        }
      />
      <Text variant="xs" color="muted" style={{ marginTop: -8 }}>
        {names.length
          ? t('console.dashboard.onLeave', {
              count: names.length,
              names: names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0],
            })
          : t('console.dashboard.nobodyOnLeave')}
      </Text>
      {cells.length ? (
        <Ribbon
          cells={cells}
          height={30}
          labelColor={(cell) => (cell.kind === 'period' && cell.state === 'gap' ? colors.bad : undefined)}
          accessibilityLabel={t('console.dashboard.ribbonLabel', {
            list: c.periods.map((p) => `P${p.period} ${p.open && p.state !== 'done' ? p.open : '✓'}`).join(', '),
          })}
        />
      ) : null}
      {c.open_rows.length ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
          {c.open_rows.map((row, i) => (
            <View key={row.period} style={[styles.coverRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
              <Text variant="xs" weight={800} color="bad" num style={{ width: 52 }}>
                {row.now ? t('console.dashboard.pNow', { period: row.period }) : `P${row.period} ${clockShort(row.starts_at)}`}
              </Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="sm" weight={700}>
                  {row.classes.join(' · ')}
                </Text>
                <Text variant="xs" color="muted">
                  {row.free.length ? t('console.dashboard.free', { names: row.free.join(', ') }) : t('console.dashboard.noneFree')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {c.placed.length ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="check" size={ICON_SIZE.sm} color="ok" />
          <Text variant="xs" color="muted">
            {t('console.dashboard.placed', { count: c.placed.length, periods: c.placed.map((p) => `P${p}`).join(', ') })}
          </Text>
        </View>
      ) : null}
      {c.missed ? (
        <Text variant="xs" color="muted">
          {t('console.dashboard.missed', { count: c.missed })}
        </Text>
      ) : null}
      {names.length ? (
        <Button
          title={c.open ? t('console.dashboard.assign', { count: c.open }) : t('console.dashboard.openBoard')}
          variant="secondary"
          size="sm"
          style={{ alignSelf: 'flex-start' }}
          onPress={() => setOpen(true)}
        />
      ) : null}
      {board.data ? <CoverSheet board={board.data} visible={open} onClose={() => setOpen(false)} /> : null}
    </Card>
  );
}

function UtTrend({ data }: { data: Dashboard }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const ex = data.exams;
  if (!ex) {
    return (
      <Card pad={22} style={{ gap: 12 }}>
        <CardHead title={t('console.shell.nav.exams')} />
        <Text variant="sm" color="muted">
          {t('console.dashboard.noExams')}
        </Text>
      </Card>
    );
  }
  const values = ex.rows.flatMap((r) => [r.from, r.to]);
  const min = Math.max(0, Math.floor((Math.min(...values) - 1) / 5) * 5);
  const max = Math.min(100, Math.ceil((Math.max(...values) + 3) / 5) * 5);
  const pts = (d: number) => t('console.dashboard.pts', { sign: d > 0 ? '+' : '−', value: Math.abs(Math.round(d)) });
  const up = ex.rows.filter((r) => r.to > r.from).length;
  const rows = ex.rows.map((r) => {
    const isDown = ex.down?.grade === r.grade;
    const isUp = ex.up?.grade === r.grade;
    return {
      label: t('console.dashboard.grade', { grade: r.grade }),
      from: r.from,
      to: r.to,
      color: isDown ? colors.bad : colors.c1,
      labelColor: isDown ? colors.bad : undefined,
      highlight: isDown,
      note: isDown || isUp ? pts(r.to - r.from) : undefined,
    };
  });
  return (
    <Card pad={22} style={{ gap: 12 }}>
      <CardHead
        title={t('console.dashboard.ut', { from: ex.from_exam, to: ex.to_exam })}
        subtitle={t('console.dashboard.utSub', { from: ex.from_avg ?? '–', to: ex.to_avg ?? '–' })}
        right={
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={styles.legendItem}>
              <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.c1 }} />
              <Text variant="xs" color="ink2" weight={600}>
                {ex.from_exam.replace('Unit Test ', 'UT')}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.c1 }} />
              <Text variant="xs" color="ink2" weight={600}>
                {ex.to_exam.replace('Unit Test ', 'UT')}
              </Text>
            </View>
          </View>
        }
      />
      <Dumbbell
        rows={rows}
        labelWidth={70}
        rowHeight={18.5}
        min={min}
        max={max}
        step={5}
        formatTick={(v) => `${v}%`}
        accessibilityLabel={t('console.dashboard.utLabel', {
          from: ex.from_exam,
          to: ex.to_exam,
          summary: t('console.dashboard.improved', { up, total: ex.rows.length }),
        })}
      />
      {ex.down ? (
        <Link
          label={
            ex.down.subject
              ? t('console.dashboard.fell', {
                  grade: ex.down.grade,
                  subject: ex.down.subject.name,
                  points: Math.abs(Math.round(ex.down.subject.delta)),
                })
              : t('console.dashboard.fellGrade', { grade: ex.down.grade, points: Math.abs(Math.round(ex.down.delta)) })
          }
          onPress={() => router.navigate('/console/exams' as Href)}
        />
      ) : null}
    </Card>
  );
}

function trayChip(item: ApprovalItem, t: (k: string, o?: Record<string, unknown>) => string): string {
  const kind = t(`console.dashboard.kind.${item.kind}`);
  if (item.kind === 'leave') {
    const d = item.details as LeaveDetails;
    return `${kind} · ${t('console.dashboard.days', { count: d.days })}`;
  }
  const last = item.summary.split(' · ').pop();
  return last && last !== item.summary ? `${kind} · ${last}` : kind;
}

function trayLine(item: ApprovalItem): { sub: string; quote: string } {
  const d = item.details as unknown as Record<string, unknown>;
  if (item.kind === 'leave') {
    const l = item.details as LeaveDetails;
    const from = formatDate(l.from_date);
    const to = formatDate(l.to_date);
    return { sub: [l.person.subject, from === to ? from : `${from.split(' ')[0]}–${to}`].filter(Boolean).join(' · '), quote: l.reason };
  }
  return { sub: item.summary, quote: String(d.reason ?? '') };
}

function Intray({ data }: { data: Dashboard }) {
  const { t } = useTranslation();
  const toast = useToast();
  const client = useQueryClient();
  const top = data.intray.top;
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve' | 'decline' }) => api.decideApproval(id, decision),
    onSuccess: (item) => {
      toast(t('console.dashboard.decided', { name: item.requested_by?.name ?? '', status: t(`console.dashboard.status.${item.status}`) }));
      void client.invalidateQueries({ queryKey: ['console'] });
      void client.invalidateQueries({ queryKey: ['approvals'] });
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });
  const line = top ? trayLine(top) : null;
  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.between, { paddingTop: 2 }]}>
        <Text variant="h3" accessibilityRole="header">
          {t('console.dashboard.intray')}
        </Text>
        {data.intray.total ? <Badge value={data.intray.total} tone="bad" /> : null}
      </View>
      {top && line ? (
        <Card pad={18} stack style={{ gap: 12, marginBottom: 14 }}>
          <View style={styles.between}>
            <Pill tone="info" dot={false} label={trayChip(top, t)} />
            <Text variant="xxs" color="muted" weight={600}>
              {t('console.dashboard.asked', { ago: relativeTime(top.created_at) })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar initials={top.requested_by?.initials ?? ''} tone={3} size={36} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="sm" weight={700} numberOfLines={1}>
                {top.requested_by?.name ?? ''}
              </Text>
              <Text variant="xs" color="muted" numberOfLines={1}>
                {line.sub}
              </Text>
            </View>
          </View>
          {line.quote ? (
            <Text variant="sm" color="ink2" style={{ lineHeight: 20 }}>
              “{line.quote}”
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title={t('console.dashboard.approve')}
              icon="check"
              variant="ok"
              size="sm"
              style={{ flex: 1 }}
              loading={decide.isPending && decide.variables?.decision === 'approve'}
              onPress={() => decide.mutate({ id: top.id, decision: 'approve' })}
            />
            <Button
              title={t('console.dashboard.decline')}
              icon="close"
              variant="danger"
              size="sm"
              style={{ flex: 1 }}
              loading={decide.isPending && decide.variables?.decision === 'decline'}
              onPress={() => decide.mutate({ id: top.id, decision: 'decline' })}
            />
          </View>
        </Card>
      ) : (
        <Card variant="flat" pad={16}>
          <Text variant="sm" color="muted">
            {t('console.dashboard.trayEmpty')}
          </Text>
        </Card>
      )}
      {data.intray.total ? (
        <View style={{ gap: 7, paddingHorizontal: 4 }}>
          {data.intray.next.map((n, i) => (
            <Text key={n.id} variant="xs" color="muted" numberOfLines={1}>
              {i === 0 ? (
                <Text variant="xs" weight={700} color="ink2">
                  {t('console.dashboard.next')}{' '}
                </Text>
              ) : null}
              {n.name} · {n.summary}
            </Text>
          ))}
          <View style={{ marginTop: 4 }}>
            <Link
              label={t('console.dashboard.allRequests', { count: data.intray.total })}
              onPress={() => router.navigate('/console/approvals' as Href)}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Buses({ data }: { data: Dashboard }) {
  const { t } = useTranslation();
  const b = data.buses;
  const routes = b.routes.slice(0, 3);
  return (
    <Card pad={22} style={{ gap: 14 }}>
      <CardHead
        title={t('console.dashboard.buses')}
        right={
          b.total ? (
            <Text variant="xs" color="muted" weight={600}>
              {t('console.dashboard.busesOut', { out: b.out, total: b.total })}
            </Text>
          ) : null
        }
      />
      {routes.length === 0 ? (
        <Text variant="sm" color="muted">
          {t('console.dashboard.noBuses')}
        </Text>
      ) : (
        <View style={{ gap: 14 }}>
          {routes.map((r) => {
            const n = Math.max(2, r.stops);
            const at = (i: number) => 0.04 + (i * 0.92) / (n - 1);
            const pos = Math.min(n - 1, r.position);
            const busAt = r.state === 'late' || r.state === 'waiting' ? at(0) + 0.06 : at(Math.floor(pos)) + (pos % 1) * (0.92 / (n - 1));
            return (
              <View key={r.route_id} style={{ gap: 2 }}>
                <View style={styles.between}>
                  <Text variant="sm" weight={700}>
                    {r.route}
                  </Text>
                  {r.state === 'late' ? (
                    <Pill tone="warn" label={t('console.dashboard.late', { count: r.delay_minutes })} />
                  ) : r.state === 'done' ? (
                    <Text variant="xs" color="muted" weight={700}>
                      {t('console.dashboard.arrived')}
                    </Text>
                  ) : (
                    <Text variant="xs" color="ok" weight={700}>
                      {t('console.dashboard.onTime')}
                    </Text>
                  )}
                </View>
                <RouteLine
                  stops={Array.from({ length: n }, (_x, i) => ({ at: at(i), kind: i < r.passed ? 'past' : 'stop' }))}
                  progress={r.state === 'done' ? 1 : r.passed ? at(Math.max(0, r.passed - 1)) : 0.04}
                  bus={r.state === 'done' ? undefined : busAt}
                  busTone={r.state === 'late' ? 'warn' : 'brand'}
                />
                {r.state === 'late' || r.state === 'waiting' ? (
                  <Text variant="xxs" color="muted">
                    {r.state === 'late'
                      ? t('console.dashboard.atSchool', { time: clockShort(r.leaves_at) })
                      : t('console.dashboard.waiting', { time: clockShort(r.leaves_at) })}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
      <Button
        title={t('console.dashboard.liveMap')}
        variant="secondary"
        size="sm"
        fullWidth
        onPress={() => router.navigate('/console/transport' as Href)}
      />
    </Card>
  );
}

function FeeBand({ data }: { data: Dashboard }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = data.fees;
  const billed = Number(f.billed);
  const collected = Number(f.collected);
  const target = f.target ? (billed * f.target.percent) / 100 : undefined;
  // Months with payments; the biggest one gets its amount under the bar, like the first.
  const months = f.months.map((m) => ({ ...m, value: Number(m.amount) }));
  const biggest = months.reduce((a, m, i) => (m.value > (months[a]?.value ?? 0) ? i : a), 0);
  const blocks = months.map((m, i) => ({
    value: m.value,
    label:
      i === 0 || i === biggest
        ? `${monthName(`${m.month}-01`, true)} ${inrShort(m.value)}`
        : m.month === f.current_month
          ? ''
          : monthName(`${m.month}-01`, true),
    strong: i === biggest && i !== 0,
  }));
  // Money collected without a dated payment still counts towards the bar.
  const unattributed = collected - months.reduce((a, m) => a + m.value, 0);
  if (unattributed > 0.5) blocks.unshift({ value: unattributed, label: '', strong: false });
  const current = months.find((m) => m.month === f.current_month);
  return (
    <Card pastel="butter" pad={0}>
      <View style={styles.band}>
        <View style={{ width: 250 }}>
          <Text variant="sm" weight={700} rawColor={colors.pButterInk}>
            {f.term ? t('console.dashboard.feeCollection', { term: f.term }) : t('console.dashboard.feeCollectionSimple')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
            <Text variant="kpi">{inrShort(collected)}</Text>
            <Text variant="sm" color="muted">
              {t('console.dashboard.ofTotal', { total: inrShort(billed) })}
            </Text>
          </View>
        </View>
        <View
          style={{ flex: 1, minWidth: 0, gap: 8 }}
          accessible
          accessibilityLabel={t('console.dashboard.feeLabel', {
            collected: inrShort(collected),
            billed: inrShort(billed),
            target: target ? inrShort(target) : '–',
          })}>
          <MonthBlocks
            blocks={blocks}
            total={billed}
            target={target}
            targetLabel={
              target && f.target.by ? t('console.dashboard.target', { date: formatDate(f.target.by), amount: inrShort(target) }) : undefined
            }
          />
          <Text variant="xxs" color="muted">
            {current
              ? t('console.dashboard.blocksNote', { month: monthName(`${current.month}-01`), amount: inrShort(current.value) })
              : t('console.dashboard.blocksNoteNone')}
          </Text>
        </View>
        <View style={{ width: 230, gap: 8, alignItems: 'flex-start' }}>
          <Text variant="sm" color="ink2">
            {Number(f.overdue) > 0 ? (
              <Trans
                i18nKey="console.dashboard.overdueFamilies"
                count={f.overdue_families}
                values={{ amount: inrShort(f.overdue), count: f.overdue_families }}
                components={{ b: <Text variant="sm" weight={800} color="bad" /> }}
              />
            ) : (
              t('console.dashboard.noOverdue')
            )}
          </Text>
          <Button
            title={t('console.dashboard.sendReminders')}
            icon="send"
            variant="secondary"
            size="sm"
            onPress={() => router.navigate('/console/fees' as Href)}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  briefing: { flexDirection: 'row', gap: 28, alignItems: 'flex-start', paddingTop: 6 },
  display: { fontFamily: fonts.displayMedium, fontSize: 29, lineHeight: 38, letterSpacing: -0.64, maxWidth: 660 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  comingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  legend: { fontFamily: fonts.semibold, fontSize: 11 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  gradeHead: { flex: 1, minWidth: 0, textAlign: 'center', fontFamily: fonts.bold, fontSize: 11 },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderStyle: 'dashed' },
  coverRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 11 },
  band: { flexDirection: 'row', alignItems: 'center', gap: 32, paddingVertical: 22, paddingHorizontal: 24 },
});
