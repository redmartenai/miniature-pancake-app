import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { downloadFile } from '@/lib/download';
import { formatDate, formatTime, isoDate, weekdayName } from '@/lib/format';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  Button,
  Checkbox,
  DateField,
  Icon,
  IconButton,
  pointer,
  Search,
  SegmentedControl,
  Switch,
  Text,
  TextField,
  TileIcon,
  TimeField,
  useToast,
  type IconName,
  type TileTone,
} from '@/ui';

import { useConsoleQuery } from '../../api';
import { Col, ConsolePage, Row } from '../../Page';
import { DataTable, type Column } from '../../Table';
import {
  reportsApi,
  type CustomDef,
  type Delivery,
  type FilterParams,
  type Fmt,
  type ReportKey,
  type ReportsData,
  type RunInfo,
  type Schedule,
} from '../api';
import { Dialog, Dropdown, errorText, FieldLabel, gradeName } from '../common';
import { AttendanceTrend, FeeCollection, UnitTests } from './Charts';

const REPORT_ICON: Record<ReportKey, { icon: IconName; tone: TileTone }> = {
  attendance_register: { icon: 'calendarCheck', tone: 'brand' },
  class_performance: { icon: 'award', tone: 'brand' },
  fee_collection: { icon: 'wallet', tone: 'brand' },
  defaulters: { icon: 'alert', tone: 'butter' },
  staff_attendance: { icon: 'briefcase', tone: 'brand' },
  transport_utilisation: { icon: 'bus', tone: 'brand' },
  admissions_funnel: { icon: 'userPlus', tone: 'brand' },
};
const SCHEDULE_TONE: Record<string, TileTone> = {
  attendance_register: 'mint',
  defaulters: 'butter',
  staff_attendance: 'brand',
  transport_utilisation: 'neutral',
};

