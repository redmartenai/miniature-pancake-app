import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Fragment, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { useConsoleContext } from '@/features/console/api';
import { Col, ConsolePage, Row } from '@/features/console/Page';
import { downloadFile } from '@/lib/download';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Avatar, Button, Card, Hr, Icon, ICON_SIZE, Pill, pointer, Text, TextField, useToast, Vr, type IconName } from '@/ui';

import { peopleApi, useProfile, type Profile } from './api';
import { Choice, clock, dayMonth, Dialog, errorText, ToolbarButton } from './kit';
import { AcademicsCard, AttendanceCard, FeesCard, HomeworkCard, InteractionsCard, RemarksCard, TransportCard } from './ProfileCards';
import { AcademicsTab, AttendanceTab, DocumentsTab, FeesTab, HomeworkTab, RemarksTab, TransportTab } from './ProfileTabs';

type Tab = 'overview' | 'attendance' | 'academics' | 'homework' | 'remarks' | 'fees' | 'transport' | 'documents';
const TABS: Tab[] = ['overview', 'attendance', 'academics', 'homework', 'remarks', 'fees', 'transport', 'documents'];
const HOUSE: Record<string, 'c1' | 'c2' | 'c3' | 'c4'> = { Teal: 'c3', Crimson: 'c4', Amber: 'c2', Indigo: 'c1' };

