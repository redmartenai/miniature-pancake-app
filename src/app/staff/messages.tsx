import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { Announcement, Conversation, Meeting } from '@/api/types';
import { useRefetchOnFocus } from '@/features/common/useRefetchOnFocus';
import { formatDate, formatTime, isoDate, isToday, weekdayName } from '@/lib/format';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import {
  AppBar,
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  clock,
  DateField,
  EmptyState,
  ErrorState,
  Icon,
  ICON_SIZE,
  IconButton,
  LoadingCards,
  Pill,
  pointer,
  Screen,
  SegmentedControl,
  Sheet,
  Text,
  ThemeToggle,
  TimeField,
  useToast,
} from '@/ui';

type Filter = 'all' | 'parents' | 'staff' | 'announcements';
const DAYS = [0, 1, 2, 3, 4, 5];

const when = (at: string) => {
  const d = new Date(at);
  return isToday(d) ? formatTime(d) : Date.now() - d.getTime() < 6 * 86_400_000 ? weekdayName(d, true) : formatDate(d);
};

/** StaffMessages: parents, colleagues and the principal's office in one list, office hours, and PTM requests. */
export default function StaffMessages() {
  const { t } = useTranslation();
  const schoolId = useSession((s) => s.schoolId);
  const [filter, setFilter] = useState<Filter>('all');
  const [hoursOpen, setHoursOpen] = useState(false);
  const conversations = useQuery({ queryKey: ['conversations', schoolId], queryFn: api.conversations });
  const announcements = useQuery({ queryKey: ['announcements', schoolId], queryFn: api.announcements });
  const me = useQuery({ queryKey: ['staff-me'], queryFn: api.staffMe });
  useRefetchOnFocus(conversations.refetch);

  const list = conversations.data?.conversations ?? [];
  const staffNotices = (announcements.data?.items ?? []).filter((a) => a.audience === 'staff' || a.audience === 'everyone').slice(0, 3);
  const parentUnread = list.filter((c) => c.counterpart === 'parent' || c.counterpart === 'student').reduce((n, c) => n + c.unread, 0);
  // Every PTM request waiting on me, in date order, so a card can say "1 of 4 requests".
  const requests = list.flatMap((c) => (c.pending_meeting ? [c.pending_meeting] : [])).sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  type Row = { at: string; node: ReactNode };
  const rows: Row[] = [];
  if (filter !== 'announcements') {
    for (const c of list) {
      const isParent = c.counterpart === 'parent' || c.counterpart === 'student';
      if (filter === 'parents' && !isParent) continue;
      if (filter === 'staff' && isParent) continue;
      rows.push({ at: c.last_message?.at ?? '', node: <ChatRow key={c.id} c={c} requests={requests} /> });
    }
  }
  if (filter === 'all' || filter === 'announcements') {
    for (const a of staffNotices) rows.push({ at: a.published_at, node: <NoticeRow key={a.id} a={a} /> });
  }
  rows.sort((a, b) => b.at.localeCompare(a.at));

  const hours = me.data?.office_hours;
  const today = new Date();

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
          subtitle={`${weekdayName(today, true)}, ${formatDate(today)}`}
          title={t('staff.messages.title')}
          theme={false}
          actions={
            <>
              <ThemeToggle />
              <IconButton icon="pencil" size="lg" label={t('staff.messages.new')} onPress={() => router.push('/chat/new')} />
            </>
          }
        />
      }>
      <SegmentedControl
        fit
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('staff.messages.all') },
          { value: 'parents', label: t('staff.messages.parents'), badge: parentUnread ? <Badge value={parentUnread} /> : undefined },
          { value: 'staff', label: t('staff.messages.staff') },
          { value: 'announcements', label: t('staff.messages.announcements') },
        ]}
      />
      {me.data ? <OfficeHours hours={hours ?? null} onEdit={() => setHoursOpen(true)} /> : null}
      {conversations.error ? <ErrorState error={conversations.error} onRetry={conversations.refetch} /> : null}
      {conversations.isLoading ? <LoadingCards count={3} /> : null}
      {conversations.data && !rows.length ? <EmptyState icon="chat" title={t('staff.messages.empty')} /> : null}
      {rows.length ? (
        <Card pad={0} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
          {rows.map((r, i) => (
            <View key={i}>
              {r.node}
              {i < rows.length - 1 ? <Divider /> : null}
            </View>
          ))}
        </Card>
      ) : null}
      {me.data ? <HoursSheet visible={hoursOpen} onClose={() => setHoursOpen(false)} hours={hours ?? null} /> : null}
    </Screen>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.line }} />;
}

