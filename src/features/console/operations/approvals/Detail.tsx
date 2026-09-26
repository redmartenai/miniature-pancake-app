import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { openFile } from '@/lib/download';
import { formatTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  Avatar,
  Button,
  Card,
  Icon,
  IconButton,
  initialsOf,
  Kicker,
  pointer,
  Stamp,
  StickyNote,
  Text,
  TextField,
  useToast,
  type IconName,
} from '@/ui';

import type { Approval, Decision, Evidence, TrailStep } from './api';
import { count, firstName, fileSize, headText, isSameDay, money, P, when } from './copy';
import { STAMP_TONE } from './InTray';
import { RequestPaper } from './Papers';

type Props = {
  item: Approval;
  today: string;
  signer: string;
  position: { index: number; total: number } | null;
  onPrev?: () => void;
  onNext?: () => void;
  onDecide: (decision: Decision, note: string) => Promise<Approval>;
  onUndo: () => Promise<Approval>;
  busy: boolean;
};

/** The selected request: who asked and when, the paper itself, the reason and evidence, the audit trail and the decision. */
export function Detail({ item, today, signer, position, onPrev, onNext, onDecide, onUndo, busy }: Props) {
  const { t } = useTranslation();
  const { title } = headText(t, item);
  const checker = item.trail.find((s) => s.action === 'checked')?.actor;
  return (
    <View style={styles.col} accessibilityLabel={title} nativeID="approval-detail">
      <DetailHead item={item} today={today} position={position} onPrev={onPrev} onNext={onNext} />
      <View style={styles.pair}>
        <RequestPaper item={item} checkerTitle={checker?.title} />
        <Side item={item} />
      </View>
      <View style={styles.pair}>
        <Trail item={item} today={today} />
        <DecisionCard key={item.id} item={item} signer={signer} onDecide={onDecide} onUndo={onUndo} busy={busy} hodNote={!!checker} />
      </View>
    </View>
  );
}

function DetailHead({ item, today, position, onPrev, onNext }: Pick<Props, 'item' | 'today' | 'position' | 'onPrev' | 'onNext'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { title, ask } = headText(t, item);
  const submitted = isSameDay(item.created_at, today)
    ? t(`${P}.meta.submittedToday`, { time: formatTime(item.created_at) })
    : t(`${P}.meta.submitted`, { date: when(item.created_at, today).split(', ')[0], time: formatTime(item.created_at) });
  const sla = item.sla;
  const who = item.requested_by;
  return (
    <View style={styles.head}>
      <Avatar size="lg" initials={who?.initials} name={who?.name} tone={2} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text variant="h2" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="sm" color="ink2">
          {ask}
        </Text>
        <View style={styles.meta}>
          <Text variant="xs" color="muted" weight={600}>
            {submitted}
          </Text>
          {sla ? (
            <Text variant="xs" weight={sla.past ? 700 : 600} rawColor={sla.past ? colors.bad : colors.muted}>
              {sla.past ? t(`${P}.meta.pastBy`, { count: sla.past_by_hours }) : t(`${P}.meta.within`, { count: sla.hours_left })}
            </Text>
          ) : item.decided_at ? (
            <Text variant="xs" color="muted" weight={600}>
              {t(`${P}.meta.decided`, {
                status: t(`${P}.stamp.${item.status}`),
                name: item.decided_by ?? '',
                when: when(item.decided_at, today),
              })}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="shield" size={13} rawColor={colors.muted} />
            <Text variant="xs" color="muted" weight={600}>
              {t(`${P}.meta.audited`)}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.nav}>
        <Text variant="xs" color="muted" weight={600} style={{ paddingRight: 4 }} num>
          {position ? t(`${P}.nav.position`, { index: position.index + 1, total: position.total }) : t(`${P}.nav.decided`)}
        </Text>
        <IconButton
          icon="chevronLeft"
          size="sm"
          label={t(`${P}.nav.prev`)}
          onPress={onPrev}
          disabled={!onPrev}
          style={!onPrev && { opacity: 0.5 }}
        />
        <IconButton
          icon="chevronRight"
          size="sm"
          label={t(`${P}.nav.next`)}
          onPress={onNext}
          disabled={!onNext}
          style={!onNext && { opacity: 0.5 }}
        />
      </View>
    </View>
  );
}

/** The reason on a sticky note, and the evidence files. */
function Side({ item }: { item: Approval }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const reason = 'reason' in item.details ? (item.details.reason as string) : '';
  const author =
    item.kind === 'leave'
      ? item.details.person
      : item.kind === 'refund' && item.details.asked_by
        ? { name: item.details.asked_by, initials: initialsOf(item.details.asked_by) }
        : item.requested_by;
  const files = item.attachments;
  if (!reason && !files.length) return null;
  return (
    <View style={styles.side}>
      {reason ? (
        <StickyNote color="pink" tilt="r" tape="center" style={{ gap: 10 }}>
          <Text rawColor={colors.pPinkInk} style={styles.noteKicker}>
            {t(`${P}.reason`)}
          </Text>
          <Text style={styles.noteText}>{`“${reason}”`}</Text>
          {author ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Avatar size="xs" initials={author.initials} name={author.name} tone={2} />
              <Text variant="xs" weight={700}>
                {author.name}
              </Text>
            </View>
          ) : null}
        </StickyNote>
      ) : null}
      <View style={{ gap: 8 }}>
        <Kicker>{t(`${P}.evidence`)}</Kicker>
        {files.length ? (
          files.map((f) => <EvidenceChip key={f.id} file={f} />)
        ) : (
          <Text variant="xs" color="muted">
            {t(`${P}.noEvidence`)}
          </Text>
        )}
      </View>
    </View>
  );
}

