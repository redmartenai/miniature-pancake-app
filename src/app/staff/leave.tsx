import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { LeaveBalance, LeaveKind, StaffLeaveRequest } from '@/api/types';
import { addDays, formatDate, isoDate, parseDate, weekdayName } from '@/lib/format';
import { appendFiles, type PickedFile } from '@/lib/pick';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  AppBar,
  Button,
  Card,
  Chip,
  DateField,
  ErrorState,
  Highlight,
  Icon,
  ICON_SIZE,
  IconButton,
  Kicker,
  LoadingCards,
  pointer,
  Screen,
  Stamp,
  Switch,
  Text,
  TextField,
  useToast,
} from '@/ui';

const KINDS: LeaveKind[] = ['casual', 'sick', 'earned'];

/** StaffLeave: days left as tear-off calendars, a leave request, and this year's slips. */
export default function StaffLeave() {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: ['staff-leave'], queryFn: api.staffLeave });
  const data = query.data;
  const resets = data?.year ? formatDate(addDays(parseDate(data.year.ends_on), 1)) : '';
  return (
    <Screen
      dock
      gap={18}
      refreshing={query.isRefetching}
      onRefresh={query.refetch}
      header={
        <AppBar
          back={() => (router.canGoBack() ? router.back() : router.navigate('/staff/me'))}
          subtitle={data?.year ? t('staff.leave.subtitle', { year: data.year.name, date: resets }) : undefined}
          title={t('staff.leave.title')}
        />
      }>
      {query.error ? <ErrorState error={query.error} onRetry={query.refetch} /> : null}
      {!data ? <LoadingCards count={3} /> : null}
      {data ? (
        <>
          <View style={{ gap: 10 }}>
            <Kicker>{t('staff.leave.daysLeft')}</Kicker>
            <View style={[styles.row, { gap: 10, alignItems: 'flex-start' }]}>
              {data.balances.map((b) => (
                <Balance key={b.kind} b={b} />
              ))}
            </View>
            <Text variant="xs" color="muted" weight={600}>
              {t('staff.leave.sheetsHint')}
            </Text>
          </View>
          <Apply balances={data.balances} approver={data.approver} periodsByWeekday={data.periods_by_weekday} />
          {data.requests.length ? (
            <View style={{ gap: 12 }}>
              <Kicker>{t('staff.leave.slips')}</Kicker>
              {data.requests.map((r) => (
                <Slip key={r.id} r={r} approver={data.approver} />
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

/** One leave type as a tear-off calendar: days left big, one small sheet per day of the year's allowance. */
function Balance({ b }: { b: LeaveBalance }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const used = Math.ceil(b.used);
  return (
    <View
      accessible
      accessibilityLabel={t('staff.leave.balanceLabel', { kind: t(`staff.leave.kind_${b.kind}`), left: b.left, allowed: b.allowed })}
      style={[styles.cal, { backgroundColor: colors.surface, borderColor: colors.lineStrong, boxShadow: `0 2px 0 -1px ${colors.surface}, 0 3px 0 -1px ${colors.lineStrong}, 0 5px 0 -2px ${colors.surface}, 0 6px 0 -2px ${colors.line}` }]}>
      <View style={[styles.calHead, { backgroundColor: colors.pPinkInk }]}>
        <View style={[styles.row, { gap: 22, position: 'absolute', top: 5 }]}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.surface }} />
          ))}
        </View>
        <Text rawColor="#FFFFFF" style={styles.calKind}>
          {t(`staff.leave.kind_${b.kind}`)}
        </Text>
      </View>
      <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 10, gap: 2 }}>
        <Text style={styles.calNum}>{b.left}</Text>
        <Text variant="xxs" color="muted" weight={700} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
          {t('staff.leave.ofLeft', { count: b.allowed })}
        </Text>
        <View style={[styles.row, { gap: 2, marginTop: 6 }]}>
          {Array.from({ length: b.allowed }, (_, i) => (
            <View key={i} style={{ width: 4, height: 9, borderRadius: 1, backgroundColor: i < used ? colors.lineStrong : colors.pPinkInk }} />
          ))}
        </View>
      </View>
    </View>
  );
}

function Apply({ balances, approver, periodsByWeekday }: { balances: LeaveBalance[]; approver: string | null; periodsByWeekday: number[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const tomorrow = isoDate(nextSchoolDay(new Date()));
  const [kind, setKind] = useState<LeaveKind>('casual');
  const [from, setFrom] = useState(tomorrow);
  const [to, setTo] = useState(tomorrow);
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [certificate, setCertificate] = useState<PickedFile | null>(null);

  const { days, periods } = useMemo(() => {
    let d = 0;
    let p = 0;
    for (let cur = parseDate(from); isoDate(cur) <= (to < from ? from : to); cur = addDays(cur, 1)) {
      if (cur.getDay() === 0) continue;
      d += 1;
      p += periodsByWeekday[(cur.getDay() + 6) % 7] ?? 0;
    }
    return halfDay ? { days: 0.5, periods: Math.ceil(p / 2) } : { days: d, periods: p };
  }, [from, to, halfDay, periodsByWeekday]);
  const balance = balances.find((b) => b.kind === kind)!;
  const after = balance.left - balance.pending - days;
  const needsCert = kind === 'sick' && days > 2;

  const submit = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('kind', kind);
      form.append('from_date', from);
      form.append('to_date', halfDay ? from : to < from ? from : to);
      form.append('half_day', String(halfDay));
      form.append('reason', reason.trim());
      if (certificate) await appendFiles(form, 'certificate', [certificate]);
      return api.applyStaffLeave(form);
    },
    onSuccess: () => {
      toast(t('staff.leave.sent', { name: approver ?? '' }));
      setReason('');
      setCertificate(null);
      void client.invalidateQueries({ queryKey: ['staff-leave'] });
      void client.invalidateQueries({ queryKey: ['staff-me'] });
      void client.invalidateQueries({ queryKey: ['staff-home'] });
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });
  const attach = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setCertificate({ uri: a.uri, name: a.name, type: a.mimeType ?? 'application/pdf', file: a.file, size: a.size });
  };

  return (
    <Card pad={18} style={{ gap: 16 }}>
      <View>
        <Text variant="h3">{t('staff.leave.apply')}</Text>
        {approver ? (
          <Text variant="xs" color="muted">
            {t('staff.leave.to', { name: approver })}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: 8 }}>
        <Text variant="sm" weight={600} color="ink2">
          {t('staff.leave.type')}
        </Text>
        <View style={[styles.row, { gap: 8 }]}>
          {KINDS.map((k) => (
            <Chip key={k} label={t(`staff.leave.chip_${k}`)} selected={kind === k} onPress={() => setKind(k)} style={{ height: 44, paddingHorizontal: 16 }} />
          ))}
        </View>
      </View>
      <View style={[styles.row, { gap: 10, alignItems: 'flex-start' }]}>
        <DateField
          label={t('staff.leave.from')}
          value={from}
          min={isoDate(new Date())}
          onChange={(v) => {
            setFrom(v);
            if (to < v) setTo(v);
          }}
          style={{ flex: 1 }}
        />
        <DateField label={t('staff.leave.toDate')} value={halfDay ? from : to} min={from} onChange={setTo} style={{ flex: 1 }} />
      </View>
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: halfDay }} onPress={() => setHalfDay(!halfDay)} style={[styles.row, { gap: 12 }, pointer]}>
        <View style={{ flex: 1 }}>
          <Text variant="sm" weight={700}>
            {t('staff.leave.halfDay')}
          </Text>
          <Text variant="xs" color="muted">
            {t('staff.leave.halfDayHint')}
          </Text>
        </View>
        <Switch value={halfDay} label={t('staff.leave.halfDay')} decorative />
      </Pressable>
      <TextField label={t('staff.leave.reason')} value={reason} onChangeText={setReason} multiline maxLength={400} style={{ minHeight: 88 }} placeholder={t('staff.leave.reasonPlaceholder')} />
      <View style={{ gap: 7 }}>
        <Text variant="sm" weight={600} color="ink2">
          {t('staff.leave.certificate')}
        </Text>
        {certificate ? (
          <View style={[styles.row, { gap: 10, minHeight: 48, paddingLeft: 14, borderRadius: 12, backgroundColor: colors.sunken }]}>
            <Icon name="document" size={ICON_SIZE.sm} rawColor={colors.brandInk} />
            <Text variant="sm" weight={600} numberOfLines={1} style={{ flex: 1 }}>
              {certificate.name}
            </Text>
            <IconButton icon="close" variant="bare" size="sm" label={t('staff.homework.remove', { name: certificate.name })} onPress={() => setCertificate(null)} />
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => void attach()} style={[styles.row, styles.attach, { borderColor: colors.lineStrong }, pointer]}>
            <Icon name="paperclip" size={ICON_SIZE.sm} rawColor={colors.muted} />
            <Text variant="sm" weight={600} color="muted">
              {t('staff.leave.attach')}
            </Text>
          </Pressable>
        )}
        <Text variant="xs" color={needsCert && !certificate ? 'warn' : 'muted'} weight={needsCert && !certificate ? 700 : 400}>
          {t('staff.leave.certHint')}
        </Text>
      </View>
      {periods ? (
        <View style={{ padding: 14, borderRadius: 14, backgroundColor: colors.sunken, gap: 2 }}>
          <Text variant="sm" weight={700}>
            {t('staff.leave.cover')}
          </Text>
          <Text variant="xs" color="ink2">
            {t('staff.leave.periods', { count: periods })}
          </Text>
        </View>
      ) : null}
      <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.lineStrong, paddingTop: 14 }}>
        <Text variant="sm" color="ink2">
          <Text variant="sm" weight={700} color="ink">
            {t('staff.leave.workingDays', { count: days })}
          </Text>{' '}
          {after >= 0 ? (
            <Trans i18nKey="staff.leave.after" values={{ count: after, kind: t(`staff.leave.kindWord_${kind}`) }} components={{ h: <Highlight /> }} />
          ) : (
            <Text variant="sm" weight={700} color="bad">
              {t('staff.leave.notEnough', { left: balance.left - balance.pending, kind: t(`staff.leave.kindWord_${kind}`) })}
            </Text>
          )}
        </Text>
      </View>
      <Button
        title={t('staff.leave.submit')}
        icon="send"
        size="lg"
        fullWidth
        disabled={!reason.trim() || !days || after < 0 || (needsCert && !certificate)}
        loading={submit.isPending}
        onPress={() => submit.mutate()}
      />
    </Card>
  );
}

