import type { TFunction } from 'i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { CardHead, Col, ConsolePage, Row } from '@/features/console/Page';
import { DataTable } from '@/features/console/Table';
import { downloadFile } from '@/lib/download';
import { relativeTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  Avatar,
  AvatarStack,
  Badge,
  Bar,
  Button,
  Card,
  Hr,
  IconButton,
  Link,
  Pill,
  pointer,
  Search,
  Text,
  TextField,
  TileIcon,
  useToast,
  type IconName,
  type PillTone,
  type TileTone,
} from '@/ui';

import { peopleApi, useStaff, type LeaveRequest, type StaffPage as Payload, type StaffRow } from './api';
import { Choice, clock, dayMonth, Dialog, errorText, FilterButton, Popover, ToolbarButton } from './kit';
import { gradeName } from './StudentsPage';

type TabKey = 'teaching' | 'support';

/** Console: staff (PStaff). */
export function StaffPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const params = useLocalSearchParams<{ person?: string }>();
  const [tab, setTab] = useState<TabKey>('teaching');
  const [typed, setTyped] = useState('');
  const [f, setF] = useState({ q: '', subject: '', today: '', page: 1, sort: '' });
  const [person, setPerson] = useState<string | undefined>(params.person);
  const [detail, setDetail] = useState<StaffRow | null>(null);
  const [deciding, setDeciding] = useState<LeaveRequest | null>(null);
  const [vacancies, setVacancies] = useState(false);
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const query = useStaff({ tab, ...f, person });
  const data = query.data;

  useEffect(() => setPerson(params.person), [params.person]);
  useEffect(() => {
    const id = setTimeout(() => setF((cur) => (cur.q === typed.trim() ? cur : { ...cur, q: typed.trim(), page: 1 })), 300);
    return () => clearTimeout(id);
  }, [typed]);
  // ?person= jumps to the right tab and page; open that person once the page arrives.
  useEffect(() => {
    if (!data || !person) return;
    if (data.tab !== tab) setTab(data.tab);
    if (data.page !== f.page) setF((cur) => ({ ...cur, page: data.page }));
    const row = data.items.find((r) => r.id === data.highlight);
    if (row) setDetail(row);
    setPerson(undefined);
  }, [data, person, tab, f.page]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const qs = new URLSearchParams({
        tab,
        ...(f.q ? { q: f.q } : {}),
        ...(f.subject ? { subject: f.subject } : {}),
        ...(f.today ? { today: f.today } : {}),
      });
      await downloadFile(`/console/staff/export?${qs.toString()}`, `staff-${tab}-${new Date().toISOString().slice(0, 10)}.csv`);
      toast(t('console.people.staff.exported'));
    } catch {
      toast(t('console.people.students.exportFailed'), 'danger');
    } finally {
      setExporting(false);
    }
  };

  const term = data?.summary.term;
  return (
    <ConsolePage
      title={t('console.people.staff.title')}
      crumbs={[{ label: t('console.people.crumb') }]}
      subtitle={
        data
          ? t('console.people.staff.subtitle', {
              total: data.summary.total,
              time: clock(data.summary.closes_at),
              term: term ? t('console.people.staff.term', { name: term.name, week: term.week }) : '',
            })
          : undefined
      }
      loading={query.isLoading}
      error={query.error}
      onRetry={query.refetch}
      gap={24}
      actions={
        <>
          <ToolbarButton icon="download" label={t('console.people.students.export')} onPress={exportCsv} busy={exporting} />
          <ToolbarButton icon="userPlus" label={t('console.people.staff.add')} primary onPress={() => setAdding(true)} />
        </>
      }>
      {data ? (
        <>
          <TabBar
            tab={tab}
            counts={data.counts}
            onChange={(k) => {
              setTab(k);
              setF((cur) => ({ ...cur, page: 1, subject: '', today: '' }));
            }}
          />
          <Kpis data={data} onVacancies={() => setVacancies(true)} />
          <Row gap={20}>
            <Col span={9}>
              <StaffTable data={data} typed={typed} setTyped={setTyped} f={f} setF={setF} onOpen={setDetail} />
            </Col>
            <Col span={3} gap={20}>
              <LeaveWeek data={data} />
              <LeaveRequests data={data} onOpen={setDeciding} />
              <Trend data={data} />
            </Col>
          </Row>
        </>
      ) : null}
      {detail ? <PersonDialog row={detail} onClose={() => setDetail(null)} /> : null}
      {deciding ? <DecideDialog req={deciding} onClose={() => setDeciding(null)} /> : null}
      {vacancies && data ? <VacanciesDialog data={data} onClose={() => setVacancies(false)} /> : null}
      <AddStaffDialog visible={adding} onClose={() => setAdding(false)} />
    </ConsolePage>
  );
}