function OfficeHours({ hours, onEdit }: { hours: { days: number[]; start: string; end: string } | null; onEdit: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const names = [t('staff.days.mon'), t('staff.days.tue'), t('staff.days.wed'), t('staff.days.thu'), t('staff.days.fri'), t('staff.days.sat'), t('staff.days.sun')];
  const days = hours ? (hours.days.length > 1 && hours.days.every((d, i) => i === 0 || d === hours.days[i - 1] + 1) ? `${names[hours.days[0]]}–${names[hours.days[hours.days.length - 1]]}` : hours.days.map((d) => names[d]).join(', ')) : '';
  return (
    <View style={[styles.row, { gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.sunken, alignItems: 'flex-start' }]}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.pMint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="clock" size={ICON_SIZE.sm} rawColor={colors.pMintInk} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="sm" weight={700}>
          {hours ? t('staff.messages.available', { start: clock(hours.start).replace(' PM', '').replace(' AM', ''), end: clock(hours.end) }) : t('staff.messages.noHours')}
        </Text>
        <Text variant="xs" color="muted">
          {hours ? t('staff.messages.hoursHint', { days }) : t('staff.messages.noHoursHint')}
        </Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onEdit} hitSlop={10} style={[{ alignSelf: 'center' }, pointer]}>
        <Text variant="sm" weight={700} rawColor={colors.brandInk}>
          {t('staff.messages.edit')}
        </Text>
      </Pressable>
    </View>
  );
}

function HoursSheet({ visible, onClose, hours }: { visible: boolean; onClose: () => void; hours: { days: number[]; start: string; end: string } | null }) {
  const { t } = useTranslation();
  const toast = useToast();
  const client = useQueryClient();
  const [days, setDays] = useState<number[]>(hours?.days ?? [0, 1, 2, 3, 4]);
  const [start, setStart] = useState(hours?.start ?? '15:00');
  const [end, setEnd] = useState(hours?.end ?? '17:00');
  const save = useMutation({
    mutationFn: () => api.updateOfficeHours({ days: [...days].sort(), start, end }),
    onSuccess: (me) => {
      client.setQueryData(['staff-me'], me);
      toast(t('staff.messages.hoursSaved'));
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });
  const names = [t('staff.days.mon'), t('staff.days.tue'), t('staff.days.wed'), t('staff.days.thu'), t('staff.days.fri'), t('staff.days.sat')];
  return (
    <Sheet visible={visible} onClose={onClose} title={t('staff.messages.hoursTitle')} message={t('staff.messages.hoursBody')}>
      <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
        {DAYS.map((d) => (
          <Chip key={d} label={names[d]} selected={days.includes(d)} onPress={() => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))} />
        ))}
      </View>
      <View style={[styles.row, { gap: 12 }]}>
        <TimeField label={t('staff.messages.from')} value={start} onChange={setStart} style={{ flex: 1 }} />
        <TimeField label={t('staff.messages.to')} value={end} onChange={setEnd} style={{ flex: 1 }} />
      </View>
      <Button title={t('staff.messages.saveHours')} size="lg" fullWidth disabled={!days.length || start >= end} loading={save.isPending} onPress={() => save.mutate()} />
    </Sheet>
  );
}

