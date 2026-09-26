import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { Checkout, Invoice, Receipt, StudentFees } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { downloadFile } from '@/lib/download';
import { daysUntil, formatDate, formatInr, monthName, weekdayName } from '@/lib/format';
import { newClientId } from '@/lib/ids';
import { useActiveSchool } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import {
  AppBar,
  Avatar,
  Button,
  Chip,
  ErrorState,
  Highlight,
  IconButton,
  Kicker,
  Link,
  LoadingCards,
  Paper,
  Pill,
  Screen,
  Sheet,
  Stamp,
  StickyNote,
  Tear,
  TearCal,
  Text,
  Ticket,
  useToast,
} from '@/ui';

type Method = 'upi' | 'card' | 'netbanking';

/** ParentFees: the bill as a ticket with a pay button, a sibling's note, the year, the breakdown, and receipts. */
export default function ParentFees() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const school = useActiveSchool();
  const family = useFamily();
  const child = family.selected;
  const studentId = child?.id;
  const [method, setMethod] = useState<Method>('upi');
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const fees = useQuery({ queryKey: ['fees', studentId], queryFn: () => api.fees(studentId as string), enabled: !!studentId });
  const siblings = useQuery({ queryKey: ['children-detail'], queryFn: api.childrenDetail, enabled: family.isParent });

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['fees', studentId] });
    void client.invalidateQueries({ queryKey: ['summary', studentId] });
    void client.invalidateQueries({ queryKey: ['children-detail'] });
  };
  const start = useMutation({
    // One idempotency key per tap, so a double tap never creates two payments.
    mutationFn: (invoice: Invoice) => api.checkout(invoice.id, newClientId(), method),
    onSuccess: (result) => {
      if (result.gateway === 'mock') setCheckout(result);
      else toast(t('common.somethingWrong'), 'danger');
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  const confirm = useMutation({
    mutationFn: ({ paymentId, outcome }: { paymentId: string; outcome: 'success' | 'failure' }) => api.confirmPayment(paymentId, { simulate: outcome }),
    onSuccess: (receipt) => {
      setCheckout(null);
      toast(t('fees.success', { receipt: receipt.receipt_no ?? '' }));
      refresh();
    },
    onError: () => {
      setCheckout(null);
      toast(t('fees.failed'), 'danger');
      refresh();
    },
  });

  const data = fees.data;
  const outstanding = (data?.invoices ?? []).filter((i) => Number(i.balance) > 0).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const bill = outstanding[0];
  const sibling = siblings.data?.children.find((c) => c.id !== studentId && c.next_invoice);

  return (
    <Screen
      dock
      gap={18}
      refreshing={fees.isRefetching}
      onRefresh={fees.refetch}
      header={<AppBar back title={t('parent.fees.title')} subtitle={child ? t('parent.fees.subtitle', { name: child.first_name, year: school?.academic_year ?? '' }) : undefined} />}>
      {fees.error ? <ErrorState error={fees.error} onRetry={fees.refetch} /> : null}
      {fees.isLoading ? <LoadingCards count={3} /> : null}
      {data ? (
        <>
          {bill ? (
            <Ticket>
              <View style={{ padding: 18, paddingBottom: 12, gap: 6 }}>
                <View style={[styles.row, { alignItems: 'flex-start', gap: 12 }]}>
                  <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                    <Text variant="xs" weight={700} rawColor={colors.pButterInk}>
                      {t('parent.fees.billFor', { title: bill.title.replace(/ tuition$/i, ' fee'), name: child?.name ?? '', class: child?.class.short_label ?? '' })}
                    </Text>
                    <Text variant="kpi" style={{ fontSize: 40, lineHeight: 42 }}>
                      {formatInr(bill.balance)}
                    </Text>
                    <Text variant="sm" color="ink2">
                      {(bill.items?.length ?? 0) > 1 ? t('parent.home.feeDescription') : (bill.items?.[0]?.head ?? bill.title)}
                    </Text>
                  </View>
                  <TearCal size="sm" month={monthName(bill.due_date, true)} day={Number(bill.due_date.slice(8))} dow={weekdayName(bill.due_date, true)} />
                </View>
                <View style={[styles.row, { gap: 12, marginTop: 6 }]}>
                  <DuePill due={bill.due_date} />
                </View>
              </View>
              <Tear />
              <View style={{ padding: 18, paddingTop: 10, gap: 12 }}>
                <Text variant="xs" weight={650} color="ink2">
                  {t('parent.fees.payWith')}
                </Text>
                <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
                  <Chip label={t('parent.fees.upi')} icon="phone" selected={method === 'upi'} onPress={() => setMethod('upi')} />
                  <Chip label={t('parent.fees.card')} icon="card" selected={method === 'card'} onPress={() => setMethod('card')} />
                  <Chip label={t('parent.fees.netbanking')} icon="school" selected={method === 'netbanking'} onPress={() => setMethod('netbanking')} />
                </View>
                <View style={[styles.row, { gap: 10 }]}>
                  <Button
                    title={t('parent.fees.pay', { amount: formatInr(bill.balance) })}
                    icon="lock"
                    size="lg"
                    loading={start.isPending}
                    onPress={() => start.mutate(bill)}
                    style={{ flex: 1 }}
                  />
                  <Button title={t('parent.fees.payLater')} variant="ghost" size="lg" onPress={() => router.back()} />
                </View>
                <Text variant="xs" color="muted" align="center">
                  {t('parent.fees.receiptNote')}
                </Text>
              </View>
            </Ticket>
          ) : (
            <Ticket style={{ padding: 18, gap: 8, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="h3">{t('parent.fees.allPaidTitle')}</Text>
                <Text variant="sm" color="ink2">
                  {t('parent.fees.allPaidBody')}
                </Text>
              </View>
              <Stamp>{t('parent.fees.paid')}</Stamp>
            </Ticket>
          )}

          {sibling && bill && sibling.next_invoice ? (
            <View style={{ paddingTop: 10, paddingLeft: 40 }}>
              <StickyNote tilt="r" tape="center" style={{ gap: 10 }}>
                <View style={[styles.row, { gap: 8 }]}>
                  <Avatar initials={sibling.initials} size="xs" tone={4} />
                  <Text variant="xs" weight={700}>
                    {t('parent.fees.siblingClass', { name: sibling.first_name, class: sibling.class.short_label })}
                  </Text>
                </View>
                <Text variant="sm" weight={500} style={{ lineHeight: 20 }}>
                  <Trans
                    i18nKey="parent.fees.siblingNote"
                    values={{
                      name: sibling.first_name,
                      title: sibling.next_invoice.title.replace(/ tuition$/i, ' fee'),
                      amount: formatInr(sibling.next_invoice.amount),
                      when:
                        sibling.next_invoice.due_date === bill.due_date
                          ? t('parent.fees.sameDay', { date: formatDate(bill.due_date) })
                          : t('parent.fees.onDate', { date: formatDate(sibling.next_invoice.due_date) }),
                      total: formatInr(Number(bill.balance) + Number(sibling.next_invoice.amount)),
                    }}
                    components={{ b: <Text variant="sm" weight={800} num /> }}
                  />
                </Text>
                <Button
                  title={t('parent.fees.switchTo', { name: sibling.first_name })}
                  variant="secondary"
                  size="sm"
                  height={44}
                  onPress={() => family.select(sibling.id)}
                  style={{ alignSelf: 'flex-start' }}
                />
              </StickyNote>
            </View>
          ) : null}

          {data.year ? <YearSection name={child?.first_name ?? ''} year={data.year} invoices={outstanding} academicYear={school?.academic_year ?? ''} /> : null}

          {bill?.items?.length ? <Breakdown invoice={bill} /> : null}

          {data.receipts.length ? <Receipts receipts={data.receipts} /> : null}
        </>
      ) : null}

      <Sheet visible={!!checkout} onClose={() => setCheckout(null)} title={t('fees.testPayment')} message={t('fees.testPaymentHint')}>
        <Text variant="kpiSm">{checkout ? formatInr(checkout.amount) : ''}</Text>
        <Button
          title={t('fees.simulateSuccess')}
          icon="checkCircle"
          onPress={() => checkout && confirm.mutate({ paymentId: checkout.payment_id, outcome: 'success' })}
          loading={confirm.isPending && confirm.variables?.outcome === 'success'}
          fullWidth
        />
        <Button
          title={t('fees.simulateFailure')}
          icon="close"
          variant="secondary"
          onPress={() => checkout && confirm.mutate({ paymentId: checkout.payment_id, outcome: 'failure' })}
          fullWidth
        />
      </Sheet>
    </Screen>
  );
}

function DuePill({ due }: { due: string }) {
  const { t } = useTranslation();
  const left = daysUntil(due);
  if (left < 0) return <Pill label={t('parent.fees.overdue', { count: -left })} tone="bad" />;
  if (left === 0) return <Pill label={t('parent.fees.dueToday')} tone="warn" />;
  return <Pill label={t('parent.fees.dueIn', { count: left })} tone="warn" />;
}

function YearSection({
  name,
  year,
  invoices,
  academicYear,
}: {
  name: string;
  year: NonNullable<StudentFees['year']>;
  invoices: Invoice[];
  academicYear: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const total = Number(year.total);
  const paid = Number(year.paid);
  const soon = Number(year.due_soon);
  const later = Number(year.later);
  const pct = total ? Math.round((paid / total) * 100) : 0;
  const soonBy = year.due_soon_by ? formatDate(year.due_soon_by) : '';
  const marks = { h: <Highlight /> };
  return (
    <View style={{ gap: 14, paddingTop: 4 }}>
      <Kicker>{t('parent.fees.yearKicker', { year: academicYear })}</Kicker>
      <Text variant="sentence" style={{ fontSize: 19, lineHeight: 27 }}>
        <Trans i18nKey="parent.fees.yearSentence" values={{ name, total: formatInr(total), paid: formatInr(paid) }} components={marks} />
        {soon ? <Trans i18nKey="parent.fees.yearSoon" values={{ amount: formatInr(soon), date: soonBy }} components={marks} /> : null}
        {soon && later ? t('parent.fees.yearLater', { amount: formatInr(later) }) : ''}
        {soon ? t('parent.fees.yearEnd') : later ? '' : t('parent.fees.yearAllPaid')}
      </Text>
      {total ? (
        <View accessibilityRole="image" style={{ flexDirection: 'row', gap: 3, height: 8 }}>
          {paid ? <View style={{ flex: paid, borderTopLeftRadius: 999, borderBottomLeftRadius: 999, borderRadius: 2, backgroundColor: colors.ok }} /> : null}
          {soon ? <View style={{ flex: soon, borderRadius: 2, backgroundColor: colors.warn }} /> : null}
          {later ? <View style={{ flex: later, borderTopRightRadius: 999, borderBottomRightRadius: 999, borderRadius: 2, backgroundColor: colors.track }} /> : null}
        </View>
      ) : null}
      <View style={[styles.row, { gap: 16, flexWrap: 'wrap' }]}>
        <Swatch color={colors.ok} label={t('parent.fees.paidPct', { percent: pct })} />
        {soon ? <Swatch color={colors.warn} label={t('parent.fees.dueBy', { date: soonBy })} /> : null}
        {later ? <Swatch color={colors.track} label={t('parent.fees.dueLater')} /> : null}
      </View>
      {invoices.length ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
          {invoices.map((inv, i) => {
            const near = daysUntil(inv.due_date) <= 45;
            return (
              <View key={inv.id} style={[styles.row, { gap: 12, paddingVertical: 12 }, i < invoices.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
                <Text variant="xs" weight={near ? 800 : 700} num rawColor={near ? colors.warn : colors.muted} style={{ width: 46 }}>
                  {formatDate(inv.due_date)}
                </Text>
                <Text variant="sm" weight={600} color={near ? 'ink' : 'ink2'} style={{ flex: 1, minWidth: 0 }}>
                  {inv.title}
                </Text>
                <Text variant="sm" weight={700} num color={near ? 'ink' : 'ink2'}>
                  {formatInr(inv.balance)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <View style={[styles.row, { gap: 6 }]}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text variant="xs" color="ink2" weight={600}>
        {label}
      </Text>
    </View>
  );
}

function Breakdown({ invoice }: { invoice: Invoice }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const pdf = useMutation({
    mutationFn: () => downloadFile(`/fees/invoices/${invoice.id}/invoice.pdf`, `${invoice.title.replace(/\s+/g, '_')}.pdf`),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  return (
    <View style={{ gap: 2 }}>
      <View style={[styles.row, { gap: 10 }]}>
        <Kicker style={{ flex: 1 }}>{t('parent.fees.covers', { amount: formatInr(invoice.amount) })}</Kicker>
        <Button title={t('parent.fees.pdf')} icon="download" variant="ghost" size="sm" height={44} textColor={colors.brandInk} loading={pdf.isPending} onPress={() => pdf.mutate()} />
      </View>
      {(invoice.items ?? []).map((item) => (
        <View key={item.head} style={[styles.row, { height: 30, gap: 8 }]}>
          <Text variant="sm" color="ink2">
            {item.head}
          </Text>
          <View style={{ flex: 1, height: 1, borderBottomWidth: 2, borderStyle: 'dotted', borderBottomColor: colors.lineStrong, marginTop: 8 }} />
          <Text variant="sm" weight={600} num>
            {formatInr(item.amount)}
          </Text>
        </View>
      ))}
      <View style={[styles.row, { justifyContent: 'space-between', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.lineStrong }]}>
        <Text variant="sm" weight={700}>
          {t('parent.fees.totalDue')}
        </Text>
        <Text variant="h3" num>
          {formatInr(invoice.balance)}
        </Text>
      </View>
      <Text variant="xs" color="muted" style={{ marginTop: 4 }}>
        {t('parent.fees.issued', { date: formatDate(invoice.due_date, { year: true }) })}
      </Text>
    </View>
  );
}

function Receipts({ receipts }: { receipts: Receipt[] }) {
  const { t } = useTranslation();
  const paid = receipts.filter((r) => r.status === 'succeeded');
  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.row, { gap: 10 }]}>
        <Kicker style={{ flex: 1 }}>{t('parent.fees.paidCount', { count: paid.length })}</Kicker>
        <Link label={t('parent.fees.allReceipts')} icon={null} onPress={() => router.push('/parent/documents')} />
      </View>
      {paid.map((r, i) => (
        <ReceiptSlip key={r.id} receipt={r} index={i} />
      ))}
    </View>
  );
}

function ReceiptSlip({ receipt, index }: { receipt: Receipt; index: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const download = useMutation({
    mutationFn: () => downloadFile(receipt.download as string, `Receipt_${(receipt.receipt_no ?? '').replace(/\//g, '-')}.pdf`),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  const methodKey = receipt.method ? `parent.fees.method${receipt.method[0].toUpperCase()}${receipt.method.slice(1)}` : null;
  return (
    <Paper
      pad={0}
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        marginBottom: 0,
        transform: [{ rotate: index % 2 ? '0.4deg' : '-0.5deg' }],
        boxShadow: `0 4px 0 -2px ${colors.surface}, 0 4px 0 -1px ${colors.lineStrong}`,
      }}>
      <View style={{ flex: 1, minWidth: 0, paddingVertical: 13, paddingLeft: 16, paddingRight: 12, gap: 3 }}>
        <View style={[styles.row, { justifyContent: 'space-between', gap: 8 }]}>
          <Text variant="sm" weight={700} numberOfLines={1} style={{ flexShrink: 1 }}>
            {receipt.invoice_title}
          </Text>
          <Text variant="sm" weight={800} num>
            {formatInr(receipt.amount)}
          </Text>
        </View>
        <Text variant="xs" color="muted">
          {receipt.paid_at ? formatDate(receipt.paid_at, { year: true }) : ''}
          {methodKey ? ` · ${t(methodKey as 'parent.fees.methodUpi')}` : ''}
        </Text>
        <Text variant="xxs" color="muted" weight={700} num style={{ letterSpacing: 0.66, textTransform: 'uppercase' }}>
          {t('parent.fees.receiptNo', { no: receipt.receipt_no ?? '' })}
        </Text>
      </View>
      <View style={[styles.row, { width: 112, borderLeftWidth: 2, borderStyle: 'dashed', borderLeftColor: colors.lineStrong, justifyContent: 'space-between', paddingLeft: 10, paddingRight: 2 }]}>
        <Stamp rotate={-11} style={{ paddingVertical: 6, paddingHorizontal: 8, alignSelf: 'center' }}>
          {t('parent.fees.paid')}
        </Stamp>
        {receipt.download ? (
          <IconButton icon="download" variant="bare" size="lg" label={t('parent.fees.downloadReceipt', { no: receipt.receipt_no ?? '' })} onPress={() => download.mutate()} />
        ) : null}
      </View>
    </Paper>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});