function TabBar({ tab, counts, onChange }: { tab: TabKey; counts: Payload['counts']; onChange: (k: TabKey) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.tabs, { borderBottomColor: colors.line }]} accessibilityRole="tablist">
      {(['teaching', 'support'] as const).map((k) => {
        const on = k === tab;
        return (
          <Pressable
            key={k}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(k)}
            style={[styles.tab, pointer, { borderBottomColor: on ? colors.brand : 'transparent' }]}>
            <Text style={[styles.tabLabel, { color: on ? colors.ink : colors.muted }]}>{t(`console.people.staff.tab.${k}`)}</Text>
            <Pill label={String(counts[k])} dot={false} style={{ height: 22, paddingHorizontal: 8 }} />
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------ KPIs */

function Kpis({ data, onVacancies }: { data: Payload; onVacancies: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const k = data.kpis;
  const teaching = data.tab === 'teaching';
  return (
    <Row gap={20} align="stretch">
      <Col span={3} style={{ flexDirection: 'row' }}>
        <Card pastel="mint" pad={22} style={{ gap: 14, flex: 1 }}>
          <KpiHead title={t('console.people.staff.kpi.present')} icon="checkCircle" tone="ok" />
          <View style={styles.baseline}>
            <Text variant="kpi">{k.present.count}</Text>
            <Text variant="sm" color="muted">
              {t(teaching ? 'console.people.staff.kpi.ofTeachers' : 'console.people.staff.kpi.ofStaff', { count: k.present.of })}
            </Text>
          </View>
          <Bar value={k.present.count} max={Math.max(1, k.present.of)} tone="ok" accessibilityLabel={`${k.present.percent ?? 0}%`} />
          <Text variant="xs" color="muted" weight={600}>
            {k.present.late
              ? t('console.people.staff.kpi.late', { pct: k.present.percent ?? 0, count: k.present.late })
              : t('console.people.staff.kpi.allIn', { pct: k.present.percent ?? 0, time: clock(k.present.last_in) })}
          </Text>
        </Card>
      </Col>
      <Col span={3} style={{ flexDirection: 'row' }}>
        <Card pastel="mint" pad={22} style={{ gap: 14, flex: 1 }}>
          <KpiHead title={t('console.people.staff.kpi.leave')} icon="calendarX" tone="warn" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text variant="kpi">{k.leave.count}</Text>
            {k.leave.people.length ? (
              <AvatarStack>
                {k.leave.people.slice(0, 4).map((p) => (
                  <Avatar key={p.id} initials={p.initials} seed={p.name} size="sm" />
                ))}
              </AvatarStack>
            ) : null}
          </View>
          <Hr />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            {teaching ? (
              <Pill
                label={t('console.people.staff.kpi.uncovered', { count: k.leave.uncovered })}
                tone={k.leave.uncovered ? 'warn' : 'ok'}
              />
            ) : (
              <Text variant="xs" color="muted">
                {t('console.people.staff.kpi.supportLeave')}
              </Text>
            )}
            {teaching ? (
              <Link
                label={t('console.people.staff.kpi.assign')}
                icon={null}
                onPress={() => router.navigate('/console/timetable' as Href)}
              />
            ) : null}
          </View>
        </Card>
      </Col>
      <Col span={3} style={{ flexDirection: 'row' }}>
        <Card pastel="lav" pad={22} style={{ gap: 14, flex: 1 }}>
          <KpiHead title={t('console.people.staff.kpi.workload')} icon="clock" tone="brand" />
          {k.workload.average !== null ? (
            <>
              <View style={styles.baseline}>
                <Text variant="kpi">{k.workload.average}</Text>
                <Text variant="sm" color="muted">
                  {t('console.people.staff.kpi.perWeek')}
                </Text>
              </View>
              <Bar value={k.workload.average} max={k.workload.cap} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="xs" color="muted" weight={600}>
                  {t('console.people.staff.kpi.cap', { cap: k.workload.cap })}
                </Text>
                {k.workload.over_cap ? (
                  <Text variant="xs" weight={700} rawColor={colors.warn}>
                    {t('console.people.staff.kpi.over', { count: k.workload.over_cap })}
                  </Text>
                ) : null}
              </View>
            </>
          ) : (
            <Text variant="sm" color="muted">
              {t('console.people.staff.kpi.noPeriods')}
            </Text>
          )}
        </Card>
      </Col>
      <Col span={3} style={{ flexDirection: 'row' }}>
        <Card pastel="blue" pad={22} style={{ gap: 14, flex: 1 }}>
          <KpiHead title={t('console.people.staff.kpi.positions')} icon="briefcase" tone="info" />
          <View style={styles.baseline}>
            <Text variant="kpi">{k.vacancies.positions}</Text>
            <Text variant="sm" color="muted">
              {t('console.people.staff.kpi.applicants', { count: k.vacancies.applicants })}
            </Text>
          </View>
          <Hr />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Text variant="xs" color="ink2" weight={600} numberOfLines={1} style={{ flex: 1 }}>
              {k.vacancies.items.map((v) => v.title).join(' · ') || t('console.people.staff.kpi.noVacancies')}
            </Text>
            {k.vacancies.items.length ? <Link label={t('console.people.staff.kpi.view')} icon={null} onPress={onVacancies} /> : null}
          </View>
        </Card>
      </Col>
    </Row>
  );
}

function KpiHead({ title, icon, tone }: { title: string; icon: IconName; tone: TileTone }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text variant="sm" weight={600} color="ink2">
        {title}
      </Text>
      <TileIcon icon={icon} tone={tone} size="sm" />
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------ table */

export function todayCell(t: TFunction, r: StaffRow): { label: string; tone: PillTone; sub: string } {
  const d = r.today;
  switch (d.state) {
    case 'leave':
      return {
        label: t('console.people.staff.today.leave'),
        tone: 'warn',
        sub:
          d.from_date === d.to_date
            ? t('console.people.staff.today.approvedKind', {
                kind: t(`console.people.staff.kind.${d.leave_kind}`, { defaultValue: d.leave_kind }),
              })
            : t('console.people.staff.today.approvedRange', { from: dayMonth(d.from_date).split(' ')[0], to: dayMonth(d.to_date) }),
      };
    case 'substituting':
      return {
        label: t('console.people.staff.today.substituting'),
        tone: 'info',
        sub: t('console.people.staff.today.cover', { cls: d.class, period: d.period, name: d.for ?? '' }),
      };
    case 'teaching':
      return {
        label: t('console.people.staff.today.present'),
        tone: 'ok',
        sub: t('console.people.staff.today.teaching', { cls: d.class }),
      };
    case 'late':
      return {
        label: t('console.people.staff.today.late'),
        tone: 'warn',
        sub: t('console.people.staff.today.inAt', { time: clock(d.at) }),
      };
    case 'present':
      return {
        label: t('console.people.staff.today.present'),
        tone: 'ok',
        sub: d.at ? t('console.people.staff.today.inAt', { time: clock(d.at) }) : '',
      };
    case 'absent':
      return { label: t('console.people.staff.today.absent'), tone: 'bad', sub: t('console.people.staff.today.noLeave') };
    default:
      return { label: t('console.people.staff.today.notIn'), tone: 'neutral', sub: t('console.people.staff.today.noCheckIn') };
  }
}

function StaffTable({
  data,
  typed,
  setTyped,
  f,
  setF,
  onOpen,
}: {
  data: Payload;
  typed: string;
  setTyped: (v: string) => void;
  f: { q: string; subject: string; today: string; page: number; sort: string };
  setF: (fn: (cur: typeof f) => typeof f) => void;
  onOpen: (r: StaffRow) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const teaching = data.tab === 'teaching';
  const cap = data.kpis.workload.cap;
  const from = data.total ? (data.page - 1) * data.page_size + 1 : 0;
  const to = Math.min(data.total, data.page * data.page_size);
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <View style={styles.toolbar}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Search value={typed} onChangeText={setTyped} placeholder={t('console.people.staff.search')} style={{ width: 280, height: 40 }} />
          <FilterButton
            label={teaching ? t('console.people.staff.subject') : t('console.people.staff.role')}
            allLabel={teaching ? t('console.people.staff.allSubjects') : t('console.people.staff.allRoles')}
            value={f.subject}
            options={data.facets.subjects.map((s) => ({ value: s, label: s }))}
            onChange={(subject) => setF((cur) => ({ ...cur, subject, page: 1 }))}
          />
          <FilterButton
            label={t('console.people.staff.todayFilter')}
            allLabel={t('console.people.staff.todayAll')}
            value={f.today}
            options={(['in', 'late', 'leave', 'substituting', 'absent'] as const).map((k) => ({
              value: k,
              label: t(`console.people.staff.todayOpt.${k}`),
            }))}
            onChange={(today) => setF((cur) => ({ ...cur, today, page: 1 }))}
          />
        </View>
        <Text variant="xs" color="muted" weight={600}>
          {t('console.people.staff.showing', { from, to, total: data.total })}
        </Text>
      </View>
      <DataTable
        rows={data.items}
        rowKey={(r) => r.id}
        onRowPress={onOpen}
        isSelected={(r) => r.id === data.highlight}
        empty={
          <Text variant="sm" color="muted">
            {t('console.people.staff.empty')}
          </Text>
        }
        columns={[
          {
            key: 'name',
            flex: 1.7,
            title: (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('console.people.staff.sortName')}
                onPress={() =>
                  setF((cur) => ({ ...cur, sort: cur.sort === 'name' ? '-name' : cur.sort === '-name' ? '' : 'name', page: 1 }))
                }
                style={[{ flexDirection: 'row', gap: 4, alignItems: 'center' }, pointer]}>
                <Text style={[styles.th, { color: colors.muted }]}>{t('console.people.staff.col.name')}</Text>
                <Text style={[styles.th, { color: colors.muted }]}>{f.sort === 'name' ? '↑' : f.sort === '-name' ? '↓' : '⌄'}</Text>
              </Pressable>
            ),
            render: (r) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar initials={r.initials} seed={r.name} size="sm" />
                <View style={{ flexShrink: 1, minWidth: 0 }}>
                  <Text variant="sm" weight={700} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text variant="xs" color="muted" num numberOfLines={1}>
                    {(r.employee_id ?? '—').replace(/-/g, '\u2011')}
                  </Text>
                </View>
              </View>
            ),
          },
          {
            key: 'subject',
            flex: 1.3,
            title: t('console.people.staff.col.subject'),
            render: (r) => (
              <View>
                <Text variant="sm" weight={600} numberOfLines={2}>
                  {r.subject ?? '—'}
                </Text>
                {r.role_note ? (
                  <Text variant="xs" color="muted" numberOfLines={1}>
                    {r.role_note}
                  </Text>
                ) : null}
              </View>
            ),
          },
          {
            key: 'classes',
            flex: 1.2,
            title: t('console.people.staff.col.classes'),
            render: (r) =>
              !r.classes || !r.classes.labels.length ? (
                <Text variant="sm" color="muted">
                  —
                </Text>
              ) : r.classes.labels.length <= 4 ? (
                <Text variant="sm" color="ink2">
                  {r.classes.labels.map((l) => l.replace(/-/g, '\u2011')).join(', ')}
                </Text>
              ) : (
                <View>
                  <Text variant="sm" color="ink2">
                    {t('console.people.staff.grades', {
                      from: gradeName(t, r.classes.grades![0]).replace(/^Grade /, ''),
                      to: r.classes.grades![1],
                    })}
                  </Text>
                  <Text variant="xs" color="muted">
                    {t('console.people.staff.sections', { count: r.classes.sections })}
                  </Text>
                </View>
              ),
          },
          {
            key: 'att',
            width: 126,
            align: 'right',
            title: t('console.people.staff.col.attendance'),
            render: (r) => (
              <Text variant="sm" weight={600} num>
                {r.attendance === null ? '—' : `${r.attendance.toFixed(1)}%`}
              </Text>
            ),
          },
          {
            key: 'periods',
            width: 128,
            title: t('console.people.staff.col.periods'),
            render: (r) =>
              r.periods === null ? (
                <Text variant="sm" color="muted">
                  —
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Bar
                    value={r.periods}
                    max={40}
                    size="thin"
                    tone={r.over_cap ? 'warn' : 'brand'}
                    style={{ width: 56 }}
                    accessibilityLabel={`${r.periods}`}
                  />
                  <View>
                    <Text variant="sm" weight={700} num rawColor={r.over_cap ? colors.warn : undefined}>
                      {r.periods}
                    </Text>
                    {r.over_cap ? (
                      <Text variant="xxs" weight={700} rawColor={colors.warn}>
                        {t('console.people.staff.overCap', { cap })}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ),
          },
          {
            key: 'today',
            width: 150,
            title: t('console.people.staff.col.today'),
            render: (r) => {
              const c = todayCell(t, r);
              return (
                <View style={{ gap: 3, alignItems: 'flex-start' }}>
                  <Pill label={c.label} tone={c.tone} />
                  {c.sub ? (
                    <Text variant="xxs" color="muted" weight={600}>
                      {c.sub}
                    </Text>
                  ) : null}
                </View>
              );
            },
          },
          {
            key: 'menu',
            width: 52,
            align: 'right',
            title: '',
            render: (r) => (
              <Popover
                align="right"
                items={[
                  { key: 'view', label: t('console.people.staff.menu.view'), icon: 'user', onPress: () => onOpen(r) },
                  {
                    key: 'call',
                    label: t('console.people.staff.menu.call'),
                    icon: 'phone',
                    onPress: () => void Linking.openURL(`tel:${r.phone}`),
                  },
                ]}>
                {(show) => (
                  <IconButton
                    icon="more"
                    size="sm"
                    variant="bare"
                    label={t('console.people.students.moreFor', { name: r.name })}
                    onPress={show}
                  />
                )}
              </Popover>
            ),
          },
        ]}
      />
      <View style={[styles.foot, { borderTopColor: colors.line }]}>
        <Text variant="xs" color="muted" weight={600}>
          {t(teaching ? 'console.people.staff.footTeaching' : 'console.people.staff.footSupport')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <IconButton
            icon="chevronLeft"
            size="sm"
            label={t('console.shell.prev')}
            disabled={data.page <= 1}
            onPress={() => setF((cur) => ({ ...cur, page: data.page - 1 }))}
          />
          <Text variant="xs" weight={700} num style={{ paddingHorizontal: 6 }}>
            {`${data.page} / ${data.pages}`}
          </Text>
          <IconButton
            icon="chevronRight"
            size="sm"
            label={t('console.shell.next')}
            disabled={data.page >= data.pages}
            onPress={() => setF((cur) => ({ ...cur, page: data.page + 1 }))}
          />
        </View>
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------------------------------------------ side */

function LeaveWeek({ data }: { data: Payload }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const w = data.leave_week;
  const today = new Date().toISOString().slice(0, 10);
  const from = new Date(`${w.from}T00:00:00`);
  const to = new Date(`${w.to}T00:00:00`);
  return (
    <Card pastel="mint" pad={20} style={{ gap: 14 }}>
      <CardHead
        title={t('console.people.staff.week.title')}
        subtitle={`${from.getDate()}–${to.getDate()} ${to.toLocaleString('en-IN', { month: 'long' })}`}
      />
      <View style={{ flexDirection: 'row', gap: 5 }} accessibilityRole="list" accessibilityLabel={t('console.people.staff.week.label')}>
        {w.days.map((d) => {
          const on = d.date === today;
          const date = new Date(`${d.date}T00:00:00`);
          const fg = on ? colors.canvas : colors.ink2;
          return (
            <View
              key={d.date}
              accessibilityRole={'listitem' as never}
              accessibilityLabel={t('console.people.staff.week.day', { date: dayMonth(d.date), approved: d.approved, pending: d.pending })}
              style={[styles.day, { backgroundColor: on ? colors.ink : colors.pTrack }]}>
              <Text variant="xxs" weight={700} rawColor={on ? colors.canvas : colors.muted}>
                {date.toLocaleString('en-IN', { weekday: 'short' })}
              </Text>
              <Text variant="sm" weight={800} num rawColor={on ? colors.canvas : colors.ink}>
                {date.getDate()}
              </Text>
              <View style={{ flexDirection: 'row', gap: 2, height: 6 }}>
                {Array.from({ length: Math.min(3, d.approved) }, (_, i) => (
                  <View key={`a${i}`} style={[styles.dot6, { backgroundColor: fg }]} />
                ))}
                {Array.from({ length: Math.min(3, d.pending) }, (_, i) => (
                  <View key={`p${i}`} style={[styles.dot6, { borderWidth: 1.5, borderColor: fg }]} />
                ))}
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={[styles.dot6, { backgroundColor: colors.ink2 }]} />
          <Text variant="xxs" color="muted" weight={600}>
            {t('console.people.staff.week.approved')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={[styles.dot6, { borderWidth: 1.5, borderColor: colors.ink2 }]} />
          <Text variant="xxs" color="muted" weight={600}>
            {t('console.people.staff.week.pending')}
          </Text>
        </View>
      </View>
      <Hr />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {w.today.length ? (
          <AvatarStack>
            {w.today.slice(0, 4).map((p) => (
              <Avatar key={p.id} initials={p.initials} seed={p.name} size="xs" />
            ))}
          </AvatarStack>
        ) : null}
        <Text variant="xs" weight={700} style={{ flex: 1 }}>
          {t('console.people.staff.week.today', { count: w.today.length })}
        </Text>
        {data.tab === 'teaching' ? (
          <Link
            label={t('console.people.staff.week.cover')}
            icon={null}
            size={12}
            onPress={() => router.navigate('/console/timetable' as Href)}
          />
        ) : null}
      </View>
    </Card>
  );
}

function leaveLine(t: TFunction, r: LeaveRequest): string {
  const range = r.from_date === r.to_date ? dayMonth(r.from_date) : `${dayMonth(r.from_date).split(' ')[0]}–${dayMonth(r.to_date)}`;
  const size = r.half_day ? t('console.people.staff.req.half') : t('console.people.staff.req.days', { count: r.days });
  return `${range} · ${t(`console.people.staff.kind.${r.leave_kind}`, { defaultValue: r.leave_kind })} · ${size}`;
}

function age(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

function LeaveRequests({ data, onOpen }: { data: Payload; onOpen: (r: LeaveRequest) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const reqs = data.leave_requests;
  const support = reqs.filter((r) => r.support).length;
  return (
    <Card pastel="mint" pad={20} style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <Text variant="h3">{t('console.people.staff.req.title')}</Text>
        {reqs.length ? <Badge value={reqs.length} tone="bad" /> : null}
      </View>
      {reqs.slice(0, 4).map((r, i) => (
        <Pressable
          key={r.id}
          accessibilityRole="button"
          accessibilityLabel={t('console.people.staff.req.open', { name: r.name })}
          onPress={() => onOpen(r)}
          style={[styles.reqRow, pointer, i ? { borderTopWidth: 1, borderTopColor: colors.pHr } : null]}>
          <Avatar initials={r.initials} seed={r.name} size="sm" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700} numberOfLines={1}>
              {r.name}
            </Text>
            <Text variant="xs" color="muted" numberOfLines={1}>
              {leaveLine(t, r)}
            </Text>
            {r.decide_today ? (
              <Text variant="xxs" weight={700} rawColor={colors.warn}>
                {t('console.people.staff.req.today')}
              </Text>
            ) : null}
          </View>
          <Text variant="xxs" color="muted" weight={600}>
            {age(r.created_at)}
          </Text>
        </Pressable>
      ))}
      {!reqs.length ? (
        <Text variant="sm" color="muted">
          {t('console.people.staff.req.none')}
        </Text>
      ) : null}
      {reqs.length ? (
        <View style={{ marginTop: 6 }}>
          <Link
            label={t('console.people.staff.req.all', { count: reqs.length })}
            onPress={() => router.navigate('/console/approvals' as Href)}
          />
        </View>
      ) : null}
      {support ? (
        <Text variant="xxs" color="muted" weight={600}>
          {t('console.people.staff.req.support', { count: support })}
        </Text>
      ) : null}
    </Card>
  );
}

function Trend({ data }: { data: Payload }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const tr = data.trend;
  const pts = tr.days.map((d) => d.percent);
  const h = 64;
  const lo = Math.min(90, ...pts);
  const hi = 100;
  const x = (i: number) => 6 + (pts.length <= 1 ? 0 : (i / (pts.length - 1)) * (w - 12));
  const y = (v: number) => 6 + (h - 12) * (1 - (v - lo) / (hi - lo || 1));
  const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join(' ');
  const last = pts.length - 1;
  return (
    <Card pastel="blue" pad={20} style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Text variant="h3">{t('console.people.staff.trend.title')}</Text>
        <Text variant="xs" color="muted">
          {t('console.people.staff.trend.sub', { count: pts.length })}
        </Text>
      </View>
      <View style={styles.baseline}>
        <Text variant="kpiSm">{tr.today === null ? '—' : `${tr.today}%`}</Text>
        <Text variant="xs" color="muted" weight={600}>
          {t('console.people.staff.trend.today')}
        </Text>
      </View>
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={{ height: h }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('console.people.staff.trend.label', { values: pts.join(', '), avg: tr.term_average ?? '—' })}>
        {w > 0 && pts.length ? (
          <Svg width={w} height={h}>
            {tr.term_average !== null ? (
              <Line
                x1={0}
                x2={w}
                y1={y(tr.term_average)}
                y2={y(tr.term_average)}
                stroke={colors.muted}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            ) : null}
            <Path d={`${line} L${x(last)} ${h} L${x(0)} ${h} Z`} fill={colors.brand} opacity={0.12} />
            <Path d={line} stroke={colors.brand} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            <Circle cx={x(last)} cy={y(pts[last])} r={4} fill={colors.brand} stroke={colors.surface} strokeWidth={2} />
          </Svg>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="xxs" color="muted" weight={600}>
          {tr.days[0] ? dayMonth(tr.days[0].date) : ''}
        </Text>
        <Text variant="xxs" color="muted" weight={600}>
          {tr.term_average !== null ? `┄ ${t('console.people.staff.trend.avg', { avg: tr.term_average })}` : ''}
        </Text>
        <Text variant="xxs" color="muted" weight={600}>
          {t('console.people.staff.trend.todayShort')}
        </Text>
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------------------------------------------ dialogs */

function PersonDialog({ row, onClose }: { row: StaffRow; onClose: () => void }) {
  const { t } = useTranslation();
  const c = todayCell(t, row);
  const facts: [string, string][] = [
    [t('console.people.staff.col.subject'), [row.subject, row.role_note].filter(Boolean).join(' · ') || '—'],
    [t('console.people.staff.col.classes'), row.classes?.labels.join(', ') || '—'],
    [t('console.people.staff.col.attendance'), row.attendance === null ? '—' : `${row.attendance}%`],
    [t('console.people.staff.col.periods'), row.periods === null ? '—' : String(row.periods)],
    [t('console.people.staff.col.today'), [c.label, c.sub].filter(Boolean).join(' · ')],
    [t('console.people.staff.phone'), row.phone],
  ];
  return (
    <Dialog
      visible
      onClose={onClose}
      title={row.name}
      subtitle={row.employee_id ?? undefined}
      footer={
        <Button
          title={t('console.people.staff.menu.call')}
          icon="phone"
          variant="secondary"
          onPress={() => void Linking.openURL(`tel:${row.phone}`)}
        />
      }>
      {facts.map(([k, v]) => (
        <View key={k} style={{ flexDirection: 'row' }}>
          <Text variant="sm" color="muted" style={{ width: 150 }}>
            {k}
          </Text>
          <Text variant="sm" weight={600} style={{ flex: 1 }}>
            {v}
          </Text>
        </View>
      ))}
    </Dialog>
  );
}

function DecideDialog({ req, onClose }: { req: LeaveRequest; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const decide = useMutation({
    mutationFn: (d: 'approve' | 'decline') => peopleApi.decideLeave(req.id, d, note),
    onSuccess: (_r, d) => {
      qc.invalidateQueries({ queryKey: ['console'] });
      toast(t(d === 'approve' ? 'console.people.staff.req.approved' : 'console.people.staff.req.declined', { name: req.name }));
      onClose();
    },
    onError: (e) => toast(errorText(e, t('console.people.failed')), 'danger'),
  });
  return (
    <Dialog
      visible
      onClose={onClose}
      title={t('console.people.staff.req.dialog', { name: req.name })}
      subtitle={`${leaveLine(t, req)} · ${t('console.people.staff.req.asked', { when: relativeTime(req.created_at) })}`}
      footer={
        <>
          <Button
            title={t('console.people.adm.decline')}
            variant="danger"
            disabled={!note.trim()}
            loading={decide.isPending && decide.variables === 'decline'}
            onPress={() => decide.mutate('decline')}
          />
          <Button
            title={t('console.people.adm.approve')}
            variant="ok"
            icon="check"
            loading={decide.isPending && decide.variables === 'approve'}
            onPress={() => decide.mutate('approve')}
          />
        </>
      }>
      <Text variant="sm" color="ink2">
        {`“${req.reason}”`}
      </Text>
      <TextField
        label={t('console.people.staff.req.note')}
        value={note}
        onChangeText={setNote}
        placeholder={t('console.people.staff.req.notePlaceholder')}
      />
      <Text variant="xs" color="muted">
        {t('console.people.staff.req.engine')}
      </Text>
    </Dialog>
  );
}

function VacanciesDialog({ data, onClose }: { data: Payload; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog
      visible
      onClose={onClose}
      title={t('console.people.staff.kpi.positions')}
      subtitle={t('console.people.staff.kpi.applicants', { count: data.kpis.vacancies.applicants })}>
      {data.kpis.vacancies.items.map((v) => (
        <View key={v.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TileIcon icon="briefcase" tone="info" size="sm" />
          <View style={{ flex: 1 }}>
            <Text variant="sm" weight={700}>
              {v.title}
            </Text>
            <Text variant="xs" color="muted">
              {[
                v.note,
                t('console.people.staff.vac.opened', { date: dayMonth(v.opened_on) }),
                v.closes_on ? t('console.people.staff.vac.closes', { date: dayMonth(v.closes_on) }) : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <Pill label={t('console.people.staff.kpi.applicants', { count: v.applicants })} tone="info" dot={false} />
        </View>
      ))}
    </Dialog>
  );
}

function AddStaffDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const empty = { full_name: '', phone: '', role: 'teacher', title: '', joined_on: '' };
  const [form, setForm] = useState(empty);
  const save = useMutation({
    mutationFn: () => peopleApi.addStaff(form),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['console'] });
      toast(t('console.people.staff.added', { id: res.employee_id }));
      setForm(empty);
      onClose();
    },
  });
  const err = (k: string) => (save.error ? errorFor(save.error, k) : undefined);
  const set = (k: keyof typeof empty) => (v: string) => setForm((cur) => ({ ...cur, [k]: v }));
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('console.people.staff.add')}
      subtitle={t('console.people.staff.addSub')}
      footer={
        <>
          <Button title={t('console.people.cancel')} variant="secondary" onPress={onClose} />
          <Button title={t('console.people.staff.add')} icon="userPlus" loading={save.isPending} onPress={() => save.mutate()} />
        </>
      }>
      <TextField
        label={t('console.people.staff.name')}
        value={form.full_name}
        onChangeText={set('full_name')}
        error={err('full_name')}
        autoFocus
      />
      <TextField
        label={t('console.people.add.phone')}
        prefix="+91"
        keyboardType="phone-pad"
        value={form.phone}
        onChangeText={set('phone')}
        error={err('phone')}
      />
      <Choice
        label={t('console.people.staff.role')}
        value={form.role}
        options={(['teacher', 'admin', 'accountant', 'transport_manager', 'driver', 'attendant'] as const).map((r) => ({
          value: r,
          label: t(`console.people.staff.roles.${r}`),
        }))}
        onChange={set('role')}
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TextField
          label={t('console.people.staff.titleField')}
          placeholder={t('console.people.staff.titlePlaceholder')}
          value={form.title}
          onChangeText={set('title')}
          containerStyle={{ flex: 1 }}
        />
        <TextField
          label={t('console.people.staff.joined')}
          placeholder="2026-10-01"
          value={form.joined_on}
          onChangeText={set('joined_on')}
          error={err('joined_on')}
          containerStyle={{ flex: 1 }}
        />
      </View>
      {save.error && !err('full_name') && !err('phone') && !err('joined_on') ? (
        <Text variant="xs" color="bad">
          {errorText(save.error, t('console.people.failed'))}
        </Text>
      ) : null}
    </Dialog>
  );
}

function errorFor(e: unknown, field: string): string | undefined {
  return (e as { fieldMessage?: (f: string) => string | undefined })?.fieldMessage?.(field);
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 26, borderBottomWidth: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: 2, marginBottom: -1 },
  tabLabel: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 18 },
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  th: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.88, textTransform: 'uppercase' },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  day: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 11 },
  dot6: { width: 6, height: 6, borderRadius: 3 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
});