function EvidenceChip({ file }: { file: Evidence }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const meta =
    file.kind === 'scan' && file.pages
      ? t(`${P}.file.scan`, { count: file.pages, size: fileSize(file.size) })
      : t(`${P}.file.doc`, { type: file.type || 'File', size: fileSize(file.size) });
  const name = `${file.name}${file.type ? `.${file.type.toLowerCase()}` : ''}`;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t(`${P}.file.open`, { name: file.name })}
      onPress={() => void openFile(file.url, name).catch(() => toast(t(`${P}.file.failed`), 'bad'))}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.file,
        pointer,
        { backgroundColor: colors.surface, borderColor: hovered ? colors.brandLine : colors.lineStrong },
      ]}>
      <Icon name="paperclip" size={16} rawColor={colors.ink2} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="xs" weight={700}>
          {file.name}
        </Text>
        <Text variant="xxs" color="muted">
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------ audit trail */

const STEP_ICON: Record<TrailStep['action'], IconName> = {
  submitted: 'send',
  checked: 'check',
  approved: 'check',
  declined: 'close',
  sent_back: 'arrowLeft',
  undone: 'refresh',
  withdrawn: 'minus',
};

function Trail({ item, today }: { item: Approval; today: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const pending = item.status === 'pending';
  const files = item.attachments.length;
  const steps = item.trail.map((s) => {
    const name = s.actor?.name ?? '';
    const sub: string[] = [];
    if (s.action === 'submitted') {
      if (s.actor?.title) sub.push(s.actor.title);
      if (files) sub.push(t(`${P}.trail.attached`, { count: files }));
    } else if (s.action === 'checked') {
      if (s.actor?.title) sub.push(s.actor.title);
      if (s.note) sub.push(`“${s.note}”`);
    } else {
      if (s.actor?.title) sub.push(s.actor.title);
      if (s.note) sub.push(`“${s.note}”`);
      else if (s.action !== 'undone' && s.action !== 'withdrawn') sub.push(t(`${P}.trail.logged`));
    }
    return {
      key: `${s.action}-${s.at}`,
      title: t(`${P}.trail.${s.action}`, { name }),
      time: s.at ? when(s.at, today) : '',
      sub: sub.join(' · '),
      icon: STEP_ICON[s.action],
    };
  });
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 14 }}>
      <Kicker>{t(`${P}.trail.title`)}</Kicker>
      <View accessibilityRole="list" aria-label={t(`${P}.trail.label`, { count: steps.length + (pending ? 1 : 0) })}>
        {steps.map((s, i) => {
          const last = i === steps.length - 1 && !pending;
          const beforeWaiting = i === steps.length - 1 && pending;
          return (
            <View key={s.key} style={[styles.step, !last && { paddingBottom: 18 }]} accessibilityRole="text">
              {!last ? <View style={[styles.rail, { backgroundColor: beforeWaiting ? colors.lineStrong : colors.brand }]} /> : null}
              <View style={[styles.dot, { backgroundColor: colors.brand }]}>
                <Icon name={s.icon} size={12} rawColor={colors.onBrand} bold />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.stepHead}>
                  <Text variant="sm" weight={700} style={{ flexShrink: 1 }}>
                    {s.title}
                  </Text>
                  <Text variant="xs" color="muted" weight={600} num numberOfLines={1} style={{ flexShrink: 0 }}>
                    {s.time}
                  </Text>
                </View>
                {s.sub ? (
                  <Text variant="xs" color="muted">
                    {s.sub}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
        {pending ? (
          <View style={styles.step} accessibilityRole="text">
            <View
              style={[
                styles.dot,
                { backgroundColor: colors.surface, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.brandLine },
              ]}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.stepHead}>
                <Text variant="sm" weight={700}>
                  {t(`${P}.trail.waiting`)}
                </Text>
                <Text variant="xs" color="muted" weight={600}>
                  {t(`${P}.trail.principal`)}
                </Text>
              </View>
              <Text variant="xs" color="muted">
                {item.kind === 'marks' ? t(`${P}.trail.next.marks`, { count: count(item) }) : t(`${P}.trail.next.${item.kind}`)}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* --------------------------------------------------------------- decision */

function DecisionCard({
  item,
  signer,
  onDecide,
  onUndo,
  busy,
  hodNote,
}: {
  item: Approval;
  signer: string;
  onDecide: Props['onDecide'];
  onUndo: Props['onUndo'];
  busy: boolean;
  hodNote: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [pendingAction, setPendingAction] = useState<Decision | 'undo' | null>(null);
  const name = firstName(item);
  const amount = item.kind === 'refund' ? money(item.details.amount) : '';
  const n = count(item);

  const decide = async (decision: Decision) => {
    if (decision !== 'approve' && !note.trim()) {
      setError(t(`${P}.decision.${decision === 'reject' ? 'noteMissingReject' : 'noteMissing'}`));
      return;
    }
    setError(undefined);
    setPendingAction(decision);
    try {
      const done = await onDecide(decision, note.trim());
      setNote('');
      toast(t(`${P}.decision.toast.${done.status}`, { title: headText(t, done).title }), decision === 'reject' ? 'bad' : 'success');
    } catch (e) {
      const message = e instanceof ApiError ? (e.fieldMessage('note') ?? e.message) : t(`${P}.decision.failed`);
      setError(message);
    } finally {
      setPendingAction(null);
    }
  };

  const undo = async () => {
    setPendingAction('undo');
    try {
      await onUndo();
      toast(t(`${P}.decision.toast.undone`));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t(`${P}.decision.failed`), 'bad');
    } finally {
      setPendingAction(null);
    }
  };

  const undoOpen = item.undo_until && new Date(item.undo_until).getTime() > Date.now();
  return (
    <Card pad={20} style={styles.decision}>
      <Text variant="h4" accessibilityRole="header">
        {t(`${P}.decision.title`)}
      </Text>
      {item.status === 'pending' ? (
        <View style={{ gap: 14 }}>
          <View style={{ gap: 7 }}>
            <Text style={[styles.label, { color: colors.ink2 }]} nativeID={`note-${item.id}`}>
              {t(`${P}.decision.${hodNote ? 'noteToHod' : 'noteTo'}`, { name })}
              <Text style={[styles.label, { color: colors.muted, fontFamily: fonts.medium }]}>{t(`${P}.decision.noteNeeded`)}</Text>
            </Text>
            <TextField
              multiline
              value={note}
              onChangeText={(v) => {
                setNote(v);
                if (error && v.trim()) setError(undefined);
              }}
              placeholder={t(`${P}.decision.placeholder`)}
              accessibilityLabel={t(`${P}.decision.${hodNote ? 'noteToHod' : 'noteTo'}`, { name })}
              error={error}
              style={{ minHeight: 60 }}
              maxLength={300}
            />
          </View>
          <Text variant="xs" color="muted">
            {item.kind === 'marks'
              ? t(`${P}.decision.effect.marks`, { count: n })
              : t(`${P}.decision.effect.${item.kind}`, { name: item.kind === 'leave' ? item.details.person.name : name, amount })}
          </Text>
          <Button
            title={
              item.kind === 'marks' ? t(`${P}.decision.approve.marks`, { count: n }) : t(`${P}.decision.approve.${item.kind}`, { amount })
            }
            icon="check"
            fullWidth
            onPress={() => void decide('approve')}
            loading={pendingAction === 'approve'}
            disabled={busy}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              title={t(`${P}.decision.sendBack`)}
              variant="secondary"
              icon="arrowLeft"
              onPress={() => void decide('send_back')}
              loading={pendingAction === 'send_back'}
              disabled={busy}
              style={{ flex: 1 }}
            />
            <Button
              title={t(`${P}.decision.reject`)}
              variant="danger"
              onPress={() => void decide('reject')}
              loading={pendingAction === 'reject'}
              disabled={busy}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 }}>
            <Stamp tone={STAMP_TONE[item.status]}>{t(`${P}.stamp.${item.status}`)}</Stamp>
            <Text variant="sm" color="ink2" style={{ flex: 1, minWidth: 0 }}>
              {t(`${P}.decision.done.${item.status}`, { name })}
            </Text>
          </View>
          {item.decision_note ? (
            <Text variant="xs" color="muted">
              {`“${item.decision_note}”`}
            </Text>
          ) : null}
          {undoOpen ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Button
                title={t(`${P}.decision.undo`)}
                variant="ghost"
                size="sm"
                icon="refresh"
                onPress={() => void undo()}
                loading={pendingAction === 'undo'}
                disabled={busy}
              />
              <Text variant="xs" color="muted">
                {t(`${P}.decision.undoUntil`, { time: formatTime(item.undo_until!) })}
              </Text>
            </View>
          ) : null}
        </View>
      )}
      <View style={[styles.signed, { borderTopColor: colors.line }]}>
        <Icon name="shield" size={13} rawColor={colors.muted} />
        <Text variant="xs" color="muted" weight={600}>
          {t(`${P}.decision.signed`, { name: signer })}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  col: { gap: 22 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pair: { flexDirection: 'row', alignItems: 'flex-start', gap: 26 },
  side: { width: 222, flexShrink: 0, gap: 22, paddingTop: 16 },
  noteKicker: { fontFamily: fonts.extrabold, fontSize: 11, lineHeight: 14, letterSpacing: 11 * 0.12, textTransform: 'uppercase' },
  noteText: { fontFamily: fonts.medium, fontSize: 14.5, lineHeight: 14.5 * 1.5 },
  file: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  step: { position: 'relative', flexDirection: 'row', gap: 14 },
  rail: { position: 'absolute', left: 11, top: 24, bottom: 0, width: 2 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  decision: { width: 380, flexShrink: 0, gap: 14 },
  label: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 17 },
  signed: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, borderTopWidth: 1 },
});
