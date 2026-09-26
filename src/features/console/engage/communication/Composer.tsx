import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { addDays, fileSize, formatDate, formatTime, isoDate, weekdayName } from '@/lib/format';
import { appendFiles, type PickedFile } from '@/lib/pick';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import {
  Button,
  Chip,
  clock,
  DateField,
  Icon,
  ICON_SIZE,
  IconButton,
  pointer,
  SegmentedControl,
  Switch,
  Text,
  TileIcon,
  TimeField,
  useToast,
  Vr,
  type IconName,
} from '@/ui';
import { noWebFocusRing } from '@/ui/webStyles';

import {
  communicationApi,
  type AnnouncementSummary,
  type AudienceBody,
  type Channel,
  type CommunicationData,
  type Draft,
  type Estimate,
  type Scope,
} from '../api';
import { Dialog, Dropdown, errorText, FieldLabel, gradeName } from '../common';

type State = {
  id?: string;
  title: string;
  body: string;
  scope: Scope;
  grades: string[];
  sections: string[];
  parentsOnly: boolean;
  channels: Channel[];
  later: boolean;
  date: string;
  time: string;
  circular: boolean;
  ackDue: string;
  savedAt?: string;
  serverFile?: { name: string; size: number } | null;
};

export const CHANNELS: { key: Channel; icon: IconName }[] = [
  { key: 'push', icon: 'bell' },
  { key: 'in_app', icon: 'phone' },
  { key: 'sms', icon: 'chat' },
  { key: 'whatsapp', icon: 'chat' },
  { key: 'email', icon: 'mail' },
];

/** The next school day (Sunday is off). */
function nextSchoolDay(): Date {
  const d = addDays(new Date(), 1);
  return d.getDay() === 0 ? addDays(d, 1) : d;
}

function blank(circular = false): State {
  const tomorrow = isoDate(nextSchoolDay());
  return {
    title: '',
    body: '',
    scope: 'school',
    grades: [],
    sections: [],
    parentsOnly: circular,
    channels: ['push', 'in_app', 'sms'],
    later: false,
    date: tomorrow,
    time: '07:30',
    circular,
    ackDue: isoDate(addDays(new Date(), 5)),
    serverFile: null,
  };
}

function fromDraft(d: Draft): State {
  const at = d.scheduled_at ? new Date(d.scheduled_at) : null;
  const base = blank(d.circular);
  return {
    ...base,
    id: d.id,
    title: d.title,
    body: d.body,
    scope: d.audience.scope === 'route' ? 'school' : d.audience.scope,
    grades: d.audience.grades,
    sections: d.audience.class_ids,
    parentsOnly: d.audience.parents_only,
    channels: d.channels,
    later: !!at,
    date: at ? isoDate(at) : base.date,
    time: at ? `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}` : base.time,
    ackDue: d.ack_due_on ?? base.ackDue,
    savedAt: d.saved_at,
    serverFile: d.attachment,
  };
}

export type ComposerHandle = { reset: (circular?: boolean) => void; load: (d: Draft) => void; focus: () => void };

