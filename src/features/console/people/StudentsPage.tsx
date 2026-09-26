import type { TFunction } from 'i18next';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { num } from '@/features/console/format';
import { ConsolePage } from '@/features/console/Page';
import { DataTable, type Column } from '@/features/console/Table';
import { downloadFile } from '@/lib/download';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Avatar, Bar, Card, Chip, Icon, ICON_SIZE, IconButton, Pill, pointer, Search, Text, useToast } from '@/ui';

import { AddStudentDialog, MessageParentsDialog } from './StudentDialogs';
import { directoryQuery, useDirectory, type Chip as ChipKey, type DirectoryParams, type StudentRow } from './api';
import { AuditedPill, dayMonth, FilterButton, Popover, ToolbarButton } from './kit';

const CHIPS: ChipKey[] = ['all', 'absent', 'late', 'overdue', 'new'];
const OPTIONAL = ['attendance', 'ut2', 'fee', 'transport', 'parent'] as const;
type Optional = (typeof OPTIONAL)[number];
const PAGE_SIZES = [12, 25, 50];

/** Console: the student directory (PStudents). */
export function StudentsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const params = useLocalSearchParams<{ class?: string }>();
  const [p, setP] = useState<DirectoryParams>({
    chip: 'all',
    q: '',
    grade: '',
    section: '',
    class: params.class ?? '',
    transport: '',
    fee: '',
    sort: 'name',
    page: 1,
    pageSize: 12,
  });
  const [typed, setTyped] = useState('');
  const [selected, setSelected] = useState<Map<string, StudentRow>>(new Map());
  const [dense, setDense] = useState(false);
  const [hidden, setHidden] = useState<Set<Optional>>(new Set());
  const [adding, setAdding] = useState(false);
  const [messaging, setMessaging] = useState<StudentRow[] | null>(null);
  const [exporting, setExporting] = useState<'all' | 'selected' | null>(null);
  const query = useDirectory(p);
  const data = query.data;

  // Global search sends ?class=<id>; follow it when it changes.
  useEffect(() => {
    if (params.class !== undefined) setP((cur) => ({ ...cur, class: params.class ?? '', grade: '', section: '', page: 1 }));
  }, [params.class]);
  // Debounce the search box.
  useEffect(() => {
    const id = setTimeout(() => setP((cur) => (cur.q === typed.trim() ? cur : { ...cur, q: typed.trim(), page: 1 })), 300);
    return () => clearTimeout(id);
  }, [typed]);

  const set = (patch: Partial<DirectoryParams>) => setP((cur) => ({ ...cur, page: 1, ...patch }));
  const classLabel = data?.facets.classes.find((c) => c.id === p.class)?.label;

  const exportCsv = async (ids?: string[]) => {
    setExporting(ids ? 'selected' : 'all');
    try {
      const qs = ids ? `ids=${ids.join(',')}` : directoryQuery(p, false);
      await downloadFile(`/console/students/export?${qs}`, `students-${new Date().toISOString().slice(0, 10)}.csv`);
      toast(t('console.people.students.exported', { count: ids?.length ?? data?.total ?? 0 }));
    } catch {
      toast(t('console.people.students.exportFailed'), 'danger');
    } finally {
      setExporting(null);
    }
  };

  const summary = data?.summary;
  const subtitle = summary
    ? t('console.people.students.subtitle', {
        enrolled: num(summary.enrolled),
        sections: summary.sections,
        from: gradeName(t, summary.first_grade ?? ''),
        to: summary.last_grade ?? '',
        year: summary.academic_year ?? '',
      })
    : undefined;

  return (
    <ConsolePage
      title={t('console.people.students.title')}
      crumbs={[{ label: t('console.people.crumb') }]}
      subtitle={subtitle}
      loading={query.isLoading}
      error={query.error}
      onRetry={query.refetch}
      gap={24}
      actions={
        <>
          <ToolbarButton
            label={t('console.people.students.export')}
            icon="download"
            busy={exporting === 'all'}
            onPress={() => exportCsv()}
            trailing={<AuditedPill label={t('console.people.audited')} />}
          />
          <ToolbarButton label={t('console.people.students.add')} icon="userPlus" primary onPress={() => setAdding(true)} />
        </>
      }>
      {data ? (
        <>
          <View style={styles.chips} accessibilityRole="toolbar" accessibilityLabel={t('console.people.students.quickFilters')}>
            {CHIPS.map((c) => (
              <Chip
                key={c}
                label={t(`console.people.students.chip.${c}`)}
                count={num(data.counts[c])}
                selected={p.chip === c}
                onPress={() => set({ chip: c })}
              />
            ))}
          </View>
          <Card pad={0} style={{ overflow: 'hidden' }}>
            <Toolbar
              p={p}
              typed={typed}
              setTyped={setTyped}
              set={set}
              data={data}
              classLabel={classLabel}
              dense={dense}
              setDense={setDense}
              hidden={hidden}
              setHidden={setHidden}
            />
            {selected.size ? (
              <BulkBar
                rows={[...selected.values()]}
                onClear={() => setSelected(new Map())}
                onMessage={() => setMessaging([...selected.values()])}
                onExport={() => exportCsv([...selected.keys()])}
                exporting={exporting === 'selected'}
              />
            ) : null}
            <Table
              rows={data.items}
              selected={selected}
              setSelected={setSelected}
              dense={dense}
              hidden={hidden}
              sort={p.sort}
              onSort={() => set({ sort: p.sort === 'name' ? '-name' : 'name' })}
              onMessage={(r) => setMessaging([r])}
            />
            <Foot data={data} p={p} setP={setP} />
          </Card>
        </>
      ) : null}
      <AddStudentDialog
        visible={adding}
        classes={data?.facets.classes ?? []}
        onClose={() => setAdding(false)}
        onDone={(id) => {
          setAdding(false);
          router.navigate(`/console/students/${id}` as Href);
        }}
      />
      {messaging ? (
        <MessageParentsDialog
          students={messaging}
          onClose={() => setMessaging(null)}
          onSent={() => {
            setMessaging(null);
            setSelected(new Map());
          }}
        />
      ) : null}
    </ConsolePage>
  );
}