/** Console: one student's record (PStudentProfile). */
export function ProfilePage() {
  const { t } = useTranslation();
  const toast = useToast();
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const id = params.id ?? '';
  const q = useProfile(id);
  const ctx = useConsoleContext();
  const today = ctx.data?.today ?? new Date().toISOString().slice(0, 10);
  const [tab, setTabState] = useState<Tab>(TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'overview');
  const [messaging, setMessaging] = useState(false);
  const [remarking, setRemarking] = useState(false);
  const [printing, setPrinting] = useState(false);
  const p = q.data;
  const setTab = (next: Tab) => {
    setTabState(next);
    router.setParams({ tab: next === 'overview' ? undefined : next });
  };

  const print = async () => {
    if (!p) return;
    setPrinting(true);
    try {
      await downloadFile(`/console/students/${p.id}/report-card.pdf`, `${p.name.replace(/ /g, '_')}_report_card.pdf`);
      toast(t('console.people.profile.printed'));
    } catch {
      toast(t('console.people.students.printFailed'), 'danger');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <ConsolePage
      title={p?.name ?? t('console.people.students.title')}
      loading={q.isLoading}
      error={q.error}
      onRetry={q.refetch}
      gap={24}
      head={p ? <Header p={p} onPrint={print} printing={printing} onMessage={() => setMessaging(true)} /> : <Crumbs name="" />}>
      {p ? (
        <>
          <TabBar p={p} tab={tab} onChange={setTab} />
          {tab === 'overview' ? (
            <>
              <Row gap={20} align="stretch">
                <Col span={5} style={{ flexDirection: 'row' }}>
                  <AttendanceCard p={p} today={today} onFullLog={() => setTab('attendance')} />
                </Col>
                <Col span={7} style={{ flexDirection: 'row' }}>
                  <AcademicsCard p={p} />
                </Col>
              </Row>
              <Row gap={20} align="stretch">
                <Col span={4} style={{ flexDirection: 'row' }}>
                  <RemarksCard p={p} onAdd={() => setRemarking(true)} onAll={() => setTab('remarks')} />
                </Col>
                <Col span={4} style={{ flexDirection: 'row' }}>
                  <FeesCard p={p} onLedger={() => setTab('fees')} />
                </Col>
                <Col span={4} style={{ flexDirection: 'row' }}>
                  <HomeworkCard p={p} />
                </Col>
              </Row>
              <Row gap={20} align="stretch">
                <Col span={8} style={{ flexDirection: 'row' }}>
                  <InteractionsCard p={p} onOpen={() => router.navigate('/console/communication?tab=messages' as Href)} />
                </Col>
                <Col span={4} style={{ flexDirection: 'row' }}>
                  <TransportCard p={p} onTrack={() => router.navigate('/console/transport' as Href)} />
                </Col>
              </Row>
            </>
          ) : null}
          {tab === 'attendance' ? <AttendanceTab p={p} today={today} /> : null}
          {tab === 'academics' ? <AcademicsTab p={p} /> : null}
          {tab === 'homework' ? <HomeworkTab p={p} /> : null}
          {tab === 'remarks' ? <RemarksTab p={p} onAdd={() => setRemarking(true)} /> : null}
          {tab === 'fees' ? <FeesTab p={p} /> : null}
          {tab === 'transport' ? <TransportTab p={p} onTrack={() => router.navigate('/console/transport' as Href)} /> : null}
          {tab === 'documents' ? <DocumentsTab p={p} /> : null}
          {messaging ? <MessageDialog p={p} onClose={() => setMessaging(false)} /> : null}
          {remarking ? <RemarkDialog p={p} onClose={() => setRemarking(false)} /> : null}
        </>
      ) : null}
    </ConsolePage>
  );
}

function Crumbs({ name }: { name: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const trail: { label: string; href?: Href }[] = [
    { label: t('console.shell.crumbHome'), href: '/console' as Href },
    { label: t('console.people.students.title'), href: '/console/students' as Href },
  ];
  return (
    <View style={styles.crumbs} accessibilityLabel={t('console.shell.breadcrumb')}>
      {trail.map((c) => (
        <Fragment key={c.label}>
          <Pressable accessibilityRole="link" onPress={() => router.navigate(c.href!)} style={pointer}>
            <Text style={[styles.crumb, { color: colors.muted }]}>{c.label}</Text>
          </Pressable>
          <Icon name="chevronRight" size={12} rawColor={colors.faint} />
        </Fragment>
      ))}
      <Text style={[styles.crumb, { color: colors.ink2 }]} aria-current="page">
        {name}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------ header */

function Header({ p, onPrint, printing, onMessage }: { p: Profile; onPrint: () => void; printing: boolean; onMessage: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const g = p.guardians.find((x) => x.is_primary) ?? p.guardians[0];
  const sib = p.siblings[0];
  const status: { label: string; tone: 'ok' | 'warn' | 'bad' | 'neutral' } =
    p.today.state === 'in_school'
      ? {
          label: p.today.since ? t('console.people.profile.inSince', { time: clock(p.today.since) }) : t('console.people.profile.inSchool'),
          tone: 'ok',
        }
      : p.today.state === 'late'
        ? {
            label: p.today.since ? t('console.people.profile.lateSince', { time: clock(p.today.since) }) : t('console.people.profile.late'),
            tone: 'warn',
          }
        : p.today.state === 'absent'
          ? { label: t('console.people.profile.absent'), tone: 'bad' }
          : { label: t('console.people.profile.notMarked'), tone: 'neutral' };
  const house = HOUSE[p.house];
  const facts: { label: string; value: string; sub: string }[] = [
    {
      label: t('console.people.profile.dob'),
      value: p.date_of_birth
        ? new Date(`${p.date_of_birth}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—',
      sub: p.age !== null ? t('console.people.profile.age', { count: p.age }) : '',
    },
    {
      label: t('console.people.profile.classTeacher'),
      value: p.class_teacher?.name ?? '—',
      sub: [p.class_teacher?.subject, p.class_teacher?.employee_id].filter(Boolean).join(' · '),
    },
    {
      label: t('console.people.profile.parent'),
      value: g ? `${g.name} · ${t(`console.people.relationship.${g.relationship}`, { defaultValue: g.relationship }).toLowerCase()}` : '—',
      sub: g ? `${g.phone_masked}${g.is_primary ? ` · ${t('console.people.profile.primary')}` : ''}` : '',
    },
    {
      label: t('console.people.profile.sibling', { count: Math.max(1, p.siblings.length) }),
      value: sib ? `${sib.name} · ${sib.class}` : t('console.people.profile.noSibling'),
      sub: sib
        ? [t('console.people.profile.roll', { n: String(sib.roll_no).padStart(2, '0') }), sib.class_teacher].filter(Boolean).join(' · ')
        : '',
    },
    {
      label: t('console.people.profile.transport'),
      value: p.transport ? [p.transport.route.name, p.transport.vehicle].filter(Boolean).join(' · ') : t('console.people.students.walks'),
      sub: p.transport ? t('console.people.profile.stop', { stop: p.transport.stop }) : '',
    },
  ];
  return (
    <View style={{ gap: 12 }}>
      <Crumbs name={p.name} />
      <Card pad={0} style={{ paddingTop: 24, paddingHorizontal: 26, paddingBottom: 22, gap: 20 }}>
        <View style={{ flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}>
          <Avatar initials={p.initials} size="xl" tone={1} />
          <View style={{ flex: 1, minWidth: 0, gap: 8, paddingTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Text variant="h1" accessibilityRole="header">
                {p.name}
              </Text>
              <Pill label={status.label} tone={status.tone} />
              {house ? (
                <View style={[styles.house, { borderColor: colors.lineStrong }]}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors[house] }} />
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.ink2 }}>
                    {t('console.people.profile.house', { house: p.house })}
                  </Text>
                </View>
              ) : null}
              {!p.is_active ? <Pill label={t('console.people.profile.inactive')} tone="neutral" /> : null}
            </View>
            <Text variant="lg" color="ink2">
              {t('console.people.profile.line', { cls: p.class.label, roll: p.roll_no })}
              <Text variant="lg" weight={600} num>
                {p.admission_no}
              </Text>
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <ToolbarButton
                icon="print"
                label={t('console.people.profile.print')}
                onPress={onPrint}
                busy={printing}
                disabled={!p.academics.report_exam_id}
                hint={!p.academics.report_exam_id ? t('console.people.profile.noResults') : undefined}
              />
              <ToolbarButton
                icon="phone"
                label={t('console.people.profile.call')}
                disabled={!g}
                hint={g ? t('console.people.profile.callHint', { name: g.name }) : t('console.people.profile.noGuardian')}
                onPress={() => g && void Linking.openURL(`tel:${g.phone}`)}
              />
              <ToolbarButton icon="chat" label={t('console.people.profile.message')} primary disabled={!g} onPress={onMessage} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="shield" size={12} rawColor={colors.muted} />
              <Text variant="xs" color="muted">
                {t('console.people.profile.auditNote')}
              </Text>
            </View>
          </View>
        </View>
        <Hr />
        <View style={{ flexDirection: 'row', alignItems: 'stretch', marginHorizontal: -20 }}>
          {facts.map((f, i) => (
            <Fragment key={f.label}>
              {i ? <Vr /> : null}
              <View style={{ flex: 1, minWidth: 0, gap: 4, paddingHorizontal: 20 }}>
                <Text variant="eyebrow" color="muted">
                  {f.label}
                </Text>
                <Text variant="sm" weight={700} numberOfLines={1}>
                  {f.value}
                </Text>
                <Text variant="xs" color="muted" numberOfLines={1}>
                  {f.sub}
                </Text>
              </View>
            </Fragment>
          ))}
        </View>
      </Card>
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------ tabs */

function TabBar({ p, tab, onChange }: { p: Profile; tab: Tab; onChange: (t: Tab) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const extra: Partial<Record<Tab, ReactNode>> = {
    homework: <Count n={p.counts.homework} />,
    remarks: <Count n={p.counts.remarks} />,
    documents: <Count n={p.counts.documents} />,
    fees:
      p.fees.status.status === 'due' || p.fees.status.status === 'overdue' ? (
        <View style={[styles.tabPill, { backgroundColor: p.fees.status.status === 'overdue' ? colors.badSoft : colors.warnSoft }]}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: p.fees.status.status === 'overdue' ? colors.bad : colors.warn }}>
            {p.fees.status.status === 'overdue'
              ? t('console.people.fee.overdue')
              : t('console.people.fee.due', { date: dayMonth(p.fees.status.due_on!) })}
          </Text>
        </View>
      ) : null,
  };
  const icons: Partial<Record<Tab, IconName>> = { overview: 'grid' };
  return (
    <View style={[styles.tabs, { borderBottomColor: colors.line }]} accessibilityRole="tablist">
      {TABS.map((k) => {
        const on = k === tab;
        return (
          <Pressable
            key={k}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(k)}
            style={[styles.tab, pointer, { borderBottomColor: on ? colors.brand : 'transparent' }]}>
            {icons[k] ? <Icon name={icons[k]!} size={ICON_SIZE.sm} rawColor={on ? colors.ink : colors.muted} /> : null}
            <Text style={[styles.tabLabel, { color: on ? colors.ink : colors.muted }]}>{t(`console.people.profile.tab.${k}`)}</Text>
            {extra[k]}
          </Pressable>
        );
      })}
    </View>
  );
}

function Count({ n }: { n: number }) {
  return n ? (
    <Text variant="xs" color="muted" num>
      {n}
    </Text>
  ) : null;
}

/* ------------------------------------------------------------------------------------------------ dialogs */

function MessageDialog({ p, onClose }: { p: Profile; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [to, setTo] = useState(p.guardians.find((g) => g.is_primary)?.id ?? p.guardians[0]?.id ?? '');
  const [body, setBody] = useState('');
  const send = useMutation({
    mutationFn: () => peopleApi.messageParent(p.id, body, to),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['console'] });
      toast(t('console.people.profile.sentTo', { name: res.to }));
      onClose();
    },
    onError: (e) => toast(errorText(e, t('console.people.failed')), 'danger'),
  });
  return (
    <Dialog
      visible
      onClose={onClose}
      title={t('console.people.profile.message')}
      subtitle={t('console.people.profile.messageSub', { name: p.name })}
      footer={
        <>
          <Button
            title={t('console.people.profile.openChats')}
            variant="ghost"
            onPress={() => router.navigate('/console/communication?tab=messages' as Href)}
          />
          <Button
            title={t('console.people.message.send')}
            icon="send"
            loading={send.isPending}
            disabled={!body.trim() || !to}
            onPress={() => send.mutate()}
          />
        </>
      }>
      {p.guardians.length > 1 ? (
        <Choice
          label={t('console.people.profile.to')}
          value={to}
          options={p.guardians.map((g) => ({
            value: g.id,
            label: `${g.name} · ${t(`console.people.relationship.${g.relationship}`, { defaultValue: g.relationship })}`,
          }))}
          onChange={setTo}
        />
      ) : (
        <Text variant="sm" color="ink2">
          {t('console.people.profile.toOne', { name: p.guardians[0]?.name ?? '', phone: p.guardians[0]?.phone_masked ?? '' })}
        </Text>
      )}
      <TextField
        label={t('console.people.message.body')}
        multiline
        value={body}
        onChangeText={setBody}
        autoFocus
        placeholder={t('console.people.message.placeholder')}
      />
    </Dialog>
  );
}

function RemarkDialog({ p, onClose }: { p: Profile; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [tone, setTone] = useState<'positive' | 'concern' | 'info'>('positive');
  const [visibility, setVisibility] = useState<'family' | 'staff'>('family');
  const save = useMutation({
    mutationFn: () => peopleApi.addRemark(p.id, { body, tone, visibility }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['console'] });
      toast(t('console.people.profile.remarks.added'));
      onClose();
    },
    onError: (e) => toast(errorText(e, t('console.people.failed')), 'danger'),
  });
  return (
    <Dialog
      visible
      onClose={onClose}
      title={t('console.people.profile.remarks.addTitle', { name: p.name })}
      footer={
        <>
          <Button title={t('console.people.cancel')} variant="secondary" onPress={onClose} />
          <Button
            title={t('console.people.profile.remarks.save')}
            loading={save.isPending}
            disabled={body.trim().length < 3}
            onPress={() => save.mutate()}
          />
        </>
      }>
      <Choice
        label={t('console.people.profile.remarks.kind')}
        value={tone}
        options={(['positive', 'concern', 'info'] as const).map((k) => ({
          value: k,
          label: t(`console.people.profile.remarks.tone.${k}`),
        }))}
        onChange={setTone}
      />
      <TextField label={t('console.people.profile.remarks.body')} multiline value={body} onChangeText={setBody} autoFocus />
      <Choice
        label={t('console.people.profile.remarks.visibility')}
        value={visibility}
        options={[
          { value: 'family', label: t('console.people.profile.remarks.family') },
          { value: 'staff', label: t('console.people.profile.remarks.staff') },
        ]}
        onChange={setVisibility}
      />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  crumbs: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  crumb: { fontFamily: fonts.semibold, fontSize: 12.5 },
  house: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 24, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  tabs: { flexDirection: 'row', gap: 26, borderBottomWidth: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: 2, marginBottom: -1 },
  tabLabel: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 17 },
  tabPill: { height: 20, paddingHorizontal: 8, borderRadius: 999, justifyContent: 'center' },
});
