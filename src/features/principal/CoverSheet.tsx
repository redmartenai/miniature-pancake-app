import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { CoverBoard } from '@/api/types';
import { clockShort } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Chip, Sheet, Text, useToast } from '@/ui';

/** Assign free teachers to the periods that have no teacher. One tap per period. */
export function CoverSheet({ board, visible, onClose }: { board: CoverBoard; visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const [busy, setBusy] = useState<string>();
  const assign = useMutation({
    mutationFn: ({ slot, teacher }: { slot: string; teacher: string; name: string }) => api.assignCover(slot, teacher),
    onMutate: ({ slot }) => setBusy(slot),
    onSuccess: (next, { name }) => {
      toast(t('principal.cover.assigned', { name }));
      client.setQueryData(['cover'], next);
      void client.invalidateQueries({ queryKey: ['pulse'] });
      void client.invalidateQueries({ queryKey: ['principal-attendance'] });
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
    onSettled: () => setBusy(undefined),
  });
  const open = board.periods.filter((p) => p.state !== 'done' && p.slots.some((s) => !s.covered_by));
  return (
    <Sheet visible={visible} onClose={onClose} title={t('principal.cover.title')} message={open.length ? t('principal.cover.body') : t('principal.cover.allCovered')}>
      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 16 }}>
        {open.map((p) =>
          p.slots
            .filter((s) => !s.covered_by)
            .map((s) => (
              <View key={s.id} style={{ gap: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                <Text variant="sm" weight={700}>
                  {t('principal.cover.slot', { period: p.period, time: clockShort(p.starts_at), class: s.class, subject: s.subject })}
                </Text>
                <Text variant="xs" color="muted">
                  {t('principal.cover.for', { name: s.teacher, room: s.room })}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {p.free.slice(0, 8).map((f) => (
                    <Chip
                      key={f.id}
                      label={f.subject ? `${f.name} · ${f.subject}` : f.name}
                      onPress={() => !busy && assign.mutate({ slot: s.id, teacher: f.id, name: f.name })}
                      style={{ height: 40, opacity: busy === s.id ? 0.5 : 1 }}
                    />
                  ))}
                  {!p.free.length ? (
                    <Text variant="xs" color="bad" weight={600}>
                      {t('principal.cover.nobodyFree')}
                    </Text>
                  ) : null}
                </View>
              </View>
            )),
        )}
      </ScrollView>
    </Sheet>
  );
}