/** PReports: filters that drive three charts, the scheduled reports and the report library. */
export function ReportsPage() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const [params, setParams] = useState<FilterParams>({});
  const schoolId = useSession((s) => s.schoolId);
  // Keep showing the last result while new filters load (the filter menus stay open).
  const q = useQuery({
    queryKey: ['console', schoolId, 'reports', params],
    queryFn: () => reportsApi.page(params),
    placeholderData: keepPreviousData,
  });
  const data = q.data;
  const [dialog, setDialog] = useState<'schedule' | 'log' | 'custom' | 'range' | null>(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [gridW, setGridW] = useState(0);
  // Four cards a row (`grid-template-columns: repeat(4, 1fr)`).
  const cardW = gridW ? Math.floor((gridW - 3 * 16) / 4) : undefined;

  // Filters sent with every generate: exactly what the page shows.
  const effective: FilterParams = data
    ? {
        term: data.filters.term,
        grades: data.filters.grades,
        sections: data.filters.sections,
        from: data.filters.start,
        to: data.filters.end,
      }
    : params;

  const generate = async (key: string, fmt: Fmt, download = true) => {
    setBusy(`${key}:${fmt}`);
    try {
      const run = await reportsApi.generate(key, fmt, effective);
      if (download) await downloadFile(run.file, `${run.title.replace(/\s+/g, '_')}.${run.format}`).catch(() => undefined);
      toast(t('console.engage.rep.generated', { title: run.title, rows: run.rows }));
      void client.invalidateQueries({ queryKey: ['console'] });
    } catch (e) {
      toast(errorText(e, t('console.engage.somethingWrong')), 'danger');
    } finally {
      setBusy(null);
    }
  };
  const fetchRun = async (run: RunInfo) => {
    try {
      await downloadFile(run.file, `${run.title.replace(/\s+/g, '_')}.${run.format}`);
    } catch (e) {
      toast(errorText(e, t('console.engage.somethingWrong')), 'danger');
    }
  };

  const refreshed = data ? formatTime(data.refreshed_at) : '';
  const f = data?.filters;
  const grades = data?.options.grades ?? [];
  const sections = (data?.options.sections ?? []).filter((s) => !f?.grades.length || f.grades.includes(s.grade));
  const setFilter = (patch: FilterParams) => setParams((p) => ({ ...p, ...patch }));
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const gradesLabel = !f?.grades.length
    ? t('console.engage.rep.allGrades')
    : f.grades.length === 1
      ? gradeName(t, f.grades[0])
      : t('console.engage.rep.nGrades', { count: f.grades.length });
  const sectionsLabel = !f?.sections.length
    ? t('console.engage.rep.allSections')
    : f.sections.length <= 2
      ? f.sections.map((id) => data?.options.sections.find((s) => s.id === id)?.label).join(', ')
      : t('console.engage.rep.nSections', { count: f.sections.length });
  const rangeLabel = f ? `${formatDate(f.start)} – ${formatDate(f.end, { year: true })}` : '';

  const library = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const items = data?.library ?? [];
    return items.filter(
      (r) =>
        !needle || `${t(`console.engage.rep.lib_${r.key}`)} ${t(`console.engage.rep.libDesc_${r.key}`)}`.toLowerCase().includes(needle),
    );
  }, [data, search, t]);
  const customs = (data?.custom ?? []).filter((c) => !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <ConsolePage
      title={t('console.engage.rep.title')}
      crumbs={[{ label: t('console.shell.group.engage') }]}
      subtitle={t('console.engage.rep.subtitle', { time: refreshed })}
      actions={
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('console.engage.rep.exportA11y')}
            disabled={!!busy}
            onPress={() => void generate('summary', 'xlsx')}
            style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.export,
              pointer,
              { borderColor: colors.lineStrong, backgroundColor: hovered ? colors.subtle : colors.surface },
            ]}>
            <Icon name="download" size={16} rawColor={colors.ink} />
            <Text style={[styles.exportText, { color: colors.ink }]}>
              {busy === 'summary:xlsx' ? t('console.engage.rep.exporting') : t('console.engage.rep.export')}
            </Text>
            <View style={[styles.audited, { backgroundColor: colors.sunken }]}>
              <Icon name="shield" size={11} rawColor={colors.muted} />
              <Text variant="xxs" color="muted" weight={600}>
                {t('console.engage.rep.audited')}
              </Text>
            </View>
          </Pressable>
          <Button title={t('console.engage.rep.scheduleReport')} icon="clock" onPress={() => setDialog('schedule')} />
        </>
      }
      loading={q.isLoading && !data}
      error={q.error}
      onRetry={() => void q.refetch()}>
      {data && f ? (
        <>
          <View style={[styles.row, { gap: 10, marginTop: -4 }]}>
            <Dropdown
              label={t('console.engage.rep.term')}
              width={180}
              items={data.options.terms.map((x) => ({ key: x, label: x, selected: x === f.term }))}
              onSelect={(k) => setParams({ term: k })}
              trigger={(open) => <FilterPill icon="calendar" label={f.term ?? t('console.engage.rep.term')} onPress={open} />}
            />
            <Dropdown
              label={t('console.engage.rep.grades')}
              width={200}
              keepOpen
              items={[
                { key: '*', label: t('console.engage.rep.allGrades'), selected: !f.grades.length },
                ...grades.map((g) => ({ key: g, label: gradeName(t, g), selected: f.grades.includes(g) })),
              ]}
              onSelect={(k) => setFilter({ grades: k === '*' ? [] : toggle(f.grades, k), sections: [] })}
              trigger={(open) => <FilterPill icon="layers" label={gradesLabel} onPress={open} />}
            />
            <Dropdown
              label={t('console.engage.rep.sections')}
              width={200}
              keepOpen
              items={[
                { key: '*', label: t('console.engage.rep.allSections'), selected: !f.sections.length },
                ...sections.map((s) => ({ key: s.id, label: s.label, selected: f.sections.includes(s.id) })),
              ]}
              onSelect={(k) => setFilter({ sections: k === '*' ? [] : toggle(f.sections, k) })}
              trigger={(open) => <FilterPill icon="users" label={sectionsLabel} onPress={open} />}
            />
            <FilterPill icon="calendar" label={rangeLabel} onPress={() => setDialog('range')} />
            <Button
              title={t('console.engage.rep.reset')}
              variant="ghost"
              onPress={() => setParams({})}
              disabled={!Object.keys(params).length}
            />
            <View style={{ flex: 1 }} />
            <Text variant="xs" color="muted" weight={600}>
              {t('console.engage.rep.applies')}
            </Text>
          </View>

          <Row align="stretch">
            <Col span={5} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <AttendanceTrend data={data.charts.attendance} />
            </Col>
            <Col span={7} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <UnitTests data={data.charts.unit_tests} />
            </Col>
          </Row>
          <Row align="stretch">
            <Col span={5} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <FeeCollection data={data.charts.fees} term={f.term} />
            </Col>
            <Col span={7} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Schedules data={data} onLog={() => setDialog('log')} />
            </Col>
          </Row>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, gap: 18 }]}>
            <View style={[styles.row, { justifyContent: 'space-between', gap: 16 }]}>
              <View style={{ gap: 2, flex: 1 }}>
                <Text variant="h3" accessibilityRole="header">
                  {t('console.engage.rep.library')}
                </Text>
                <Text variant="xs" color="muted">
                  {t('console.engage.rep.librarySub')}
                </Text>
              </View>
              <Search value={search} onChangeText={setSearch} placeholder={t('console.engage.rep.searchReports')} style={{ width: 260 }} />
            </View>
            <View style={styles.grid} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
              {library.map((r) => (
                <LibraryCard
                  key={r.key}
                  title={t(`console.engage.rep.lib_${r.key}`)}
                  description={t(`console.engage.rep.libDesc_${r.key}`)}
                  icon={REPORT_ICON[r.key].icon}
                  tone={REPORT_ICON[r.key].tone}
                  formats={r.formats}
                  last={r.last}
                  busy={busy}
                  width={cardW}
                  id={r.key}
                  onGenerate={(fmt) => void generate(r.key, fmt)}
                  onDownload={() => r.last && void fetchRun(r.last)}
                />
              ))}
              {customs.map((c) => (
                <LibraryCard
                  key={c.key}
                  title={c.name}
                  description={t('console.engage.rep.customDesc', {
                    module: t(`console.engage.rep.mod_${c.module}`),
                    count: c.columns.length,
                  })}
                  icon="sliders"
                  tone="lav"
                  formats={c.formats}
                  last={c.last}
                  busy={busy}
                  width={cardW}
                  id={c.key}
                  custom={c}
                  onGenerate={(fmt) => void generate(c.key, fmt)}
                  onDownload={() => c.last && void fetchRun(c.last)}
                />
              ))}
              <View style={[styles.libCard, styles.dashed, { borderColor: colors.lineStrong, width: cardW }]}>
                <TileIcon icon="plus" tone="neutral" />
                <View style={{ gap: 4 }}>
                  <Text variant="h4">{t('console.engage.rep.customTitle')}</Text>
                  <Text variant="xs" color="muted">
                    {t('console.engage.rep.customSub')}
                  </Text>
                </View>
                <View style={[styles.row, { gap: 6, marginTop: 'auto' }]}>
                  <Icon name="lock" size={13} rawColor={colors.ink2} />
                  <Text variant="xs" color="ink2" weight={600}>
                    {data.can_export ? t('console.engage.rep.needsExport') : t('console.engage.rep.noExport')}
                  </Text>
                </View>
                <Button
                  title={t('console.engage.rep.build')}
                  variant="secondary"
                  size="sm"
                  disabled={!data.can_export}
                  onPress={() => setDialog('custom')}
                  fullWidth
                />
              </View>
            </View>
          </View>

          <ScheduleDialog visible={dialog === 'schedule'} onClose={() => setDialog(null)} data={data} />
          <DeliveryLog visible={dialog === 'log'} onClose={() => setDialog(null)} />
          <CustomBuilder visible={dialog === 'custom'} onClose={() => setDialog(null)} data={data} />
          <RangeDialog
            visible={dialog === 'range'}
            onClose={() => setDialog(null)}
            start={f.start}
            end={f.end}
            onApply={(from, to) => setFilter({ from, to })}
          />
        </>
      ) : null}
    </ConsolePage>
  );
}

