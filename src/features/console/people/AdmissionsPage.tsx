import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { StackedBar } from '@/features/charts/Stacked';
import { CardHead, Col, ConsolePage, Row, Swatch } from '@/features/console/Page';
import { DataTable } from '@/features/console/Table';
import { formatTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Avatar, Bar, Card, Hr, Icon, IconButton, Pill, pointer, Search, SegmentedControl, Text, TileIcon, useToast, Vr } from '@/ui';
import type { Pastel } from '@/theme/tokens';

import { tagText } from './admissionTags';
import { ApplicationDialog, NewEnquiryDialog } from './AdmissionDialogs';
import { peopleApi, STAGES, useAdmissions, type Admissions, type AppCard, type Source, type Stage } from './api';
import { dayMonth, dowDayMonth, errorText, FilterButton, ToolbarButton } from './kit';
import { gradeName } from './StudentsPage';

const SHOWN = 3;

/** Console: admissions pipeline and board (PAdmissions). */
export function AdmissionsPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [typed, setTyped] = useState('');
  const [f, setF] = useState<{ q: string; grade: string; source: string }>({ q: '', grade: '', source: '' });
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const query = useAdmissions(f);
  const data = query.data;
  useEffect(() => {
    const id = setTimeout(() => setF((cur) => (cur.q === typed.trim() ? cur : { ...cur, q: typed.trim() })), 300);
    return () => clearTimeout(id);
  }, [typed]);

  const cycle = data?.cycle;
  return (
    <ConsolePage
      title={cycle ? t('console.people.adm.title', { year: cycle.academic_year }) : t('console.people.adm.titlePlain')}
      crumbs={[{ label: t('console.people.crumb') }]}
      subtitle={
        cycle
          ? t('console.people.adm.subtitle', {
              starts: dayMonthYear(cycle.session_starts_on),
              closes: dayMonth(cycle.applications_close_on),
              count: data!.awaiting_approval,
            })
          : undefined
      }
      loading={query.isLoading}
      error={query.error}
      onRetry={query.refetch}
      gap={28}
      actions={
        <>
          <SegmentedControl
            full={false}
            options={[
              { value: 'board', label: t('console.people.adm.board'), icon: 'layers' },
              { value: 'list', label: t('console.people.adm.list'), icon: 'list' },
            ]}
            value={view}
            onChange={setView}
          />
          <ToolbarButton icon="send" label={t('console.people.adm.share')} disabled hint={t('console.people.adm.shareHint')} />
          <ToolbarButton icon="plus" label={t('console.people.adm.new')} primary onPress={() => setAdding(true)} disabled={!cycle} />
        </>
      }>
      {data && !cycle ? (
        <Card pad={22}>
          <Text variant="sm" color="muted">
            {t('console.people.adm.noCycle')}
          </Text>
        </Card>
      ) : null}
      {data && cycle ? (
        <>
          <Row gap={20} align="stretch">
            <Col span={8} style={{ flexDirection: 'row' }}>
              <Pipeline data={data} />
            </Col>
            <Col span={4} style={{ flexDirection: 'row' }}>
              <Seats data={data} />
            </Col>
          </Row>
          <View style={{ gap: 14 }}>
            <View style={styles.boardHead}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                <Text variant="h2">{t(view === 'board' ? 'console.people.adm.board' : 'console.people.adm.list')}</Text>
                <Text variant="sm" color="muted">
                  {t('console.people.adm.boardSub')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Search
                  value={typed}
                  onChangeText={setTyped}
                  placeholder={t('console.people.adm.search')}
                  style={{ width: 240, height: 36 }}
                />
                <FilterButton
                  label={t('console.people.adm.grade')}
                  allLabel={t('console.people.adm.gradeAll')}
                  value={f.grade}
                  options={data.facets.grades.map((g) => ({ value: g, label: gradeName(t, g) }))}
                  onChange={(grade) => setF((cur) => ({ ...cur, grade }))}
                />
                <FilterButton
                  label={t('console.people.adm.source')}
                  allLabel={t('console.people.adm.sourceAll')}
                  value={f.source as Source | ''}
                  options={data.facets.sources.map((s) => ({ value: s, label: t(`console.people.adm.src.${s}`) }))}
                  onChange={(source) => setF((cur) => ({ ...cur, source }))}
                />
              </View>
            </View>
            {view === 'board' ? <Board data={data} onOpen={setOpen} /> : <List data={data} onOpen={setOpen} />}
          </View>
        </>
      ) : null}
      <NewEnquiryDialog visible={adding} grades={data?.facets.grades ?? []} onClose={() => setAdding(false)} />
      {open && data ? <ApplicationDialog id={open} classes={data.classes} onClose={() => setOpen(null)} /> : null}
    </ConsolePage>
  );
}

