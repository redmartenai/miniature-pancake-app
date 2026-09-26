import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { Announcement, Conversation } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { formatDate, formatTime, isToday, weekdayName } from '@/lib/format';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { AppBar, Avatar, AvatarStack, Badge, Button, Card, EmptyState, ErrorState, Icon, ICON_SIZE, LoadingCards, pointer, Screen, SectionHead, Text } from '@/ui';

const when = (at: string | Date) => {
  const d = typeof at === 'string' ? new Date(at) : at;
  return isToday(d) ? formatTime(d) : Date.now() - d.getTime() < 6 * 86_400_000 ? weekdayName(d, true) : formatDate(d);
};

/** StuMessages: school-moderated chats with the student's own teachers, plus the class announcements channel. */
export default function StudentMessages() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const schoolId = useSession((s) => s.schoolId);
  const family = useFamily();
  const me = family.selected;
  const conversations = useQuery({ queryKey: ['conversations', schoolId], queryFn: api.conversations });
  const contacts = useQuery({ queryKey: ['chat-contacts', schoolId], queryFn: api.chatContacts });
  const announcements = useQuery({ queryKey: ['announcements', schoolId], queryFn: api.announcements });
  const list = conversations.data?.conversations ?? [];
  const unread = conversations.data?.unread_total ?? 0;
  const latest = announcements.data?.items[0];
  const teachers = (contacts.data?.contacts ?? []).filter((c, i, all) => c.kind === 'user' && all.findIndex((x) => x.user_id === c.user_id) === i);
  const count = list.length + (latest ? 1 : 0);
  // The announcements row sits in time order among the chats.
  const rows: ({ kind: 'chat'; c: Conversation } | { kind: 'channel'; a: Announcement })[] = list.map((c) => ({ kind: 'chat' as const, c }));
  if (latest) {
    const at = new Date(latest.published_at).getTime();
    const index = rows.findIndex((r) => r.kind === 'chat' && new Date(r.c.last_message?.at ?? 0).getTime() < at);
    rows.splice(index < 0 ? rows.length : index, 0, { kind: 'channel', a: latest });
  }

  return (
    <Screen
      dock
      refreshing={conversations.isRefetching}
      onRefresh={() => {
        void conversations.refetch();
        void announcements.refetch();
      }}
      header={
        <AppBar
          back={() => router.navigate('/student')}
          subtitle={unread ? t('student.messages.subtitleUnread', { count: unread }) : t('student.messages.subtitle')}
          title={t('student.messages.title')}
        />
      }>
      <View style={[styles.row, { alignItems: 'flex-start', gap: 12, padding: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.infoSoft }]}>
        <Icon name="shield" size={ICON_SIZE.md} rawColor={colors.info} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text variant="sm" weight={700}>
            {t('student.messages.moderated')}
          </Text>
          <Text variant="xs" color="ink2">
            {t('student.messages.moderatedBody')}
          </Text>
        </View>
      </View>

      <SectionHead
        title={t('student.messages.conversations')}
        action={
          <Text variant="xs" color="muted" weight={600}>
            {count}
          </Text>
        }
      />
      {conversations.error ? <ErrorState error={conversations.error} onRetry={conversations.refetch} /> : null}
      {conversations.isLoading ? <LoadingCards count={2} /> : null}
      {conversations.data && !rows.length ? <EmptyState icon="chat" title={t('student.messages.empty')} /> : null}
      {rows.length ? (
        <Card pad={0} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
          {rows.map((r, i) =>
            r.kind === 'chat' ? (
              <ChatRow key={r.c.id} conversation={r.c} last={i === rows.length - 1} />
            ) : (
              <ChannelRow key="channel" announcement={r.a} label={me ? t('student.messages.channel', { class: me.class.short_label }) : t('student.messages.channelNoClass')} last={i === rows.length - 1} />
            ),
          )}
        </Card>
      ) : null}

      <Card pad={16} style={{ gap: 14 }}>
        {teachers.length ? (
          <View style={[styles.row, { gap: 12 }]}>
            <AvatarStack>
              {teachers.slice(0, 4).map((c) => (
                <Avatar key={c.user_id ?? c.name} initials={c.initials} size="sm" seed={c.name} />
              ))}
            </AvatarStack>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="sm" weight={700}>
                {t('student.messages.teachers', { count: teachers.length })}
              </Text>
              <Text variant="xs" color="muted">
                {t('student.messages.teachersSub')}
              </Text>
            </View>
          </View>
        ) : null}
        <Button title={t('student.messages.new')} icon="plus" height={48} fullWidth onPress={() => router.push('/chat/new')} />
      </Card>
    </Screen>
  );
}

function RowShell({ left, children, onPress, label, last }: { left: ReactNode; children: ReactNode; onPress: () => void; label: string; last: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.row,
        { alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
        !last && { borderBottomWidth: 1, borderBottomColor: colors.line },
        hovered && { opacity: 0.85 },
        pointer,
      ]}>
      {left}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>{children}</View>
    </Pressable>
  );
}

function ChatRow({ conversation: c, last }: { conversation: Conversation; last: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const unread = c.unread > 0;
  const preview = c.last_message ? (c.last_message.mine ? t('parent.messages.you', { text: c.last_message.body }) : c.last_message.body) : '';
  return (
    <RowShell
      last={last}
      onPress={() => router.push(`/chat/${c.id}`)}
      label={`${c.title}, ${preview}${unread ? `, ${t('parent.messages.unread', { count: c.unread })}` : ''}`}
      left={<Avatar initials={c.initials} size="lg" seed={c.title} style={{ width: 44, height: 44, borderRadius: 22 }} />}>
      <View style={[styles.row, { gap: 8 }]}>
        <Text variant="sm" weight={700} numberOfLines={1} style={{ flex: 1 }}>
          {c.title}
        </Text>
        <Text variant="xxs" weight={unread ? 700 : 600} rawColor={unread ? colors.brandInk : colors.muted}>
          {c.last_message ? when(c.last_message.at) : ''}
        </Text>
      </View>
      {c.subtitle ? (
        <Text variant="xxs" color="muted" weight={600} numberOfLines={1}>
          {c.subtitle}
        </Text>
      ) : null}
      <View style={[styles.row, { gap: 8 }]}>
        <Text variant="sm" weight={unread ? 600 : 400} color={unread ? 'ink' : 'muted'} numberOfLines={1} style={{ flex: 1 }}>
          {preview}
        </Text>
        {unread ? <Badge value={c.unread} /> : null}
      </View>
    </RowShell>
  );
}

/** Class announcements: read-only, opens the notifications feed. */
function ChannelRow({ announcement: a, label, last }: { announcement: Announcement; label: string; last: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <RowShell
      last={last}
      onPress={() => router.push('/student/notifications')}
      label={`${label}, ${t('student.messages.readOnly')}, ${a.title}`}
      left={
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.infoSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="speaker" size={ICON_SIZE.md} rawColor={colors.info} />
        </View>
      }>
      <View style={[styles.row, { gap: 8 }]}>
        <Text variant="sm" weight={700} numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Text>
        <Text variant="xxs" color="muted" weight={600}>
          {when(a.published_at)}
        </Text>
      </View>
      <View style={[styles.row, { gap: 4 }]}>
        <Icon name="lock" size={12} rawColor={colors.muted} />
        <Text variant="xxs" color="muted" weight={600}>
          {t('student.messages.readOnly')}
        </Text>
      </View>
      <Text variant="sm" color="muted" numberOfLines={1}>
        {a.title}
      </Text>
    </RowShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