function FilterPill({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.pill,
        pointer,
        { borderColor: colors.lineStrong, backgroundColor: hovered ? colors.subtle : colors.surface },
      ]}>
      <Icon name={icon} size={15} rawColor={colors.ink2} />
      <Text style={[styles.pillText, { color: colors.ink }]} numberOfLines={1}>
        {label}
      </Text>
      <Icon name="chevronDown" size={13} rawColor={colors.muted} />
    </Pressable>
  );
}

function everyText(t: (k: string, o?: Record<string, unknown>) => string, s: Schedule): string {
  const [h, m] = s.at.split(':').map(Number);
  const time = formatTime(new Date(2026, 0, 1, h, m));
  const when =
    s.frequency === 'daily'
      ? t('console.engage.rep.daily')
      : s.frequency === 'weekly'
        ? t('console.engage.rep.weekly', { day: t(`console.engage.rep.day_${s.weekday}`) })
        : t('console.engage.rep.monthly', { day: t(`console.engage.rep.ord_${Math.min(s.day_of_month, 4)}`, { n: s.day_of_month }) });
  const to = s.recipients.map((r) => r.title || r.name);
  const who = to.length <= 2 ? to.join(` ${t('console.engage.rep.and')} `) : to.join(', ');
  return `${when} · ${time} · ${t('console.engage.rep.to', { who })}`;
}