function dayMonthYear(iso: string): string {
  return `${dayMonth(iso)} ${iso.slice(0, 4)}`;
}

/* ------------------------------------------------------------------------------------------------ pipeline */

function Pipeline({ data }: { data: Admissions }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = data.funnel;
  const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n)}%`);
  const steps = [
    { key: 'enquiries', value: f.enquiries, sub: t('console.people.adm.stillOpen', { count: f.still_open }) },
    { key: 'applications', value: f.applications, sub: t('console.people.adm.conversion', { pct: pct(f.application_rate) }) },
    { key: 'assessed', value: f.assessed, sub: t('console.people.adm.conversion', { pct: pct(f.assessed_rate) }) },
    { key: 'offers', value: f.offers, sub: t('console.people.adm.conversion', { pct: pct(f.offer_rate) }) },
    { key: 'admitted', value: f.admitted, sub: t('console.people.adm.accepted', { pct: pct(f.accepted_rate) }) },
  ];
  const colorsBy: Record<Source, string> = { website: colors.c1, walk_in: colors.c2, referral: colors.c3, social: colors.c4 };
  const d = data.dates;
  return (
    <Card pad={22} style={{ gap: 20, flex: 1 }}>
      <CardHead
        title={t('console.people.adm.pipeline')}
        subtitle={t('console.people.adm.pipelineSub', { date: dayMonthYear(data.cycle!.enquiries_open_on) })}
        right={
          data.updated_at ? (
            <Text variant="xs" color="muted" weight={600}>
              {t('console.people.adm.updated', { time: formatTime(data.updated_at) })}
            </Text>
          ) : undefined
        }
      />
      <View
        style={{ flexDirection: 'row', alignItems: 'stretch' }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('console.people.adm.funnelLabel', {
          e: f.enquiries,
          a: f.applications,
          s: f.assessed,
          o: f.offers,
          d: f.admitted,
        })}>
        {steps.map((s, i) => (
          <Fragment key={s.key}>
            {i ? <Vr /> : null}
            <View style={{ flex: 1, minWidth: 0, gap: 8, paddingLeft: i ? 18 : 0, paddingRight: i < steps.length - 1 ? 18 : 0 }}>
              <Text variant="eyebrow" color="muted">
                {t(`console.people.adm.step.${s.key}`)}
              </Text>
              <Text variant="kpiSm">{s.value}</Text>
              <Bar value={s.value} max={Math.max(1, f.enquiries)} size="thin" />
              <Text variant="xs" color="muted">
                {s.sub}
              </Text>
            </View>
          </Fragment>
        ))}
      </View>
      <Hr />
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="sm" weight={700}>
            {t('console.people.adm.sources')}
          </Text>
          <Text variant="xs" color="muted">
            {t('console.people.adm.enquiries', { count: f.enquiries })}
          </Text>
        </View>
        <StackedBar
          height={10}
          segments={data.sources.map((s) => ({
            value: s.count,
            color: colorsBy[s.source],
            label: t(`console.people.adm.src.${s.source}`),
          }))}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
          {data.sources.map((s) => (
            <View key={s.source} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Swatch color={colorsBy[s.source]} />
              <Text variant="xs" color="ink2" weight={600}>
                {t(`console.people.adm.srcLong.${s.source}`)}
              </Text>
              <Text variant="xs" weight={700} num>
                {s.count}
              </Text>
              <Text variant="xs" color="muted" num>
                {`· ${s.percent === null ? 0 : Math.round(s.percent)}%`}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Hr />
      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        <DateItem
          icon="clipboard"
          label={t('console.people.adm.nextAssessment')}
          value={
            d.next_assessment
              ? t('console.people.adm.children', { date: dowDayMonth(d.next_assessment.date), count: d.next_assessment.children })
              : t('console.people.adm.noneBooked')
          }
        />
        <Vr />
        <DateItem
          icon="mail"
          label={d.next_offer_round?.name ?? t('console.people.adm.offerRound')}
          value={d.next_offer_round ? dowDayMonth(d.next_offer_round.on) : t('console.people.adm.noRound')}
          pad
        />
        <Vr />
        <DateItem icon="calendar" label={t('console.people.adm.close')} value={dowDayMonth(d.applications_close_on)} pad />
      </View>
    </Card>
  );
}

function DateItem({ icon, label, value, pad }: { icon: 'clipboard' | 'mail' | 'calendar'; label: string; value: string; pad?: boolean }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: pad ? 18 : 0 }}>
      <TileIcon icon={icon} size="sm" />
      <View>
        <Text variant="xs" color="muted" weight={600}>
          {label}
        </Text>
        <Text variant="sm" weight={700}>
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------ seats */

function Seats({ data }: { data: Admissions }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = data.seats;
  const cell = { paddingVertical: 10, paddingHorizontal: 12 };
  return (
    <Card pad={0} style={{ overflow: 'hidden', flex: 1 }}>
      <View style={{ paddingTop: 20, paddingHorizontal: 22, paddingBottom: 14 }}>
        <CardHead
          title={t('console.people.adm.seats', { year: data.cycle!.academic_year })}
          subtitle={t('console.people.adm.seatsSub', { count: s.offers_outstanding })}
          right={<Pill label={t('console.people.adm.open', { count: s.open })} tone="ok" />}
        />
      </View>
      <View accessibilityRole={'table' as never}>
        <View style={[styles.seatRow, { backgroundColor: colors.subtle, borderBottomColor: colors.line }]}>
          {(['grade', 'seatsCol', 'admitted', 'openCol'] as const).map((k, i) => (
            <Text key={k} style={[styles.th, { color: colors.muted, flex: i ? 0.8 : 1.3, textAlign: i ? 'right' : 'left', ...cell }]}>
              {t(`console.people.adm.${k}`)}
            </Text>
          ))}
        </View>
        {s.rows.map((r) => (
          <View key={r.id} style={[styles.seatRow, { borderBottomColor: colors.line }]}>
            <Text variant="sm" weight={600} style={{ flex: 1.3, ...cell }}>
              {r.label}
            </Text>
            <Text variant="sm" num align="right" style={{ flex: 0.8, ...cell }}>
              {r.seats}
            </Text>
            <View style={{ flex: 0.8, ...cell, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              <Bar value={r.admitted} max={Math.max(1, r.seats)} size="thin" style={{ width: 40 }} />
              <Text variant="sm" weight={600} num align="right" style={{ width: 18 }}>
                {r.admitted}
              </Text>
            </View>
            <Text variant="sm" weight={700} num align="right" style={{ flex: 0.8, ...cell }}>
              {r.open}
            </Text>
          </View>
        ))}
        <View style={[styles.seatRow, { backgroundColor: colors.subtle, borderBottomWidth: 0 }]}>
          <Text variant="sm" weight={700} style={{ flex: 1.3, ...cell }}>
            {t('console.people.adm.total')}
          </Text>
          {[s.seats, s.admitted, s.open].map((v, i) => (
            <Text key={i} variant="sm" weight={700} num align="right" style={{ flex: 0.8, ...cell }}>
              {v}
            </Text>
          ))}
        </View>
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------------------------------------------ board */

function pastelFor(c: AppCard): Pastel | null {
  if (c.stage === 'documents' && c.approval_id && c.tag.kind === 'verified') return 'blue';
  if (c.tag.kind === 'form_fee_paid') return 'butter';
  if (c.stage === 'enquiry' && c.tag.kind === 'call_back' && c.tag.date && c.tag.date <= new Date().toISOString().slice(0, 10))
    return 'blue';
  if (c.stage === 'enquiry' || c.stage === 'application') return 'lav';
  return null;
}

function Board({ data, onOpen }: { data: Admissions; onOpen: (id: string) => void }) {
  const [expanded, setExpanded] = useState<Set<Stage>>(new Set());
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      {data.columns.map((col) => {
        const all = expanded.has(col.stage);
        return (
          <Column
            key={col.stage}
            stage={col.stage}
            count={col.count}
            items={all ? col.items : col.items.slice(0, SHOWN)}
            more={col.count - SHOWN}
            expanded={all}
            onToggle={() => {
              const next = new Set(expanded);
              if (all) next.delete(col.stage);
              else next.add(col.stage);
              setExpanded(next);
            }}
            onOpen={onOpen}
          />
        );
      })}
    </View>
  );
}

function Column({
  stage,
  count,
  items,
  more,
  expanded,
  onToggle,
  onOpen,
}: {
  stage: Stage;
  count: number;
  items: AppCard[];
  more: number;
  expanded: boolean;
  onToggle: () => void;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View
      style={[styles.column, { backgroundColor: colors.subtle, borderColor: colors.line }]}
      accessibilityLabel={`${t(`console.people.adm.stage.${stage}`)}, ${count}`}>
      <View style={styles.colHead}>
        <Text variant="sm" weight={700}>
          {t(`console.people.adm.stage.${stage}`)}
        </Text>
        <View style={[styles.countPill, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.ink2 }}>{count}</Text>
        </View>
      </View>
      {items.map((c) => (
        <BoardCard key={c.id} c={c} onOpen={() => onOpen(c.id)} />
      ))}
      {!count ? (
        <Text variant="xs" color="muted" align="center" style={{ paddingVertical: 10 }}>
          {t('console.people.adm.emptyCol')}
        </Text>
      ) : null}
      {more > 0 ? (
        <Pressable accessibilityRole="button" onPress={onToggle} style={[styles.more, pointer]}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.muted }}>
            {expanded ? t('console.people.adm.fewer') : t('console.people.adm.more', { count: more })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function BoardCard({ c, onOpen }: { c: AppCard; onOpen: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const tag = tagText(t, c);
  const pastel = pastelFor(c);
  const awaiting = c.stage === 'documents' && !!c.approval_id;
  const decide = useMutation({
    mutationFn: (d: 'approve' | 'decline') => peopleApi.decide(c.id, d, d === 'decline' ? t('console.people.adm.declineNote') : ''),
    onSuccess: (_r, d) => {
      qc.invalidateQueries({ queryKey: ['console'] });
      toast(t(d === 'approve' ? 'console.people.adm.approved' : 'console.people.adm.declined', { name: c.child }));
    },
    onError: (e) => toast(errorText(e, t('console.people.failed')), 'danger'),
  });
  return (
    <Card
      pastel={pastel ?? undefined}
      pad={10}
      style={[{ borderRadius: 14, gap: 8, boxShadow: 'none' }, awaiting && { borderWidth: 1, borderColor: colors.brandLine }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('console.people.adm.openCard', { name: c.child })}
        onPress={onOpen}
        style={[{ gap: 8 }, pointer]}>
        <View style={styles.cardRow}>
          <Text variant="sm" weight={700} numberOfLines={1} style={{ flexShrink: 1 }}>
            {c.child}
          </Text>
          <Text variant="xxs" color="muted" weight={600} num numberOfLines={1}>
            {c.date_is_slot ? dowDayMonth(c.date).split(' ').slice(0, 2).join(' ') : dayMonth(c.date)}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Text variant="xs" weight={600} color="ink2">
            {gradeName(t, c.grade)}
          </Text>
          <Pill label={t(`console.people.adm.src.${c.source}`)} tone="outline" dot={false} style={{ height: 20, paddingHorizontal: 8 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Avatar initials={c.guardian.initials} seed={c.guardian.name} size="xs" />
          <Text variant="xs" color="ink2" numberOfLines={1} style={{ flexShrink: 1 }}>
            {c.guardian.name}
          </Text>
        </View>
        {tag ? <Pill label={tag.text} tone={tag.tone} dot={false} style={{ alignSelf: 'stretch' }} /> : null}
        {c.tag.kind === 'fee_paid' && c.tag.receipt ? (
          <Text variant="xxs" color="muted">
            {t('console.people.adm.receipt', { no: c.tag.receipt })}
          </Text>
        ) : null}
        {awaiting ? (
          <Text variant="xs" weight={700} rawColor={colors.brand}>
            {t('console.people.adm.awaiting')}
          </Text>
        ) : null}
      </Pressable>
      {awaiting ? (
        <>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('console.people.adm.approveFor', { name: c.child })}
              disabled={decide.isPending}
              onPress={() => decide.mutate('approve')}
              style={[styles.approve, pointer, { backgroundColor: colors.okSoft }]}>
              <Icon name="check" size={14} rawColor={colors.ok} />
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ok }}>{t('console.people.adm.approve')}</Text>
            </Pressable>
            <IconButton
              icon="close"
              size={32}
              variant="bad"
              label={t('console.people.adm.declineFor', { name: c.child })}
              onPress={() => decide.mutate('decline')}
              disabled={decide.isPending}
            />
          </View>
        </>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------------------------------------ list */

function List({ data, onOpen }: { data: Admissions; onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  const rows = STAGES.flatMap((s) => data.columns.find((c) => c.stage === s)?.items ?? []);
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        onRowPress={(r) => onOpen(r.id)}
        empty={
          <Text variant="sm" color="muted">
            {t('console.people.adm.emptyList')}
          </Text>
        }
        columns={[
          {
            key: 'c',
            flex: 1.6,
            title: t('console.people.adm.col.child'),
            render: (r) => (
              <View>
                <Text variant="sm" weight={700}>
                  {r.child}
                </Text>
                <Text variant="xs" color="muted" num>
                  {r.application_no}
                </Text>
              </View>
            ),
          },
          { key: 'g', width: 110, title: t('console.people.adm.grade'), render: (r) => gradeName(t, r.grade) },
          { key: 's', width: 130, title: t('console.people.adm.col.stage'), render: (r) => t(`console.people.adm.stage.${r.stage}`) },
          {
            key: 'src',
            width: 120,
            title: t('console.people.adm.source'),
            render: (r) => <Pill label={t(`console.people.adm.src.${r.source}`)} tone="outline" dot={false} />,
          },
          { key: 'p', flex: 1.2, title: t('console.people.adm.col.parent'), render: (r) => r.guardian.name },
          {
            key: 'n',
            width: 200,
            title: t('console.people.adm.col.next'),
            render: (r) => {
              const tag = tagText(t, r);
              return tag ? <Pill label={tag.text} tone={tag.tone} dot={false} /> : '—';
            },
          },
          { key: 'd', width: 100, title: t('console.people.adm.col.updated'), render: (r) => dayMonth(r.date) },
        ]}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  boardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  column: { flex: 1, minWidth: 0, padding: 8, gap: 8, borderRadius: 16, borderWidth: 1 },
  colHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  countPill: { height: 24, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  more: { height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  approve: { flex: 1, height: 32, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  seatRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  th: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.88, textTransform: 'uppercase' },
});