function ChatRow({ c, requests }: { c: Conversation; requests: Meeting[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const unread = c.unread > 0;
  const preview = c.last_message ? (c.last_message.mine ? t('parent.messages.you', { text: c.last_message.body }) : c.last_message.body) : '';
  return (
    <View style={{ paddingVertical: 14, gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${c.title}, ${preview}${unread ? `, ${t('parent.messages.unread', { count: c.unread })}` : ''}`}
        onPress={() => router.push(`/chat/${c.id}`)}
        style={[styles.row, { gap: 12, alignItems: 'flex-start' }, pointer]}>
        <Avatar initials={c.initials} size="lg" seed={c.title} style={{ width: 44, height: 44, borderRadius: 22 }} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
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
          {c.pending_meeting ? (
            <Text variant="sm" weight={unread ? 600 : 400} color={unread ? 'ink' : 'ink2'} numberOfLines={2}>
              {t('staff.messages.requested')}
            </Text>
          ) : (
            <View style={[styles.row, { gap: 8, alignItems: 'flex-start' }]}>
              <Text variant="sm" weight={unread ? 600 : 400} color={unread ? 'ink' : 'ink2'} numberOfLines={2} style={{ flex: 1 }}>
                {preview}
              </Text>
              {unread ? <Badge value={c.unread} /> : null}
            </View>
          )}
        </View>
      </Pressable>
      {c.pending_meeting ? <MeetingRequest m={c.pending_meeting} index={requests.findIndex((r) => r.id === c.pending_meeting!.id) + 1} total={requests.length} /> : null}
    </View>
  );
}

/** A parent's PTM slot request: accept it, or propose another time. */
function MeetingRequest({ m, index, total }: { m: Meeting; index: number; total: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const [proposing, setProposing] = useState(false);
  const start = new Date(m.starts_at);
  const end = new Date(m.ends_at);
  const [day, setDay] = useState(isoDate(start));
  const [time, setTime] = useState(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`);
  const decide = useMutation({
    mutationFn: (action: 'accept' | 'propose') => api.decideMeeting(m.id, action, action === 'propose' ? new Date(`${day}T${time}:00`).toISOString() : undefined),
    onSuccess: (_r, action) => {
      toast(action === 'accept' ? t('staff.messages.accepted') : t('staff.messages.proposed'));
      setProposing(false);
      void client.invalidateQueries({ queryKey: ['conversations'] });
      void client.invalidateQueries({ queryKey: ['staff-home'] });
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });
  return (
    <View style={{ marginLeft: 56, padding: 12, borderRadius: 14, backgroundColor: colors.sunken, borderWidth: 1, borderColor: colors.line, gap: 10 }}>
      <View style={[styles.row, { gap: 10, alignItems: 'flex-start' }]}>
        <Icon name="calendar" size={ICON_SIZE.sm} rawColor={colors.brandInk} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="sm" weight={700}>
            {`${weekdayName(start, true)} ${formatDate(start)} · ${formatTime(start).replace(/ (AM|PM)$/, '')}–${formatTime(end)}`}
          </Text>
          <Text variant="xs" color="muted">
            {[t('staff.messages.ptm'), m.location, total > 1 ? t('staff.messages.requestOf', { index, total }) : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      <View style={[styles.row, { gap: 8 }]}>
        <Button title={t('staff.messages.accept')} icon="check" height={44} loading={decide.isPending && decide.variables === 'accept'} onPress={() => decide.mutate('accept')} style={{ flex: 1 }} />
        <Button title={t('staff.messages.propose')} variant="secondary" height={44} onPress={() => setProposing(true)} style={{ flex: 1 }} />
      </View>
      <Sheet visible={proposing} onClose={() => setProposing(false)} title={t('staff.messages.proposeTitle')} message={t('staff.messages.proposeBody')}>
        <DateField label={t('staff.messages.day')} value={day} onChange={setDay} min={isoDate(new Date())} />
        <TimeField label={t('staff.messages.time')} value={time} onChange={setTime} from="08:00" to="17:00" />
        <Button title={t('staff.messages.send')} size="lg" fullWidth loading={decide.isPending && decide.variables === 'propose'} onPress={() => decide.mutate('propose')} />
      </Sheet>
    </View>
  );
}

function NoticeRow({ a }: { a: Announcement }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/announcements')} style={[styles.row, { gap: 12, paddingVertical: 14, alignItems: 'flex-start' }, pointer]}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.infoSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="speaker" size={ICON_SIZE.md} rawColor={colors.info} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={[styles.row, { gap: 8 }]}>
          <Text variant="sm" weight={700} numberOfLines={1} style={{ flex: 1 }}>
            {t('staff.messages.principalOffice')}
          </Text>
          <Text variant="xxs" color="muted" weight={600}>
            {when(a.published_at)}
          </Text>
        </View>
        <View style={[styles.row, { gap: 6 }]}>
          <Pill label={t('staff.messages.announcement')} tone="info" dot={false} style={{ height: 22 }} />
          <Text variant="xs" color="ink2" weight={600} numberOfLines={1}>
            {a.audience === 'staff' ? t('staff.messages.allStaff') : t('staff.messages.everyone')}
          </Text>
        </View>
        <Text variant="sm" color="ink2" numberOfLines={2}>
          {a.body || a.title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
