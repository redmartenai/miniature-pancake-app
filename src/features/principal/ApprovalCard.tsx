import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type {
  AdmissionDetails,
  ApprovalItem,
  ApprovalTray,
  AttendanceFixDetails,
  LeaveDetails,
  MarksDetails,
  RefundDetails,
} from '@/api/types';
import { openFile } from '@/lib/download';
import { daysUntil, formatDate, formatInr, formatTime, isToday, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Highlight,
  Icon,
  ICON_SIZE,
  Paper,
  Pill,
  Sheet,
  Stamp,
  Tear,
  Text,
  TextField,
  Ticket,
  useToast,
} from '@/ui';

const firstName = (name?: string | null) => (name ?? '').replace(/^(Dr\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/, '').split(' ')[0];

/** Replace one item in every cached tray (so a decided card stays in place with its Undo). */
export function useReplaceInTray() {
  const client = useQueryClient();
  return (item: ApprovalItem) => {
    client.setQueriesData<ApprovalTray>({ queryKey: ['approvals'] }, (tray) =>
      tray ? { ...tray, items: tray.items.map((i) => (i.id === item.id ? item : i)) } : tray,
    );
    void client.invalidateQueries({ queryKey: ['pulse'] });
  };
}

function sent(at: string, t: (k: string, o?: Record<string, unknown>) => string) {
  const d = new Date(at);
  return isToday(d) ? t('principal.approvals.sentAt', { time: formatTime(d) }) : t('principal.approvals.sentOn', { day: weekdayName(d, true), time: formatTime(d) });
}

function when(iso: string | null, t: (k: string, o?: Record<string, unknown>) => string): { label: string; urgent: boolean } | null {
  if (!iso) return null;
  const n = daysUntil(iso);
  if (n <= 0) return { label: t('principal.approvals.today'), urgent: true };
  if (n === 1) return { label: t('principal.approvals.tomorrow'), urgent: true };
  return { label: t('principal.approvals.inDays', { count: n }), urgent: false };
}

/**
 * One request in the in-tray. `variant="pulse"` is the compact card on the home screen (decline / approve right away);
 * `variant="tray"` shows the details when `expanded`.
 */
export function ApprovalCard({ item, variant = 'tray', expanded = true, onOpen }: { item: ApprovalItem; variant?: 'pulse' | 'tray'; expanded?: boolean; onOpen?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const replace = useReplaceInTray();
  const [sendingBack, setSendingBack] = useState(false);
  const [note, setNote] = useState('');
  const decide = useMutation({
    mutationFn: ({ decision, note: n }: { decision: 'approve' | 'decline' | 'send_back'; note?: string }) => api.decideApproval(item.id, decision, n ?? ''),
    onSuccess: (next) => {
      setSendingBack(false);
      replace(next);
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });
  const undo = useMutation({
    mutationFn: () => api.undoApproval(item.id),
    onSuccess: (next) => replace(next),
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });

  const done = item.status !== 'pending';
  const who = item.requested_by?.name ?? '';
  const actions = (approveLabel?: string, secondary: 'decline' | 'send_back' = 'decline') =>
    variant === 'pulse' ? (
      <View style={[styles.row, { gap: 10 }]}>
        <Button title={t('principal.approvals.decline')} icon="close" variant="danger" height={44} loading={decide.isPending && decide.variables?.decision === 'decline'} onPress={() => decide.mutate({ decision: 'decline' })} style={{ flex: 1, backgroundColor: colors.badSoft }} textColor={colors.bad} />
        <Button title={approveLabel ?? t('principal.approvals.approve')} icon="check" variant="ok" height={44} loading={decide.isPending && decide.variables?.decision === 'approve'} onPress={() => decide.mutate({ decision: 'approve' })} style={{ flex: 1, backgroundColor: colors.okSoft }} textColor={colors.ok} />
      </View>
    ) : (
      <View style={[styles.row, { gap: 10 }]}>
        <Button
          title={secondary === 'send_back' ? t('principal.approvals.sendBack') : t('principal.approvals.decline')}
          icon={secondary === 'send_back' ? 'arrowLeft' : 'close'}
          variant="secondary"
          height={44}
          loading={decide.isPending && decide.variables?.decision === 'decline'}
          onPress={() => (secondary === 'send_back' ? setSendingBack(true) : decide.mutate({ decision: 'decline' }))}
          style={secondary === 'send_back' ? undefined : { flex: 1 }}
        />
        <Button
          title={approveLabel ?? t('principal.approvals.approve')}
          icon="check"
          height={44}
          loading={decide.isPending && decide.variables?.decision === 'approve'}
          onPress={() => decide.mutate({ decision: 'approve' })}
          style={{ flex: 1 }}
        />
      </View>
    );

  const doneRow = done ? (
    <View style={[styles.row, { gap: 12, paddingTop: 10, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.lineStrong }]}>
      <Stamp tone={item.status === 'approved' ? 'ok' : item.status === 'sent_back' ? 'warn' : 'bad'} rotate={-6}>
        {t(`principal.approvals.stamp_${item.status}`)}
      </Stamp>
      <Text variant="xs" color="ink2" weight={600} style={{ flex: 1, minWidth: 0 }}>
        {t(`principal.approvals.done_${item.status}_${item.kind}`, { name: firstName(who), defaultValue: t(`principal.approvals.done_${item.status}`, { name: firstName(who) }) })}
      </Text>
      {item.undo_until ? <Button title={t('principal.approvals.undo')} variant="ghost" height={44} loading={undo.isPending} onPress={() => undo.mutate()} /> : null}
    </View>
  ) : null;

  const collapsed = (text: string) => (
    <View style={[styles.row, { gap: 10 }]}>
      <Text variant="xs" color="ink2" numberOfLines={2} style={{ flex: 1, minWidth: 0 }}>
        {text}
      </Text>
      <Button title={t('principal.approvals.open')} variant="ghost" height={44} onPress={onOpen} />
    </View>
  );

  const header = (initials: string, title: string, sub: string, right?: ReactNode, tone?: 1 | 2 | 3 | 4 | 5 | 6) => (
    <View style={[styles.row, { gap: 10 }]}>
      <Avatar initials={initials} size="md" tone={tone} seed={title} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="sm" weight={700} numberOfLines={1}>
          {title}
        </Text>
        <Text variant="xs" color="muted" numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {right}
    </View>
  );

  const backSheet = (
    <Sheet visible={sendingBack} onClose={() => setSendingBack(false)} title={t('principal.approvals.sendBackTitle', { name: firstName(who) })} message={t('principal.approvals.sendBackBody')}>
      <TextField value={note} onChangeText={setNote} multiline style={{ minHeight: 100 }} placeholder={t('principal.approvals.sendBackPlaceholder')} maxLength={300} />
      <Button title={t('principal.approvals.sendBack')} size="lg" fullWidth disabled={!note.trim()} loading={decide.isPending} onPress={() => decide.mutate({ decision: 'send_back', note: note.trim() })} />
    </Sheet>
  );

  // ---------------------------------------------------------------- refund: a fee slip
  if (item.kind === 'refund') {
    const d = item.details as RefundDetails;
    const amount = formatInr(d.amount);
    return (
      <View style={variant === 'tray' && expanded && !done ? { marginBottom: 6 } : undefined}>
        <Ticket color="butter">
          <View style={{ padding: 16, paddingBottom: 12 }}>
            {header(
              d.student.initials,
              t('principal.approvals.refundTitle', { name: d.student.name, class: d.student.class }),
              [d.asked_by ? t('principal.approvals.askedBy', { name: d.asked_by, rel: d.relationship ? ` (${t(`principal.rel.${d.relationship}`, { defaultValue: d.relationship })})` : '' }) : null, formatDate(item.created_at)].filter(Boolean).join(' · '),
              <Text variant="sm" weight={800} num>
                {amount}
              </Text>,
              6,
            )}
          </View>
          <Tear />
          <View style={{ padding: 16, paddingTop: 10, gap: 14 }}>
            {done ? (
              doneRow
            ) : !expanded ? (
              collapsed(`${d.fee_head} · ${d.reason.split(/[;.]/)[0]} · ${t('principal.approvals.audited')}`)
            ) : (
              <>
                <View style={[styles.row, { flexWrap: 'wrap', rowGap: 10 }]}>
                  {[
                    [t('principal.approvals.feeHead'), d.fee_head],
                    [t('principal.approvals.paid'), [d.paid_on ? formatDate(d.paid_on) : null, d.method ? t(`principal.method.${d.method}`, { defaultValue: d.method.toUpperCase() }) : null].filter(Boolean).join(' · ')],
                    [t('principal.approvals.receipt'), d.receipt_no ?? '—'],
                    [t('principal.approvals.refundTo'), t('principal.approvals.original', { method: d.method ? t(`principal.method.${d.method}`, { defaultValue: d.method.toUpperCase() }) : '' })],
                  ].map(([k, v]) => (
                    <View key={k} style={{ width: '50%' }}>
                      <Text variant="xxs" color="muted" weight={700}>
                        {k}
                      </Text>
                      <Text variant="sm" weight={700} num>
                        {v}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text variant="sm" color="ink2">
                  {d.reason}
                </Text>
                {actions(t('principal.approvals.approveAmount', { amount }))}
              </>
            )}
          </View>
        </Ticket>
      </View>
    );
  }

  let title = '';
  let sub = '';
  let pill: ReactNode = null;
  let body: ReactNode = null;
  let brief = '';
  let approveLabel: string | undefined;
  let secondary: 'decline' | 'send_back' = 'decline';

  if (item.kind === 'leave') {
    const d = item.details as LeaveDetails;
    const w = when(d.from_date, t);
    const dates = d.from_date === d.to_date ? `${weekdayName(d.from_date, true)} ${formatDate(d.from_date)}` : `${new Date(d.from_date).getDate()}–${formatDate(d.to_date)}`;
    const kind = t(`principal.leaveKind.${d.leave_kind}`);
    title = variant === 'pulse' ? who : t('principal.approvals.leaveTitle', { name: who });
    sub = variant === 'pulse' ? [d.person.subject, dates, kind.toLowerCase()].filter(Boolean).join(' · ') : [d.person.subject, sent(item.created_at, t)].filter(Boolean).join(' · ');
    pill =
      variant === 'pulse' ? null : w ? <Pill label={w.label} tone={w.urgent ? 'warn' : 'neutral'} dot={w.urgent} /> : null;
    brief = [dates, kind.toLowerCase(), t('principal.approvals.periodsToCover', { count: d.cover_periods })].join(' · ');
    const sentence = [
      d.reason.replace(/\.$/, '') + '.',
      variant === 'pulse' ? t('principal.approvals.needCover', { count: d.cover_periods }) : t('principal.approvals.leftAfter', { left: d.left_after, allowed: d.allowed, kind: kind.toLowerCase() }),
      variant === 'pulse' && d.certificate ? t('principal.approvals.certAttached') : null,
    ]
      .filter(Boolean)
      .join(' ');
    body = (
      <>
        {variant === 'tray' ? (
          <View style={[styles.row, styles.grid, { borderColor: colors.lineStrong }]}>
            {[
              [d.from_date === d.to_date ? t('principal.approvals.date') : t('principal.approvals.dates'), dates],
              [t('principal.approvals.type'), kind],
              [t('principal.approvals.cover'), t('principal.approvals.periods', { count: d.cover_periods })],
            ].map(([k, v]) => (
              <View key={k} style={{ flex: 1 }}>
                <Text variant="xxs" color="muted" weight={700}>
                  {k}
                </Text>
                <Text variant="sm" weight={700}>
                  {v}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text variant="sm" color="ink2" style={{ lineHeight: 21 }}>
          {sentence}
        </Text>
        {variant === 'tray' && d.certificate ? (
          <Chip label={t('principal.approvals.certificate')} icon="paperclip" onPress={() => void openFile(d.certificate!.url, d.certificate!.name)} style={{ height: 44, alignSelf: 'flex-start' }} />
        ) : null}
      </>
    );
  } else if (item.kind === 'marks') {
    const d = item.details as MarksDetails;
    title = t('principal.approvals.marksTitle', { name: who });
    sub = [d.subject, d.class, sent(item.created_at, t)].join(' · ');
    pill = <Pill label={t('principal.approvals.changes', { count: d.entries.length })} dot={false} style={{ backgroundColor: colors.pLav }} />;
    brief = [d.exam, d.reason.split(/[.;]/)[0], d.checked_by ? t('principal.approvals.hodChecked') : null].filter(Boolean).join(' · ');
    approveLabel = t('principal.approvals.approveChanges', { count: d.entries.length });
    secondary = 'send_back';
    body = (
      <>
        <Paper pad={0} style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, marginBottom: 8 }}>
          <View style={[styles.row, { justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.line }]}>
            <Text variant="xxs" color="muted" weight={700} style={styles.caps}>
              {`${d.class} · ${d.subject} · ${d.exam}`}
            </Text>
            <Text variant="xxs" color="muted" weight={700} style={styles.caps}>
              {t('principal.approvals.totalOutOf', { count: d.out_of })}
            </Text>
          </View>
          {d.entries.map((e, i) => (
            <View key={i} style={[styles.row, { height: 44, gap: 10 }, i < d.entries.length - 1 && { borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: colors.line }]}>
              <Text variant="xxs" color="muted" weight={700} num style={{ width: 18 }}>
                {e.roll_no != null ? String(e.roll_no).padStart(2, '0') : ''}
              </Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="sm" weight={700} numberOfLines={1}>
                  {e.student}
                </Text>
                {e.note ? (
                  <Text variant="xxs" color="muted">
                    {e.note}
                  </Text>
                ) : null}
              </View>
              <Text variant="sm" color="muted" num style={{ textDecorationLine: 'line-through' }}>
                {e.from}
              </Text>
              <Icon name="arrowRight" size={14} rawColor={colors.muted} />
              <Text variant="sm" weight={800} num>
                <Highlight color="lav">{String(e.to)}</Highlight>
              </Text>
            </View>
          ))}
        </Paper>
        <Text variant="sm" color="ink2" style={{ lineHeight: 21 }}>
          “{d.reason}”{' '}
          {d.checked_by ? (
            <Text variant="sm" color="muted">
              {t('principal.approvals.checkedBy', { name: d.checked_by })}
            </Text>
          ) : null}
        </Text>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text variant="xs" color="muted" weight={600}>
            {t('principal.approvals.classAverage', { class: d.class, subject: d.subject })}
          </Text>
          <Text variant="xs" weight={700} num>
            {`${d.average_before}% → ${d.average_after}%`}
          </Text>
        </View>
        <View style={[styles.row, { gap: 8, alignItems: 'flex-start' }]}>
          <Icon name="shield" size={14} rawColor={colors.muted} />
          <Text variant="xs" color="muted" style={{ flex: 1 }}>
            {t('principal.approvals.marksAudited', { count: d.entries.length })}
          </Text>
        </View>
      </>
    );
  } else if (item.kind === 'admission') {
    const d = item.details as AdmissionDetails;
    title = t('principal.approvals.admissionTitle', { name: d.child });
    sub = [t('principal.approvals.grade', { grade: d.grade }), d.academic_year, d.application_no].join(' · ');
    brief = [d.documents_verified ? t('principal.approvals.docsVerified') : t('principal.approvals.docsPending'), d.sibling ? t('principal.approvals.siblingIn', { class: d.sibling.class }) : null].filter(Boolean).join(' · ');
    body = (
      <View style={{ gap: 8 }}>
        {[
          [d.documents_verified, d.documents_verified ? t('principal.approvals.docsVerified') : t('principal.approvals.docsPending')],
          [!!d.interaction_on, d.interaction_on ? t('principal.approvals.interaction', { date: formatDate(d.interaction_on) }) : t('principal.approvals.noInteraction')],
        ].map(([ok, label], i) => (
          <View key={i} style={[styles.row, { gap: 10 }]}>
            <Icon name={ok ? 'checkCircle' : 'alert'} size={ICON_SIZE.sm} rawColor={ok ? colors.ok : colors.warn} />
            <Text variant="sm" weight={600}>
              {label as string}
            </Text>
          </View>
        ))}
        <Text variant="sm" color="ink2" style={{ paddingLeft: 26 }}>
          {[d.sibling ? t('principal.approvals.siblingIn', { class: d.sibling.class }) : null, d.seats_left != null ? t('principal.approvals.seatsLeft', { count: d.seats_left, grade: d.grade }) : null].filter(Boolean).join(' · ')}
        </Text>
      </View>
    );
  } else {
    const d = item.details as AttendanceFixDetails;
    title = t('principal.approvals.attendanceTitle', { name: who });
    sub = [d.class, `${weekdayName(d.date, true)} ${formatDate(d.date)}`, sent(item.created_at, t)].join(' · ');
    brief = t('principal.approvals.registerChanges', { count: d.entries.length });
    body = (
      <View style={{ gap: 6 }}>
        {d.entries.map((e, i) => (
          <Text key={i} variant="sm" color="ink2">
            {`${e.student}: ${t(`principal.status.${e.from}`, { defaultValue: e.from })} → `}
            <Text variant="sm" weight={700}>
              {t(`principal.status.${e.to}`, { defaultValue: e.to })}
            </Text>
          </Text>
        ))}
        {d.reason ? (
          <Text variant="xs" color="muted">
            {d.reason}
          </Text>
        ) : null}
      </View>
    );
  }

  const initials = item.kind === 'admission' ? (item.details as AdmissionDetails).child.split(' ').map((w) => w[0]).join('').slice(0, 2) : (item.requested_by?.initials ?? '?');
  const pulseKicker = variant === 'pulse' && item.kind === 'leave' ? when((item.details as LeaveDetails).from_date, t) : null;

  return (
    <Card pad={16} style={[{ gap: 12 }, variant === 'pulse' && { marginBottom: 14 }]} accessibilityLabel={`${title}. ${sub}`}>
      {variant === 'pulse' ? (
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Pill label={pulseKicker ? t('principal.approvals.kindWhen', { kind: t(`principal.kind.${item.kind}`), when: pulseKicker.label.toLowerCase() }) : t(`principal.kind.${item.kind}`)} tone="info" dot={false} />
          <Text variant="xxs" color="muted" weight={600}>
            {sent(item.created_at, t)}
          </Text>
        </View>
      ) : null}
      {header(initials, title, sub, pill, ({ leave: 4, marks: 2, admission: 5, attendance: 3 } as const)[item.kind as 'leave'])}
      {done ? doneRow : variant === 'tray' && !expanded ? collapsed(brief) : (
        <>
          {body}
          {actions(approveLabel, secondary)}
        </>
      )}
      {backSheet}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grid: { alignItems: 'stretch', borderTopWidth: 1, borderBottomWidth: 1, borderStyle: 'dashed', paddingVertical: 12 },
  caps: { letterSpacing: 0.9, textTransform: 'uppercase' },
});