function Schedules({ data, onLog }: { data: ReportsData; onLog: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const active = data.schedules.filter((s) => s.enabled).length;
  const act = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'on' | 'off' | 'run' | 'delete' }) => {
      if (action === 'run') return reportsApi.runNow(id);
      if (action === 'delete') return reportsApi.removeSchedule(id);
      return reportsApi.toggle(id, action === 'on');
    },
    onSuccess: (_r, v) => {
      toast(t(`console.engage.rep.sched_${v.action}`));
      void client.invalidateQueries({ queryKey: ['console'] });
    },
    onError: (e) => toast(errorText(e, t('console.engage.somethingWrong')), 'danger'),
  });
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={{ gap: 2 }}>
          <Text variant="h3" accessibilityRole="header">
            {t('console.engage.rep.scheduled')}
          </Text>
          <Text variant="xs" color="muted">
            {t('console.engage.rep.scheduledSub', { count: active })}
          </Text>
        </View>
        <Button title={t('console.engage.rep.deliveryLog')} icon="history" variant="ghost" size="sm" onPress={onLog} />
      </View>
      {data.schedules.map((s, i) => (
        <View key={s.id} style={[styles.row, styles.schedule, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
          <TileIcon icon="clock" size="sm" tone={s.enabled ? (SCHEDULE_TONE[s.report] ?? 'brand') : 'neutral'} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700} numberOfLines={1}>
              {s.name}
            </Text>
            <Text variant="xs" color="muted" numberOfLines={1}>
              {everyText(t, s)}
            </Text>
          </View>
          <View style={[styles.fmt, { borderColor: colors.lineStrong }]}>
            <Text style={[styles.fmtText, { color: colors.ink2 }]}>{s.format.toUpperCase()}</Text>
          </View>
          <View style={{ width: 86, alignItems: 'flex-end' }}>
            <Text variant="xxs" color="muted" weight={600}>
              {t('console.engage.rep.nextRun')}
            </Text>
            <Text variant="xs" weight={700} numberOfLines={1}>
              {s.enabled && s.next_run_at
                ? `${weekdayName(s.next_run_at, true)} ${formatDate(s.next_run_at)}`
                : t('console.engage.rep.paused')}
            </Text>
          </View>
          <Switch
            value={s.enabled}
            label={t('console.engage.rep.enableA11y', { name: s.name })}
            onChange={(on) => act.mutate({ id: s.id, action: on ? 'on' : 'off' })}
          />
          <Dropdown
            label={t('console.engage.rep.scheduleActions', { name: s.name })}
            align="right"
            width={200}
            items={[
              { key: 'run', label: t('console.engage.rep.runNow'), icon: 'play' },
              { key: 'delete', label: t('console.engage.rep.deleteSchedule'), icon: 'close', danger: true },
            ]}
            onSelect={(k) => act.mutate({ id: s.id, action: k as 'run' | 'delete' })}
            trigger={(open) => (
              <IconButton
                icon="more"
                variant="bare"
                size="sm"
                label={t('console.engage.rep.scheduleActions', { name: s.name })}
                onPress={open}
              />
            )}
          />
        </View>
      ))}
      {!data.schedules.length ? (
        <Text variant="sm" color="muted" style={{ paddingVertical: 14 }}>
          {t('console.engage.rep.noSchedules')}
        </Text>
      ) : null}
    </View>
  );
}

