import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import { inrShort } from '@/features/console/format';
import { Button, Checkbox, Sheet, Text, useToast } from '@/ui';

import { feesApi, useOverdue, type Family, type PeriodKey, type Segment } from './api';

export type RemindTarget = { kind: 'families'; families: Family[] } | { kind: 'all'; segment: Segment; q: string };

const CHANNELS = ['app', 'sms', 'whatsapp'] as const;

/** Confirm and send fee reminders to chosen families, or to every family in the ledger's current view. */
export function RemindSheet({
  period,
  target,
  onClose,
  onSent,
}: {
  period: PeriodKey;
  target: RemindTarget;
  onClose: () => void;
  onSent: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [channels, setChannels] = useState<string[]>([...CHANNELS]);
  // For "everyone in this view", count what the view holds right now.
  const view = useOverdue(
    { period, segment: target.kind === 'all' ? target.segment : 'all', q: target.kind === 'all' ? target.q : '', page: 1, pageSize: 1 },
    target.kind === 'all',
  );
  const count = target.kind === 'families' ? target.families.length : (view.data?.total ?? 0);
  const amount = target.kind === 'families' ? target.families.reduce((a, f) => a + Number(f.amount), 0) : Number(view.data?.amount ?? 0);
  const send = useMutation({
    mutationFn: () =>
      feesApi.remind(
        target.kind === 'families'
          ? { period, channels, family_ids: target.families.map((f) => f.id) }
          : { period, channels, all: true, segment: target.segment, q: target.q },
      ),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['console'] });
      toast(t('console.operations.fees.remind.done', { count: res.families }));
      onSent();
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('console.operations.fees.remind.failed'), 'danger'),
  });
  const toggle = (c: string, on: boolean) => setChannels((cur) => (on ? [...cur, c] : cur.filter((x) => x !== c)));
  return (
    <Sheet
      visible
      onClose={onClose}
      title={t('console.operations.fees.remind.title')}
      message={
        target.kind === 'families'
          ? t('console.operations.fees.remind.toSelected', { count, amount: inrShort(amount) })
          : t('console.operations.fees.remind.toAll', { count, amount: inrShort(amount) })
      }>
      <Text variant="sm" weight={700}>
        {t('console.operations.fees.remind.channels')}
      </Text>
      <View style={{ flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
        {CHANNELS.map((c) => (
          <View key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Checkbox
              checked={channels.includes(c)}
              onChange={(on) => toggle(c, on)}
              label={t(`console.operations.fees.ledger.channel.${c}`)}
            />
            <Text variant="sm">{t(`console.operations.fees.ledger.channel.${c}`)}</Text>
          </View>
        ))}
      </View>
      <Text variant="xs" color="muted">
        {t('console.operations.fees.remind.preview')} {t('console.operations.fees.remind.smsNote')}
      </Text>
      {!channels.length ? (
        <Text variant="xs" color="bad">
          {t('console.operations.fees.remind.pickChannel')}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
        <Button title={t('console.operations.fees.remind.cancel')} variant="secondary" onPress={onClose} />
        <Button
          title={t('console.operations.fees.remind.send', { count })}
          icon="send"
          loading={send.isPending}
          disabled={!channels.length || !count}
          onPress={() => send.mutate()}
        />
      </View>
    </Sheet>
  );
}
