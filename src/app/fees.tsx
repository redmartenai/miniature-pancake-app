import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { Checkout, Invoice } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { formatDate, formatInr } from '@/lib/format';
import { newClientId } from '@/lib/ids';
import { spacing, type Tone } from '@/theme/tokens';
import { Banner, Button, Card, EmptyState, ErrorState, ListRow, LoadingCards, Pill, Screen, SectionHeader, Text, useToast } from '@/ui';
import { Sheet } from '@/ui/Sheet';

const STATUS_TONE: Record<Invoice['status'], Tone> = { paid: 'success', partial: 'info', due: 'warning', overdue: 'danger' };

export default function FeesScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const family = useFamily();
  const studentId = family.selected?.id;
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const query = useQuery({ queryKey: ['fees', studentId], queryFn: () => api.fees(studentId as string), enabled: !!studentId });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['fees', studentId] });
    void queryClient.invalidateQueries({ queryKey: ['summary', studentId] });
  };

  const start = useMutation({
    // One idempotency key per tap, so a double tap never creates two payments.
    mutationFn: (invoice: Invoice) => api.checkout(invoice.id, newClientId()),
    onSuccess: (result) => {
      if (result.gateway === 'mock') setCheckout(result);
      else toast(t('common.somethingWrong'), 'danger');
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : t('common.somethingWrong'), 'danger'),
  });
  const confirm = useMutation({
    mutationFn: ({ paymentId, outcome }: { paymentId: string; outcome: 'success' | 'failure' }) =>
      api.confirmPayment(paymentId, { simulate: outcome }),
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

  const data = query.data;
  const outstanding = data?.invoices.filter((i) => Number(i.balance) > 0) ?? [];
  const paid = data?.invoices.filter((i) => Number(i.balance) === 0) ?? [];

  return (
    <Screen edges={[]} onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Stack.Screen options={{ title: `${t('fees.title')} · ${family.selected?.first_name ?? ''}` }} />
      {query.isLoading ? (
        <LoadingCards />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : data ? (
        <>
          <Card tone={Number(data.total_due) > 0 ? 'soft' : 'surface'}>
            <Text variant="caption">{t('fees.totalDue')}</Text>
            <Text variant="display">{formatInr(data.total_due)}</Text>
            {data.next_due_date ? (
              <Text variant="body" color={data.overdue ? 'danger' : 'textMuted'}>
                {data.overdue ? t('fees.overdue') : t('fees.dueOn', { date: formatDate(data.next_due_date, { year: true }) })}
              </Text>
            ) : (
              <Text variant="body" color="success">
                {t('fees.allPaid')}
              </Text>
            )}
          </Card>

          {outstanding.map((invoice) => (
            <Card key={invoice.id}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text variant="subheading">{invoice.title}</Text>
                  <Text variant="caption">{t('fees.dueOn', { date: formatDate(invoice.due_date, { year: true }) })}</Text>
                </View>
                <Pill label={t(`fees.${invoice.status}`)} tone={STATUS_TONE[invoice.status]} />
              </View>
              <Button
                title={t('fees.payNow', { amount: formatInr(invoice.balance) })}
                icon="lock-closed-outline"
                onPress={() => start.mutate(invoice)}
                loading={start.isPending && start.variables?.id === invoice.id}
                fullWidth
                style={styles.pay}
              />
            </Card>
          ))}

          <Banner tone="neutral" icon="shield-checkmark-outline" message={t('fees.secureNote')} />

          {data.receipts.length || paid.length ? (
            <>
              <SectionHeader title={t('fees.receipts')} />
              <Card padded={false}>
                {data.receipts.map((receipt, index) => (
                  <ListRow
                    key={receipt.id}
                    icon="receipt-outline"
                    iconTone="success"
                    title={`${receipt.invoice_title} · ${formatInr(receipt.amount)}`}
                    subtitle={`${receipt.receipt_no ?? ''}${receipt.paid_at ? ` · ${formatDate(receipt.paid_at, { year: true })}` : ''}`}
                    last={index === data.receipts.length - 1}
                  />
                ))}
              </Card>
            </>
          ) : null}
        </>
      ) : (
        <EmptyState icon="wallet-outline" title={t('fees.allPaid')} />
      )}

      <Sheet visible={!!checkout} onClose={() => setCheckout(null)} title={t('fees.testPayment')} message={t('fees.testPaymentHint')}>
        <Text variant="heading">{checkout ? formatInr(checkout.amount) : ''}</Text>
        <Button
          title={t('fees.simulateSuccess')}
          icon="checkmark-circle-outline"
          onPress={() => checkout && confirm.mutate({ paymentId: checkout.payment_id, outcome: 'success' })}
          loading={confirm.isPending && confirm.variables?.outcome === 'success'}
          fullWidth
        />
        <Button
          title={t('fees.simulateFailure')}
          icon="close-circle-outline"
          variant="secondary"
          onPress={() => checkout && confirm.mutate({ paymentId: checkout.payment_id, outcome: 'failure' })}
          fullWidth
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  pay: { marginTop: spacing.sm },
});