function LibraryCard({
  id,
  title,
  description,
  icon,
  tone,
  formats,
  last,
  busy,
  custom,
  width,
  onGenerate,
  onDownload,
}: {
  width?: number;
  id: string;
  title: string;
  description: string;
  icon: IconName;
  tone: TileTone;
  formats: Fmt[];
  last: RunInfo | null;
  busy: string | null;
  custom?: CustomDef;
  onGenerate: (fmt: Fmt) => void;
  onDownload: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const remove = useMutation({
    mutationFn: () => reportsApi.removeCustom(custom!.id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['console'] }),
    onError: (e) => toast(errorText(e, t('console.engage.somethingWrong')), 'danger'),
  });
  const working = busy?.startsWith(`${id}:`);
  return (
    <View style={[styles.libCard, { backgroundColor: colors.subtle, borderColor: colors.line, width }]}>
      <View style={[styles.row, { gap: 6 }]}>
        <TileIcon icon={icon} tone={tone} />
        <View style={{ flex: 1 }} />
        {formats.map((fmt) => (
          <Pressable
            key={fmt}
            accessibilityRole="button"
            accessibilityLabel={t('console.engage.rep.generateAs', { title, format: fmt.toUpperCase() })}
            onPress={() => onGenerate(fmt)}
            disabled={!!busy}
            style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.fmt,
              pointer,
              { borderColor: hovered ? colors.brandLine : colors.lineStrong, backgroundColor: colors.surface },
            ]}>
            <Text style={[styles.fmtText, { color: colors.ink2 }]}>{fmt.toUpperCase()}</Text>
          </Pressable>
        ))}
        {custom ? (
          <IconButton
            icon="close"
            variant="bare"
            size={26}
            label={t('console.engage.rep.removeCustom', { name: title })}
            onPress={() => remove.mutate()}
          />
        ) : null}
      </View>
      <View style={{ gap: 4 }}>
        <Text variant="h4" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="xs" color="muted" numberOfLines={2}>
          {description}
        </Text>
      </View>
      <View style={[styles.row, { gap: 6, marginTop: 'auto' }]}>
        <Icon name="clock" size={13} rawColor={colors.ink2} />
        <Text variant="xs" color="ink2" weight={600} numberOfLines={1}>
          {last
            ? t('console.engage.rep.lastGenerated', { when: `${formatDate(last.at)}, ${formatTime(last.at)}` })
            : t('console.engage.rep.neverGenerated')}
        </Text>
      </View>
      <View style={[styles.row, { gap: 8 }]}>
        <Button
          title={t('console.engage.rep.generate')}
          variant="soft"
          size="sm"
          loading={working}
          disabled={!!busy && !working}
          onPress={() => onGenerate(formats[0])}
          style={{ flex: 1 }}
        />
        <IconButton
          icon="download"
          size="sm"
          label={t('console.engage.rep.downloadLast', { title })}
          disabled={!last}
          onPress={onDownload}
        />
      </View>
    </View>
  );
}

