import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { ChatMessage } from '@/api/types';
import { downloadFile } from '@/lib/download';
import { fileSize, formatDate, formatTime, relativeTime } from '@/lib/format';
import { newClientId } from '@/lib/ids';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Avatar, Bar, Bubble, Button, Card, EmptyState, Icon, IconButton, pointer, Text, useToast } from '@/ui';
import { noWebFocusRing } from '@/ui/webStyles';

import { useConsoleQuery } from '../../api';
import { CardHead, Col, Row } from '../../Page';
import { DataTable, TableFoot, type Column } from '../../Table';
import { communicationApi, type AnnouncementSummary, type ChannelStat, type Circular } from '../api';
import { audienceText, Dialog, errorText, stamp } from '../common';
import { CHANNEL_ICON, circularPill, MeetingRow } from './SideCards';

// ------------------------------------------------------------------ circulars

export function CircularsPanel({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const client = useQueryClient();
  const q = useConsoleQuery(['comm-circulars'], communicationApi.circulars);
  const remind = useMutation({
    mutationFn: (id: string) => communicationApi.remind(id),
    onSuccess: (r) => {
      toast(t('console.engage.comm.reminded', { count: r.reminded }));
      void client.invalidateQueries({ queryKey: ['console'] });
    },
    onError: (e) => toast(errorText(e, t('console.engage.somethingWrong')), 'danger'),
  });
  const rows = q.data?.items ?? [];
  const columns: Column<Circular>[] = [
    {
      key: 'title',
      title: t('console.engage.comm.colCircular'),
      flex: 3,
      render: (c) => (
        <View style={{ gap: 2 }}>
          <Text variant="sm" weight={700} numberOfLines={1}>
            {t('console.engage.comm.circularTitle', { n: c.number, title: c.title })}
          </Text>
          <Text variant="xs" color="muted" numberOfLines={1}>
            {`${audienceText(t, c.audience)} · ${formatDate(c.published_at)}`}
          </Text>
        </View>
      ),
    },
    { key: 'due', title: t('console.engage.comm.colDue'), width: 110, render: (c) => (c.due_on ? formatDate(c.due_on) : '—') },
    {
      key: 'ack',
      title: t('console.engage.comm.colAck'),
      flex: 2,
      render: (c) => (
        <View style={{ gap: 6, alignSelf: 'stretch' }}>
          <Bar
            value={c.rate ?? 0}
            size="thin"
            tone={c.state === 'done' ? 'ok' : 'brand'}
            accessibilityLabel={`${Math.round(c.rate ?? 0)}%`}
          />
          <Text variant="xs" color="muted" num>
            {t('console.engage.comm.ackCount', {
              done: c.acknowledged.toLocaleString('en-IN'),
              total: c.recipients.toLocaleString('en-IN'),
              pct: Math.round(c.rate ?? 0),
            })}
          </Text>
        </View>
      ),
    },
    { key: 'state', title: t('console.engage.comm.colStatus'), width: 140, render: (c) => circularPill(t, c) },
    {
      key: 'act',
      title: '',
      width: 170,
      align: 'right',
      render: (c) =>
        c.state === 'pending' && c.acknowledged < c.recipients ? (
          <Button
            title={t('console.engage.comm.remindPending')}
            icon="bell"
            variant="secondary"
            size="sm"
            loading={remind.isPending && remind.variables === c.id}
            onPress={() => remind.mutate(c.id)}
          />
        ) : null,
    },
  ];
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <View style={{ padding: 22, paddingBottom: 16 }}>
        <CardHead
          title={t('console.engage.comm.circulars')}
          subtitle={t('console.engage.comm.circularsSub')}
          right={<Button title={t('console.engage.comm.newCircular')} icon="plus" size="sm" onPress={onNew} />}
        />
      </View>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        empty={<Text color="muted">{q.isLoading ? t('console.engage.loading') : t('console.engage.comm.noCirculars')}</Text>}
      />
      <TableFoot>{t('console.engage.comm.circularsFoot')}</TableFoot>
    </Card>
  );
}

