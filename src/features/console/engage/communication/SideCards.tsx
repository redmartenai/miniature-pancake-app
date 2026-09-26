import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { addDays, formatDate, formatTime, isoDate, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Badge, Bar, Button, DateField, Icon, Link, Pill, Text, TileIcon, TimeField, useToast, type IconName } from '@/ui';

import { CardHead } from '../../Page';
import { communicationApi, type AnnouncementSummary, type Channel, type Circular, type MeetingRequest } from '../api';
import { audienceText, Dialog, errorText, stamp } from '../common';

export const CHANNEL_ICON: Record<Channel, IconName> = { push: 'bell', in_app: 'phone', sms: 'chat', whatsapp: 'call', email: 'mail' };

const date = (d: Date) => formatDate(d);

/** "Recent announcements": read rate across all channels. */
export function RecentCard({ items, onAll }: { items: AnnouncementSummary[]; onAll: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <CardHead
        title={t('console.engage.comm.recent')}
        subtitle={t('console.engage.comm.recentSub')}
        right={<Link label={t('console.engage.comm.all')} onPress={onAll} />}
      />
      <View>
        {items.map((a, i) => (
          <View key={a.id} style={[styles.recent, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
            <View style={styles.between}>
              <Text variant="sm" weight={700} numberOfLines={1} style={{ flex: 1 }}>
                {a.title}
              </Text>
              <Text variant="xs" color="muted" weight={600}>
                {a.scheduled
                  ? t('console.engage.comm.scheduledFor', { when: stamp(t, a.published_at, formatTime, date) })
                  : stamp(t, a.published_at, formatTime, date)}
              </Text>
            </View>
            <View style={styles.between}>
              <Text variant="xs" color="muted" numberOfLines={1} style={{ flex: 1 }}>
                {audienceText(t, a.audience)}
              </Text>
              <View style={[styles.row, { gap: 6 }]}>
                {a.channels.map((c) => (
                  <View key={c} accessible accessibilityRole="image" accessibilityLabel={t(`console.engage.comm.ch_${c}`)}>
                    <Icon name={CHANNEL_ICON[c]} size={14} rawColor={colors.muted} />
                  </View>
                ))}
              </View>
            </View>
            <View style={[styles.row, { gap: 10 }]}>
              <Bar
                value={a.read_rate ?? 0}
                max={100}
                size="thin"
                style={{ flex: 1 }}
                accessibilityLabel={t('console.engage.comm.readPct', { pct: Math.round(a.read_rate ?? 0) })}
              />
              <Text variant="xs" weight={700} num align="right" style={{ width: 64 }}>
                {a.read_rate == null ? '—' : t('console.engage.comm.readPct', { pct: Math.round(a.read_rate) })}
              </Text>
            </View>
          </View>
        ))}
        {items.length === 0 ? (
          <Text variant="sm" color="muted" style={{ paddingVertical: 14 }}>
            {t('console.engage.comm.noRecent')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function circularPill(t: (k: string) => string, c: Circular) {
  return c.state === 'done' ? (
    <Pill label={t('console.engage.comm.done')} tone="ok" />
  ) : c.state === 'closed' ? (
    <Pill label={t('console.engage.comm.closed')} tone="neutral" />
  ) : (
    <Pill label={t('console.engage.comm.pendingAcks')} tone="warn" />
  );
}

/** The two latest circulars with their acknowledgement rate. */
export function CircularsCard({ items, onAll }: { items: Circular[]; onAll: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <CardHead
        title={t('console.engage.comm.circulars')}
        right={<Link label={t('console.engage.comm.allCirculars')} onPress={onAll} />}
        style={{ marginBottom: 4 }}
      />
      {items.map((c, i) => (
        <View key={c.id} style={[styles.listItem, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
          <TileIcon icon="document" size="sm" tone="pink" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700} numberOfLines={1}>
              {t('console.engage.comm.circularTitle', { n: c.number, title: c.title })}
            </Text>
            <Text variant="xs" color="muted" numberOfLines={1}>
              {t('console.engage.comm.ackBy', { pct: Math.round(c.rate ?? 0), due: c.due_on ? formatDate(c.due_on) : '—' })}
            </Text>
          </View>
          {circularPill(t, c)}
        </View>
      ))}
      {items.length === 0 ? (
        <Text variant="sm" color="muted" style={{ paddingVertical: 14 }}>
          {t('console.engage.comm.noCirculars')}
        </Text>
      ) : null}
    </View>
  );
}

const TONES = [1, 4, 6, 3, 2, 5] as const;

/** One meeting request: who, about what, when, and Accept / Propose time. */
export function MeetingRow({ m, index, first }: { m: MeetingRequest; index: number; first: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const [propose, setPropose] = useState(false);
  const decide = useMutation({
    mutationFn: (args: { action: 'accept' | 'propose'; at?: string }) => communicationApi.decide(m.id, args.action, args.at),
    onSuccess: (_r, args) => {
      toast(
        args.action === 'accept'
          ? t('console.engage.comm.accepted', { name: m.parent?.name ?? '' })
          : t('console.engage.comm.proposed', { name: m.parent?.name ?? '' }),
      );
      setPropose(false);
      void client.invalidateQueries({ queryKey: ['console'] });
    },
    onError: (e) => toast(errorText(e, t('console.engage.somethingWrong')), 'danger'),
  });
  const kids = m.children.map((c) => `${c.name} (${c.class})`).join(', ');
  const when = `${weekdayName(m.starts_at, true)} ${formatDate(m.starts_at)}, ${formatTime(m.starts_at)}`;
  const name = m.parent?.name ?? '';
  return (
    <View style={[styles.meeting, !first && { borderTopWidth: 1, borderTopColor: colors.line }]}>
      <View style={[styles.row, { gap: 12, alignItems: 'flex-start' }]}>
        <Avatar initials={m.parent?.initials} name={name} size="sm" tone={TONES[index % TONES.length]} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="sm" weight={700}>
            {name}
          </Text>
          <Text variant="xs" color="muted">
            {t('console.engage.comm.parentOf', { kids })}
          </Text>
          <Text variant="sm" color="ink2" style={{ marginTop: 4 }}>
            {`“${m.topic}”`}
          </Text>
        </View>
      </View>
      <View style={[styles.row, { gap: 8, paddingLeft: 42 }]}>
        <View style={[styles.row, { gap: 6, flex: 1 }]}>
          <Icon name="calendar" size={14} rawColor={colors.ink2} />
          <Text variant="xs" weight={600} color="ink2" style={{ flexShrink: 1 }}>
            {m.event ? `${when} · ${/parent.teacher/i.test(m.event) ? t('console.engage.comm.ptm') : m.event}` : when}
          </Text>
        </View>
        {m.status === 'requested' ? (
          <>
            <Button
              title={t('console.engage.comm.accept')}
              icon="check"
              variant="ok"
              size="sm"
              accessibilityLabel={t('console.engage.comm.acceptA11y', { name })}
              loading={decide.isPending && decide.variables?.action === 'accept'}
              onPress={() => decide.mutate({ action: 'accept' })}
            />
            <Button
              title={t('console.engage.comm.propose')}
              variant="secondary"
              size="sm"
              accessibilityLabel={t('console.engage.comm.proposeA11y', { name })}
              onPress={() => setPropose(true)}
            />
          </>
        ) : (
          <Pill label={t('console.engage.comm.booked')} tone="ok" />
        )}
      </View>
      <ProposeDialog
        visible={propose}
        name={name}
        startsAt={m.starts_at}
        busy={decide.isPending}
        onClose={() => setPropose(false)}
        onSubmit={(at) => decide.mutate({ action: 'propose', at })}
      />
    </View>
  );
}

function ProposeDialog({
  visible,
  name,
  startsAt,
  busy,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  name: string;
  startsAt: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (iso: string) => void;
}) {
  const { t } = useTranslation();
  const start = new Date(startsAt);
  const [day, setDay] = useState(isoDate(start > new Date() ? start : addDays(new Date(), 1)));
  const [time, setTime] = useState(
    `${String(start.getHours()).padStart(2, '0')}:${String(Math.floor(start.getMinutes() / 15) * 15).padStart(2, '0')}`,
  );
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('console.engage.comm.proposeTitle', { name })}
      subtitle={t('console.engage.comm.proposeSub')}
      width={480}
      footer={
        <>
          <Button title={t('console.engage.cancel')} variant="ghost" onPress={onClose} />
          <Button
            title={t('console.engage.comm.proposeSend')}
            icon="send"
            loading={busy}
            onPress={() => onSubmit(new Date(`${day}T${time}:00`).toISOString())}
          />
        </>
      }>
      <View style={[styles.row, { gap: 10, alignItems: 'flex-start' }]}>
        <DateField label={t('console.engage.comm.date')} value={day} onChange={setDay} min={isoDate(new Date())} style={{ flex: 1 }} />
        <TimeField label={t('console.engage.comm.time')} value={time} onChange={setTime} from="08:00" to="18:00" style={{ flex: 1 }} />
      </View>
    </Dialog>
  );
}

/** "Meeting requests": parents asking to meet the principal. */
export function MeetingsCard({ items }: { items: MeetingRequest[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <CardHead
        title={
          <View style={[styles.row, { gap: 8 }]}>
            <Text variant="h3" accessibilityRole="header">
              {t('console.engage.comm.meetingRequests')}
            </Text>
            {items.length ? <Badge value={items.length} /> : null}
          </View>
        }
        right={
          <Text variant="xs" color="muted" weight={600}>
            {t('console.engage.comm.meetingSub')}
          </Text>
        }
        style={{ marginBottom: 2 }}
      />
      {items.map((m, i) => (
        <MeetingRow key={m.id} m={m} index={i} first={i === 0} />
      ))}
      {items.length === 0 ? (
        <Text variant="sm" color="muted" style={{ paddingVertical: 14 }}>
          {t('console.engage.comm.noMeetings')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  card: { borderWidth: 1, borderRadius: 18, paddingTop: 20, paddingHorizontal: 22, paddingBottom: 8 },
  recent: { gap: 8, paddingVertical: 14 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  meeting: { gap: 10, paddingVertical: 14 },
});