const DAYS = [0, 1, 2, 3, 4, 5];

function ScheduleDialog({ visible, onClose, data }: { visible: boolean; onClose: () => void; data: ReportsData }) {
  const { t } = useTranslation();
  const toast = useToast();
  const client = useQueryClient();
  const reports = [
    ...data.library.map((r) => ({ key: r.key as string, label: t(`console.engage.rep.lib_${r.key}`), formats: r.formats })),
    ...data.custom.map((c) => ({ key: c.key, label: c.name, formats: c.formats })),
  ];
  const [report, setReport] = useState(reports[0]?.key ?? '');
  const spec = reports.find((r) => r.key === report);
  const [fmt, setFmt] = useState<Fmt>('pdf');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [weekday, setWeekday] = useState(0);
  const [dom, setDom] = useState(1);
  const [at, setAt] = useState('07:00');
  const [who, setWho] = useState<string[]>(data.recipients.slice(0, 1).map((r) => r.id));
  const format = spec?.formats.includes(fmt) ? fmt : (spec?.formats[0] ?? 'pdf');
  const save = useMutation({
    mutationFn: () =>
      reportsApi.schedule({
        name: name.trim() || spec?.label || '',
        report,
        format,
        frequency,
        weekday,
        day_of_month: dom,
        at,
        recipient_ids: who,
      }),
    onSuccess: () => {
      toast(t('console.engage.rep.scheduledToast'));
      void client.invalidateQueries({ queryKey: ['console'] });
      onClose();
    },
    onError: (e) => toast(errorText(e, t('console.engage.somethingWrong')), 'danger'),
  });
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('console.engage.rep.scheduleReport')}
      subtitle={t('console.engage.rep.scheduleSub')}
      width={620}
      footer={
        <>
          <Button title={t('console.engage.cancel')} variant="ghost" onPress={onClose} />
          <Button
            title={t('console.engage.rep.saveSchedule')}
            icon="clock"
            disabled={!report || !who.length}
            loading={save.isPending}
            onPress={() => save.mutate()}
          />
        </>
      }>
      <View style={{ gap: 8 }}>
        <FieldLabel>{t('console.engage.rep.report')}</FieldLabel>
        <Dropdown
          label={t('console.engage.rep.report')}
          width={320}
          items={reports.map((r) => ({ key: r.key, label: r.label, selected: r.key === report }))}
          onSelect={setReport}
          trigger={(open) => <FilterPill icon="chart" label={spec?.label ?? ''} onPress={open} />}
        />
      </View>
      <TextField
        label={t('console.engage.rep.scheduleName')}
        value={name}
        onChangeText={setName}
        placeholder={spec?.label}
        maxLength={80}
      />
      <View style={[styles.row, { gap: 16, alignItems: 'flex-start' }]}>
        <View style={{ gap: 8 }}>
          <FieldLabel>{t('console.engage.rep.format')}</FieldLabel>
          <SegmentedControl
            full={false}
            value={format}
            onChange={(v) => setFmt(v)}
            options={(spec?.formats ?? ['pdf']).map((x) => ({ value: x, label: x.toUpperCase() }))}
          />
        </View>
        <View style={{ gap: 8 }}>
          <FieldLabel>{t('console.engage.rep.frequency')}</FieldLabel>
          <SegmentedControl
            full={false}
            value={frequency}
            onChange={setFrequency}
            options={(['daily', 'weekly', 'monthly'] as const).map((x) => ({ value: x, label: t(`console.engage.rep.freq_${x}`) }))}
          />
        </View>
      </View>
      {frequency === 'weekly' ? (
        <View style={{ gap: 8 }}>
          <FieldLabel>{t('console.engage.rep.onDay')}</FieldLabel>
          <SegmentedControl
            full={false}
            value={weekday}
            onChange={setWeekday}
            options={DAYS.map((d) => ({ value: d, label: t(`console.engage.rep.day_${d}`).slice(0, 3) }))}
          />
        </View>
      ) : null}
      {frequency === 'monthly' ? (
        <View style={{ gap: 8 }}>
          <FieldLabel>{t('console.engage.rep.onDate')}</FieldLabel>
          <SegmentedControl
            full={false}
            value={dom}
            onChange={setDom}
            options={[1, 5, 10, 15, 20, 25].map((d) => ({ value: d, label: String(d) }))}
          />
        </View>
      ) : null}
      <TimeField label={t('console.engage.rep.at')} value={at} onChange={setAt} from="06:00" to="21:00" style={{ width: 200 }} />
      <View style={{ gap: 8 }}>
        <FieldLabel>{t('console.engage.rep.recipients')}</FieldLabel>
        {data.recipients.map((p) => (
          <View key={p.id} style={[styles.row, { gap: 10 }]}>
            <Checkbox
              checked={who.includes(p.id)}
              onChange={(on) => setWho((w) => (on ? [...w, p.id] : w.filter((x) => x !== p.id)))}
              label={`${p.name} · ${p.title}`}
            />
            <Text variant="sm">{p.name}</Text>
            <Text variant="xs" color="muted">
              {p.title}
            </Text>
          </View>
        ))}
        <Text variant="xs" color="muted">
          {t('console.engage.rep.deliveredHint')}
        </Text>
      </View>
    </Dialog>
  );
}