/** PCommunication's "New announcement" card: write, pick the audience and channels, send now or schedule. */
export const Composer = forwardRef<ComposerHandle, { data: CommunicationData; initialDraft?: Draft | null }>(function Composer(
  { data, initialDraft },
  ref,
) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const schoolId = useSession((s) => s.schoolId);
  const [s, setS] = useState<State>(() => (initialDraft ? fromDraft(initialDraft) : blank()));
  const [file, setFile] = useState<PickedFile | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sel, setSel] = useState({ start: 0, end: 0 });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bodyHeight, setBodyHeight] = useState(244);
  const titleRef = useRef<TextInput>(null);
  const bodyRef = useRef<TextInput>(null);
  const set = (patch: Partial<State>) => setS((prev) => ({ ...prev, ...patch }));

  useImperativeHandle(ref, () => ({
    reset: (circular = false) => {
      setS(blank(circular));
      setFile(null);
      setRemoveFile(false);
      setErrors({});
      setTimeout(() => titleRef.current?.focus(), 50);
    },
    load: (d: Draft) => {
      setS(fromDraft(d));
      setFile(null);
      setRemoveFile(false);
      setErrors({});
    },
    focus: () => titleRef.current?.focus(),
  }));

  const audience: AudienceBody = useMemo(
    () => ({
      scope: s.scope,
      grades: s.scope === 'grades' ? s.grades : [],
      class_ids: s.scope === 'sections' ? s.sections : [],
      parents_only: s.parentsOnly && s.scope !== 'staff',
    }),
    [s.scope, s.grades, s.sections, s.parentsOnly],
  );
  const needsPick = (s.scope === 'grades' && !s.grades.length) || (s.scope === 'sections' && !s.sections.length);
  const reach = useQuery({
    queryKey: ['console', schoolId, 'comm-estimate', audience],
    queryFn: () => communicationApi.estimate(audience),
    enabled: !needsPick,
  });
  const r: Estimate | undefined = reach.data && !reach.data.empty ? reach.data : undefined;

  // Who the numbers are about: parents, staff, or everyone the audience reaches.
  const noun = s.scope === 'staff' ? 'staff' : audience.parents_only ? 'parents' : 'people';
  const reachCount = !r ? 0 : noun === 'staff' ? r.staff : noun === 'parents' ? r.parents : r.people;
  const smsUse = s.channels.includes('sms') && r ? r.sms : 0;
  const whenIso = s.later ? new Date(`${s.date}T${s.time}:00`).toISOString() : null;
  const whenLabel = `${weekdayName(s.date, true)} ${formatDate(s.date)}, ${clock(s.time)}`;

  const form = (intent: 'draft' | 'send') => {
    const f = new FormData();
    if (s.id) f.append('id', s.id);
    f.append('intent', intent);
    f.append('title', s.title);
    f.append('body', s.body);
    f.append('scope', s.scope);
    f.append('grades', JSON.stringify(audience.grades));
    f.append('class_ids', JSON.stringify(audience.class_ids));
    f.append('channels', JSON.stringify(s.channels));
    f.append('parents_only', String(audience.parents_only));
    if (whenIso) f.append('scheduled_at', whenIso);
    if (s.circular) {
      f.append('circular', 'true');
      f.append('ack_due_on', s.ackDue);
    }
    if (removeFile) f.append('remove_attachment', 'true');
    return f;
  };

  const save = useMutation({
    mutationFn: async (intent: 'draft' | 'send') => {
      const f = form(intent);
      if (file) await appendFiles(f, 'attachment', [file]);
      return communicationApi.compose(f);
    },
    onSuccess: (res, intent) => {
      setErrors({});
      void client.invalidateQueries({ queryKey: ['console'] });
      if (intent === 'draft') {
        const d = res as Draft;
        setS((prev) => ({ ...prev, id: d.id, savedAt: d.saved_at, serverFile: d.attachment }));
        setFile(null);
        setRemoveFile(false);
        toast(t('console.engage.comm.draftSavedToast'));
        return;
      }
      const sent = res as AnnouncementSummary;
      toast(
        sent.scheduled
          ? t('console.engage.comm.scheduledToast', { when: whenLabel })
          : t('console.engage.comm.sentToast', { count: sent.recipients, formatted: sent.recipients.toLocaleString('en-IN') }),
      );
      setS(blank());
      setFile(null);
      setRemoveFile(false);
    },
    onError: (e: unknown) => {
      const fields = (e as { fields?: Record<string, unknown> }).fields ?? {};
      setErrors(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, Array.isArray(v) ? String(v[0]) : String(v)])));
      toast(errorText(e, t('console.engage.somethingWrong')), 'danger');
    },
  });

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if ((a.size ?? 0) > 10 * 1024 * 1024) return toast(t('console.engage.comm.tooBig'), 'danger');
    setFile({ uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream', file: a.file, size: a.size });
    setRemoveFile(false);
  };

  // Light formatting: wrap or prefix the selection, the way a plain-text editor does.
  const wrap = (before: string, after = before, placeholder = '') => {
    const { start, end } = sel;
    const picked = s.body.slice(start, end) || placeholder;
    const body = s.body.slice(0, start) + before + picked + after + s.body.slice(end);
    set({ body: body.slice(0, data.limit) });
    bodyRef.current?.focus();
  };
  const bullets = () => {
    const { start, end } = sel;
    const lineStart = s.body.lastIndexOf('\n', start - 1) + 1;
    const block = s.body.slice(lineStart, Math.max(end, start));
    const listed = (block || '')
      .split('\n')
      .map((l) => (l.startsWith('• ') ? l : `• ${l}`))
      .join('\n');
    set({ body: (s.body.slice(0, lineStart) + listed + s.body.slice(Math.max(end, start))).slice(0, data.limit) });
  };

  const toggleChannel = (c: Channel) => {
    if (c === 'in_app') return;
    set({ channels: s.channels.includes(c) ? s.channels.filter((x) => x !== c) : [...s.channels, c] });
  };
  const setScope = (scope: Scope) => set({ scope, parentsOnly: scope === 'staff' ? false : s.parentsOnly });
  const gradesLeft = data.grades.filter((g) => !s.grades.includes(g));
  const sectionsLeft = data.sections.filter((x) => !s.sections.includes(x.id));
  const sectionLabel = (id: string) => data.sections.find((x) => x.id === id)?.label ?? id;

  const blocked =
    !s.title.trim() || !s.body.trim() ? t('console.engage.comm.needText') : needsPick ? t('console.engage.comm.needAudience') : null;
  const channelSub: Record<Channel, string> = {
    push: t(`console.engage.comm.pushSub_${noun}`, { count: r?.push ?? 0, formatted: (r?.push ?? 0).toLocaleString('en-IN') }),
    in_app: t('console.engage.comm.inAppSub'),
    sms: t('console.engage.comm.smsSub'),
    whatsapp: t('console.engage.comm.whatsappSub', { formatted: (r?.whatsapp ?? 0).toLocaleString('en-IN') }),
    email: t(`console.engage.comm.emailSub_${noun}`, { count: r?.email ?? 0, formatted: (r?.email ?? 0).toLocaleString('en-IN') }),
  };
  const reachText = t(`console.engage.comm.reach_${noun}`, { count: reachCount, formatted: reachCount.toLocaleString('en-IN') });
  const summary = (() => {
    if (s.scope === 'staff') return { main: t('console.engage.aud.staff'), rest: t('console.engage.comm.sumStaff') };
    const who =
      s.scope === 'school'
        ? t('console.engage.aud.school')
        : s.scope === 'grades'
          ? s.grades.length === 1
            ? gradeName(t, s.grades[0])
            : t('console.engage.aud.grades', { range: rangeOf(s.grades, data.grades) })
          : s.sections.map(sectionLabel).join(', ');
    const main = audience.parents_only ? `${who} · ${t('console.engage.comm.parents')}` : who;
    const sections = t('console.engage.comm.sections', { count: r?.sections ?? 0 });
    const excluded = audience.parents_only
      ? t('console.engage.comm.sumParents')
      : s.scope === 'school'
        ? t('console.engage.comm.sumSchool')
        : t('console.engage.comm.sumFamilies');
    return { main, rest: `${sections} · ${excluded}` };
  })();
  const bodyLen = s.body.length;
  const attached = file ? { name: file.name, size: file.size ?? 0 } : removeFile ? null : s.serverFile;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
      accessibilityLabel={t('console.engage.comm.composeLabel')}>
      <View style={[styles.head, { borderBottomColor: colors.line }]}>
        <View style={{ gap: 2 }}>
          <Text variant="h3" accessibilityRole="header">
            {s.circular ? t('console.engage.comm.newCircular') : t('console.engage.comm.newAnnouncement')}
          </Text>
          <Text variant="xs" color="muted">
            {s.savedAt ? t('console.engage.comm.draftSaved', { time: formatTime(new Date(s.savedAt)) }) : t('console.engage.comm.notSaved')}
          </Text>
        </View>
        <Dropdown
          label={t('console.engage.comm.templates')}
          width={300}
          align="right"
          items={[
            { key: 'blank', label: t('console.engage.comm.startBlank'), icon: 'plus' },
            ...data.drafts.map((d) => ({
              key: `d:${d.id}`,
              label: `${t('console.engage.comm.draftPrefix')} · ${d.title || t('console.engage.comm.untitled')}`,
              icon: 'edit' as IconName,
              selected: d.id === s.id,
            })),
            ...data.recent.map((a) => ({ key: `a:${a.id}`, label: a.title, icon: 'history' as IconName })),
          ]}
          onSelect={(key) => {
            if (key === 'blank') return (setS(blank(s.circular)), setFile(null));
            const draft = data.drafts.find((d) => `d:${d.id}` === key);
            if (draft) return (setS(fromDraft(draft)), setFile(null));
            const sent = data.recent.find((a) => `a:${a.id}` === key);
            if (sent) set({ id: undefined, savedAt: undefined, title: sent.title, channels: sent.channels });
          }}
          trigger={(open) => <Button title={t('console.engage.comm.templates')} icon="layers" variant="ghost" size="sm" onPress={open} />}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.field}>
          <FieldLabel>{t('console.engage.comm.title')}</FieldLabel>
          <TextInput
            ref={titleRef}
            value={s.title}
            onChangeText={(v) => set({ title: v })}
            maxLength={120}
            placeholder={t('console.engage.comm.titlePlaceholder')}
            placeholderTextColor={colors.muted}
            accessibilityLabel={t('console.engage.comm.title')}
            style={[
              styles.input,
              { color: colors.ink, borderColor: errors.title ? colors.bad : colors.lineStrong, backgroundColor: colors.surface },
              noWebFocusRing,
            ]}
          />
          {errors.title ? (
            <Text variant="xs" color="bad">
              {errors.title}
            </Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <FieldLabel>{t('console.engage.comm.message')}</FieldLabel>
          <View style={[styles.editor, { borderColor: errors.body ? colors.bad : colors.lineStrong, backgroundColor: colors.surface }]}>
            <View
              style={[styles.toolbar, { borderBottomColor: colors.line, backgroundColor: colors.subtle }]}
              accessibilityRole="toolbar"
              accessibilityLabel={t('console.engage.comm.formatting')}>
              <ToolButton label={t('console.engage.comm.bold')} onPress={() => wrap('**', '**', t('console.engage.comm.boldText'))}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink2 }}>B</Text>
              </ToolButton>
              <ToolButton label={t('console.engage.comm.italic')} onPress={() => wrap('_', '_', t('console.engage.comm.italicText'))}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, fontStyle: 'italic', color: colors.ink2 }}>I</Text>
              </ToolButton>
              <ToolButton label={t('console.engage.comm.list')} onPress={bullets}>
                <Icon name="list" size={ICON_SIZE.sm} rawColor={colors.ink2} />
              </ToolButton>
              <ToolButton label={t('console.engage.comm.link')} onPress={() => wrap('[', '](https://)', t('console.engage.comm.linkText'))}>
                <Icon name="link" size={ICON_SIZE.sm} rawColor={colors.ink2} />
              </ToolButton>
              <Vr style={{ marginVertical: 6, marginHorizontal: 6, alignSelf: 'stretch' }} />
              <Dropdown
                label={t('console.engage.comm.insertField')}
                width={240}
                items={data.fields.map((f) => ({ key: f, label: t(`console.engage.comm.field_${f}`) }))}
                onSelect={(f) => wrap(`{${f}}`, '', '')}
                trigger={(open) => (
                  <Button title={t('console.engage.comm.insertField')} iconRight="chevronDown" variant="ghost" size="sm" onPress={open} />
                )}
              />
              <View style={{ flex: 1 }} />
              <Text variant="xxs" color={bodyLen > data.limit * 0.95 ? 'bad' : 'muted'} weight={600} num style={{ paddingRight: 6 }}>
                {`${bodyLen.toLocaleString('en-IN')} / ${data.limit.toLocaleString('en-IN')}`}
              </Text>
            </View>
            <TextInput
              ref={bodyRef}
              value={s.body}
              onChangeText={(v) => set({ body: v.slice(0, data.limit) })}
              onSelectionChange={(e) => setSel(e.nativeEvent.selection)}
              onContentSizeChange={(e) => setBodyHeight(Math.max(244, Math.ceil(e.nativeEvent.contentSize.height) + 2))}
              multiline
              placeholder={t('console.engage.comm.messagePlaceholder')}
              placeholderTextColor={colors.muted}
              accessibilityLabel={t('console.engage.comm.message')}
              style={[styles.textarea, { color: colors.ink, height: bodyHeight }, noWebFocusRing]}
            />
          </View>
          {errors.body ? (
            <Text variant="xs" color="bad">
              {errors.body}
            </Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <FieldLabel>{t('console.engage.comm.audience')}</FieldLabel>
          <View style={styles.wrapRow} accessibilityRole={'group' as never} accessibilityLabel={t('console.engage.comm.audience')}>
            {(['school', 'grades', 'sections', 'staff'] as Scope[]).map((scope) => (
              <Chip
                key={scope}
                label={t(`console.engage.comm.scope_${scope}`)}
                icon={s.scope === scope ? 'check' : undefined}
                selected={s.scope === scope}
                onPress={() => setScope(scope)}
              />
            ))}
            <Chip
              label={t('console.engage.comm.parentsOnly')}
              icon={audience.parents_only ? 'check' : undefined}
              selected={audience.parents_only}
              disabled={s.scope === 'staff'}
              onPress={() => set({ parentsOnly: !s.parentsOnly })}
            />
          </View>
          <View style={[styles.well, { backgroundColor: colors.sunken }]}>
            {s.scope === 'grades' || s.scope === 'sections' ? (
              <View style={[styles.wrapRow, { gap: 8 }]}>
                {(s.scope === 'grades' ? s.grades : s.sections).map((v) => {
                  const label = s.scope === 'grades' ? gradeName(t, v) : sectionLabel(v);
                  return (
                    <View key={v} style={[styles.inkPill, { backgroundColor: colors.ink }]}>
                      <Text style={[styles.inkPillText, { color: colors.canvas }]}>{label}</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('console.engage.comm.remove', { name: label })}
                        onPress={() =>
                          s.scope === 'grades'
                            ? set({ grades: s.grades.filter((g) => g !== v) })
                            : set({ sections: s.sections.filter((x) => x !== v) })
                        }
                        style={[styles.pillX, pointer]}>
                        <Icon name="close" size={12} rawColor={colors.canvas} bold />
                      </Pressable>
                    </View>
                  );
                })}
                <Dropdown
                  label={s.scope === 'grades' ? t('console.engage.comm.addGrade') : t('console.engage.comm.addSection')}
                  width={200}
                  items={
                    s.scope === 'grades'
                      ? gradesLeft.map((g) => ({ key: g, label: gradeName(t, g) }))
                      : sectionsLeft.map((x) => ({ key: x.id, label: x.label }))
                  }
                  onSelect={(v) => (s.scope === 'grades' ? set({ grades: [...s.grades, v] }) : set({ sections: [...s.sections, v] }))}
                  trigger={(open) => (
                    <Button
                      title={s.scope === 'grades' ? t('console.engage.comm.addGrade') : t('console.engage.comm.addSection')}
                      icon="plus"
                      variant="ghost"
                      size="sm"
                      height={28}
                      onPress={open}
                    />
                  )}
                />
              </View>
            ) : null}
            <View style={[styles.wrapRow, { gap: 6 }]}>
              <Text variant="xs" weight={700}>
                {needsPick ? t('console.engage.comm.needAudience') : summary.main}
              </Text>
              {!needsPick ? (
                <Text variant="xs" color="muted">
                  {`· ${summary.rest}`}
                </Text>
              ) : null}
            </View>
          </View>
          {errors.grades ? (
            <Text variant="xs" color="bad">
              {errors.grades}
            </Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <FieldLabel>{t('console.engage.comm.channels')}</FieldLabel>
          <View style={styles.grid}>
            {CHANNELS.map((c) => {
              const on = s.channels.includes(c.key) || c.key === 'in_app';
              const fixed = c.key === 'in_app';
              return (
                <Pressable
                  key={c.key}
                  accessibilityRole="switch"
                  accessibilityLabel={t(`console.engage.comm.ch_${c.key}`)}
                  accessibilityState={{ checked: on, disabled: fixed }}
                  disabled={fixed}
                  onPress={() => toggleChannel(c.key)}
                  style={[styles.channel, { borderColor: colors.line, backgroundColor: colors.surface }, !fixed && pointer]}>
                  <TileIcon icon={c.icon} size="sm" tone={c.key === 'whatsapp' ? 'neutral' : 'brand'} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="sm" weight={700} numberOfLines={1}>
                      {t(`console.engage.comm.ch_${c.key}`)}
                    </Text>
                    <Text variant="xs" color="muted" numberOfLines={1}>
                      {channelSub[c.key]}
                    </Text>
                  </View>
                  {fixed ? <Icon name="lock" size={14} rawColor={colors.muted} /> : null}
                  <Switch value={on} label={t(`console.engage.comm.ch_${c.key}`)} disabled={fixed} decorative />
                </Pressable>
              );
            })}
            <View style={[styles.channel, styles.reach, { backgroundColor: colors.brandSoft, borderColor: colors.brandLine }]}>
              <Text style={[styles.reachKicker, { color: colors.brandInk }]}>{t('console.engage.comm.estimatedReach')}</Text>
              <Text variant="h3" num>
                {needsPick ? '—' : r ? reachText : '…'}
              </Text>
              <Text variant="xxs" color="ink2" weight={600} num>
                {smsUse
                  ? t('console.engage.comm.smsCredits', {
                      used: smsUse.toLocaleString('en-IN'),
                      balance: (r?.sms_credits.balance ?? 0).toLocaleString('en-IN'),
                    })
                  : t('console.engage.comm.noSmsCredits', {
                      balance: (reach.data?.sms_credits.balance ?? data.sms_credits.balance).toLocaleString('en-IN'),
                    })}
              </Text>
            </View>
          </View>
        </View>

        {s.circular ? (
          <View style={styles.field}>
            <FieldLabel>{t('console.engage.comm.ackDue')}</FieldLabel>
            <View style={[styles.wrapRow, { gap: 12 }]}>
              <DateField value={s.ackDue} onChange={(v) => set({ ackDue: v })} min={isoDate(new Date())} style={{ width: 240 }} />
              <Text variant="xs" color="muted" style={{ flex: 1 }}>
                {t('console.engage.comm.ackHint')}
              </Text>
            </View>
            {errors.ack_due_on ? (
              <Text variant="xs" color="bad">
                {errors.ack_due_on}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.field}>
          <FieldLabel>{t('console.engage.comm.when')}</FieldLabel>
          <View style={[styles.wrapRow, { gap: 12 }]}>
            <SegmentedControl
              full={false}
              value={s.later ? 'later' : 'now'}
              onChange={(v) => set({ later: v === 'later' })}
              options={[
                { value: 'now', label: t('console.engage.comm.sendNow') },
                { value: 'later', label: t('console.engage.comm.schedule') },
              ]}
            />
            <Text variant="xs" color="muted">
              {t('console.engage.comm.quietHours', { start: hourLabel(data.quiet_hours.start), end: hourLabel(data.quiet_hours.end) })}
            </Text>
          </View>
          {s.later ? (
            <View style={[styles.wrapRow, { gap: 10, alignItems: 'flex-start' }]}>
              <DateField
                label={t('console.engage.comm.date')}
                value={s.date}
                onChange={(v) => set({ date: v })}
                min={isoDate(new Date())}
                sundays
                style={{ width: 240 }}
              />
              <TimeField
                label={t('console.engage.comm.time')}
                value={s.time}
                onChange={(v) => set({ time: v })}
                from="06:00"
                to="21:00"
                style={{ width: 180 }}
              />
            </View>
          ) : null}
          {errors.scheduled_at ? (
            <Text variant="xs" color="bad">
              {errors.scheduled_at}
            </Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <FieldLabel>{t('console.engage.comm.attachments')}</FieldLabel>
          <View style={[styles.wrapRow, { gap: 10 }]}>
            {attached ? (
              <View style={[styles.file, { borderColor: colors.lineStrong, backgroundColor: colors.surface }]}>
                <TileIcon icon="document" size="sm" />
                <View>
                  <Text variant="sm" weight={700} numberOfLines={1} style={{ maxWidth: 240 }}>
                    {attached.name}
                  </Text>
                  <Text variant="xxs" color="muted" weight={600}>
                    {fileSize(attached.size)}
                  </Text>
                </View>
                <IconButton
                  icon="close"
                  variant="bare"
                  size="sm"
                  label={t('console.engage.comm.removeAttachment')}
                  onPress={() => {
                    setFile(null);
                    if (s.serverFile) setRemoveFile(true);
                  }}
                />
              </View>
            ) : null}
            <Button
              title={attached ? t('console.engage.comm.replaceAttachment') : t('console.engage.comm.addAttachment')}
              icon="paperclip"
              variant="ghost"
              size="sm"
              onPress={() => void pick()}
            />
          </View>
        </View>
      </View>

      <View style={[styles.foot, { borderTopColor: colors.line, backgroundColor: colors.subtle }]}>
        <View style={[styles.row, { gap: 8 }]}>
          <Button
            title={t('console.engage.comm.preview')}
            icon="eye"
            variant="secondary"
            onPress={() => setPreview(true)}
            disabled={!s.title.trim() && !s.body.trim()}
          />
          <Button
            title={t('console.engage.comm.saveDraft')}
            variant="ghost"
            loading={save.isPending && save.variables === 'draft'}
            onPress={() => save.mutate('draft')}
          />
        </View>
        <View style={[styles.row, { gap: 14, flexShrink: 1 }]}>
          <Text variant="xs" color="muted" weight={600} style={{ maxWidth: 150 }}>
            {blocked ??
              (s.later
                ? t('console.engage.comm.goesLater', { who: reachText, when: whenLabel })
                : t('console.engage.comm.goesNow', { who: reachText }))}
          </Text>
          <Button
            title={
              s.later
                ? t('console.engage.comm.scheduleSend')
                : s.circular
                  ? t('console.engage.comm.sendCircular')
                  : t('console.engage.comm.send')
            }
            icon={s.later ? 'clock' : 'send'}
            disabled={!!blocked}
            loading={save.isPending && save.variables === 'send'}
            onPress={() => save.mutate('send')}
          />
        </View>
      </View>

      <PreviewDialog
        visible={preview}
        onClose={() => setPreview(false)}
        audience={audience}
        title={s.title}
        body={s.body}
        channels={s.channels}
      />
    </View>
  );
});

/** "21:00" -> "9 PM", "07:30" -> "7:30 AM". */
function hourLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h >= 12 ? 'PM' : 'AM'}`;
}

function rangeOf(picked: string[], order: string[]): string {
  const idx = picked.map((g) => order.indexOf(g)).sort((a, b) => a - b);
  const short = (g: string) => (g === 'Nursery' ? 'N' : g);
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (idx.length > 1 && contiguous) return `${short(order[idx[0]])}–${short(order[idx[idx.length - 1]])}`;
  return idx.map((i) => short(order[i])).join(', ');
}

function ToolButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.tool,
        pointer,
        { backgroundColor: hovered ? colors.sunken : 'transparent' },
      ]}>
      {children}
    </Pressable>
  );
}

/** How the message reads on a parent's phone (push), by SMS and by email, for one real family in the audience. */
function PreviewDialog({
  visible,
  onClose,
  audience,
  title,
  body,
  channels,
}: {
  visible: boolean;
  onClose: () => void;
  audience: AudienceBody;
  title: string;
  body: string;
  channels: Channel[];
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const schoolId = useSession((s) => s.schoolId);
  const q = useQuery({
    queryKey: ['console', schoolId, 'comm-preview', audience, title, body],
    queryFn: () => communicationApi.preview({ ...audience, title, body }),
    enabled: visible,
  });
  const p = q.data;
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('console.engage.comm.previewTitle')}
      subtitle={p?.sample ? t('console.engage.comm.previewAs', p.sample) : undefined}
      width={620}>
      {!p ? (
        <Text variant="sm" color="muted">
          {t('console.engage.loading')}
        </Text>
      ) : (
        <>
          <View style={{ gap: 8 }}>
            <Text variant="eyebrow" color="muted">
              {t('console.engage.comm.previewPush')}
            </Text>
            <View style={[styles.push, { backgroundColor: colors.sunken }]}>
              <View style={[styles.appIcon, { backgroundColor: colors.brand }]}>
                <Icon name="school" size={18} rawColor={colors.onBrand} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="sm" weight={700} numberOfLines={1}>
                  {p.push.title || t('console.engage.comm.untitled')}
                </Text>
                <Text variant="xs" color="ink2" numberOfLines={3}>
                  {p.push.body}
                </Text>
              </View>
            </View>
          </View>
          {channels.includes('sms') ? (
            <View style={{ gap: 8 }}>
              <Text variant="eyebrow" color="muted">
                {t('console.engage.comm.previewSms', { count: p.sms.length })}
              </Text>
              <View style={[styles.push, { backgroundColor: colors.sunken }]}>
                <Text variant="sm" color="ink2" style={{ flex: 1 }}>
                  {p.sms.text}
                </Text>
              </View>
            </View>
          ) : null}
          {channels.includes('email') ? (
            <View style={{ gap: 8 }}>
              <Text variant="eyebrow" color="muted">
                {t('console.engage.comm.previewEmail')}
              </Text>
              <View style={[styles.email, { borderColor: colors.line }]}>
                <Text variant="sm" weight={700}>
                  {p.email.subject}
                </Text>
                <Text variant="sm" color="ink2">
                  {p.email.body}
                </Text>
              </View>
            </View>
          ) : null}
        </>
      )}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrapRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  card: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  body: { paddingVertical: 22, paddingHorizontal: 24, gap: 22 },
  field: { gap: 8 },
  input: { height: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontFamily: fonts.medium, fontSize: 15 },
  editor: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1 },
  tool: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  textarea: {
    minHeight: 244,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: fonts.medium,
    fontSize: 14.5,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  well: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, gap: 10 },
  inkPill: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 28, paddingLeft: 10, paddingRight: 3, borderRadius: 999 },
  inkPillText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 15 },
  pillX: { padding: 3, borderRadius: 999 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  channel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
    width: '49.3%',
    flexGrow: 1,
    minHeight: 62,
  },
  reach: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 2 },
  reachKicker: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.88, textTransform: 'uppercase' },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 6,
    borderWidth: 1,
    borderRadius: 12,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
  },
  push: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, alignItems: 'flex-start' },
  appIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  email: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
});