function nextSchoolDay(d: Date): Date {
  let next = addDays(d, 1);
  if (next.getDay() === 0) next = addDays(next, 1);
  return next;
}

function Slip({ r, approver }: { r: StaffLeaveRequest; approver: string | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => api.cancelLeave(r.id),
    onSuccess: () => {
      toast(t('staff.leave.withdrawn'));
      void client.invalidateQueries({ queryKey: ['staff-leave'] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  const range =
    r.from_date === r.to_date
      ? `${weekdayName(r.from_date, true)} ${formatDate(r.from_date)}`
      : `${weekdayName(r.from_date, true)} ${parseDate(r.from_date).getDate()} – ${weekdayName(r.to_date, true)} ${formatDate(r.to_date)}`;
  const tone = r.status === 'approved' ? 'ok' : r.status === 'declined' ? 'bad' : 'warn';
  const line =
    r.status === 'pending'
      ? t('staff.leave.sentWith', { date: formatDate(r.created_at), name: approver ?? '' })
      : r.status === 'declined'
        ? r.decision_note || t('staff.leave.declinedBy', { name: r.decided_by ?? '' })
        : r.status === 'approved'
          ? t('staff.leave.signedBy', { name: r.decided_by ?? '' })
          : t('staff.leave.withdrawnLine');
  return (
    <View style={[styles.slip, { backgroundColor: colors.surface, borderColor: colors.lineStrong }]}>
      <View style={{ position: 'absolute', top: 0, left: 10, right: 10, borderTopWidth: 1.5, borderStyle: 'dashed', borderTopColor: colors.lineStrong }} />
      <View style={[styles.row, { gap: 10 }]}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text variant="xxs" color="muted" weight={700} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>
            {t('staff.leave.slipKind', { kind: t(`staff.leave.kind_${r.kind}`), count: r.days })}
          </Text>
          <Text variant="sm" weight={700}>
            {r.half_day ? `${range} · ${t('staff.leave.half')}` : range}
          </Text>
          <Text variant="xs" color="muted" numberOfLines={2}>
            {line}
          </Text>
        </View>
        {r.status === 'cancelled' ? (
          <Text variant="xs" color="muted" weight={700}>
            {t('staff.leave.status_cancelled')}
          </Text>
        ) : (
          <Stamp tone={tone} rotate={-6}>
            {t(`staff.leave.status_${r.status}`)}
          </Stamp>
        )}
      </View>
      {r.status === 'pending' ? (
        <Button title={t('staff.leave.withdraw')} variant="ghost" size="sm" height={36} textColor={colors.bad} loading={cancel.isPending} onPress={() => cancel.mutate()} style={{ alignSelf: 'flex-start', marginLeft: -10 }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  cal: { flex: 1, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  calHead: { height: 36, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 },
  calKind: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase' },
  calNum: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1 },
  attach: { minHeight: 48, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', gap: 8 },
  slip: { borderWidth: 1, borderRadius: 12, padding: 16, paddingTop: 16, gap: 8 },
});