function DeliveryLog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const q = useConsoleQuery(['report-deliveries'], reportsApi.deliveries, { enabled: visible });
  const columns: Column<Delivery>[] = [
    { key: 'when', title: t('console.engage.rep.colWhen'), width: 150, render: (d) => `${formatDate(d.at)}, ${formatTime(d.at)}` },
    { key: 'what', title: t('console.engage.rep.colSchedule'), flex: 2, render: (d) => `${d.schedule} · ${d.format.toUpperCase()}` },
    { key: 'who', title: t('console.engage.rep.colRecipient'), flex: 1.4, render: (d) => d.user ?? '—' },
    {
      key: 'ch',
      title: t('console.engage.rep.colChannel'),
      width: 120,
      render: (d) => (d.channel === 'email' ? t('console.engage.rep.chEmail') : t('console.engage.rep.chInApp')),
    },
    {
      key: 'status',
      title: t('console.engage.rep.colStatus'),
      width: 110,
      render: (d) => t(`console.engage.rep.st_${d.status}`, { defaultValue: d.status }),
    },
    {
      key: 'dl',
      title: '',
      width: 60,
      align: 'right',
      render: (d) => (
        <IconButton
          icon="download"
          size="sm"
          label={t('console.engage.rep.downloadRun')}
          onPress={() => void downloadFile(d.file, `${d.report.replace(/\s+/g, '_')}.${d.format}`)}
        />
      ),
    },
  ];
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('console.engage.rep.deliveryLog')}
      subtitle={t('console.engage.rep.deliveryLogSub')}
      width={920}>
      <View style={{ marginHorizontal: -24, marginTop: -16 }}>
        <DataTable
          columns={columns}
          rows={q.data?.items ?? []}
          rowKey={(d) => d.id}
          dense
          empty={<Text color="muted">{q.isLoading ? t('console.engage.loading') : t('console.engage.rep.noDeliveries')}</Text>}
        />
      </View>
    </Dialog>
  );
}