export function gradeName(t: TFunction, grade: string): string {
  return /^\d+$/.test(grade) ? t('console.people.grade', { grade }) : grade;
}

/* ------------------------------------------------------------------------------------------------ toolbar */

function Toolbar({
  p,
  typed,
  setTyped,
  set,
  data,
  classLabel,
  dense,
  setDense,
  hidden,
  setHidden,
}: {
  p: DirectoryParams;
  typed: string;
  setTyped: (v: string) => void;
  set: (patch: Partial<DirectoryParams>) => void;
  data: NonNullable<ReturnType<typeof useDirectory>['data']>;
  classLabel?: string;
  dense: boolean;
  setDense: (v: boolean) => void;
  hidden: Set<Optional>;
  setHidden: (v: Set<Optional>) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const fees = ['paid', 'due', 'overdue'] as const;
  return (
    <View style={styles.toolbar}>
      <View style={styles.toolbarLeft}>
        <Search
          value={typed}
          onChangeText={setTyped}
          placeholder={t('console.people.students.search')}
          style={{ width: 290, height: 36 }}
        />
        {p.class && classLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('console.people.students.clearClass', { label: classLabel })}
            onPress={() => set({ class: '' })}
            style={[styles.classPill, pointer, { backgroundColor: colors.brandSoft, borderColor: colors.brandLine }]}>
            <Text style={[styles.smText, { color: colors.brandInk }]}>
              {t('console.people.students.classFilter', { label: classLabel })}
            </Text>
            <Icon name="close" size={12} rawColor={colors.brandInk} />
          </Pressable>
        ) : null}
        <FilterButton
          label={t('console.people.students.filter.grade')}
          allLabel={t('console.people.students.filter.allGrades')}
          value={p.grade}
          options={data.facets.grades.map((g) => ({ value: g, label: gradeName(t, g) }))}
          onChange={(v) => set({ grade: v, class: '' })}
        />
        <FilterButton
          label={t('console.people.students.filter.section')}
          allLabel={t('console.people.students.filter.allSections')}
          value={p.section}
          options={data.facets.sections.map((s) => ({ value: s, label: s }))}
          onChange={(v) => set({ section: v, class: '' })}
        />
        <FilterButton
          label={t('console.people.students.filter.transport')}
          allLabel={t('console.people.students.filter.allTransport')}
          value={p.transport}
          options={[
            { value: 'none', label: t('console.people.students.walks') },
            ...data.facets.routes.map((r) => ({ value: r.id, label: r.label })),
          ]}
          onChange={(v) => set({ transport: v })}
        />
        <FilterButton
          label={t('console.people.students.filter.fee')}
          allLabel={t('console.people.students.filter.allFees')}
          value={p.fee}
          options={fees.map((f) => ({ value: f, label: t(`console.people.students.feeFilter.${f}`) }))}
          onChange={(v) => set({ fee: v })}
        />
      </View>
      <View style={styles.toolbarRight}>
        <Pressable accessibilityRole="button" onPress={() => set({ sort: p.sort === 'name' ? '-name' : 'name' })} style={pointer}>
          <Text variant="xs" color="muted" weight={600}>
            {t(p.sort === '-name' ? 'console.people.students.sortedZA' : 'console.people.students.sortedAZ')}
          </Text>
        </Pressable>
        <IconButton
          icon="list"
          size="sm"
          label={t(dense ? 'console.people.students.densityCompact' : 'console.people.students.densityComfortable')}
          onPress={() => setDense(!dense)}
          iconColor={dense ? colors.brand : undefined}
        />
        <Popover
          align="right"
          width={200}
          items={OPTIONAL.map((c) => ({
            key: c,
            label: t(`console.people.students.col.${c}`),
            selected: !hidden.has(c),
            onPress: () => {
              const next = new Set(hidden);
              if (next.has(c)) next.delete(c);
              else next.add(c);
              setHidden(next);
            },
          }))}>
          {(open) => <ToolbarButton size="sm" icon="sliders" label={t('console.people.students.columns')} onPress={open} />}
        </Popover>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------ bulk */

function BulkBar({
  rows,
  onClear,
  onMessage,
  onExport,
  exporting,
}: {
  rows: StudentRow[];
  onClear: () => void;
  onMessage: () => void;
  onExport: () => void;
  exporting: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const names = rows.slice(0, 2).map((r) => `${r.name} (${r.class.label})`);
  const more = rows.length - names.length;
  const allOverdue = rows.every((r) => r.fee.status === 'overdue');
  const text = [
    names.join(' · ') + (more > 0 ? ` ${t('console.people.students.bulk.more', { count: more })}` : ''),
    allOverdue ? t('console.people.students.bulk.allOverdue', { count: rows.length }) : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View
      style={[styles.bulk, { backgroundColor: colors.brandSoft, borderColor: colors.brandLine }]}
      accessibilityRole="toolbar"
      accessibilityLabel={t('console.people.students.bulk.label')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="checkCircle" size={ICON_SIZE.sm} rawColor={colors.brand} />
        <Text variant="sm" weight={700} rawColor={colors.brand}>
          {t('console.people.students.bulk.selected', { count: rows.length })}
        </Text>
      </View>
      <Text variant="xs" color="ink2" numberOfLines={1} style={{ flexShrink: 1 }}>
        {text}
      </Text>
      <View style={{ flex: 1 }} />
      <ToolbarButton size="sm" icon="chat" label={t('console.people.students.bulk.message')} onPress={onMessage} />
      <ToolbarButton
        size="sm"
        icon="download"
        label={t('console.people.students.export')}
        busy={exporting}
        onPress={onExport}
        trailing={
          <Text variant="xxs" color="muted" weight={600}>
            {t('console.people.students.bulk.audited')}
          </Text>
        }
      />
      <Pressable accessibilityRole="button" onPress={onClear} style={[styles.ghost, pointer]}>
        <Text style={[styles.smText, { color: colors.ink2 }]}>{t('console.people.students.bulk.clear')}</Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------ table */

function Table({
  rows,
  selected,
  setSelected,
  dense,
  hidden,
  sort,
  onSort,
  onMessage,
}: {
  rows: StudentRow[];
  selected: Map<string, StudentRow>;
  setSelected: (m: Map<string, StudentRow>) => void;
  dense: boolean;
  hidden: Set<Optional>;
  sort: string;
  onSort: () => void;
  onMessage: (r: StudentRow) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const open = (r: StudentRow) => router.navigate(`/console/students/${r.id}` as Href);
  const columns: Column<StudentRow>[] = [
    {
      key: 'student',
      flex: 2.1,
      title: (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('console.people.students.sortByName')}
          onPress={onSort}
          style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, pointer]}>
          <Text style={[styles.th, { color: colors.ink2 }]}>{t('console.people.students.col.student')}</Text>
          <Icon name={sort === '-name' ? 'chevronDown' : 'chevronUp'} size={12} rawColor={colors.ink2} />
        </Pressable>
      ),
      render: (r) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar initials={r.initials} seed={r.name} size="sm" />
          <View style={{ gap: 1, flexShrink: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="sm" weight={700} numberOfLines={1} style={{ flexShrink: 1 }}>
                {r.name}
              </Text>
              {r.is_new ? (
                <Pill label={t('console.people.students.new')} tone="info" dot={false} style={{ height: 20, paddingHorizontal: 8 }} />
              ) : null}
            </View>
            <Text variant="xs" color="muted" num>
              {r.admission_no}
            </Text>
          </View>
        </View>
      ),
    },
    {
      key: 'class',
      width: 84,
      title: t('console.people.students.col.class'),
      render: (r) => (
        <Text variant="sm" weight={600}>
          {r.class.label}
        </Text>
      ),
    },
    {
      key: 'roll',
      width: 68,
      align: 'right',
      title: t('console.people.students.col.roll'),
      render: (r) => (
        <Text variant="sm" num>
          {String(r.roll_no).padStart(2, '0')}
        </Text>
      ),
    },
    {
      key: 'attendance',
      width: 156,
      title: t('console.people.students.col.attendance'),
      render: (r) =>
        r.attendance === null ? (
          <Text variant="sm" color="muted">
            —
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Bar
              value={r.attendance}
              size="thin"
              tone={r.attendance < 80 ? 'bad' : r.attendance < 90 ? 'warn' : 'brand'}
              style={{ width: 60 }}
              accessibilityLabel={`${r.attendance}%`}
            />
            <Text variant="sm" weight={600} num>
              {r.attendance >= 100 ? '100%' : `${r.attendance.toFixed(1)}%`}
            </Text>
          </View>
        ),
    },
    {
      key: 'ut2',
      width: 92,
      align: 'right',
      title: t('console.people.students.col.ut2'),
      render: (r) => (
        <Text variant="sm" weight={600} num color={r.ut2 === null ? 'muted' : undefined}>
          {r.ut2 ?? '—'}
        </Text>
      ),
    },
    { key: 'fee', width: 140, title: t('console.people.students.col.fee'), render: (r) => <FeePill fee={r.fee} /> },
    {
      key: 'transport',
      width: 144,
      title: t('console.people.students.col.transport'),
      render: (r) => (
        <Text variant="sm" color="ink2" numberOfLines={1}>
          {r.transport ? r.transport.route : t('console.people.students.walks')}
        </Text>
      ),
    },
    {
      key: 'parent',
      flex: 1.3,
      title: t('console.people.students.col.parent'),
      render: (r) =>
        r.parent ? (
          <View style={{ gap: 1 }}>
            <Text variant="sm" weight={600} numberOfLines={1}>
              {r.parent.name}
            </Text>
            <Text variant="xs" color="muted" num numberOfLines={1}>
              {r.parent.phone_masked}
            </Text>
          </View>
        ) : (
          <Text variant="sm" color="muted">
            —
          </Text>
        ),
    },
    {
      key: 'menu',
      width: 48,
      align: 'right',
      title: <Text style={{ width: 1, height: 1, overflow: 'hidden' }}>{t('console.people.students.col.actions')}</Text>,
      render: (r) => (
        <Popover
          align="right"
          items={[
            { key: 'open', label: t('console.people.students.menu.open'), icon: 'user', onPress: () => open(r) },
            { key: 'msg', label: t('console.people.students.menu.message'), icon: 'chat', onPress: () => onMessage(r) },
            {
              key: 'print',
              label: t('console.people.students.menu.print'),
              icon: 'print',
              onPress: () =>
                downloadFile(`/console/students/${r.id}/report-card.pdf`, `${r.name.replace(/ /g, '_')}_report_card.pdf`).catch(() =>
                  toast(t('console.people.students.printFailed'), 'danger'),
                ),
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
  ];
  const visible = columns.filter((c) => !hidden.has(c.key as Optional));
  const asSet = useMemo(() => new Set(selected.keys()), [selected]);
  return (
    <DataTable
      columns={visible}
      rows={rows}
      rowKey={(r) => r.id}
      onRowPress={open}
      dense={dense}
      rowHeight={dense ? undefined : 64}
      empty={
        <Text variant="sm" color="muted">
          {t('console.people.students.empty')}
        </Text>
      }
      selection={{
        selected: asSet,
        allLabel: t('console.people.students.selectAll'),
        label: (r) => t('console.people.students.select', { name: r.name }),
        onChange: (next) => {
          const m = new Map<string, StudentRow>();
          for (const [id, row] of selected) if (next.has(id)) m.set(id, row);
          for (const r of rows) if (next.has(r.id)) m.set(r.id, r);
          setSelected(m);
        },
      }}
    />
  );
}

export function FeePill({ fee }: { fee: StudentRow['fee'] }) {
  const { t } = useTranslation();
  if (fee.status === 'paid') return <Pill label={t('console.people.fee.paid')} tone="ok" />;
  if (fee.status === 'overdue') return <Pill label={t('console.people.fee.overdue')} tone="bad" />;
  if (fee.status === 'due')
    return <Pill label={t('console.people.fee.due', { date: fee.due_on ? dayMonth(fee.due_on) : '' })} tone="warn" />;
  return <Pill label={t('console.people.fee.none')} tone="neutral" dot={false} />;
}

/* ------------------------------------------------------------------------------------------------ foot */

function Foot({
  data,
  p,
  setP,
}: {
  data: NonNullable<ReturnType<typeof useDirectory>['data']>;
  p: DirectoryParams;
  setP: (fn: (cur: DirectoryParams) => DirectoryParams) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const from = data.total ? (data.page - 1) * data.page_size + 1 : 0;
  const to = Math.min(data.total, data.page * data.page_size);
  const go = (page: number) => setP((cur) => ({ ...cur, page }));
  const pages = pageList(data.page, data.pages);
  return (
    <View style={[styles.foot, { borderTopColor: colors.line }]}>
      <Text variant="sm" color="muted" style={{ flex: 1 }}>
        {t('console.people.students.showing', { from: num(from), to: num(to), total: num(data.total) })}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityRole={'navigation' as never}>
        <IconButton
          icon="chevronLeft"
          size="sm"
          label={t('console.shell.prev')}
          disabled={data.page <= 1}
          onPress={() => go(data.page - 1)}
        />
        {pages.map((n, i) =>
          n === 0 ? (
            <Text key={`gap${i}`} variant="sm" color="muted" style={{ width: 24, textAlign: 'center' }}>
              …
            </Text>
          ) : (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={t('console.people.students.page', { n })}
              accessibilityState={{ selected: n === data.page }}
              onPress={() => go(n)}
              style={[styles.pageBtn, pointer, n === data.page && { backgroundColor: colors.ink }]}>
              <Text style={[styles.pageText, { color: n === data.page ? colors.surface : colors.ink2 }]}>{n}</Text>
            </Pressable>
          ),
        )}
        <IconButton
          icon="chevronRight"
          size="sm"
          label={t('console.shell.next')}
          disabled={data.page >= data.pages}
          onPress={() => go(data.page + 1)}
        />
      </View>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Popover
          align="right"
          width={150}
          items={PAGE_SIZES.map((n) => ({
            key: String(n),
            label: t('console.people.students.perPage', { n }),
            selected: n === p.pageSize,
            onPress: () => setP((cur) => ({ ...cur, pageSize: n, page: 1 })),
          }))}>
          {(open) => (
            <Pressable accessibilityRole="button" onPress={open} style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, pointer]}>
              <Text variant="sm" weight={600} color="ink2">
                {t('console.people.students.perPage', { n: p.pageSize })}
              </Text>
              <Icon name="chevronDown" size={14} rawColor={colors.ink2} />
            </Pressable>
          )}
        </Popover>
      </View>
    </View>
  );
}

/** 1 2 3 … 104 style page list (0 = gap). */
function pageList(page: number, pages: number): number[] {
  if (pages <= 6) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, 2, 3, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: number[] = [];
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) out.push(0);
    out.push(n);
  });
  return out;
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexWrap: 'wrap',
  },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  classPill: { height: 32, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  smText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 16 },
  bulk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 18,
    marginBottom: 14,
    paddingVertical: 7,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  ghost: { height: 32, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 10 },
  th: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.88, textTransform: 'uppercase' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 18, borderTopWidth: 1 },
  pageBtn: { minWidth: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  pageText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 16 },
});
