import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { Announcement } from '@/api/types';
import { relativeTime } from '@/lib/format';
import { useActiveSchool } from '@/state/session';
import { spacing, type Tone } from '@/theme/tokens';
import { Button, Card, EmptyState, ErrorState, Icon, type IconName, LoadingCards, Pill, Screen, Text } from '@/ui';

const KIND: Record<Announcement['kind'], { icon: IconName; tone: Tone }> = {
  general: { icon: 'megaphone-outline', tone: 'accent' },
  event: { icon: 'calendar-outline', tone: 'primary' },
  holiday: { icon: 'sunny-outline', tone: 'warning' },
  exam: { icon: 'school-outline', tone: 'info' },
  transport: { icon: 'bus-outline', tone: 'primary' },
  safety: { icon: 'warning-outline', tone: 'danger' },
};

export default function AnnouncementsScreen() {
  const { t } = useTranslation();
  const school = useActiveSchool();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['announcements', school?.id], queryFn: api.announcements });
  const ack = useMutation({
    mutationFn: (id: string) => api.acknowledge(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });

  return (
    <Screen edges={[]} onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Stack.Screen options={{ title: t('announcements.title') }} />
      {query.isLoading ? (
        <LoadingCards />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !query.data?.items.length ? (
        <EmptyState icon="megaphone-outline" title={t('announcements.empty')} />
      ) : (
        query.data.items.map((item) => {
          const kind = KIND[item.kind];
          return (
            <Card key={item.id}>
              <View style={styles.top}>
                <Icon name={kind.icon} size={18} color={kind.tone === 'danger' ? 'danger' : 'primary'} />
                <Text variant="caption" style={styles.flex}>
                  {item.author ? `${item.author} · ` : ''}
                  {relativeTime(item.published_at)}
                </Text>
                {item.requires_ack ? (
                  <Pill label={item.acknowledged ? t('announcements.acknowledged') : t('announcements.needsAck')} tone={item.acknowledged ? 'success' : 'warning'} />
                ) : null}
              </View>
              <Text variant="heading" style={styles.title}>
                {item.title}
              </Text>
              <Text variant="body">{item.body}</Text>
              {item.requires_ack && !item.acknowledged ? (
                <Button
                  title={t('announcements.acknowledge')}
                  icon="checkmark-done-outline"
                  variant="soft"
                  onPress={() => ack.mutate(item.id)}
                  loading={ack.isPending && ack.variables === item.id}
                  style={styles.ack}
                />
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
  title: { marginTop: spacing.sm, marginBottom: spacing.xxs },
  ack: { marginTop: spacing.sm, alignSelf: 'flex-start' },
});
