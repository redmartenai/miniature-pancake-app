import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useConsoleQuery } from '@/features/console/api';
import { CardHead, Panel } from '@/features/console/Page';
import { DataTable, Pager, TableFoot } from '@/features/console/Table';
import { formatDate, formatTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Button, DateField, Icon, IconButton, Pill, Search, Switch, Text, TextField, TileIcon, useToast, type IconName } from '@/ui';

import { adminApi, type AuditEntry, type Holiday, type SettingsOverview, type Term } from '../api';
import { Dropdown } from '../Overlay';

function useSaved() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  return {
    onSuccess: () => {
      toast(t('console.admin.settings.saved'));
      qc.invalidateQueries({ queryKey: ['console'] });
    },
  };
}

function fieldError(error: unknown, field: string): string | undefined {
  return error instanceof ApiError ? error.fieldMessage(field) : undefined;
}

function SectionHead({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <CardHead
      title={
        <View style={{ gap: 2 }}>
          <Text variant="h2" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="sm" color="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
      }
      right={right}
    />
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

function Half({ children }: { children: ReactNode }) {
  return <View style={styles.half}>{children}</View>;
}

/* ------------------------------------------------------------------ profile */

export function ProfileSection({ data }: { data: SettingsOverview }) {
  const { t } = useTranslation();
  const p = data.profile;
  const [form, setForm] = useState(p);
  useEffect(() => setForm(p), [p]);
  const save = useMutation({ mutationFn: () => adminApi.saveProfile(form), ...useSaved() });
  const set = (k: keyof typeof form) => (v: string) => setForm({ ...form, [k]: v });
  const ro = !data.can_edit;
  const f = (key: keyof typeof form, label: string, extra: object = {}) => (
    <TextField
      label={label}
      value={String(form[key] ?? '')}
      onChangeText={set(key)}
      editable={!ro}
      error={fieldError(save.error, key)}
      {...extra}
    />
  );
  return (
    <Panel pad={22} gap={18}>
      <SectionHead title={t('console.admin.settings.profile.title')} subtitle={t('console.admin.settings.profile.subtitle')} />
      <Grid>
        <Half>{f('name', t('console.admin.settings.profile.name'))}</Half>
        <Half>{f('short_name', t('console.admin.settings.profile.shortName'))}</Half>
        <Half>
          <TextField
            label={t('console.admin.settings.profile.code')}
            value={p.code}
            editable={false}
            hint={t('console.admin.settings.profile.codeHint')}
          />
        </Half>
        <Half>{f('campus', t('console.admin.settings.profile.campus'))}</Half>
      </Grid>
      {f('address', t('console.admin.settings.profile.address'))}
      <Grid>
        <Half>{f('city', t('console.admin.settings.profile.city'))}</Half>
        <Half>{f('state', t('console.admin.settings.profile.state'))}</Half>
        <Half>
          <TextField
            label={t('console.admin.settings.profile.office')}
            value={form.contacts.office}
            onChangeText={(v) => setForm({ ...form, contacts: { ...form.contacts, office: v } })}
            editable={!ro}
            keyboardType="phone-pad"
            error={fieldError(save.error, 'contacts.office')}
          />
        </Half>
        <Half>
          <TextField
            label={t('console.admin.settings.profile.transport')}
            value={form.contacts.transport}
            onChangeText={(v) => setForm({ ...form, contacts: { ...form.contacts, transport: v } })}
            editable={!ro}
            keyboardType="phone-pad"
            error={fieldError(save.error, 'contacts.transport')}
          />
        </Half>
        <Half>{f('email', t('console.admin.settings.profile.email'), { keyboardType: 'email-address', autoCapitalize: 'none' })}</Half>
        <Half>{f('website', t('console.admin.settings.profile.website'), { autoCapitalize: 'none' })}</Half>
      </Grid>
      {f('logo_url', t('console.admin.settings.profile.logo'), {
        hint: t('console.admin.settings.profile.logoHint'),
        autoCapitalize: 'none',
      })}
      {!ro ? (
        <View style={styles.actions}>
          <Button title={t('console.admin.settings.profile.save')} icon="check" loading={save.isPending} onPress={() => save.mutate()} />
        </View>
      ) : null}
    </Panel>
  );
}

/* ----------------------------------------------------------------- calendar */

export function CalendarSection({ data }: { data: SettingsOverview }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const cal = data.calendar;
  const [terms, setTerms] = useState<Term[]>(cal.terms);
  const [holidays, setHolidays] = useState<Holiday[]>(cal.holidays);
  useEffect(() => {
    setTerms(cal.terms);
    setHolidays(cal.holidays);
  }, [cal]);
  const save = useMutation({ mutationFn: () => adminApi.saveCalendar({ terms, holidays }), ...useSaved() });
  const ro = !data.can_edit;
  const today = new Date().toISOString().slice(0, 10);
  const err = save.error instanceof ApiError ? save.error.fieldMessage() : undefined;
  return (
    <Panel pad={22} gap={18}>
      <SectionHead
        title={t('console.admin.settings.calendar.title')}
        subtitle={t('console.admin.settings.calendar.subtitle', { year: cal.academic_year?.name ?? '', cutoff: cal.attendance_cutoff })}
      />
      <Text variant="h4">{t('console.admin.settings.calendar.terms')}</Text>
      {terms.map((term, i) => (
        <View key={i} style={[styles.row, { gap: 12, alignItems: 'flex-end' }]}>
          <View style={{ flex: 1.2 }}>
            <TextField
              label={t('console.admin.settings.calendar.termName')}
              value={term.name}
              editable={!ro}
              onChangeText={(v) => setTerms(terms.map((x, j) => (j === i ? { ...x, name: v } : x)))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateField
              label={t('console.admin.settings.calendar.starts')}
              value={term.starts_on}
              sundays
              withYear
              onChange={(v) => !ro && setTerms(terms.map((x, j) => (j === i ? { ...x, starts_on: v } : x)))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateField
              label={t('console.admin.settings.calendar.ends')}
              value={term.ends_on}
              sundays
              withYear
              onChange={(v) => !ro && setTerms(terms.map((x, j) => (j === i ? { ...x, ends_on: v } : x)))}
            />
          </View>
          {!ro ? (
            <IconButton
              icon="close"
              variant="bare"
              label={t('console.admin.settings.calendar.remove', { name: term.name })}
              onPress={() => setTerms(terms.filter((_, j) => j !== i))}
            />
          ) : null}
        </View>
      ))}
      {!ro ? (
        <View style={styles.row}>
          <Button
            title={t('console.admin.settings.calendar.addTerm')}
            icon="plus"
            variant="ghost"
            size="sm"
            onPress={() => setTerms([...terms, { name: `Term ${terms.length + 1}`, starts_on: today, ends_on: today }])}
          />
        </View>
      ) : null}

      <View style={[styles.row, { justifyContent: 'space-between', paddingTop: 14, borderTopWidth: 1, borderColor: colors.line }]}>
        <Text variant="h4">{t('console.admin.settings.calendar.holidays')}</Text>
        <Text variant="xs" color="muted">
          {t('console.admin.settings.calendar.holidaysSub', { count: holidays.filter((h) => h.date >= today).length })}
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        {holidays.map((h, i) => (
          <View key={i} style={[styles.row, { gap: 12, alignItems: 'center', opacity: h.date < today ? 0.6 : 1 }]}>
            <View style={{ flex: 1 }}>
              <DateField
                value={h.date}
                withYear
                onChange={(v) => !ro && setHolidays(holidays.map((x, j) => (j === i ? { ...x, date: v } : x)))}
              />
            </View>
            <View style={{ flex: 1.6 }}>
              <TextField
                value={h.name}
                editable={!ro}
                onChangeText={(v) => setHolidays(holidays.map((x, j) => (j === i ? { ...x, name: v } : x)))}
              />
            </View>
            {!ro ? (
              <IconButton
                icon="close"
                variant="bare"
                label={t('console.admin.settings.calendar.remove', { name: h.name })}
                onPress={() => setHolidays(holidays.filter((_, j) => j !== i))}
              />
            ) : null}
          </View>
        ))}
      </View>
      {err ? (
        <Text variant="sm" color="bad">
          {err}
        </Text>
      ) : null}
      {!ro ? (
        <View style={[styles.actions, { justifyContent: 'space-between' }]}>
          <Button
            title={t('console.admin.settings.calendar.addHoliday')}
            icon="plus"
            variant="ghost"
            size="sm"
            onPress={() => setHolidays([...holidays, { date: today, name: '' }])}
          />
          <Button title={t('console.admin.settings.calendar.save')} icon="check" loading={save.isPending} onPress={() => save.mutate()} />
        </View>
      ) : null}
    </Panel>
  );
}

/* ------------------------------------------------------------ notifications */

function hours() {
  const out: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++)
    for (const m of ['00', '30']) {
      const v = `${String(h).padStart(2, '0')}:${m}`;
      const hh = h % 12 || 12;
      out.push({ value: v, label: `${hh}:${m} ${h < 12 ? 'AM' : 'PM'}` });
    }
  return out;
}

export function NotificationsSection({ data }: { data: SettingsOverview }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const n = data.notifications;
  const [qh, setQh] = useState<[string, string]>(n.quiet_hours);
  const [template, setTemplate] = useState(n.templates.absence);
  const [alerts, setAlerts] = useState(n.absence_alerts);
  useEffect(() => {
    setQh(n.quiet_hours);
    setTemplate(n.templates.absence);
    setAlerts(n.absence_alerts);
  }, [n]);
  const save = useMutation({
    mutationFn: () => adminApi.saveNotifications({ quiet_hours: qh, absence_template: template, absence_alerts: alerts }),
    ...useSaved(),
  });
  const ro = !data.can_edit;
  const opts = hours();
  return (
    <Panel pad={22} gap={18}>
      <SectionHead title={t('console.admin.settings.notifications.title')} subtitle={t('console.admin.settings.notifications.subtitle')} />
      <Text variant="h4">{t('console.admin.settings.notifications.channels')}</Text>
      <View>
        {n.channels.map((c, i) => {
          const builtIn = c.key === 'in_app';
          const note = c.connected
            ? null
            : c.key === 'push'
              ? t('console.admin.settings.notifications.pushOff')
              : t('console.admin.settings.notifications.notConnectedNote');
          return (
            <View key={c.key} style={[styles.row, styles.listRow, { borderTopWidth: i ? 1 : 0, borderColor: colors.line }]}>
              <TileIcon icon={CHANNEL_ICON[c.key]} size="sm" tone={c.connected ? 'ok' : 'neutral'} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="sm" weight={700}>
                  {t(`console.admin.settings.notifications.${c.key}`)}
                </Text>
                {note ? (
                  <Text variant="xs" color="muted">
                    {note}
                  </Text>
                ) : null}
              </View>
              <Pill
                label={
                  builtIn
                    ? t('console.admin.settings.notifications.builtIn')
                    : c.connected
                      ? t('console.admin.settings.notifications.connected')
                      : t('console.admin.settings.notifications.notConnected')
                }
                tone={c.connected ? 'ok' : 'neutral'}
              />
            </View>
          );
        })}
      </View>
      <View style={[styles.sep, { borderColor: colors.line }]} />
      <View style={{ gap: 4 }}>
        <Text variant="h4">{t('console.admin.settings.notifications.quietHours')}</Text>
        <Text variant="xs" color="muted">
          {t('console.admin.settings.notifications.quietHoursSub')}
        </Text>
      </View>
      <View style={[styles.row, { gap: 12 }]}>
        <Text variant="sm" color="ink2" weight={600}>
          {t('console.admin.settings.notifications.from')}
        </Text>
        <Dropdown
          value={qh[0]}
          options={opts}
          onChange={(v) => setQh([v, qh[1]])}
          label={t('console.admin.settings.notifications.from')}
          disabled={ro}
          style={{ width: 120, height: 36 }}
        />
        <Text variant="sm" color="ink2" weight={600}>
          {t('console.admin.settings.notifications.to')}
        </Text>
        <Dropdown
          value={qh[1]}
          options={opts}
          onChange={(v) => setQh([qh[0], v])}
          label={t('console.admin.settings.notifications.to')}
          disabled={ro}
          style={{ width: 120, height: 36 }}
        />
      </View>
      <View style={[styles.sep, { borderColor: colors.line }]} />
      <Text variant="h4">{t('console.admin.settings.notifications.templates')}</Text>
      <TextField
        label={t('console.admin.settings.notifications.absence')}
        hint={t('console.admin.settings.notifications.absenceHint')}
        value={template}
        onChangeText={setTemplate}
        editable={!ro}
        multiline
        maxLength={300}
        error={fieldError(save.error, 'absence_template')}
        labelRight={
          <Text variant="xxs" color="muted" num>
            {template.length}/300
          </Text>
        }
      />
      <View style={[styles.row, { gap: 12 }]}>
        <Switch value={alerts} onChange={setAlerts} disabled={ro} label={t('console.admin.settings.notifications.absenceAlerts')} />
        <Text variant="sm" weight={600}>
          {t('console.admin.settings.notifications.absenceAlerts')}
        </Text>
      </View>
      {!ro ? (
        <View style={styles.actions}>
          <Button
            title={t('console.admin.settings.notifications.save')}
            icon="check"
            loading={save.isPending}
            onPress={() => save.mutate()}
          />
        </View>
      ) : null}
    </Panel>
  );
}

const CHANNEL_ICON: Record<string, IconName> = { in_app: 'inbox', push: 'bell', sms: 'chat', whatsapp: 'phone', email: 'mail' };

/* ------------------------------------------------------------- integrations */

const INTEGRATION_ICON: Record<string, IconName> = { payments: 'card', sms: 'chat', whatsapp: 'phone', biometric: 'user', gps: 'navigate' };

export function IntegrationsSection({ data }: { data: SettingsOverview }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const body = (key: string, status: string, detail: string | null) => {
    const base = `console.admin.settings.integrations.${key}`;
    if (key === 'payments') return t(`${base}${status === 'live' ? 'Live' : status === 'test' ? 'Test' : 'Off'}`);
    if (key === 'gps') return status === 'live' ? t(`${base}Live`, { detail }) : t(`${base}Off`);
    if (key === 'biometric') return t(`${base}${status === 'live' ? 'Live' : 'Off'}`);
    return t(`${base}Off`);
  };
  return (
    <Panel pad={22} gap={16}>
      <SectionHead title={t('console.admin.settings.integrations.title')} subtitle={t('console.admin.settings.integrations.subtitle')} />
      <View>
        {data.integrations.map((it, i) => (
          <View key={it.key} style={[styles.row, styles.listRow, { borderTopWidth: i ? 1 : 0, borderColor: colors.line }]}>
            <TileIcon
              icon={INTEGRATION_ICON[it.key]}
              size="sm"
              tone={it.status === 'live' ? 'ok' : it.status === 'test' ? 'warn' : 'neutral'}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="sm" weight={700}>
                {t(`console.admin.settings.integrations.${it.key}`)}
              </Text>
              <Text variant="xs" color="muted">
                {body(it.key, it.status, it.detail)}
              </Text>
            </View>
            <Pill
              label={t(`console.admin.settings.integrations.${it.status}`)}
              tone={it.status === 'live' ? 'ok' : it.status === 'test' ? 'warn' : 'neutral'}
            />
          </View>
        ))}
      </View>
      <View style={[styles.note, { backgroundColor: colors.sunken }]}>
        <Icon name="info" size={16} rawColor={colors.ink2} />
        <Text variant="xs" color="ink2" style={{ flex: 1 }}>
          {t('console.admin.settings.integrations.contact')}
        </Text>
      </View>
    </Panel>
  );
}

/* ----------------------------------------------------------------- security */

export function SecuritySection({ data }: { data: SettingsOverview }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = data.security;
  return (
    <View style={{ gap: 20 }}>
      <Panel pad={22} gap={16}>
        <SectionHead title={t('console.admin.settings.security.title')} subtitle={t('console.admin.settings.security.subtitle')} />
        <View>
          <View style={[styles.row, styles.listRow]}>
            <TileIcon icon="phone" size="sm" tone="ok" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="sm" weight={700}>
                {t('console.admin.settings.security.signIn')}
              </Text>
              <Text variant="xs" color="muted">
                {t('console.admin.settings.security.signInBody')}{' '}
                {t('console.admin.settings.security.passwords', { count: s.staff_with_password, total: s.staff })}
              </Text>
            </View>
          </View>
          <View style={[styles.row, styles.listRow, { borderTopWidth: 1, borderColor: colors.line }]}>
            <TileIcon icon="shield" size="sm" tone="neutral" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="sm" weight={700}>
                {t('console.admin.settings.security.twoStep')}
              </Text>
              <Text variant="xs" color="muted">
                {t('console.admin.settings.security.twoStepBody')}
              </Text>
            </View>
            <Pill label={t('console.admin.settings.security.notAvailable')} tone="neutral" />
          </View>
        </View>
        <Text variant="xs" color="muted">
          {t('console.admin.settings.security.auditStats', { count: s.audit_entries_30d, sensitive: s.sensitive_30d })}
        </Text>
      </Panel>
      <AuditLogPanel />
    </View>
  );
}

const PAGE = 15;

/** "Mozilla/5.0 (Macintosh…) … Chrome/…" → "Chrome · macOS"; short strings pass through. */
function device(ua: string): string {
  if (!ua || ua.length < 30) return ua;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : /okhttp|Expo|Dalvik/i.test(ua)
            ? 'App'
            : '';
  const os = /iPhone|iPad/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Mac OS X|Macintosh/.test(ua)
        ? 'macOS'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return [browser, os].filter(Boolean).join(' · ') || ua.slice(0, 40);
}

export function AuditLogPanel() {
  const { t } = useTranslation();
  const [module, setModule] = useState('');
  const [actor, setActor] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [module, actor, q]);
  const log = useConsoleQuery(['admin', 'audit', module, actor, q, page], () =>
    adminApi.audit({ module, actor, q, page, page_size: PAGE }),
  );
  const d = log.data;
  const moduleOptions = [
    { value: '', label: t('console.admin.settings.security.allModules') },
    ...(d?.modules ?? []).map((m) => ({ value: m, label: m })),
  ];
  const actorOptions = [
    { value: '', label: t('console.admin.settings.security.allPeople') },
    ...(d?.actors ?? []).map((a) => ({ value: a.id, label: a.name })),
  ];
  return (
    <Panel pad={0} gap={0}>
      <View style={{ padding: 22, gap: 14 }}>
        <SectionHead title={t('console.admin.settings.security.log')} subtitle={t('console.admin.settings.security.logSub')} />
        <View style={[styles.row, { gap: 10 }]}>
          <View style={{ flex: 1 }}>
            <Search value={q} onChangeText={setQ} placeholder={t('console.admin.settings.security.search')} />
          </View>
          <Dropdown
            value={module}
            options={moduleOptions}
            onChange={setModule}
            label={t('console.admin.settings.security.allModules')}
            style={{ width: 150, height: 40 }}
          />
          <Dropdown
            value={actor}
            options={actorOptions}
            onChange={setActor}
            label={t('console.admin.settings.security.allPeople')}
            style={{ width: 180, height: 40 }}
          />
        </View>
      </View>
      <DataTable<AuditEntry>
        dense
        rows={d?.items ?? []}
        rowKey={(r) => r.id}
        empty={
          <Text variant="sm" color="muted" style={{ padding: 16 }}>
            {log.isLoading ? '…' : t('console.admin.settings.security.empty')}
          </Text>
        }
        columns={[
          {
            key: 'when',
            title: t('console.admin.settings.security.when'),
            width: 150,
            render: (r) => (
              <Text variant="xs" color="ink2" num>
                {formatDate(r.at.slice(0, 10), { year: r.at.slice(0, 4) !== new Date().toISOString().slice(0, 4) })}, {formatTime(r.at)}
              </Text>
            ),
          },
          {
            key: 'who',
            title: t('console.admin.settings.security.who'),
            width: 150,
            render: (r) => (
              <Text variant="xs" weight={700}>
                {r.actor ?? t('console.admin.settings.security.system')}
              </Text>
            ),
          },
          {
            key: 'action',
            title: t('console.admin.settings.security.action'),
            width: 150,
            render: (r) => (
              <Text variant="xs" color="muted" style={{ fontFamily: fonts.semibold }}>
                {r.action}
              </Text>
            ),
          },
          { key: 'what', title: t('console.admin.settings.security.what'), flex: 1, render: (r) => <Text variant="xs">{r.summary}</Text> },
          {
            key: 'where',
            title: t('console.admin.settings.security.where'),
            width: 160,
            render: (r) => (
              <Text variant="xxs" color="muted" numberOfLines={2}>
                {[r.ip, device(r.device)].filter(Boolean).join(' · ')}
              </Text>
            ),
          },
        ]}
      />
      {d ? (
        <TableFoot right={<Pager page={d.page} pageSize={d.page_size} total={d.total} onPage={setPage} />}>
          {t('console.admin.settings.security.page', {
            page: d.page,
            pages: Math.max(1, Math.ceil(d.total / d.page_size)),
            total: d.total,
          })}
        </TableFoot>
      ) : null}
    </Panel>
  );
}

/* ------------------------------------------------------------------ billing */

export function BillingSection({ data }: { data: SettingsOverview }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const b = data.billing;
  const stat = (label: string, value: string, sub?: string) => (
    <View style={[styles.stat, { backgroundColor: colors.subtle, borderColor: colors.line }]}>
      <Text variant="xxs" color="muted" weight={700} style={{ textTransform: 'uppercase', letterSpacing: 0.9 }}>
        {label}
      </Text>
      <Text variant="kpiSm">{value}</Text>
      {sub ? (
        <Text variant="xs" color="muted">
          {sub}
        </Text>
      ) : null}
    </View>
  );
  return (
    <Panel pad={22} gap={18}>
      <SectionHead title={t('console.admin.settings.billing.title')} subtitle={t('console.admin.settings.billing.subtitle')} />
      <View style={[styles.note, { backgroundColor: colors.sunken, alignItems: 'flex-start' }]}>
        <TileIcon icon="card" size="sm" tone="neutral" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="sm" weight={700}>
            {b.plan ?? t('console.admin.settings.billing.noPlan')}
          </Text>
          <Text variant="xs" color="ink2">
            {t('console.admin.settings.billing.noPlanBody')}
          </Text>
        </View>
      </View>
      <View style={[styles.row, { gap: 14 }]}>
        {stat(t('console.admin.settings.billing.students'), b.students.toLocaleString('en-IN'))}
        {stat(t('console.admin.settings.billing.staff'), b.staff.toLocaleString('en-IN'))}
        {stat(
          t('console.admin.settings.billing.sms'),
          b.sms_month.toLocaleString('en-IN'),
          t('console.admin.settings.billing.smsBody', { count: b.sms_month, delivered: b.sms_delivered_month }),
        )}
        {stat(t('console.admin.settings.billing.credits'), '—', t('console.admin.settings.billing.noCredits'))}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  half: { flexBasis: '47%', flexGrow: 1, minWidth: 0 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  listRow: { gap: 12, paddingVertical: 12 },
  sep: { borderTopWidth: 1 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
});
