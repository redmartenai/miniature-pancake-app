import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { BarChart, type BarDatum } from '@/features/charts/BarChart';
import { MonthBlocks } from '@/features/charts/Stacked';
import { inrShort } from '@/features/console/format';
import { CardHead, Col, ConsolePage, Row } from '@/features/console/Page';
import { downloadFile } from '@/lib/download';
import { formatDate, formatInr, formatTime, monthName, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  Card,
  cardShadow,
  Highlight,
  Icon,
  ICON_SIZE,
  Kicker,
  Link,
  pointer,
  SegmentedControl,
  Stamp,
  TearCal,
  Text,
  useToast,
} from '@/ui';

import { useFees, type Family, type FeesPayload, type PeriodKey, type Receipt } from './api';
import { Ledger } from './Ledger';
import { ReceiptSheet, ReceiptsSheet } from './ReceiptSheet';
import { RemindSheet, type RemindTarget } from './RemindSheet';
import { GradeByGrade, Refunds, Structure } from './Sections';
import { periodName } from './util';

/** Console: Fees & Finance (PFees). */
export function FeesPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const params = useLocalSearchParams<{ receipt?: string }>();
  const [period, setPeriod] = useState<PeriodKey | undefined>();
  const query = useFees(period);
  const data = query.data;
  const key = data?.period.key ?? period;
  const [remind, setRemind] = useState<RemindTarget | null>(null);
  const [ledgerView, setLedgerView] = useState<{ segment: 'all' | 'over60' | 'never'; q: string; selected: Family[] }>({
    segment: 'all',
    q: '',
    selected: [],
  });
  const [allReceipts, setAllReceipts] = useState(false);
  const [sent, setSent] = useState(0);
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await downloadFile(`/console/fees/export?period=${data.period.key}`, `fees-${data.period.key}.csv`);
      toast(t('console.operations.fees.exportDone', { name: periodName(t, data.period) }));
    } catch {
      toast(t('console.operations.fees.exportFailed'), 'danger');
    } finally {
      setExporting(false);
    }
  };

  const openRemindAll = () => {
    if (!data) return;
    if (ledgerView.selected.length) setRemind({ kind: 'families', families: ledgerView.selected });
    else setRemind({ kind: 'all', segment: ledgerView.segment, q: ledgerView.q });
  };

  return (
    <ConsolePage
      title={t('console.operations.fees.title')}
      crumbs={[{ label: t('console.operations.fees.crumb') }]}
      subtitle={data ? t('console.operations.fees.subtitle', { year: data.academic_year ?? '', time: formatTime(data.as_of) }) : undefined}
      gap={28}
      loading={query.isLoading}
      error={query.error}
      onRetry={query.refetch}
      actions={
        data ? (
          <>
            <SegmentedControl
              full={false}
              fit
              options={data.periods.map((p) => ({ value: p.key, label: periodName(t, p) }))}
              value={data.period.key}
              onChange={(v) => setPeriod(v)}
            />
            <ExportButton onPress={exportCsv} busy={exporting} />
            <PrimaryButton label={t('console.operations.fees.sendReminders')} onPress={openRemindAll} disabled={!data.overdue.families} />
          </>
        ) : null
      }>
      {data ? (
        <>
          <Lead data={data} />
          <Collection data={data} />
          <Row gap={28}>
            <Col span={7}>
              <MonthByMonth data={data} />
            </Col>
            <Col span={5}>
              <ReceiptsToday data={data} onAll={() => setAllReceipts(true)} onOpen={(r) => router.setParams({ receipt: r.id })} />
            </Col>
          </Row>
          <Ledger
            data={data}
            period={key!}
            onChange={setLedgerView}
            resetKey={sent}
            onRemind={(families) => setRemind({ kind: 'families', families })}
          />
          {data.refunds.length ? <Refunds refunds={data.refunds} /> : null}
          <Row gap={28}>
            <Col span={7}>
              <GradeByGrade data={data} />
            </Col>
            <Col span={5}>
              <Structure structure={data.structure} />
            </Col>
          </Row>
        </>
      ) : null}
      {data && remind ? (
        <RemindSheet period={data.period.key} target={remind} onClose={() => setRemind(null)} onSent={() => setSent((n) => n + 1)} />
      ) : null}
      <ReceiptSheet id={params.receipt} onClose={() => router.setParams({ receipt: undefined })} />
      <ReceiptsSheet
        visible={allReceipts}
        onClose={() => setAllReceipts(false)}
        onOpen={(r) => {
          setAllReceipts(false);
          router.setParams({ receipt: r.id });
        }}
      />
    </ConsolePage>
  );
}

