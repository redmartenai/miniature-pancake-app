import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { api } from '@/api/endpoints';
import type { Conversation } from '@/api/types';
import { useRefetchOnFocus } from '@/features/common/useRefetchOnFocus';
import { relativeTime } from '@/lib/format';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { Avatar, Button, Card, EmptyState, ErrorState, ListRow, LoadingCards, Screen, Text } from '@/ui';

export function MessagesScreen({ canStart }: { canStart: boolean }) {
  const { t } = useTranslation();
  const schoolId = useSession((s) => s.schoolId);
  const query = useQuery({ queryKey: ['conversations', schoolId], queryFn: api.conversations, refetchInterval: 30_000 });
  useRefetchOnFocus(query.refetch);
  const items = query.data?.conversations ?? [];

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <View style={styles.header}>
        <Text variant="title" style={styles.flex}>
          {t('chat.title')}
        </Text>
        {canStart ? <Button title={t('chat.newMessage')} icon="create-outline" size="sm" variant="soft" onPress={() => router.push('/chat/new')} /> : null}
      </View>
      {query.isLoading ? (
        <LoadingCards />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title={t('chat.empty')}
          message={t('chat.emptyHint')}
          action={canStart ? { label: t('chat.newMessage'), onPress: () => router.push('/chat/new') } : undefined}
        />
      ) : (
        <Card padded={false}>
          {items.map((conversation, index) => (
            <ConversationRow key={conversation.id} conversation={conversation} last={index === items.length - 1} />
          ))}
        </Card>
      )}
    </Screen>
  );
}

function ConversationRow({ conversation, last }: { conversation: Conversation; last: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const preview = conversation.last_message
    ? `${conversation.last_message.mine ? 'You: ' : ''}${conversation.last_message.body}`
    : conversation.subtitle;
  const context = conversation.student ? t('chat.about', { name: conversation.student.first_name }) : conversation.subtitle;
  return (
    <ListRow
      left={<Avatar initials={conversation.initials} seed={conversation.title} size={46} />}
      title={conversation.title}
      subtitle={`${context} · ${preview}`}
      onPress={() => router.push(`/chat/${conversation.id}`)}
      chevron={false}
      last={last}
      right={
        <View style={styles.meta}>
          {conversation.last_message ? <Text variant="caption">{relativeTime(conversation.last_message.at)}</Text> : null}
          {conversation.unread ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text variant="caption" rawColor={colors.onPrimary} style={styles.badgeText}>
                {conversation.unread}
              </Text>
            </View>
          ) : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
  meta: { alignItems: 'flex-end', gap: 4 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontWeight: '700', fontSize: 11 },
});
