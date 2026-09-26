import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { Conversation } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { formatDate, formatTime, isToday, joinNames, weekdayName } from '@/lib/format';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { AppBar, Avatar, Badge, Button, Card, EmptyState, ErrorState, Icon, ICON_SIZE, ListRow, LoadingCards, Screen, Search, SegmentedControl, Text, TileIcon, Well } from '@/ui';

type Filter = 'all' | 'teachers' | 'office';

/** ParentMessages: conversations with teachers and the school office. */
export default function ParentMessages() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const schoolId = useSession((s) => s.schoolId);
  const family = useFamily();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const query = useQuery({ queryKey: ['conversations', schoolId], queryFn: api.conversations });
  const list = (query.data?.conversations ?? [])
    .filter((c) => filter === 'all' || (filter === 'teachers' ? c.kind === 'direct' : c.kind === 'department'))
    .filter((c) => {
      const term = q.trim().toLowerCase();
      if (!term) return true;
      return [c.title, c.subtitle, c.last_message?.body, c.student?.first_name].some((v) => v?.toLowerCase().includes(term));
    });
  const names = family.students.map((s) => s.first_name);

  return (
    <Screen
      dock
      refreshing={query.isRefetching}
      onRefresh={query.refetch}
      header={<AppBar back title={t('parent.messages.title')} subtitle={t('parent.messages.subtitle')} />}>
      <Search value={q} onChangeText={setQ} placeholder={t('parent.messages.search')} />
      <SegmentedControl
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('parent.messages.all') },
          { value: 'teachers', label: t('parent.messages.teachers') },
          { value: 'office', label: t('parent.messages.office') },
        ]}
      />
      {query.error ? <ErrorState error={query.error} onRetry={query.refetch} /> : null}
      {query.isLoading ? <LoadingCards count={3} /> : null}
      {query.data && !list.length ? (
        <EmptyState icon="chat" title={q.trim() ? t('parent.messages.noMatch', { q: q.trim() }) : t('parent.messages.empty')} />
      ) : null}
      {list.length ? (
        <Card pad={0} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
          {list.map((c, i) => (
            <ConversationRow key={c.id} conversation={c} last={i === list.length - 1} />
          ))}
        </Card>
      ) : null}
      <Well style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="shield" size={ICON_SIZE.sm} rawColor={colors.ink2} />
        <Text variant="xs" color="ink2" style={{ flex: 1 }}>
          {t('parent.messages.moderation', { names: joinNames(names) })}
        </Text>
      </Well>
      <View style={{ alignItems: 'flex-end' }}>
        <Button title={t('parent.messages.newMessage')} icon="pencil" size="lg" onPress={() => router.push('/chat/new')} />
      </View>
    </Screen>
  );
}

function ConversationRow({ conversation: c, last }: { conversation: Conversation; last: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const at = c.last_message?.at;
  const d = at ? new Date(at) : null;
  const when = d ? (isToday(d) ? formatTime(d) : Date.now() - d.getTime() < 6 * 86_400_000 ? weekdayName(d, true) : formatDate(d)) : '';
  const unread = c.unread > 0;
  const preview = c.last_message ? (c.last_message.mine ? t('parent.messages.you', { text: c.last_message.body }) : c.last_message.body) : '';
  const left =
    c.kind === 'department' ? (
      <TileIcon icon={c.department === 'transport' ? 'bus' : 'school'} tone="neutral" size="lg" style={{ borderRadius: 24 }} />
    ) : (
      <Avatar initials={c.initials} size="lg" seed={c.title} />
    );
  return (
    <ListRow
      inset={0}
      last={last}
      chevron={false}
      onPress={() => router.push(`/chat/${c.id}`)}
      accessibilityLabel={`${c.title}, ${preview}${unread ? `, ${t('parent.messages.unread', { count: c.unread })}` : ''}`}
      left={left}
      style={{ alignItems: 'flex-start' }}
      title={
        <View style={styles.titleRow}>
          <Text variant="sm" weight={700} numberOfLines={1} style={{ flex: 1, fontSize: 14 }}>
            {c.title}
          </Text>
          <Text variant="xxs" weight={unread ? 700 : 600} rawColor={unread ? colors.brandInk : colors.muted}>
            {when}
          </Text>
        </View>
      }
      subtitle={
        <View style={{ gap: 3 }}>
          <Text variant="xs" color="muted" numberOfLines={1}>
            {[c.subtitle, c.student?.first_name].filter(Boolean).join(' · ')}
          </Text>
          <View style={styles.titleRow}>
            <Text variant="sm" weight={unread ? 700 : 500} color={unread ? 'ink' : 'ink2'} numberOfLines={1} style={{ flex: 1 }}>
              {preview}
            </Text>
            {unread ? <Badge value={c.unread} /> : null}
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
