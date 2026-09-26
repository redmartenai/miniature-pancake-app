import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useConsoleQuery } from '@/features/console/api';
import { inrShort } from '@/features/console/format';
import { downloadFile } from '@/lib/download';
import { formatDate, formatInr, formatTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Sheet, Skeleton, Stamp, Text, useToast } from '@/ui';

import { feesApi, type Receipt } from './api';

/** One receipt (opened from a receipt card or the ⌘K search's `?receipt=<payment id>`), with its PDF. */
export function ReceiptSheet({ id, onClose }: { id?: string; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const query = useConsoleQuery(['fees', 'receipt', id], () => feesApi.receipt(id!), { enabled: !!id });
  const r = query.data;
  const pdf = async () => {
    if (!r?.pdf) return;
    setBusy(true);
    try {
      await downloadFile(r.pdf, `Receipt_${(r.receipt_no ?? r.id).replace(/\//g, '-')}.pdf`);
    } catch {
      toast(t('console.operations.fees.receipt.pdfFailed'), 'danger');
    } finally {
      setBusy(false);
    }
  };
  const row = (label: string, value: string) => (
    <View style={[styles.row, { borderBottomColor: colors.line }]} key={label}>
      <Text variant="sm" color="muted">
        {label}
      </Text>
      <Text variant="sm" weight={600} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
  return (
    <Sheet visible={!!id} onClose={onClose} title={r ? t('console.operations.fees.receipt.title', { no: r.receipt_no ?? '' }) : ' '}>
      {query.isLoading ? (
        <Skeleton height={220} />
      ) : !r ? (
        <Text color="muted">{t('console.operations.fees.receipt.notFound')}</Text>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="kpiSm">{formatInr(r.amount)}</Text>
            <Stamp>{t('console.operations.fees.receipts.paid')}</Stamp>
          </View>
          <View>
            {row(t('console.operations.fees.receipt.student'), `${r.student.name} · ${r.student.class}`)}
            {row(t('console.operations.fees.receipt.fee'), r.title)}
            {row(
              t('console.operations.fees.receipt.method'),
              t(`console.operations.fees.months.method.${r.method as 'upi'}`, { defaultValue: r.method }),
            )}
            {r.paid_at
              ? row(
                  t('console.operations.fees.receipt.paidAt'),
                  `${formatDate(r.paid_at, { weekday: true, year: true })}, ${formatTime(r.paid_at)}`,
                )
              : null}
            {r.paid_by ? row(t('console.operations.fees.receipt.paidBy'), r.paid_by) : null}
            {r.gateway_payment_id ? row(t('console.operations.fees.receipt.ref'), r.gateway_payment_id) : null}
          </View>
          <Text variant="xs" color="muted">
            {t('console.operations.fees.receipt.invoice', {
              amount: formatInr(r.invoice.amount),
              paid: formatInr(r.invoice.paid_amount),
              balance: formatInr(r.invoice.balance),
            })}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
            <Button title={t('console.operations.fees.receipt.close')} variant="secondary" onPress={onClose} />
            {r.pdf ? <Button title={t('console.operations.fees.receipt.pdf')} icon="download" loading={busy} onPress={pdf} /> : null}
          </View>
        </>
      )}
    </Sheet>
  );
}

/** Every receipt issued today ("All 37"). */
export function ReceiptsSheet({ visible, onClose, onOpen }: { visible: boolean; onClose: () => void; onOpen: (r: Receipt) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const query = useConsoleQuery(['fees', 'receipts'], feesApi.receipts, { enabled: visible });
  const d = query.data;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('console.operations.fees.receipts.sheetTitle', { count: d?.count ?? 0 })}
      message={d ? inrShort(d.amount) : undefined}>
      {query.isLoading ? (
        <Skeleton height={300} />
      ) : (
        <ScrollView style={{ maxHeight: 460 }}>
          {(d?.items ?? []).map((r) => (
            <View key={r.id} style={[styles.row, { borderBottomColor: colors.line }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="sm" weight={700} numberOfLines={1}>
                  {r.student.name} · {r.student.class}
                </Text>
                <Text variant="xs" color="muted" numberOfLines={1}>
                  {r.receipt_no} · {r.paid_at ? formatTime(r.paid_at) : ''} · {r.title}
                </Text>
              </View>
              <Text variant="sm" weight={800} num>
                {formatInr(r.amount)}
              </Text>
              <Button
                title={t('console.operations.fees.receipts.view')}
                variant="ghost"
                size="sm"
                accessibilityLabel={t('console.operations.fees.receipts.open', { no: r.receipt_no ?? '' })}
                onPress={() => onOpen(r)}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1 },
});