/** `.btn.btn-secondary` with the "· audited" note inside. */
function ExportButton({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('console.operations.fees.export')} ${t('console.operations.fees.audited')}`}
      onPress={onPress}
      disabled={busy}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.btn,
        pointer,
        { backgroundColor: hovered ? colors.subtle : colors.surface, borderColor: colors.lineStrong, opacity: busy ? 0.6 : 1 },
      ]}>
      <Icon name="download" size={ICON_SIZE.sm} rawColor={colors.ink} />
      <Text style={[styles.btnText, { color: colors.ink }]}>{t('console.operations.fees.export')}</Text>
      <Text variant="xxs" color="muted" weight={600}>
        {t('console.operations.fees.audited')}
      </Text>
    </Pressable>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { colors, scheme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        pointer,
        { backgroundColor: colors.brand, borderColor: colors.brand, opacity: disabled ? 0.55 : 1 },
        cardShadow(scheme),
      ]}>
      <Icon name="send" size={ICON_SIZE.sm} rawColor={colors.onBrand} />
      <Text style={[styles.btnText, { color: colors.onBrand }]}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------------------------------------ lead */

function Lead({ data }: { data: FeesPayload }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const name = periodName(t, data.period);
  const due = data.next_due;
  const dueDate = due ? new Date(`${due.date}T00:00:00`) : null;
  const hl = { b: <Highlight />, p: <Highlight color="pink" /> };
  const students = t('console.operations.fees.lead.overdueStudents', { count: data.overdue.students });
  return (
    <View style={styles.lead}>
      {dueDate && due ? (
        <View
          style={{ alignItems: 'center', gap: 10 }}
          accessible
          accessibilityLabel={t('console.operations.fees.lead.dueCal', {
            title: due.title,
            date: formatDate(due.date, { weekday: true }),
          })}>
          <TearCal month={monthName(dueDate, true)} day={dueDate.getDate()} dow={weekdayName(dueDate)} />
          <Text variant="xxs" color="muted" weight={700} style={{ letterSpacing: 0.88, textTransform: 'uppercase' }}>
            {t('console.operations.fees.lead.dueLabel', { title: shortTitle(due.title) })}
          </Text>
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 14, paddingTop: 2 }}>
        <Kicker style={{ maxWidth: 620 }}>
          {t('console.operations.fees.lead.kicker', { period: name, time: formatTime(data.as_of) })}
        </Kicker>
        <Text style={[styles.display, { color: colors.ink }]}>
          <Trans
            i18nKey="console.operations.fees.lead.brought"
            values={{ period: name, collected: inrShort(data.collected), billed: inrShort(data.billed) }}
            components={hl}
          />
          {data.overdue.families ? (
            <Trans
              i18nKey="console.operations.fees.lead.overdue"
              count={data.overdue.families}
              values={{ amount: inrShort(data.overdue.amount), students, count: data.overdue.families }}
              components={hl}
            />
          ) : (
            t('console.operations.fees.lead.noOverdue')
          )}
          {due && due.days > 0 ? (
            <Trans
              i18nKey="console.operations.fees.lead.due"
              count={due.days}
              values={{ title: shortTitle(due.title), count: due.days }}
              components={hl}
            />
          ) : due ? (
            <Trans i18nKey="console.operations.fees.lead.dueToday" values={{ title: shortTitle(due.title) }} components={hl} />
          ) : (
            t('console.operations.fees.lead.noDue')
          )}
        </Text>
        <Text variant="sm" color="muted">
          {data.receipts_today.count ? (
            <Trans
              i18nKey="console.operations.fees.lead.counter"
              count={data.receipts_today.count}
              values={{ amount: inrShort(data.receipts_today.amount), count: data.receipts_today.count }}
              components={{ b: <Text variant="sm" color="ink2" weight={700} /> }}
            />
          ) : (
            t('console.operations.fees.lead.counterNone')
          )}
          {data.last_run
            ? t('console.operations.fees.lead.lastRun', { date: formatDate(data.last_run) })
            : t('console.operations.fees.lead.noRun')}
        </Text>
      </View>
    </View>
  );
}

/** "Term 2 tuition" → "Term 2" (the calendar and sentence talk about the term). */
function shortTitle(title: string) {
  return title.replace(/\s+tuition$/i, '');
}

/* ------------------------------------------------------------------------------------------------ collection */

function Collection({ data }: { data: FeesPayload }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const billed = Number(data.billed);
  const collected = Number(data.collected);
  const months = data.months.filter((m) => !m.future).map((m) => ({ ...m, value: Number(m.amount) }));
  const biggest = months.reduce((a, m, i) => (m.value > (months[a]?.value ?? 0) ? i : a), 0);
  const blocks = months.map((m, i) => ({
    value: m.value,
    // Blocks too narrow for a label (under ~6% of the bill) stay unlabelled.
    label:
      m.value < billed * 0.06
        ? ''
        : i === 0 || i === biggest
          ? `${monthName(`${m.month}-01`, true)} ${inrShort(m.value)}`
          : m.open
            ? ''
            : monthName(`${m.month}-01`, true),
    strong: i === biggest && i !== 0,
  }));
  const target = data.target ? Number(data.target.amount) : undefined;
  const name = periodName(t, data.period);
  return (
    <Card pastel="butter" pad={0}>
      <View style={styles.band}>
        <View style={{ width: 250 }}>
          <Text variant="sm" weight={700} rawColor={colors.pButterInk}>
            {t('console.operations.fees.collection.title', { period: name })}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
            <Text variant="kpi">{inrShort(collected)}</Text>
            <Text variant="sm" color="muted">
              {t('console.operations.fees.collection.of', { total: inrShort(billed) })}
            </Text>
          </View>
        </View>
        <View
          style={{ flex: 1, minWidth: 0, gap: 8 }}
          accessible
          accessibilityRole="image"
          accessibilityLabel={
            t('console.operations.fees.collection.label', {
              collected: inrShort(collected),
              billed: inrShort(billed),
              percent: data.percent ?? 0,
            }) + (data.target ? t('console.operations.fees.collection.labelTarget', { percent: data.target.percent }) : '')
          }>
          <MonthBlocks
            blocks={blocks}
            total={billed}
            target={target}
            targetLabel={
              data.target
                ? data.target.by
                  ? t('console.operations.fees.collection.target', {
                      date: formatDate(data.target.by),
                      amount: inrShort(data.target.amount),
                    })
                  : t('console.operations.fees.collection.targetNoDate', { amount: inrShort(data.target.amount) })
                : undefined
            }
          />
          <Text variant="xxs" color="muted">
            {t('console.operations.fees.collection.note')}
            {data.target
              ? Number(data.target.gap) > 0
                ? t('console.operations.fees.collection.gap', { amount: inrShort(data.target.gap) })
                : t('console.operations.fees.collection.reached')
              : ''}
          </Text>
        </View>
        <View style={{ width: 230, gap: 6, alignItems: 'flex-start' }}>
          <Text variant="sm" color="ink2">
            {Number(data.overdue.amount) > 0 ? (
              <Trans
                i18nKey="console.operations.fees.collection.overdue"
                values={{ amount: inrShort(data.overdue.amount), days: data.overdue.oldest_days }}
                components={{ b: <Text variant="sm" weight={800} color="bad" /> }}
              />
            ) : (
              t('console.operations.fees.collection.noOverdue')
            )}
          </Text>
          {Number(data.on_plan) > 0 ? (
            <Text variant="sm" color="ink2">
              <Trans
                i18nKey="console.operations.fees.collection.plan"
                values={{ amount: inrShort(data.on_plan) }}
                components={{ b: <Text variant="sm" weight={800} /> }}
              />
            </Text>
          ) : null}
          <View style={{ marginTop: 4 }}>
            <Link label={t('console.operations.fees.collection.families')} onPress={() => scrollToLedger()} />
          </View>
        </View>
      </View>
    </Card>
  );
}

/** Scroll the console to the overdue ledger (web). */
function scrollToLedger() {
  if (typeof document === 'undefined') return;
  document.getElementById('fees-ledger')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ------------------------------------------------------------------------------------------------ month by month */

function MonthByMonth({ data }: { data: FeesPayload }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const values = data.months.map((m) => Number(m.amount));
  const max = Math.max(1, ...values);
  const step = niceStep(max);
  const yMax = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
  const peak = values.indexOf(Math.max(...values));
  const past = data.months.filter((m) => !m.future);
  const chart: BarDatum[] = data.months.map((m, i) => {
    const v = Number(m.amount);
    const label = monthName(`${m.month}-01`, true);
    const show = !m.future && v > 0 && (i === 0 || i === peak || m.open);
    return {
      label: m.open ? t('console.operations.fees.months.soFar', { month: label }) : label,
      values: [m.future ? null : v],
      top: show ? inrShort(v) : undefined,
      sub:
        i === peak && data.peak_due && v > 0
          ? t('console.operations.fees.months.due', { title: periodName(t, data.period), date: formatDate(data.peak_due.date) })
          : undefined,
      open: m.open,
    };
  });
  const first = past[0] ?? data.months[0];
  const last = data.months[data.months.length - 1];
  const shares = data.method_shares;
  const online = shares.filter((s) => ['upi', 'card', 'netbanking'].includes(s.method));
  const offline = shares.filter((s) => ['cash', 'cheque'].includes(s.method)).reduce((a, s) => a + (s.percent ?? 0), 0);
  const list = online
    .map((s) => `${t(`console.operations.fees.months.method.${s.method as 'upi'}`)} ${Math.round(s.percent ?? 0)}%`)
    .join(', ');
  return (
    <Card pad={22} style={{ gap: 14 }}>
      <CardHead
        title={t('console.operations.fees.months.title')}
        subtitle={t('console.operations.fees.months.subtitle', {
          from: monthName(`${first.month}-01`),
          to: `${monthName(`${last.month}-01`)} ${last.month.slice(0, 4)}`,
        })}
        right={
          data.months.some((m) => m.open) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.sw, { backgroundColor: colors.pButter, borderColor: colors.pButterInk }]} />
              <Text variant="xxs" color="muted" weight={600}>
                {t('console.operations.fees.months.open')}
              </Text>
            </View>
          ) : null
        }
      />
      <BarChart
        data={chart}
        series={[{ key: 'paid', color: colors.pButterInk }]}
        height={260}
        yMax={yMax}
        ticks={ticks}
        formatY={(v) => (v === 0 ? '0' : inrShort(v, 0))}
        axisWidth={40}
        accessibilityLabel={t('console.operations.fees.months.label', {
          list: data.months
            .filter((m) => !m.future)
            .map((m) => `${monthName(`${m.month}-01`, true)} ${inrShort(m.amount)}`)
            .join(', '),
        })}
      />
      <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
        {data.online_share != null ? (
          <Text variant="sm" color="ink2">
            <Trans
              i18nKey="console.operations.fees.months.online"
              values={{
                percent: Math.round(data.online_share),
                scope: t(`console.operations.fees.months.scope.${data.period.key === 'year' ? 'year' : 'term'}`),
                list,
              }}
              components={{ hl: <Highlight /> }}
            />
            {offline > 0 ? t('console.operations.fees.months.offline', { percent: Math.round(offline) }) : ''}
          </Text>
        ) : (
          <Text variant="sm" color="muted">
            {t('console.operations.fees.months.noPayments')}
          </Text>
        )}
      </View>
    </Card>
  );
}

/** A round axis step (in rupees) giving 3–5 gridlines: 25 L, 50 L, 1 Cr … */
function niceStep(max: number) {
  const steps = [1e4, 2.5e4, 5e4, 1e5, 2.5e5, 5e5, 1e6, 2.5e6, 5e6, 1e7, 2.5e7, 5e7, 1e8];
  return steps.find((s) => max / s <= 4) ?? 1e8;
}

/* ------------------------------------------------------------------------------------------------ receipts */

const TILTS = [-7, -3, -10, -5];

function ReceiptsToday({ data, onAll, onOpen }: { data: FeesPayload; onAll: () => void; onOpen: (r: Receipt) => void }) {
  const { t } = useTranslation();
  const r = data.receipts_today;
  return (
    <View style={{ gap: 14 }} accessibilityLabel={t('console.operations.fees.receipts.title')}>
      <CardHead
        title={t('console.operations.fees.receipts.title')}
        right={
          <Text variant="xs" color="muted" weight={600}>
            {t('console.operations.fees.receipts.count', { count: r.count, amount: inrShort(r.amount) })}
          </Text>
        }
      />
      {r.items.length ? (
        <View style={styles.receiptGrid}>
          {r.items.map((item, i) => (
            <ReceiptCard key={item.id} item={item} tilt={TILTS[i % TILTS.length]} onPress={() => onOpen(item)} />
          ))}
        </View>
      ) : (
        <Text variant="sm" color="muted">
          {t('console.operations.fees.receipts.none')}
        </Text>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Text variant="xs" color="muted" style={{ flex: 1 }}>
          {t('console.operations.fees.receipts.note')}
        </Text>
        {r.count ? <Link label={t('console.operations.fees.receipts.all', { count: r.count })} icon={null} onPress={onAll} /> : null}
      </View>
    </View>
  );
}

export function ReceiptCard({ item, tilt, onPress }: { item: Receipt; tilt: number; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('console.operations.fees.receipts.open', { no: item.receipt_no ?? '' })}
      onPress={onPress}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.receipt,
        pointer,
        { backgroundColor: colors.surface, borderColor: hovered ? colors.brandLine : colors.lineStrong },
        cardShadow(scheme),
      ]}>
      <View style={styles.between}>
        <Text variant="xxs" color="muted" weight={700} num numberOfLines={1} style={{ flexShrink: 1 }}>
          {receiptTail(item.receipt_no)}
        </Text>
        <Text variant="xxs" color="muted" weight={700} num numberOfLines={1} style={{ flexShrink: 0 }}>
          {item.paid_at ? formatTime(item.paid_at) : ''}
        </Text>
      </View>
      <Text variant="sm" weight={700} style={{ marginTop: 8 }} numberOfLines={1}>
        {item.student.name} · {item.student.class}
      </Text>
      <Text variant="xs" color="muted" numberOfLines={1}>
        {item.title} · {t(`console.operations.fees.months.method.${item.method as 'upi'}`, { defaultValue: item.method })}
      </Text>
      <View style={[styles.between, styles.receiptFoot, { borderTopColor: colors.lineStrong }]}>
        <Text variant="kpiSm" style={{ fontSize: 20, lineHeight: 22 }}>
          {formatInr(item.amount)}
        </Text>
        <Stamp rotate={tilt}>{t('console.operations.fees.receipts.paid')}</Stamp>
      </View>
    </Pressable>
  );
}

/** "SUNRISE/2026-27/002525" → "2026-27/002525": the school code is the same on every card. */
function receiptTail(no: string | null) {
  return no ? no.split('/').slice(-2).join('/') : '';
}

const styles = StyleSheet.create({
  btn: { height: 40, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontFamily: fonts.bold, fontSize: 14 },
  lead: { flexDirection: 'row', gap: 28, alignItems: 'flex-start' },
  display: { fontFamily: fonts.displayMedium, fontSize: 28, lineHeight: 37.5, letterSpacing: -0.62, maxWidth: 780 },
  band: { paddingVertical: 22, paddingHorizontal: 24, flexDirection: 'row', gap: 32, alignItems: 'center' },
  sw: { width: 10, height: 10, borderRadius: 3, borderWidth: 1.5 },
  receiptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  receipt: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 2,
  },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  receiptFoot: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderStyle: 'dashed' },
});
