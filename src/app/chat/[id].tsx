import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { ChatMessage, Meeting } from '@/api/types';
import { useRealtimeStatus } from '@/features/realtime/realtime';
import { downloadFile } from '@/lib/download';
import { fileSize, formatDate, formatTime, isToday, weekdayName } from '@/lib/format';
import { newClientId } from '@/lib/ids';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { AppBar, Avatar, Bubble, Button, Card, ErrorState, Icon, ICON_SIZE, IconButton, LoadingCards, pointer, Text, TileIcon, useToast } from '@/ui';
import { noWebFocusRing } from '@/ui/webStyles';

type Thread = { messages: ChatMessage[]; meetings: Meeting[]; others_read_at?: string | null; has_more: boolean };
type Row = { kind: 'message'; message: ChatMessage } | { kind: 'meeting'; meeting: Meeting } | { kind: 'date'; date: string };

/** ParentChat (shared by every role): a school-moderated thread with attachments and booked meetings. */
export default function ChatThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();
  const schoolId = useSession((s) => s.schoolId);
  const me = useSession((s) => s.user);
  const realtime = useRealtimeStatus((s) => s.status);
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);

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
      meetings: current?.meetings ?? [],
      others_read_at: current?.others_read_at,
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

  const attach = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new ApiError(0, 'permission', t('chat.photoPermission'));
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (picked.canceled || !picked.assets[0]) return null;
      const asset = picked.assets[0];
      const form = new FormData();
      form.append('client_id', newClientId());
      form.append('body', draft.trim());
      const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
      if (Platform.OS === 'web') {
        const blob = await (await fetch(asset.uri)).blob();
        form.append('attachment', blob, name);
      } else {
        form.append('attachment', { uri: asset.uri, name, type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
      }
      return api.sendAttachment(id, form);
    },
    onSuccess: (saved) => {
      if (!saved) return;
      setDraft('');
      void queryClient.invalidateQueries({ queryKey: ['messages', id] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
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

  // Messages and meeting cards in time order, with a divider for each day; newest last.
  const items: { at: string; row: Row }[] = [
    ...(thread.data?.messages ?? []).map((m) => ({ at: m.created_at, row: { kind: 'message', message: m } as Row })),
    ...(thread.data?.meetings ?? []).map((m) => ({ at: m.created_at, row: { kind: 'meeting', meeting: m } as Row })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const rows: Row[] = [];
  let day = '';
  for (const item of items) {
    const d = new Date(item.at).toDateString();
    if (d !== day) {
      rows.push({ kind: 'date', date: item.at });
      day = d;
    }
    rows.push(item.row);
  }
  const lastMine = [...(thread.data?.messages ?? [])].reverse().find((m) => m.mine && !m.pending);
  const readAt = thread.data?.others_read_at;

  const header = (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.canvas }}>
      <AppBar
        back
        titleNode={
          conversation ? (
            <View style={[styles.row, { gap: 12 }]}>
              <Avatar initials={conversation.initials} size="md" tone={2} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="h4" numberOfLines={1} style={{ fontSize: 16 }}>
                  {conversation.title}
                </Text>
                <Text variant="xxs" color="muted" numberOfLines={2}>
                  {conversation.office_hours ? t('chat.usuallyReplies', { subtitle: conversation.subtitle, hours: conversation.office_hours.text }) : conversation.subtitle}
                </Text>
              </View>
            </View>
          ) : null
        }
      />
      <View style={[styles.row, { gap: 6, justifyContent: 'center', paddingBottom: 10, marginTop: -2 }]}>
        <Icon name="shield" size={ICON_SIZE.xs} rawColor={colors.muted} />
        <Text variant="xs" color="muted" weight={500}>
          {t('chat.moderated')}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      {header}
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {thread.isLoading ? (
          <View style={{ padding: 20 }}>
            <LoadingCards count={2} />
          </View>
        ) : thread.error ? (
          <ErrorState error={thread.error} onRetry={() => void thread.refetch()} />
        ) : (
          <FlatList
            inverted
            data={[...rows].reverse()}
            keyExtractor={(row, i) => (row.kind === 'message' ? row.message.client_id || row.message.id : row.kind === 'meeting' ? row.meeting.id : `d${i}`)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) =>
              item.kind === 'date' ? (
                <DateDivider date={item.date} />
              ) : item.kind === 'meeting' ? (
                <MeetingCard meeting={item.meeting} teacher={conversation?.title ?? ''} onReschedule={() => setDraft(t('chat.rescheduleDraft', { date: formatDate(item.meeting.starts_at) }))} />
              ) : (
                <MessageBubble
                  message={item.message}
                  read={!!(readAt && item.message.id === lastMine?.id && readAt >= item.message.created_at)}
                  onRetry={() => send.mutate(item.message)}
                />
              )
            }
          />
        )}
        <View style={[styles.composer, { borderTopColor: colors.line, backgroundColor: colors.canvas, paddingBottom: Math.max(insets.bottom, 12) + 2 }]}>
          {conversation?.can_send !== false ? (
            <IconButton icon="paperclip" size="lg" label={t('chat.attach')} onPress={() => attach.mutate()} disabled={attach.isPending} />
          ) : null}
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.muted}
            multiline
            maxLength={2000}
            accessibilityLabel={t('chat.placeholder')}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[
              styles.input,
              { color: colors.ink, backgroundColor: colors.surface, borderColor: focused ? colors.brand : colors.lineStrong },
              focused && { boxShadow: `0 0 0 3px ${colors.brandSoft}` },
            ]}
          />
          <IconButton icon="send" size="lg" variant="brand" label={t('common.send')} onPress={submit} disabled={!draft.trim()} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function DateDivider({ date }: { date: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const d = new Date(date);
  return (
    <View style={[styles.row, { gap: 12, marginVertical: 14 }]}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      <Text variant="xs" color="muted" weight={600}>
        {isToday(d) ? t('common.today') : `${weekdayName(d, true)}, ${formatDate(d)}`}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
    </View>
  );
}

function MessageBubble({ message, read, onRetry }: { message: ChatMessage; read: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const mine = message.mine;
  const download = useMutation({
    mutationFn: () => downloadFile(message.attachment!.download, message.attachment!.name),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  const fg = mine ? colors.onBrand : colors.ink;
  const meta = [formatTime(message.created_at), mine && read ? t('chat.read') : null, message.pending ? t('chat.sending') : null].filter(Boolean).join(' · ');
  return (
    <Pressable
      disabled={!message.failed}
      onPress={onRetry}
      accessibilityRole={message.failed ? 'button' : undefined}
      accessibilityLabel={message.failed ? t('chat.failed') : undefined}
      style={{ marginBottom: 12, alignItems: mine ? 'flex-end' : 'flex-start', opacity: message.pending ? 0.75 : 1 }}>
      <Bubble out={mine} style={{ gap: 10 }}>
        {message.body ? (
          <Text variant="body" rawColor={fg} style={{ fontSize: 15, lineHeight: 22 }}>
            {message.deleted ? '—' : message.body}
          </Text>
        ) : null}
        {message.attachment ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('chat.downloadFile', { name: message.attachment.name })}
            onPress={() => download.mutate()}
            style={[styles.file, { backgroundColor: mine ? 'rgba(255,255,255,0.14)' : colors.subtle, borderColor: mine ? 'transparent' : colors.line }, pointer]}>
            <TileIcon icon="document" size="sm" tone={mine ? 'neutral' : 'brand'} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="sm" weight={700} rawColor={fg} numberOfLines={1}>
                {message.attachment.name}
              </Text>
              <Text variant="xxs" weight={600} rawColor={mine ? colors.onBrand : colors.muted}>
                {[message.attachment.name.split('.').pop()?.toUpperCase(), fileSize(message.attachment.size)].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Icon name="download" size={ICON_SIZE.sm} rawColor={mine ? colors.onBrand : colors.muted} />
          </Pressable>
        ) : null}
      </Bubble>
      <Text variant="xxs" weight={500} color={message.failed ? 'bad' : 'muted'} style={{ marginTop: 4 }}>
        {message.failed ? t('chat.failed') : meta}
      </Text>
    </Pressable>
  );
}

function MeetingCard({ meeting, teacher, onReschedule }: { meeting: Meeting; teacher: string; onReschedule: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const calendar = useMutation({
    mutationFn: () => downloadFile(meeting.calendar, 'meeting.ics'),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  const start = new Date(meeting.starts_at);
  const end = new Date(meeting.ends_at);
  return (
    <View style={{ marginBottom: 12 }}>
      <Card pad={16} style={{ maxWidth: 310, gap: 12 }}>
        <View style={[styles.row, { alignItems: 'flex-start', gap: 12 }]}>
          <TileIcon icon="calendarCheck" tone="pink" size="sm" />
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Text variant="xxs" weight={700} rawColor={colors.brandInk} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>
              {t('chat.meetingBooked')}
            </Text>
            <Text variant="sm" weight={700}>
              {meeting.title}
            </Text>
            <Text variant="sm" weight={700} num>
              {`${weekdayName(start, true)} ${formatDate(start)} · ${formatTime(start).replace(/ (AM|PM)$/, '')}–${formatTime(end)}`}
            </Text>
            {meeting.location ? (
              <Text variant="xs" color="muted">
                {t('chat.withTeacher', { location: meeting.location, name: teacher })}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.row, { gap: 8 }]}>
          <Button title={t('chat.addToCalendar')} icon="calendar" variant="soft" height={44} loading={calendar.isPending} onPress={() => calendar.mutate()} style={{ flex: 1 }} />
          <Button title={t('chat.reschedule')} variant="ghost" height={44} onPress={onReschedule} />
        </View>
      </Card>
      <Text variant="xxs" color="muted" weight={500} style={{ marginTop: 4 }}>
        {formatTime(meeting.created_at)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  list: { paddingHorizontal: 20, paddingVertical: 12 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: fonts.medium,
    fontSize: 15,
    ...noWebFocusRing,
  },
  file: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, minWidth: 220 },
});
