import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Hr, Pill, Skeleton, Switch, Text, TextField, useToast } from '@/ui';

import { tagText } from './admissionTags';
import { peopleApi, STAGES, useApplication, type AppDetail, type Source } from './api';
import { Choice, clock, dayMonth, Dialog, dowDayMonth, errorText, FilterButton } from './kit';
import { gradeName } from './StudentsPage';

const SOURCES: Source[] = ['website', 'walk_in', 'referral', 'social'];
const ALL_GRADES = ['Nursery', 'LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => String(i + 1))];

/** Record a new enquiry (it lands in the Enquiry column with a call-back today). */
export function NewEnquiryDialog({ visible, grades, onClose }: { visible: boolean; grades: string[]; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const empty = { child_name: '', grade: '', source: 'walk_in', guardian_name: '', guardian_phone: '' };
  const [form, setForm] = useState(empty);
  const save = useMutation({
    mutationFn: () => peopleApi.newEnquiry(form),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['console'] });
      toast(t('console.people.adm.enquiryAdded', { name: res.child }));
      setForm(empty);
      onClose();
    },
  });
  const err = (k: string) => (save.error instanceof ApiError ? save.error.fieldMessage(k) : undefined);
  const set = (k: keyof typeof empty) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const options = [...new Set([...ALL_GRADES, ...grades])];
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('console.people.adm.new')}
      subtitle={t('console.people.adm.newSub')}
      footer={
        <>
          <Button title={t('console.people.cancel')} variant="secondary" onPress={onClose} />
          <Button title={t('console.people.adm.save')} icon="plus" loading={save.isPending} onPress={() => save.mutate()} />
        </>
      }>
      <TextField
        label={t('console.people.adm.child')}
        value={form.child_name}
        onChangeText={set('child_name')}
        error={err('child_name')}
        autoFocus
      />
      <View style={{ gap: 7 }}>
        <Text variant="xs" color="ink2" weight={600}>
          {t('console.people.adm.applyingFor')}
        </Text>
        <FilterButton
          label={t('console.people.adm.grade')}
          allLabel={t('console.people.adm.pickGrade')}
          value={form.grade}
          options={options.map((g) => ({ value: g, label: gradeName(t, g) }))}
          onChange={set('grade')}
        />
        {err('grade') ? (
          <Text variant="xs" color="bad">
            {err('grade')}
          </Text>
        ) : null}
      </View>
      <Choice
        label={t('console.people.adm.source')}
        value={form.source}
        options={SOURCES.map((s) => ({ value: s, label: t(`console.people.adm.srcLong.${s}`) }))}
        onChange={set('source')}
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TextField
          label={t('console.people.adm.parent')}
          value={form.guardian_name}
          onChangeText={set('guardian_name')}
          error={err('guardian_name')}
          containerStyle={{ flex: 1 }}
        />
        <TextField
          label={t('console.people.add.phone')}
          prefix="+91"
          keyboardType="phone-pad"
          value={form.guardian_phone}
          onChangeText={set('guardian_phone')}
          error={err('guardian_phone')}
          containerStyle={{ flex: 1 }}
        />
      </View>
    </Dialog>
  );
}