function CustomBuilder({ visible, onClose, data }: { visible: boolean; onClose: () => void; data: ReportsData }) {
  const { t } = useTranslation();
  const toast = useToast();
  const client = useQueryClient();
  const modules = Object.keys(data.custom_modules);
  const [module, setModule] = useState(modules[0] ?? 'students');
  const [cols, setCols] = useState<string[]>([]);
  const [name, setName] = useState('');
  const catalog = data.custom_modules[module] ?? [];
  const save = useMutation({
    mutationFn: () =>
      reportsApi.saveCustom({ name: name.trim(), module, columns: catalog.map(([k]) => k).filter((k) => cols.includes(k)) }),
    onSuccess: (c) => {
      toast(t('console.engage.rep.customSaved', { name: c.name }));
      void client.invalidateQueries({ queryKey: ['console'] });
      setCols([]);
      setName('');
      onClose();
    },
    onError: (e) => toast(errorText(e, t('console.engage.somethingWrong')), 'danger'),
  });
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('console.engage.rep.customTitle')}
      subtitle={t('console.engage.rep.customDialogSub')}
      width={600}
      footer={
        <>
          <Button title={t('console.engage.cancel')} variant="ghost" onPress={onClose} />
          <Button
            title={t('console.engage.rep.saveToLibrary')}
            icon="plus"
            disabled={!name.trim() || !cols.length}
            loading={save.isPending}
            onPress={() => save.mutate()}
          />
        </>
      }>
      <TextField
        label={t('console.engage.rep.customName')}
        value={name}
        onChangeText={setName}
        maxLength={80}
        placeholder={t('console.engage.rep.customPlaceholder')}
      />
      <View style={{ gap: 8 }}>
        <FieldLabel>{t('console.engage.rep.module')}</FieldLabel>
        <SegmentedControl
          full={false}
          value={module}
          onChange={(m) => {
            setModule(m);
            setCols([]);
          }}
          options={modules.map((m) => ({ value: m, label: t(`console.engage.rep.mod_${m}`) }))}
        />
      </View>
      <View style={{ gap: 8 }}>
        <FieldLabel
          right={
            <Text variant="xs" color="muted">
              {t('console.engage.rep.nColumns', { count: cols.length })}
            </Text>
          }>
          {t('console.engage.rep.columns')}
        </FieldLabel>
        <View style={[styles.row, { flexWrap: 'wrap', rowGap: 10, columnGap: 18 }]}>
          {catalog.map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: cols.includes(key) }}
              accessibilityLabel={label}
              onPress={() => setCols((c) => (c.includes(key) ? c.filter((x) => x !== key) : [...c, key]))}
              style={[styles.row, pointer, { gap: 8, width: 240 }]}>
              <Checkbox checked={cols.includes(key)} label={label} decorative />
              <Text variant="sm">{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Text variant="xs" color="muted">
        {t('console.engage.rep.customHint')}
      </Text>
    </Dialog>
  );
}

function RangeDialog({
  visible,
  onClose,
  start,
  end,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  start: string;
  end: string;
  onApply: (from: string, to: string) => void;
}) {
  const { t } = useTranslation();
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(end);
  const today = isoDate(new Date());
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('console.engage.rep.dateRange')}
      width={520}
      footer={
        <>
          <Button title={t('console.engage.cancel')} variant="ghost" onPress={onClose} />
          <Button
            title={t('console.engage.rep.apply')}
            disabled={from > to}
            onPress={() => {
              onApply(from, to);
              onClose();
            }}
          />
        </>
      }>
      <View style={[styles.row, { gap: 12, alignItems: 'flex-start' }]}>
        <DateField label={t('console.engage.rep.from')} value={from} onChange={setFrom} max={to} sundays withYear style={{ flex: 1 }} />
        <DateField
          label={t('console.engage.rep.toLabel')}
          value={to}
          onChange={setTo}
          min={from}
          max={today}
          sundays
          withYear
          style={{ flex: 1 }}
        />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 18, padding: 22 },
  export: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  exportText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
  audited: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: 999 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  pillText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 16 },
  schedule: { gap: 12, paddingVertical: 12 },
  fmt: { height: 24, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  fmtText: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  libCard: { width: '23%', minHeight: 216, borderWidth: 1, borderRadius: 16, padding: 18, gap: 12 },
  dashed: { borderStyle: 'dashed', borderWidth: 1.5 },
});
