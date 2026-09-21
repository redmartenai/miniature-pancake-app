import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api/endpoints';
import type { ChatMessage } from '@/api/types';
import { useRealtimeStatus } from '@/features/realtime/realtime';
import { newClientId } from '@/lib/ids';
import { formatDate, formatTime, isToday } from '@/lib/format';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, spacing } from '@/theme/tokens';
import { Banner, ErrorState, Icon, LoadingCards, Text } from '@/ui';
import { noWebFocusRing } from '@/ui/webStyles';

type Thread = { messages: ChatMessage[]; has_more: boolean };

export default function ChatThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const schoolId = useSession((s) => s.schoolId);
  const me = useSession((s) => s.user);
  const realtime = useRealtimeStatus((s) => s.status);
  const [draft, setDraft] = useState('');
  const [composerFocused, setComposerFocused] = useState(false);

  const conversations = useQuery({ queryKey: ['conversations', schoolId], queryFn: api.conversations });
  const conversation = conversations.data?.conversations.find((c) => c.id === id);
  const thread = useQuery({
    queryKey: ['messages', id],
    queryFn: () => api.messages(id),
    // New messages arrive over realtime; poll only when it's unavailable.
    refetchInterval: realtime === 'connected' ? false : 8_000,
  });

  const lastId = thread.data?.messages[thread.data.messages.length - 1]?.id;
  useEffect(() => {
    if (!lastId) return;
    api
      .markConversationRead(id)
      .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
      .catch(() => undefined);
  }, [id, lastId, queryClient]);

  const updateThread = (fn: (messages: ChatMessage[]) => ChatMessage[]) =>
    queryClient.setQueryData<Thread>(['messages', id], (current) => ({
      has_more: current?.has_more ?? false,
      messages: fn(current?.messages ?? []),
    }));

  const send = useMutation({
    mutationFn: (message: ChatMessage) => api.sendMessage(id, message.body, message.client_id),
    onMutate: (message) => {
      updateThread((messages) => [...messages.filter((m) => m.client_id !== message.client_id), { ...message, pending: true, failed: false }]);
    },
    onSuccess: (saved) => {
      updateThread((messages) => messages.map((m) => (m.client_id === saved.client_id ? saved : m)));
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (_error, message) => {
      updateThread((messages) => messages.map((m) => (m.client_id === message.client_id ? { ...m, pending: false, failed: true } : m)));
    },
  });

  const submit = () => {
    const body = draft.trim();
    if (!body || !me) return;
    setDraft('');
    const clientId = newClientId();
    send.mutate({
      id: clientId,
      client_id: clientId,
      conversation_id: id,
      body,
      deleted: false,
      created_at: new Date().toISOString(),
      sender: { id: me.id, name: me.full_name, initials: me.initials },
      mine: true,
    });
  };

  const messages = [...(thread.data?.messages ?? [])].reverse();

  return (
    <SafeAreaView edges={['bottom']} style={[styles.root, { backgroundColor: colors.bg }]}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View>
              <Text variant="subheading" numberOfLines={1}>
                {conversation?.title ?? ''}
              </Text>
              {conversation ? (
                <Text variant="caption" numberOfLines={1}>
                  {conversation.student ? `${t('chat.about', { name: conversation.student.first_name })} · ` : ''}
                  {conversation.subtitle}
                </Text>
              ) : null}
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {conversation?.office_hours && !conversation.office_hours.open_now ? (
          <View style={styles.banner}>
            <Banner tone="info" icon="time-outline" message={`${t('chat.officeClosed')} ${conversation.office_hours.text}.`} />
          </View>
        ) : null}
        {thread.isLoading ? (
          <View style={styles.banner}>
            <LoadingCards count={2} />
          </View>
        ) : thread.error ? (
          <ErrorState error={thread.error} onRetry={() => void thread.refetch()} />
        ) : (
          <FlatList
            inverted
            data={messages}
            keyExtractor={(m) => m.client_id || m.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => {
              const older = messages[index + 1];
              const showDate = !older || new Date(older.created_at).toDateString() !== new Date(item.created_at).toDateString();
              return (
                <View>
                  {showDate ? (
                    <Text variant="caption" align="center" style={styles.date}>
                      {isToday(new Date(item.created_at)) ? t('common.today') : formatDate(item.created_at, { weekday: true })}
                    </Text>
                  ) : null}
                  <Bubble message={item} onRetry={() => send.mutate(item)} />
                </View>
              );
            }}
          />
        )}
        <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            accessibilityLabel={t('chat.placeholder')}
            onFocus={() => setComposerFocused(true)}
            onBlur={() => setComposerFocused(false)}
            style={[styles.input, { color: colors.ink, backgroundColor: colors.bg, borderColor: composerFocused ? colors.primary : colors.border }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.send')}
            onPress={submit}
            disabled={!draft.trim()}
            style={[styles.send, { backgroundColor: draft.trim() ? colors.primary : colors.surfaceAlt }]}>
            <Icon name="send" size={18} rawColor={draft.trim() ? colors.onPrimary : colors.textMuted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message, onRetry }: { message: ChatMessage; onRetry: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const mine = message.mine;
  const content = (
    <View
      style={[
        styles.bubble,
        mine
          ? { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 6 }
          : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
        (message.pending || message.failed) && { opacity: 0.7 },
      ]}>
      {!mine ? (
        <Text variant="label" color="primary" style={styles.sender}>
          {message.sender.name}
        </Text>
      ) : null}
      <Text variant="body" rawColor={mine ? colors.onPrimary : colors.ink}>
        {message.deleted ? '—' : message.body}
      </Text>
      <View style={styles.metaRow}>
        <Text variant="caption" rawColor={mine ? colors.onPrimary : colors.textMuted} style={styles.time}>
          {formatTime(message.created_at)}
        </Text>
        {mine ? (
          <Icon
            name={message.failed ? 'alert-circle-outline' : message.pending ? 'time-outline' : 'checkmark-done'}
            size={13}
            rawColor={colors.onPrimary}
          />
        ) : null}
      </View>
    </View>
  );
  if (message.failed) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={t('chat.failed')} onPress={onRetry} style={styles.failedWrap}>
        {content}
        <Text variant="caption" color="danger" style={styles.failed}>
          {t('chat.failed')}
        </Text>
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  banner: { padding: spacing.md, paddingBottom: 0 },
  list: { padding: spacing.md, gap: spacing.xs, maxWidth: 760, width: '100%', alignSelf: 'center' },
  date: { marginVertical: spacing.sm },
  bubble: { maxWidth: '82%', paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2, borderRadius: radius.md + 4, marginVertical: 2 },
  sender: { marginBottom: 2, fontSize: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 },
  time: { fontSize: 11, lineHeight: 14, opacity: 0.85 },
  failedWrap: { alignItems: 'flex-end' },
  failed: { marginTop: 2 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, padding: spacing.xs + 2, borderTopWidth: StyleSheet.hairlineWidth },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 130,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: fonts.regular,
    fontSize: 16,
    ...noWebFocusRing,
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