/** One application: its details, history, and the next step for the stage it is in. */
export function ApplicationDialog({
  id,
  classes,
  onClose,
}: {
  id: string;
  classes: { id: string; label: string; grade: string }[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const q = useApplication(id);
  const a = q.data;
  return (
    <Dialog
      visible
      onClose={onClose}
      title={a?.child ?? t('console.people.adm.loading')}
      subtitle={a ? `${a.application_no} · ${gradeName(t, a.grade)} · ${a.academic_year}` : undefined}
      width={620}>
      {a ? <Body a={a} classes={classes} onClose={onClose} /> : <Skeleton height={260} style={{ borderRadius: 14 }} />}
    </Dialog>
  );
}

function Body({ a, classes, onClose }: { a: AppDetail; classes: { id: string; label: string; grade: string }[]; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const run = useMutation({
    mutationFn: (fn: () => Promise<AppDetail>) => fn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['console'] }),
    onError: (e) => toast(errorText(e, t('console.people.failed')), 'danger'),
  });
  const act = (fn: () => Promise<AppDetail>, done?: string) => run.mutate(fn, { onSuccess: () => done && toast(done) });
  const idx = STAGES.indexOf(a.stage);
  const next = STAGES[idx + 1];
  const tag = tagText(t, a);
  const [slot, setSlot] = useState(a.assessment_at ? a.assessment_at.slice(0, 16) : '');
  const [score, setScore] = useState(a.assessment_score?.toString() ?? '');
  const [pending, setPending] = useState(a.documents_pending);
  const [receipt, setReceipt] = useState('');
  const [cls, setCls] = useState(classes.find((c) => c.grade === a.grade)?.id ?? '');
  const [reason, setReason] = useState('');
  const [followUp, setFollowUp] = useState<string>(a.follow_up || 'call_back');
  const [followOn, setFollowOn] = useState(a.follow_up_on ?? '');
  const moveNext = () =>
    act(() => peopleApi.move(a.id, next), t('console.people.adm.moved', { stage: t(`console.people.adm.stage.${next}`) }));

  const facts: [string, string][] = [
    [
      t('console.people.adm.stageLabel'),
      `${t(`console.people.adm.stage.${a.stage}`)}${a.closed ? ` · ${t('console.people.adm.closed')}` : ''}`,
    ],
    [t('console.people.adm.parent'), `${a.guardian.name} · ${a.guardian_phone}`],
    [t('console.people.adm.source'), t(`console.people.adm.srcLong.${a.source}`)],
    [t('console.people.adm.enquired'), a.enquired_on ? dowDayMonth(a.enquired_on) : '—'],
  ];
  if (a.sibling) facts.push([t('console.people.adm.sibling'), `${a.sibling.name} · ${a.sibling.class}`]);
  if (a.assessment_at)
    facts.push([
      t('console.people.adm.assessment'),
      `${dowDayMonth(a.assessment_at.slice(0, 10))} · ${clock(a.assessment_at)}${a.assessment_score !== null ? ` · ${a.assessment_score}/100` : ''}`,
    ]);
  if (a.offer_made_on)
    facts.push([
      t('console.people.adm.offer'),
      `${dayMonth(a.offer_made_on)}${a.offer_reply_by ? ` · ${t('console.people.adm.tag.reply', { date: dayMonth(a.offer_reply_by) })}` : ''}`,
    ]);
  if (a.fee_receipt_no) facts.push([t('console.people.adm.receiptLabel'), a.fee_receipt_no]);

  return (
    <View style={{ gap: 14 }}>
      {tag ? <Pill label={tag.text} tone={tag.tone} dot={false} /> : null}
      <View style={{ gap: 6 }}>
        {facts.map(([k, v]) => (
          <View key={k} style={styles.kv}>
            <Text variant="sm" color="muted" style={{ width: 150 }}>
              {k}
            </Text>
            <Text variant="sm" weight={600} style={{ flex: 1 }}>
              {v}
            </Text>
          </View>
        ))}
      </View>
      <Hr />
      {a.closed ? (
        <View style={{ gap: 8 }}>
          <Text variant="sm" color="ink2">
            {t('console.people.adm.closedWhy', { reason: a.closed_reason || '—' })}
          </Text>
          <Button
            title={t('console.people.adm.reopen')}
            variant="secondary"
            size="sm"
            style={{ alignSelf: 'flex-start' }}
            loading={run.isPending}
            onPress={() => act(() => peopleApi.close(a.id, { reopen: true }))}
          />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Text variant="h4">{t('console.people.adm.nextStep')}</Text>
          {a.stage === 'enquiry' ? (
            <>
              <Choice
                label={t('console.people.adm.followUp')}
                value={followUp}
                options={(['call_back', 'tour', 'prospectus'] as const).map((k) => ({ value: k, label: t(`console.people.adm.fu.${k}`) }))}
                onChange={setFollowUp}
              />
              <View style={styles.inline}>
                <TextField
                  label={t('console.people.adm.on')}
                  placeholder="2026-10-03"
                  value={followOn}
                  onChangeText={setFollowOn}
                  containerStyle={{ flex: 1 }}
                />
                <Button
                  title={t('console.people.adm.saveFollowUp')}
                  variant="secondary"
                  loading={run.isPending}
                  onPress={() =>
                    act(
                      () => peopleApi.updateApplication(a.id, { follow_up: followUp, follow_up_on: followOn || null }),
                      t('console.people.adm.saved'),
                    )
                  }
                />
              </View>
              <Button
                title={t('console.people.adm.toApplication')}
                icon="arrowRight"
                onPress={moveNext}
                loading={run.isPending}
                style={{ alignSelf: 'flex-start' }}
              />
            </>
          ) : null}
          {a.stage === 'application' ? (
            <>
              <View style={[styles.inline, { alignItems: 'center' }]}>
                <Switch
                  value={a.form_fee_paid}
                  label={t('console.people.adm.formFee')}
                  onChange={(v) => act(() => peopleApi.updateApplication(a.id, { form_fee_paid: v }))}
                />
                <Text variant="sm">{t('console.people.adm.formFee')}</Text>
              </View>
              <View style={styles.inline}>
                <TextField label={t('console.people.adm.docsDue')} value={pending} onChangeText={setPending} containerStyle={{ flex: 1 }} />
                <Button
                  title={t('console.people.adm.save')}
                  variant="secondary"
                  onPress={() =>
                    act(() => peopleApi.updateApplication(a.id, { documents_pending: pending }), t('console.people.adm.saved'))
                  }
                />
              </View>
              <View style={styles.inline}>
                <TextField
                  label={t('console.people.adm.slot')}
                  placeholder="2026-10-01T10:00"
                  value={slot}
                  onChangeText={setSlot}
                  containerStyle={{ flex: 1 }}
                />
                <Button
                  title={t('console.people.adm.bookAndMove')}
                  icon="arrowRight"
                  loading={run.isPending}
                  disabled={!a.form_fee_paid}
                  onPress={() =>
                    act(
                      async () =>
                        slot
                          ? (await peopleApi.updateApplication(a.id, { assessment_at: slot }), peopleApi.move(a.id, 'assessment'))
                          : peopleApi.move(a.id, 'assessment'),
                      t('console.people.adm.moved', { stage: t('console.people.adm.stage.assessment') }),
                    )
                  }
                />
              </View>
              {!a.form_fee_paid ? (
                <Text variant="xs" color="muted">
                  {t('console.people.adm.feeFirst')}
                </Text>
              ) : null}
            </>
          ) : null}
          {a.stage === 'assessment' ? (
            <>
              <View style={styles.inline}>
                <TextField
                  label={t('console.people.adm.slot')}
                  placeholder="2026-10-01T10:00"
                  value={slot}
                  onChangeText={setSlot}
                  containerStyle={{ flex: 1 }}
                />
                <Button
                  title={t('console.people.adm.book')}
                  variant="secondary"
                  onPress={() =>
                    act(() => peopleApi.updateApplication(a.id, { assessment_at: slot || null }), t('console.people.adm.saved'))
                  }
                />
              </View>
              <View style={styles.inline}>
                <TextField
                  label={t('console.people.adm.score')}
                  keyboardType="number-pad"
                  value={score}
                  onChangeText={setScore}
                  containerStyle={{ flex: 1 }}
                />
                <Button
                  title={t('console.people.adm.saveScore')}
                  variant="secondary"
                  onPress={() => act(() => peopleApi.updateApplication(a.id, { assessment_score: score }), t('console.people.adm.saved'))}
                />
              </View>
              <Button
                title={t('console.people.adm.toDocuments')}
                icon="arrowRight"
                onPress={moveNext}
                disabled={a.assessment_score === null}
                loading={run.isPending}
                style={{ alignSelf: 'flex-start' }}
              />
            </>
          ) : null}
          {a.stage === 'documents' ? (
            a.approval_id ? (
              <>
                <Text variant="sm" color="ink2">
                  {t('console.people.adm.waitingYou')}
                </Text>
                <View style={styles.inline}>
                  <Button
                    title={t('console.people.adm.approve')}
                    variant="ok"
                    icon="check"
                    loading={run.isPending}
                    onPress={() => act(() => peopleApi.decide(a.id, 'approve'), t('console.people.adm.approved', { name: a.child }))}
                  />
                  <TextField
                    label={t('console.people.adm.declineWhy')}
                    value={reason}
                    onChangeText={setReason}
                    containerStyle={{ flex: 1 }}
                  />
                  <Button
                    title={t('console.people.adm.decline')}
                    variant="danger"
                    disabled={!reason.trim()}
                    onPress={() =>
                      act(() => peopleApi.decide(a.id, 'decline', reason), t('console.people.adm.declined', { name: a.child }))
                    }
                  />
                </View>
              </>
            ) : (
              <>
                <Text variant="sm" color="ink2">
                  {a.documents_pending
                    ? t('console.people.adm.stillPending', { what: a.documents_pending })
                    : t('console.people.adm.checkDocs')}
                </Text>
                <Button
                  title={t('console.people.adm.verify')}
                  icon="checkCircle"
                  loading={run.isPending}
                  onPress={() => act(() => peopleApi.verify(a.id), t('console.people.adm.sentForApproval'))}
                  style={{ alignSelf: 'flex-start' }}
                />
              </>
            )
          ) : null}
          {a.stage === 'offer' ? (
            <>
              {!a.offer_accepted_on ? (
                <Button
                  title={t('console.people.adm.markAccepted')}
                  variant="secondary"
                  icon="check"
                  style={{ alignSelf: 'flex-start' }}
                  onPress={() => act(() => peopleApi.updateApplication(a.id, { offer_accepted: true }), t('console.people.adm.saved'))}
                />
              ) : null}
              <View style={styles.inline}>
                <TextField
                  label={t('console.people.adm.receiptLabel')}
                  placeholder="SPS-R-25999"
                  value={receipt}
                  onChangeText={setReceipt}
                  containerStyle={{ flex: 1 }}
                />
                <View style={{ gap: 7 }}>
                  <Text variant="xs" color="ink2" weight={600}>
                    {t('console.people.add.class')}
                  </Text>
                  <FilterButton
                    label={t('console.people.add.class')}
                    allLabel={t('console.people.adm.anySection')}
                    value={cls}
                    options={classes.filter((c) => c.grade === a.grade).map((c) => ({ value: c.id, label: c.label }))}
                    onChange={setCls}
                  />
                </View>
              </View>
              <Button
                title={t('console.people.adm.admit')}
                icon="userPlus"
                disabled={!receipt.trim()}
                loading={run.isPending}
                style={{ alignSelf: 'flex-start' }}
                onPress={() =>
                  act(
                    () => peopleApi.admit(a.id, { receipt_no: receipt, class_id: cls || undefined }),
                    t('console.people.adm.admittedToast', { name: a.child }),
                  )
                }
              />
              <Text variant="xs" color="muted">
                {t('console.people.adm.admitNote')}
              </Text>
            </>
          ) : null}
          {a.stage === 'admitted' ? (
            a.student_id ? (
              <Button
                title={t('console.people.adm.openStudent')}
                variant="secondary"
                icon="user"
                style={{ alignSelf: 'flex-start' }}
                onPress={() => {
                  onClose();
                  router.navigate(`/console/students/${a.student_id}` as Href);
                }}
              />
            ) : (
              <Text variant="sm" color="muted">
                {t('console.people.adm.admittedEarlier')}
              </Text>
            )
          ) : null}
          {a.stage !== 'admitted' ? (
            <View style={[styles.inline, { marginTop: 4 }]}>
              {idx > 0 && idx < 4 ? (
                <Button
                  title={t('console.people.adm.back', { stage: t(`console.people.adm.stage.${STAGES[idx - 1]}`) })}
                  variant="ghost"
                  size="sm"
                  onPress={() => act(() => peopleApi.move(a.id, STAGES[idx - 1]))}
                />
              ) : null}
              <View style={{ flex: 1 }} />
              <TextField
                placeholder={t('console.people.adm.closeWhy')}
                value={reason}
                onChangeText={setReason}
                containerStyle={{ width: 220 }}
              />
              <Button
                title={t('console.people.adm.closeApp')}
                variant="ghost"
                size="sm"
                textColor={colors.bad}
                disabled={!reason.trim()}
                onPress={() => act(() => peopleApi.close(a.id, { reason }), t('console.people.adm.closedToast'))}
              />
            </View>
          ) : null}
        </View>
      )}
      <Hr />
      <View style={{ gap: 8 }}>
        <Text variant="h4">{t('console.people.adm.history')}</Text>
        {a.events.map((e) => (
          <View key={e.id} style={{ flexDirection: 'row', gap: 12 }}>
            <Text variant="xs" color="muted" num style={{ width: 128 }}>
              {`${dayMonth(e.at)} · ${clock(e.at)}`}
            </Text>
            <Text variant="xs" color="ink2" style={{ flex: 1 }}>
              {[
                e.action === 'moved' || e.action === 'admitted' || e.action === 'approved'
                  ? t(`console.people.adm.ev.${e.action}`, {
                      from: e.from_stage ? t(`console.people.adm.stage.${e.from_stage}`) : '',
                      to: e.to_stage ? t(`console.people.adm.stage.${e.to_stage}`) : '',
                    })
                  : t(`console.people.adm.ev.${e.action}`),
                e.note,
                e.actor,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kv: { flexDirection: 'row', alignItems: 'flex-start' },
  inline: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
});