// ------------------------------------------------------------------ meetings

export function MeetingsPanel() {
  const { t } = useTranslation();
  const q = useConsoleQuery(['comm-meetings'], communicationApi.meetings);
  const requested = q.data?.requested ?? [];
  const booked = q.data?.booked ?? [];
  return (
    <Row>
      <Col span={6}>
        <Card pad={22} style={{ paddingBottom: 8 }}>
          <CardHead title={t('console.engage.comm.meetingRequests')} subtitle={t('console.engage.comm.meetingSub')} />
          {requested.map((m, i) => (
            <MeetingRow key={m.id} m={m} index={i} first={i === 0} />
          ))}
          {!requested.length ? (
            <Text variant="sm" color="muted" style={{ paddingVertical: 14 }}>
              {q.isLoading ? t('console.engage.loading') : t('console.engage.comm.noMeetings')}
            </Text>
          ) : null}
        </Card>
      </Col>
      <Col span={6}>
        <Card pad={22} style={{ paddingBottom: 8 }}>
          <CardHead title={t('console.engage.comm.upcoming')} subtitle={t('console.engage.comm.upcomingSub')} />
          {booked.map((m, i) => (
            <MeetingRow key={m.id} m={m} index={i + 3} first={i === 0} />
          ))}
          {!booked.length ? (
            <Text variant="sm" color="muted" style={{ paddingVertical: 14 }}>
              {q.isLoading ? t('console.engage.loading') : t('console.engage.comm.noUpcoming')}
            </Text>
          ) : null}
        </Card>
      </Col>
    </Row>
  );
}

// ------------------------------------------------------------------ messages

