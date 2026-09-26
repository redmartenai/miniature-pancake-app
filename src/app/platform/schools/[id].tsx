import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { CardHead, Col, ConsolePage, Panel, Row } from '@/features/console/Page';
import { platformApi, usePlatformQuery, type Channel, type Method, type SchoolDetail, type Slip } from '@/features/platform/api';
import { CredentialSlip } from '@/features/platform/CredentialSlip';
import { HandoverFields } from '@/features/platform/Handover';
import { formatDate, formatTime, relativeTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Button, Pill, SegmentedControl, Sheet, Text, TextField, useToast } from '@/ui';

type Person = SchoolDetail['people'][number];

/** One school: its people and their sign-in status, credential history, profile, and pause/resume. */
export default function PlatformSchool() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = usePlatformQuery(['school', id], () => platformApi.school(id!), !!id);
  const s = q.data;
  const [slip, setSlip] = useState<Slip>();
  const [reset, setReset] = useState<Person>();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pausing, setPausing] = useState(false);

  const fail = (e: unknown) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger');
  const refresh = (next: SchoolDetail) => {
    client.setQueryData(['platform', 'school', id], next);
    void client.invalidateQueries({ queryKey: ['platform'] });
  };
  const toggle = useMutation({
    mutationFn: () => platformApi.updateSchool(id!, { is_active: !s!.is_active }),
    onSuccess: (next) => {
      refresh(next);
      setPausing(false);
    },
    onError: fail,
  });

  const home = { label: t('platform.area'), href: '/platform' as Href };
  const crumbs = [{ label: t('platform.nav.schools'), href: '/platform/schools' as Href }];

  if (slip) {
    return (
      <ConsolePage title={t('platform.slip.title')} home={home} crumbs={crumbs} subtitle={slip.school.name}>
        <CredentialSlip slip={slip} onDone={() => setSlip(undefined)} />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage
      title={s?.name ?? ''}
      home={home}
      crumbs={crumbs}
      subtitle={s ? `${s.code} · ${[s.city, s.state].filter(Boolean).join(', ')}` : undefined}
      loading={q.isLoading}
      error={q.error}
      onRetry={q.refetch}
      actions={
        s ? (
          <>
            <Pill
              tone={s.is_active ? 'ok' : 'neutral'}
              size="lg"
              label={s.is_active ? t('platform.detail.active') : t('platform.detail.paused')}
            />
            <Button title={t('platform.detail.editProfile')} icon="edit" variant="secondary" onPress={() => setEditing(true)} />
            <Button
              title={s.is_active ? t('platform.detail.pause') : t('platform.detail.resume')}
              icon={s.is_active ? 'lock' : 'refresh'}
              variant={s.is_active ? 'danger' : 'ok'}
              onPress={() => setPausing(true)}
            />
          </>
        ) : null
      }>
      {s ? (
        <Row>
          <Col span={8} gap={20}>
            <Panel>
              <CardHead
                title={t('platform.detail.people')}
                subtitle={t('platform.detail.counts', {
                  students: s.students.toLocaleString('en-IN'),
                  staff: s.staff.toLocaleString('en-IN'),
                  sections: s.sections,
                })}
                right={
                  <Button
                    title={t('platform.detail.addPerson')}
                    icon="userPlus"
                    variant="secondary"
                    size="sm"
                    onPress={() => setAdding(true)}
                  />
                }
              />
              {s.people.map((p, i) => (
                <View key={`${p.id}${p.role}`} style={[styles.person, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
                  <Avatar name={p.name} size={38} seed={p.id} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text variant="sm" weight={700} numberOfLines={1}>
                      {p.name} · {t(`platform.slip.role.${p.role}`)}
                    </Text>
                    <Text variant="xs" color="muted" num>
                      {[p.phone, p.email].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {p.invite_pending ? <Pill tone="info" label={t('platform.detail.invitePending')} /> : null}
                  <Pill
                    tone={p.status === 'active' ? 'ok' : p.status === 'temporary_password' ? 'warn' : 'neutral'}
                    label={
                      p.status === 'active'
                        ? t('platform.detail.status.active', { when: p.last_sign_in ? relativeTime(p.last_sign_in) : '' })
                        : t(`platform.detail.status.${p.status}`)
                    }
                  />
                  <Button title={t('platform.detail.reset')} icon="key" variant="ghost" size="sm" onPress={() => setReset(p)} />
                </View>
              ))}
            </Panel>
            <Panel>
              <CardHead title={t('platform.detail.history')} />
              {s.history.length === 0 ? (
                <Text variant="sm" color="muted">
                  {t('platform.detail.noHistory')}
                </Text>
              ) : (
                s.history.map((h, i) => (
                  <View key={h.id} style={[styles.history, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
                    <Text variant="xs" color="muted" num style={{ width: 150 }}>
                      {formatDate(h.at, { year: true })}, {formatTime(h.at)}
                    </Text>
                    <Text variant="sm" style={{ flex: 1 }}>
                      <Text variant="sm" weight={700}>
                        {t(`platform.detail.reason.${h.reason}`, { defaultValue: h.reason })}
                      </Text>
                      {` · ${h.name} (${t(`platform.slip.role.${h.role}`, { defaultValue: h.role })}) · ${t(`platform.detail.method.${h.method}`)}`}
                    </Text>
                    {h.by ? (
                      <Text variant="xs" color="muted">
                        {t('platform.detail.by', { name: h.by })}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </Panel>
          </Col>
          <Col span={4} gap={20}>
            <Panel gap={10}>
              <CardHead title={t('platform.detail.profile')} />
              <Fact label={t('platform.detail.org')} value={s.organization} />
              <Fact label={t('platform.detail.location')} value={[s.city, s.state].filter(Boolean).join(', ')} />
              <Fact label={t('platform.detail.campus')} value={s.campus} />
              <Fact label={t('platform.detail.address')} value={s.address} />
              <Fact label={t('platform.detail.office')} value={s.office_phone} />
              <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4 }}>
                <View style={[styles.swatch, { backgroundColor: s.primary_color }]} />
                <View style={[styles.swatch, { backgroundColor: s.accent_color }]} />
              </View>
            </Panel>
            <Panel gap={10}>
              <CardHead title={t('platform.detail.year')} />
              {s.year ? (
                <>
                  <Text variant="sm" weight={700}>
                    {s.year.name} · {formatDate(s.year.starts_on, { year: true })} – {formatDate(s.year.ends_on, { year: true })}
                  </Text>
                  {s.terms.map((term) => (
                    <Text key={term.name} variant="xs" color="muted">
                      {term.name}: {formatDate(term.starts_on)} – {formatDate(term.ends_on, { year: true })}
                    </Text>
                  ))}
                </>
              ) : (
                <Text variant="sm" color="muted">
                  {t('platform.detail.noYear')}
                </Text>
              )}
            </Panel>
            <Panel gap={8}>
              <CardHead title={t('platform.detail.structure')} />
              {s.grades.map((g) => (
                <View key={g.grade} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="sm" weight={600}>
                    {g.grade}
                  </Text>
                  <Text variant="sm" color="muted">
                    {g.sections.join(' · ')}
                  </Text>
                </View>
              ))}
            </Panel>
          </Col>
        </Row>
      ) : null}

      {s ? (
        <>
          <Sheet
            visible={pausing}
            onClose={() => setPausing(false)}
            title={s.is_active ? t('platform.detail.pauseTitle', { name: s.name }) : t('platform.detail.resumeTitle', { name: s.name })}
            message={s.is_active ? t('platform.detail.pauseBody') : t('platform.detail.resumeBody')}>
            <View style={styles.sheetActions}>
              <Button title={t('platform.detail.cancel')} variant="secondary" onPress={() => setPausing(false)} />
              <Button
                title={s.is_active ? t('platform.detail.pause') : t('platform.detail.resume')}
                variant={s.is_active ? 'danger' : 'ok'}
                loading={toggle.isPending}
                onPress={() => toggle.mutate()}
              />
            </View>
          </Sheet>
          {reset ? (
            <ResetSheet
              person={reset}
              onClose={() => setReset(undefined)}
              onIssue={async (method, send) => {
                try {
                  const res = await platformApi.resetCredentials(id!, reset.id, { method, send });
                  refresh(res.school);
                  setReset(undefined);
                  setSlip(res.slip);
                } catch (e) {
                  fail(e);
                }
              }}
            />
          ) : null}
          {adding ? (
            <AddPersonSheet
              onClose={() => setAdding(false)}
              onAdd={async (body) => {
                try {
                  const res = await platformApi.addPerson(id!, body);
                  refresh(res.school);
                  setAdding(false);
                  setSlip(res.slip);
                } catch (e) {
                  fail(e);
                }
              }}
            />
          ) : null}
          {editing ? (
            <EditSheet
              school={s}
              onClose={() => setEditing(false)}
              onSave={async (patch) => {
                try {
                  refresh(await platformApi.updateSchool(id!, patch));
                  setEditing(false);
                } catch (e) {
                  fail(e);
                }
              }}
            />
          ) : null}
        </>
      ) : null}
    </ConsolePage>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Text variant="xs" color="muted" weight={600} style={{ width: 96 }}>
        {label}
      </Text>
      <Text variant="sm" style={{ flex: 1 }}>
        {value || '—'}
      </Text>
    </View>
  );
}

function ResetSheet({
  person,
  onClose,
  onIssue,
}: {
  person: Person;
  onClose: () => void;
  onIssue: (method: Method, send: Channel[]) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [method, setMethod] = useState<Method>('password');
  const [send, setSend] = useState<Channel[]>([]);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet
      visible
      onClose={onClose}
      title={t('platform.detail.resetTitle', { name: person.name })}
      message={t('platform.detail.resetBody')}>
      <HandoverFields method={method} setMethod={setMethod} send={send} setSend={setSend} />
      <View style={styles.sheetActions}>
        <Button title={t('platform.detail.cancel')} variant="secondary" onPress={onClose} />
        <Button
          title={t('platform.detail.issue')}
          icon="key"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            await onIssue(method, send);
            setBusy(false);
          }}
        />
      </View>
    </Sheet>
  );
}

function AddPersonSheet({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (body: {
    name: string;
    phone: string;
    email: string;
    role: 'principal' | 'admin';
    method: Method;
    send: Channel[];
  }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [person, setPerson] = useState({ name: '', phone: '', email: '' });
  const [role, setRole] = useState<'principal' | 'admin'>('admin');
  const [method, setMethod] = useState<Method>('password');
  const [send, setSend] = useState<Channel[]>([]);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet visible onClose={onClose} title={t('platform.detail.addPerson')}>
      <SegmentedControl
        value={role}
        onChange={setRole}
        options={(['principal', 'admin'] as const).map((r) => ({ value: r, label: t(`platform.slip.role.${r}`) }))}
      />
      <TextField label={t('platform.wizard.fullName')} value={person.name} onChangeText={(name) => setPerson({ ...person, name })} />
      <TextField
        label={t('platform.wizard.phone')}
        prefix="+91"
        keyboardType="phone-pad"
        value={person.phone}
        onChangeText={(phone) => setPerson({ ...person, phone })}
      />
      <TextField
        label={t('platform.wizard.email')}
        autoCapitalize="none"
        value={person.email}
        onChangeText={(email) => setPerson({ ...person, email })}
      />
      <HandoverFields method={method} setMethod={setMethod} send={send} setSend={setSend} />
      <View style={styles.sheetActions}>
        <Button title={t('platform.detail.cancel')} variant="secondary" onPress={onClose} />
        <Button
          title={t('platform.detail.addPerson')}
          icon="userPlus"
          loading={busy}
          disabled={!person.name.trim() || !person.phone.trim()}
          onPress={async () => {
            setBusy(true);
            await onAdd({ ...person, role, method, send });
            setBusy(false);
          }}
        />
      </View>
    </Sheet>
  );
}

function EditSheet({
  school,
  onClose,
  onSave,
}: {
  school: SchoolDetail;
  onClose: () => void;
  onSave: (patch: Partial<SchoolDetail>) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: school.name,
    city: school.city,
    state: school.state,
    campus: school.campus ?? '',
    address: school.address ?? '',
    office_phone: school.office_phone ?? '',
    primary_color: school.primary_color,
    accent_color: school.accent_color,
  });
  const [busy, setBusy] = useState(false);
  const field = (key: keyof typeof form, label: string) => (
    <TextField label={label} value={form[key]} onChangeText={(v) => setForm({ ...form, [key]: v })} />
  );
  return (
    <Sheet visible onClose={onClose} title={t('platform.detail.editProfile')}>
      {field('name', t('platform.wizard.name'))}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>{field('city', t('platform.wizard.city'))}</View>
        <View style={{ flex: 1 }}>{field('state', t('platform.wizard.state'))}</View>
      </View>
      {field('campus', t('platform.wizard.campus'))}
      {field('address', t('platform.wizard.address'))}
      {field('office_phone', t('platform.wizard.officePhone'))}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>{field('primary_color', t('platform.wizard.primary'))}</View>
        <View style={{ flex: 1 }}>{field('accent_color', t('platform.wizard.accent'))}</View>
      </View>
      <View style={styles.sheetActions}>
        <Button title={t('platform.detail.cancel')} variant="secondary" onPress={onClose} />
        <Button
          title={t('platform.detail.save')}
          loading={busy}
          onPress={async () => {
            setBusy(true);
            await onSave(form);
            setBusy(false);
          }}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  history: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  swatch: { width: 28, height: 28, borderRadius: 8 },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
});
