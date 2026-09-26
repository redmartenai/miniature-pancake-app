import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useConsoleQuery } from '@/features/console/api';
import { formatDate, formatTime, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Badge, Button, Card, Icon, Pill, Register, RegisterDot, Stamp, Text, TextField, useToast } from '@/ui';

import { adminApi, type Chronic, type Slip } from '../api';
import { Dialog } from '../Overlay';
import { dayLabel } from './HeatGrid';

/* ---------------------------------------------------------- chronic absentees */

export function ChronicCard({ rows, days, canAct }: { rows: Chronic[]; days: string[]; canAct: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [calling, setCalling] = useState<Chronic | null>(null);
  const reached = (c: Chronic) => c.reason_given || (c.contact && (c.contact.outcome === 'reached' || c.contact.channel === 'handoff'));
  const notReached = rows.filter((c) => !reached(c)).length;
  const handoff = useMutation({
    mutationFn: adminApi.handoff,
    onSuccess: (res) => {
      toast(t('console.admin.attendance.handedToast', { count: res.handed, to: res.to.join(', ') }));
      qc.invalidateQueries({ queryKey: ['console'] });
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : String(e), 'danger'),
  });
  return (
    <Card pad={22} style={{ gap: 6 }}>
      <View nativeID="absentees" style={[styles.row, { alignItems: 'flex-start', justifyContent: 'space-between' }]}>
        <View style={{ gap: 2, flex: 1 }}>
          <Text variant="h3" accessibilityRole="header">
            {t('console.admin.attendance.chronic')}
          </Text>
          <Text variant="xs" color="muted">
            {notReached ? t('console.admin.attendance.chronicSub', { count: notReached }) : t('console.admin.attendance.chronicSubAll')}
          </Text>
        </View>
        {notReached ? (
          <Stamp tone="bad" rotate={-6} style={{ marginTop: 2, marginRight: 6 }}>
            {t('console.admin.attendance.callToday')}
          </Stamp>
        ) : null}
      </View>
      <View style={[styles.row, styles.headRow, { borderBottomColor: colors.line }]}>
        <Text style={[styles.th, { width: 128, color: colors.muted }]}>{t('console.admin.attendance.colStudent')}</Text>
        <Text style={[styles.th, { width: 146, color: colors.muted }]}>
          {days.length
            ? t('console.admin.attendance.colWindow', { from: Number(days[0].slice(8, 10)), to: formatDate(days[days.length - 1]) })
            : ''}
        </Text>
        <Text style={[styles.th, { flex: 1, color: colors.muted }]}>{t('console.admin.attendance.colAbsent')}</Text>
        <View style={{ width: 74 }} />
      </View>
      {rows.length ? (
        <View>
          {rows.map((c, i) => {
            const status = contactLine(c, t);
            const present = c.marks.filter((m) => m === 'p').length;
            return (
              <View key={c.id} style={[styles.row, { gap: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: colors.line }]}>
                <View style={{ width: 128, minWidth: 0 }}>
                  <Text variant="sm" weight={700} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text variant="xs" color="muted" num>
                    {t('console.admin.attendance.rollNo', { class: c.class, roll: String(c.roll_no).padStart(2, '0') })}
                  </Text>
                </View>
                <Register
                  marks={c.marks}
                  gap={4}
                  wrap={false}
                  style={{ width: 146 }}
                  accessibilityLabel={t('console.admin.attendance.marksLabel', {
                    name: c.name,
                    present,
                    absent: c.marks.filter((m) => m === 'a').length,
                    late: c.marks.filter((m) => m === 'l').length,
                  })}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="sm" weight={700}>
                    {t('console.admin.attendance.days', { count: c.days })}{' '}
                    <Text variant="xs" color="muted" weight={600}>
                      {t('console.admin.attendance.since', { day: dayLabel(c.since) })}
                    </Text>
                  </Text>
                  <Text
                    variant="xs"
                    weight={700}
                    rawColor={status.tone === 'bad' ? colors.bad : status.tone === 'warn' ? colors.warn : colors.ok}>
                    {status.text}
                    {c.ytd !== null ? ` · ${t('console.admin.attendance.ytd', { pct: c.ytd })}` : ''}
                  </Text>
                </View>
                <Button
                  title={t('console.admin.attendance.call')}
                  icon="call"
                  variant="secondary"
                  size="sm"
                  style={{ width: 74 }}
                  disabled={!canAct}
                  accessibilityLabel={t('console.admin.attendance.callLabel', { name: c.name })}
                  onPress={() => setCalling(c)}
                />
              </View>
            );
          })}
        </View>
      ) : (
        <Text variant="sm" color="muted" style={{ paddingVertical: 16 }}>
          {t('console.admin.attendance.noChronic')}
        </Text>
      )}
      <View style={[styles.row, { justifyContent: 'space-between', gap: 12, paddingTop: 12, borderTopWidth: 1, borderColor: colors.line }]}>
        <Text variant="xs" color="muted">
          {t('console.admin.attendance.logged')}
        </Text>
        <Button
          title={t('console.admin.attendance.handoff')}
          variant="ghost"
          size="sm"
          disabled={!canAct || !notReached}
          loading={handoff.isPending}
          onPress={() => handoff.mutate()}
        />
      </View>
      {calling ? <CallDialog child={calling} onClose={() => setCalling(null)} /> : null}
    </Card>
  );
}

function contactLine(c: Chronic, t: (k: string, o?: Record<string, unknown>) => string): { text: string; tone: 'bad' | 'warn' | 'ok' } {
  if (c.reason_given) return { text: t('console.admin.attendance.reasonGiven'), tone: 'ok' };
  const k = c.contact;
  if (!k) return { text: t('console.admin.attendance.notContacted'), tone: 'bad' };
  if (k.channel === 'call') {
    return k.outcome === 'reached'
      ? { text: t('console.admin.attendance.reached', { when: `${formatDate(k.at.slice(0, 10))}, ${formatTime(k.at)}` }), tone: 'ok' }
      : { text: t('console.admin.attendance.noAnswer'), tone: 'warn' };
  }
  if (k.channel === 'handoff') return { text: t('console.admin.attendance.handedOff'), tone: 'warn' };
  return { text: t('console.admin.attendance.alertSentNoReply'), tone: 'warn' };
}

function CallDialog({ child, onClose }: { child: Chronic; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const log = useMutation({
    mutationFn: (outcome: 'reached' | 'no_answer') => adminApi.logCall(child.id, outcome, note),
    onSuccess: () => {
      toast(t('console.admin.attendance.callLogged', { name: child.name }));
      qc.invalidateQueries({ queryKey: ['console'] });
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : String(e), 'danger'),
  });
  const g = child.guardian;
  return (
    <Dialog
      visible
      onClose={onClose}
      title={t('console.admin.attendance.callTitle', { name: child.name })}
      subtitle={t('console.admin.attendance.callSub', {
        child: child.name,
        class: child.class,
        days: t('console.admin.attendance.days', { count: child.days }),
      })}
      footer={
        <>
          <Button
            title={t('console.admin.attendance.noAnswerBtn')}
            variant="secondary"
            loading={log.isPending && log.variables === 'no_answer'}
            onPress={() => log.mutate('no_answer')}
          />
          <Button
            title={t('console.admin.attendance.reachedBtn')}
            icon="check"
            loading={log.isPending && log.variables === 'reached'}
            onPress={() => log.mutate('reached')}
          />
        </>
      }>
      <View style={[styles.guardian, { backgroundColor: colors.sunken }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="xxs" color="muted" weight={700} style={{ textTransform: 'uppercase', letterSpacing: 0.9 }}>
            {t('console.admin.attendance.guardian')}
          </Text>
          <Text variant="sm" weight={700}>
            {g ? g.name : t('console.admin.attendance.noGuardian')}
          </Text>
          {g ? (
            <Text variant="sm" color="ink2" num>
              {g.phone}
            </Text>
          ) : null}
        </View>
        {g ? (
          <Button
            title={t('console.admin.attendance.callNow', { phone: g.phone })}
            icon="call"
            variant="soft"
            size="sm"
            onPress={() => Linking.openURL(`tel:${g.phone}`)}
          />
        ) : null}
      </View>
      <Register marks={child.marks} large gap={5} wrap={false} />
      <Text variant="sm" weight={700}>
        {t('console.admin.attendance.outcome')}
      </Text>
      <TextField
        label={t('console.admin.attendance.note')}
        placeholder={t('console.admin.attendance.notePlaceholder')}
        value={note}
        onChangeText={setNote}
        maxLength={300}
      />
    </Dialog>
  );
}

/* ---------------------------------------------------------- correction slips */

export function Slips({ slips, canAct }: { slips: Slip[]; canAct: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const open = slips.filter((s) => s.status === 'pending').length;
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 2 }}>
        <View style={[styles.row, { gap: 10 }]}>
          <Text variant="h3" accessibilityRole="header">
            {t('console.admin.attendance.slips')}
          </Text>
          {open ? <Badge value={open} /> : null}
        </View>
        <View style={[styles.row, { gap: 5 }]}>
          <Icon name="shield" size={12} rawColor={colors.muted} />
          <Text variant="xs" color="muted">
            {t('console.admin.attendance.slipsSub')}
          </Text>
        </View>
      </View>
      {slips.length ? (
        slips.map((s) => <SlipCard key={s.id} slip={s} canAct={canAct} />)
      ) : (
        <Card variant="well" pad={16}>
          <Text variant="sm" color="muted">
            {t('console.admin.attendance.noSlips')}
          </Text>
        </Card>
      )}
    </View>
  );
}

function statusDot(status: string) {
  return status === 'present' ? 'p' : status === 'late' || status === 'half_day' ? 'l' : 'a';
}

function SlipCard({ slip, canAct }: { slip: Slip; canAct: boolean }) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ['console'] });
  const onError = (e: unknown) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : String(e), 'danger');
  const decide = useMutation({
    mutationFn: (d: 'approve' | 'decline') => adminApi.decide(slip.id, d),
    onSuccess: (_r, d) => {
      toast(t(d === 'approve' ? 'console.admin.attendance.slipApproved' : 'console.admin.attendance.slipRejected', { code: slip.code }));
      done();
    },
    onError,
  });
  const undo = useMutation({
    mutationFn: () => adminApi.undo(slip.id),
    onSuccess: () => {
      toast(t('console.admin.attendance.slipUndone', { code: slip.code }));
      done();
    },
    onError,
  });
  const from = t(`console.admin.attendance.statuses.${slip.from}` as never, { defaultValue: slip.from });
  const to = t(`console.admin.attendance.statuses.${slip.to}` as never, { defaultValue: slip.to });
  const day = `${weekdayName(slip.date, true)} ${formatDate(slip.date)}`;
  const decided = slip.status !== 'pending';
  return (
    <View
      accessibilityLabel={slip.student ?? slip.code}
      style={[
        styles.slip,
        {
          backgroundColor: colors.surface,
          borderColor: colors.lineStrong,
          boxShadow: scheme === 'dark' ? '0 12px 30px -18px rgba(0,0,0,0.7)' : '0 1px 2px rgba(28,27,34,0.05)',
        },
      ]}>
      <View style={[styles.row, styles.slipHead, { backgroundColor: colors.pMint }]}>
        <Text style={[styles.slipKicker, { color: colors.pMintInk }]}>{t('console.admin.attendance.slipHead', { class: slip.class })}</Text>
        <Text variant="xxs" color="ink2" weight={700} num>
          {slip.code}
        </Text>
      </View>
      <View style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>
        <View style={[styles.row, { justifyContent: 'space-between', gap: 12 }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700}>
              {slip.more
                ? t('console.admin.attendance.slipMore', { name: slip.student, count: slip.more, day })
                : t('console.admin.attendance.slipStudent', { name: slip.student, day })}
            </Text>
            <Text variant="xs" color="muted">
              {t('console.admin.attendance.askedBy', { name: slip.requested_by ?? '—', date: formatDate(slip.requested_at.slice(0, 10)) })}
            </Text>
          </View>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={t('console.admin.attendance.changeLabel', { from, to })}
            style={[styles.row, { gap: 6 }]}>
            <RegisterDot mark={statusDot(slip.from)} large />
            <Icon name="arrowRight" size={14} rawColor={colors.ink2} />
            {slip.to === 'excused' ? (
              <View style={[styles.infoDot, { backgroundColor: colors.info }]} />
            ) : (
              <RegisterDot mark={statusDot(slip.to)} large />
            )}
          </View>
        </View>
        {slip.reason ? (
          <Text variant="xs" color="ink2">
            “{slip.reason}”
          </Text>
        ) : null}
        <View style={[styles.row, { gap: 8, paddingTop: 10, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong }]}>
          <Text variant="xxs" color="muted" weight={700} style={{ flex: 1 }}>
            {t('console.admin.attendance.change', { from, to })}
          </Text>
          {decided ? (
            <>
              <Stamp tone={slip.status === 'approved' ? 'ok' : 'bad'}>
                {t(slip.status === 'approved' ? 'console.admin.attendance.approved' : 'console.admin.attendance.rejected')}
              </Stamp>
              {slip.undo_until && canAct ? (
                <Button
                  title={t('console.admin.attendance.undo')}
                  variant="ghost"
                  size="sm"
                  loading={undo.isPending}
                  onPress={() => undo.mutate()}
                />
              ) : null}
            </>
          ) : (
            <>
              <Button
                title={t('console.admin.attendance.reject')}
                variant="secondary"
                size="sm"
                disabled={!canAct}
                loading={decide.isPending && decide.variables === 'decline'}
                onPress={() => decide.mutate('decline')}
              />
              <Button
                title={t('console.admin.attendance.approve')}
                variant="ok"
                size="sm"
                disabled={!canAct}
                loading={decide.isPending && decide.variables === 'approve'}
                onPress={() => decide.mutate('approve')}
              />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------- who is missing in… */

export function MissingDialog({ date, sections, onClose }: { date: string; sections: string[]; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const q = useConsoleQuery(['admin', 'absentees', date, sections.join(',')], () => adminApi.absentees(date, sections));
  const list = sections.join(t('console.admin.attendance.and'));
  return (
    <Dialog
      visible
      onClose={onClose}
      width={620}
      title={t('console.admin.attendance.missingIn', { sections: list })}
      subtitle={t('console.admin.attendance.missingInSub', { date: `${weekdayName(date, true)} ${formatDate(date)}` })}>
      {(q.data?.items ?? []).map((a, i) => (
        <View key={a.id} style={[styles.row, { gap: 12, paddingTop: i ? 12 : 0, borderTopWidth: i ? 1 : 0, borderColor: colors.line }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700}>
              {a.name}
            </Text>
            <Text variant="xs" color="muted">
              {t('console.admin.attendance.rollNo', { class: a.class, roll: String(a.roll_no).padStart(2, '0') })}
              {a.guardian ? ` · ${a.guardian.name} · ${a.guardian.phone}` : ''}
              {a.note ? ` · ${a.note}` : ''}
            </Text>
          </View>
          {a.status === 'late' ? (
            <Pill label={t('console.admin.attendance.lateStatus')} tone="warn" />
          ) : a.explained ? (
            <Pill label={t('console.admin.attendance.explained')} tone="ok" />
          ) : (
            <Pill
              label={
                a.alerted
                  ? `${t('console.admin.attendance.unexplained')} · ${t('console.admin.attendance.alerted')}`
                  : t('console.admin.attendance.unexplained')
              }
              tone="bad"
            />
          )}
        </View>
      ))}
      {q.data && !q.data.items.length ? (
        <Text variant="sm" color="muted">
          {t('console.admin.attendance.nobodyMissing')}
        </Text>
      ) : null}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  headRow: { gap: 14, paddingTop: 12, paddingBottom: 6, borderBottomWidth: 1 },
  th: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15, letterSpacing: 0.66, textTransform: 'uppercase' },
  guardian: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14 },
  slip: {
    borderWidth: 1,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: 'hidden',
  },
  slipHead: { justifyContent: 'space-between', paddingVertical: 9, paddingHorizontal: 16 },
  slipKicker: { fontFamily: fonts.extrabold, fontSize: 11, lineHeight: 15, letterSpacing: 1.32, textTransform: 'uppercase' },
  infoDot: { width: 14, height: 14, borderRadius: 7 },
});