/** The principal's conversations and the open thread, side by side (the app's chat API). */
export function MessagesPanel() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const schoolId = useSession((s) => s.schoolId);
  const list = useQuery({ queryKey: ['conversations', schoolId], queryFn: api.conversations, refetchInterval: 30_000 });
  const items = list.data?.conversations ?? [];
  const [openId, setOpenId] = useState<string | null>(null);
  const current = items.find((c) => c.id === openId) ?? items[0];

  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', minHeight: 620 }}>
        <View style={[styles.convList, { borderRightColor: colors.line }]}>
          <View style={{ padding: 18, paddingBottom: 12 }}>
            <CardHead
              title={t('console.engage.comm.messages')}
              subtitle={t('console.engage.comm.unreadTotal', { count: list.data?.unread_total ?? 0 })}
            />
          </View>
          <ScrollView style={{ flex: 1 }}>
            {items.map((c) => {
              const on = current?.id === c.id;
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={c.unread ? `${c.title}, ${t('console.engage.comm.unreadN', { count: c.unread })}` : c.title}
                  accessibilityState={{ selected: on }}
                  onPress={() => setOpenId(c.id)}
                  style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.conv,
                    pointer,
                    { borderTopColor: colors.line, backgroundColor: on ? colors.brandSoft : hovered ? colors.subtle : 'transparent' },
                  ]}>
                  <Avatar initials={c.initials} name={c.title} size="sm" />
                  <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <Text variant="sm" weight={700} numberOfLines={1} style={{ flex: 1 }}>
                        {c.title}
                      </Text>
                      {c.last_message ? (
                        <Text variant="xxs" color="muted" weight={600}>
                          {relativeTime(c.last_message.at)}
                        </Text>
                      ) : null}
                    </View>
                    <Text variant="xs" color="muted" numberOfLines={1}>
                      {c.subtitle}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <Text
                        variant="xs"
                        color={c.unread ? 'ink' : 'muted'}
                        weight={c.unread ? 600 : undefined}
                        numberOfLines={1}
                        style={{ flex: 1 }}>
                        {c.last_message ? `${c.last_message.mine ? t('console.engage.comm.you') : ''}${c.last_message.body}` : ''}
                      </Text>
                      {c.unread ? (
                        <View style={[styles.unread, { backgroundColor: colors.brand }]}>
                          <Text variant="xxs" weight={700} rawColor={colors.onBrand}>
                            {c.unread}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
            {!items.length ? (
              <Text variant="sm" color="muted" style={{ padding: 18 }}>
                {list.isLoading ? t('console.engage.loading') : t('console.engage.comm.noConversations')}
              </Text>
            ) : null}
          </ScrollView>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {current ? (
            <Thread id={current.id} title={current.title} subtitle={current.subtitle} />
          ) : (
            <EmptyState icon="chat" title={t('console.engage.comm.noConversations')} />
          )}
        </View>
      </View>
    </Card>
  );
}

function Thread({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollView>(null);
  const thread = useQuery({ queryKey: ['messages', id], queryFn: () => api.messages(id), refetchInterval: 10_000 });
  const messages = thread.data?.messages ?? [];
  const lastId = messages[messages.length - 1]?.id;
  useEffect(() => {
    if (!lastId) return;
    api
      .markConversationRead(id)
      .then(() => client.invalidateQueries({ queryKey: ['conversations'] }))
      .then(() => client.invalidateQueries({ queryKey: ['console'] }))
      .catch(() => undefined);
  }, [id, lastId, client]);
  const send = useMutation({
    mutationFn: (body: string) => api.sendMessage(id, body, newClientId()),
    onSuccess: (m: ChatMessage) => {
      setDraft('');
      client.setQueryData<typeof thread.data>(['messages', id], (cur) => (cur ? { ...cur, messages: [...cur.messages, m] } : cur));
      void client.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e) => toast(errorText(e, t('console.engage.somethingWrong')), 'danger'),
  });
  const meetings = thread.data?.meetings ?? [];
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.threadHead, { borderBottomColor: colors.line }]}>
        <Avatar name={title} size="sm" />
        <View style={{ flex: 1 }}>
          <Text variant="sm" weight={700}>
            {title}
          </Text>
          <Text variant="xs" color="muted">
            {subtitle}
          </Text>
        </View>
      </View>
      <ScrollView
        ref={scroll}
        style={{ flex: 1, backgroundColor: colors.subtle }}
        contentContainerStyle={{ padding: 20, gap: 10 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        {meetings.map((m) => (
          <View key={m.id} style={[styles.meetingCard, { borderColor: colors.line, backgroundColor: colors.surface }]}>
            <Icon name="calendar" size={16} rawColor={colors.brandInk} />
            <Text variant="xs" weight={600} style={{ flex: 1 }}>
              {`${m.title} · ${formatDate(m.starts_at, { weekday: true })}, ${formatTime(m.starts_at)}`}
            </Text>
            <Text variant="xs" color={m.status === 'booked' ? 'ok' : 'warn'} weight={700}>
              {m.status === 'booked' ? t('console.engage.comm.booked') : t('console.engage.comm.requested')}
            </Text>
          </View>
        ))}
        {messages.map((m) => (
          <View key={m.id} style={{ alignItems: m.mine ? 'flex-end' : 'flex-start', gap: 2 }}>
            <Bubble out={m.mine} style={{ maxWidth: 440 }}>
              <Text variant="sm" rawColor={m.mine ? colors.onBrand : colors.ink}>
                {m.deleted ? t('console.engage.comm.deleted') : m.body}
              </Text>
              {m.attachment ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void downloadFile(m.attachment!.download, m.attachment!.name)}
                  style={[pointer, { flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'center' }]}>
                  <Icon name="paperclip" size={14} rawColor={m.mine ? colors.onBrand : colors.brandInk} />
                  <Text variant="xs" weight={700} rawColor={m.mine ? colors.onBrand : colors.brandInk}>
                    {`${m.attachment.name} · ${fileSize(m.attachment.size)}`}
                  </Text>
                </Pressable>
              ) : null}
            </Bubble>
            <Text variant="xxs" color="muted">
              {stamp(t, m.created_at, formatTime, (d) => formatDate(d))}
            </Text>
          </View>
        ))}
      </ScrollView>
      <View style={[styles.composer, { borderTopColor: colors.line }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('console.engage.comm.replyPlaceholder')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t('console.engage.comm.replyPlaceholder')}
          multiline
          style={[
            styles.reply,
            { color: colors.ink, borderColor: colors.lineStrong, backgroundColor: colors.surface, fontFamily: fonts.medium },
            noWebFocusRing,
          ]}
        />
        <IconButton
          icon="send"
          variant="brand"
          label={t('console.engage.comm.sendReply')}
          disabled={!draft.trim() || send.isPending}
          onPress={() => send.mutate(draft.trim())}
        />
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ delivery reports

function stat(s: ChannelStat | undefined) {
  return s ? `${s.sent.toLocaleString('en-IN')} · ${s.read.toLocaleString('en-IN')}` : '—';
}

/** Every announcement sent: reach, and sent · read per channel. */
export function DeliveryReports({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const q = useConsoleQuery(['comm-reports'], communicationApi.reports, { enabled: visible });
  const rows = q.data?.items ?? [];
  const failed = (a: AnnouncementSummary) => Object.values(a.by_channel).reduce((n, s) => n + (s?.failed ?? 0), 0);
  const columns: Column<AnnouncementSummary>[] = [
    {
      key: 'title',
      title: t('console.engage.comm.colAnnouncement'),
      flex: 3,
      render: (a) => (
        <View style={{ gap: 2 }}>
          <Text variant="sm" weight={700} numberOfLines={1}>
            {a.circular_no ? t('console.engage.comm.circularTitle', { n: a.circular_no, title: a.title }) : a.title}
          </Text>
          <Text variant="xs" color="muted" numberOfLines={1}>
            {`${audienceText(t, a.audience)} · ${stamp(t, a.published_at, formatTime, (d) => formatDate(d))}`}
          </Text>
        </View>
      ),
    },
    {
      key: 'ch',
      title: t('console.engage.comm.colChannels'),
      width: 110,
      render: (a) => (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {a.channels.map((c) => (
            <Icon key={c} name={CHANNEL_ICON[c]} size={14} />
          ))}
        </View>
      ),
    },
    {
      key: 'to',
      title: t('console.engage.comm.colReached'),
      width: 90,
      align: 'right',
      render: (a) => (a.scheduled ? t('console.engage.comm.scheduledShort') : a.recipients.toLocaleString('en-IN')),
    },
    { key: 'app', title: t('console.engage.comm.colApp'), width: 110, align: 'right', render: (a) => stat(a.by_channel.app) },
    { key: 'sms', title: t('console.engage.comm.ch_sms'), width: 100, align: 'right', render: (a) => stat(a.by_channel.sms) },
    { key: 'email', title: t('console.engage.comm.ch_email'), width: 100, align: 'right', render: (a) => stat(a.by_channel.email) },
    { key: 'wa', title: t('console.engage.comm.colWhatsapp'), width: 100, align: 'right', render: (a) => stat(a.by_channel.whatsapp) },
    { key: 'failed', title: t('console.engage.comm.colFailed'), width: 84, align: 'right', render: (a) => String(failed(a)) },
    {
      key: 'read',
      title: t('console.engage.comm.colRead'),
      width: 80,
      align: 'right',
      render: (a) => (a.read_rate == null ? '—' : `${Math.round(a.read_rate)}%`),
    },
  ];
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('console.engage.comm.deliveryReports')}
      subtitle={t('console.engage.comm.deliverySub')}
      width={1120}>
      <View style={{ marginHorizontal: -24, marginTop: -16 }}>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(a) => a.id}
          dense
          empty={<Text color="muted">{t('console.engage.loading')}</Text>}
        />
        <TableFoot>
          {q.data
            ? t('console.engage.comm.deliveryFoot', {
                balance: q.data.sms_credits.balance.toLocaleString('en-IN'),
                used: q.data.sms_credits.used.toLocaleString('en-IN'),
              })
            : ''}
        </TableFoot>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  convList: { width: 340, borderRightWidth: 1 },
  conv: { flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 18, borderTopWidth: 1 },
  unread: { minWidth: 20, height: 20, borderRadius: 999, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  threadHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1 },
  meetingCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderRadius: 12 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 14, borderTopWidth: 1 },
  reply: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14.5,
  },
});
