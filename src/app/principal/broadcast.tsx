import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { BroadcastChannel } from '@/api/types';
import { addDays, fileSize, formatClock, formatDate, formatTime, isoDate, weekdayName } from '@/lib/format';
import { appendFiles, type PickedFile } from '@/lib/pick';
import { useActiveSchool } from '@/state/session';
import { appStorage } from '@/state/storage';
import { useTheme } from '@/theme/ThemeProvider';
import {
  AppBar,
  Button,
  Card,
  Chip,
  clock,
  DateField,
  Icon,
  ICON_SIZE,
  IconButton,
  Pill,
  pointer,
  Screen,
  SectionHead,
  SegmentedControl,
  Sheet,
  Switch,
  Text,
  TextField,
  ThemeToggle,
  TimeField,
  useToast,
  Well,
  type IconName,
} from '@/ui';

type Audience = 'everyone' | 'grades' | 'sections' | 'staff' | 'parents' | 'route';
type Draft = {
  audience: Audience;
  grades: string[];
  sections: string[];
  title: string;
  body: string;
  channels: BroadcastChannel[];
  later: boolean;
  date: string;
  time: string;
  savedAt?: string;
};
const DRAFT_KEY = 'eduflow.broadcast-draft';
const CHANNELS: { key: BroadcastChannel; icon: IconName }[] = [
  { key: 'push', icon: 'bell' },
  { key: 'in_app', icon: 'inbox' },
  { key: 'sms', icon: 'chat' },
  { key: 'whatsapp', icon: 'phone' },
  { key: 'email', icon: 'mail' },
];

function fresh(): Draft {
  return { audience: 'everyone', grades: [], sections: [], title: '', body: '', channels: ['push', 'in_app', 'sms'], later: false, date: isoDate(addDays(new Date(), 1)), time: '07:30' };
}

/** PMBroadcast: write once, choose who and how (push, in-app, SMS, WhatsApp, email), send now or later. */
export default function PrincipalBroadcast() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const school = useActiveSchool();
  const toast = useToast();
  const client = useQueryClient();
  const params = useLocalSearchParams<{ preset?: string; routeId?: string; route?: string; delay?: string; leaves?: string }>();
  const [d, setD] = useState<Draft>(fresh);
  const [routeId, setRouteId] = useState<string>();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [picker, setPicker] = useState<'grades' | 'sections' | null>(null);
  const loaded = useRef(false);
  const sections = useQuery({ queryKey: ['school-sections'], queryFn: api.schoolSections });

  // Restore the draft (or start from a preset such as "Route 07 is late").
  useEffect(() => {
    if (params.preset === 'route' && params.routeId) {
      setRouteId(params.routeId);
      setD({
        ...fresh(),
        audience: 'route',
        title: t('principal.broadcast.routeTitle', { route: params.route ?? '' }),
        body: t('principal.broadcast.routeBody', { route: params.route ?? '', count: Number(params.delay ?? 0), time: params.leaves ? formatClock(params.leaves) : '' }),
        channels: ['push', 'in_app', 'sms'],
      });
      loaded.current = true;
      return;
    }
    void appStorage.getJson<Draft>(DRAFT_KEY).then((saved) => {
      if (saved) setD({ ...fresh(), ...saved, audience: saved.audience === 'route' ? 'everyone' : saved.audience });
      loaded.current = true;
    });
  }, [params.preset, params.routeId, params.route, params.delay, params.leaves, t]);

  // Autosave the draft a moment after each change.
  useEffect(() => {
    if (!loaded.current || d.audience === 'route') return;
    const id = setTimeout(() => {
      const savedAt = new Date().toISOString();
      void appStorage.setJson(DRAFT_KEY, { ...d, savedAt });
      setD((prev) => (prev.savedAt === savedAt ? prev : { ...prev, savedAt }));
    }, 800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.audience, d.grades, d.sections, d.title, d.body, d.channels, d.later, d.date, d.time]);

  const audienceBody = useMemo(() => {
    if (d.audience === 'grades') return { audience: 'families', grades: d.grades };
    if (d.audience === 'sections') return { audience: 'families', class_ids: d.sections };
    if (d.audience === 'route') return { audience: 'route', route_id: routeId };
    return { audience: d.audience };
  }, [d.audience, d.grades, d.sections, routeId]);
  const needsPick = (d.audience === 'grades' && !d.grades.length) || (d.audience === 'sections' && !d.sections.length);
  const reach = useQuery({ queryKey: ['broadcast-estimate', audienceBody], queryFn: () => api.broadcastEstimate(audienceBody), enabled: !needsPick });
  const r = reach.data;

  const send = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('title', d.title.trim());
      form.append('body', d.body.trim());
      form.append('audience', audienceBody.audience);
      for (const g of d.audience === 'grades' ? d.grades : []) form.append('grades', g);
      for (const c of d.audience === 'sections' ? d.sections : []) form.append('class_ids', c);
      if (routeId && d.audience === 'route') form.append('route_id', routeId);
      for (const c of d.channels) form.append('channels', c);
      if (d.later) form.append('scheduled_at', new Date(`${d.date}T${d.time}:00`).toISOString());
      if (file) await appendFiles(form, 'attachment', [file]);
      return api.broadcast(form);
    },
    onSuccess: (item) => {
      toast(item.scheduled ? t('principal.broadcast.scheduled', { when: whenLabel }) : t('principal.broadcast.sent', { count: r?.families ?? 0 }));
      void appStorage.remove(DRAFT_KEY);
      setD(fresh());
      setFile(null);
      void client.invalidateQueries({ queryKey: ['announcements'] });
      router.push('/announcements');
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if ((a.size ?? 0) > 10 * 1024 * 1024) return toast(t('principal.broadcast.tooBig'), 'danger');
    setFile({ uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream', file: a.file, size: a.size });
  };

  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const toggle = (c: BroadcastChannel) => set({ channels: d.channels.includes(c) ? d.channels.filter((x) => x !== c) : [...d.channels, c] });
  const whenLabel = `${weekdayName(d.date, true)}, ${formatDate(d.date)}, ${clock(d.time)}`;
  const staffOnly = d.audience === 'staff';
  const target = staffOnly ? t('principal.broadcast.toStaff', { count: r?.staff ?? 0 }) : t('principal.broadcast.toFamilies', { count: r?.families ?? 0 });
  const blocked = !d.title.trim() || !d.body.trim() ? t('principal.broadcast.needText') : !d.channels.length ? t('principal.broadcast.needChannel') : needsPick ? t('principal.broadcast.needAudience') : null;
  const channelSub: Record<BroadcastChannel, string> = {
    push: t('principal.broadcast.pushSub', { count: staffOnly ? (r?.push ?? 0) : (r?.families_on_app ?? 0), formatted: (staffOnly ? (r?.push ?? 0) : (r?.families_on_app ?? 0)).toLocaleString('en-IN') }),
    in_app: t('principal.broadcast.inAppSub'),
    sms: staffOnly ? t('principal.broadcast.smsStaffSub', { count: r?.sms ?? 0 }) : t('principal.broadcast.smsSub', { count: r?.families_without_app ?? 0, formatted: (r?.families_without_app ?? 0).toLocaleString('en-IN') }),
    whatsapp: t('principal.broadcast.whatsappSub', { count: r?.whatsapp ?? 0, formatted: (r?.whatsapp ?? 0).toLocaleString('en-IN') }),
    email: t('principal.broadcast.emailSub', { count: r?.email ?? 0, formatted: (r?.email ?? 0).toLocaleString('en-IN') }),
  };
  const via = d.channels.filter((c) => c !== 'email' && c !== 'whatsapp').map((c) => t(`principal.broadcast.via_${c}`));
  const viaAll = [...via, ...d.channels.filter((c) => c === 'whatsapp' || c === 'email').map((c) => t(`principal.broadcast.via_${c}`))];

  return (
    <Screen
      dock
      gap={16}
      header={
        <AppBar
          subtitle={d.savedAt ? t('principal.broadcast.draftSaved', { time: formatTime(new Date(d.savedAt)) }) : t('principal.broadcast.newNotice')}
          title={t('principal.broadcast.title')}
          theme={false}
          actions={
            <>
              <ThemeToggle />
              <IconButton icon="history" size="lg" label={t('principal.broadcast.sentList')} onPress={() => router.push('/announcements')} />
            </>
          }
        />
      }>
      <View style={{ gap: 10 }}>
        <SectionHead title={t('principal.broadcast.sendTo')} />
        <View accessibilityRole="radiogroup" style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
          {d.audience === 'route' ? <Chip label={t('principal.broadcast.routeFamilies', { route: params.route ?? '' })} icon="bus" selected style={{ height: 44 }} /> : null}
          <Chip label={t('principal.broadcast.school')} icon="school" selected={d.audience === 'everyone'} onPress={() => set({ audience: 'everyone' })} style={{ height: 44 }} />
          <Chip
            label={d.audience === 'grades' && d.grades.length ? t('principal.broadcast.gradesPicked', { list: d.grades.join(', ') }) : t('principal.broadcast.grades')}
            icon="chevronDown"
            selected={d.audience === 'grades'}
            onPress={() => {
              set({ audience: 'grades' });
              setPicker('grades');
            }}
            style={{ height: 44 }}
          />
          <Chip
            label={d.audience === 'sections' && d.sections.length ? t('principal.broadcast.sectionsPicked', { count: d.sections.length }) : t('principal.broadcast.sections')}
            icon="chevronDown"
            selected={d.audience === 'sections'}
            onPress={() => {
              set({ audience: 'sections' });
              setPicker('sections');
            }}
            style={{ height: 44 }}
          />
          <Chip label={t('principal.broadcast.staff')} selected={d.audience === 'staff'} onPress={() => set({ audience: 'staff' })} style={{ height: 44 }} />
          <Chip label={t('principal.broadcast.parents')} selected={d.audience === 'parents'} onPress={() => set({ audience: 'parents' })} style={{ height: 44 }} />
        </View>
      </View>

      <Card variant="flat" pad={0} style={[styles.row, { paddingVertical: 14, paddingHorizontal: 16, gap: 12, alignItems: 'flex-start' }]}>
        <View style={[styles.tile, { backgroundColor: colors.brandSoft }]}>
          <Icon name="users" size={ICON_SIZE.sm} rawColor={colors.brandInk} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="xs" color="muted" weight={600}>
            {t('principal.broadcast.reach')}
          </Text>
          <Text variant="h3" num style={{ marginTop: 2 }}>
            {needsPick ? t('principal.broadcast.pickFirst') : r ? reachMain(r, d.audience, t) : '…'}
          </Text>
          {r && !needsPick ? (
            <Text variant="xs" color="muted" style={{ marginTop: 2 }}>
              {reachSub(r, d.audience, t)}
            </Text>
          ) : null}
        </View>
      </Card>

      <TextField
        label={t('principal.broadcast.titleLabel')}
        labelRight={
          <Text variant="xs" color="muted" num>
            {`${d.title.length}/80`}
          </Text>
        }
        value={d.title}
        onChangeText={(v) => set({ title: v })}
        maxLength={80}
        placeholder={t('principal.broadcast.titlePlaceholder')}
      />
      <View style={{ gap: 6 }}>
        <TextField
          label={t('principal.broadcast.message')}
          labelRight={
            <Text variant="xs" color="muted" num>
              {`${d.body.length.toLocaleString('en-IN')}/1,000`}
            </Text>
          }
          value={d.body}
          onChangeText={(v) => set({ body: v })}
          multiline
          maxLength={1000}
          style={{ minHeight: 200 }}
          placeholder={t('principal.broadcast.messagePlaceholder')}
        />
        {d.channels.includes('sms') ? (
          <View style={[styles.row, { gap: 6, alignItems: 'flex-start' }]}>
            <Icon name="info" size={13} rawColor={colors.muted} />
            <Text variant="xs" color="muted" style={{ flex: 1 }}>
              {t('principal.broadcast.smsHint')}
            </Text>
          </View>
        ) : null}
      </View>

      <Card pad={0} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
        <View style={[styles.row, { justifyContent: 'space-between', paddingTop: 14, paddingBottom: 6 }]}>
          <Text variant="h3">{t('principal.broadcast.channels')}</Text>
          <Text variant="xs" color="muted" weight={600}>
            {t('principal.broadcast.onCount', { count: d.channels.length, total: CHANNELS.length })}
          </Text>
        </View>
        {CHANNELS.map((c, i) => {
          const on = d.channels.includes(c.key);
          return (
            <Pressable
              key={c.key}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(c.key)}
              style={[styles.row, { gap: 12, paddingVertical: 12 }, i < CHANNELS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }, pointer]}>
              <View style={[styles.tileSm, { backgroundColor: colors.sunken }]}>
                <Icon name={c.icon} size={16} rawColor={colors.ink2} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                <View style={[styles.row, { gap: 8 }]}>
                  <Text variant="sm" weight={700}>
                    {t(`principal.broadcast.ch_${c.key}`)}
                  </Text>
                  {c.key === 'whatsapp' ? <Pill label={t('principal.broadcast.optional')} tone="outline" dot={false} /> : null}
                </View>
                <Text variant="xs" color="muted">
                  {channelSub[c.key]}
                </Text>
              </View>
              <Switch value={on} label={t(`principal.broadcast.ch_${c.key}`)} decorative />
            </Pressable>
          );
        })}
      </Card>

      <View style={{ gap: 10 }}>
        <SectionHead
          title={t('principal.broadcast.when')}
          action={
            <Text variant="xs" color="muted" weight={600}>
              {d.later ? t('principal.broadcast.sendsAt', { when: whenLabel }) : t('principal.broadcast.rightAway')}
            </Text>
          }
        />
        <SegmentedControl
          value={d.later ? 'later' : 'now'}
          onChange={(v) => set({ later: v === 'later' })}
          options={[
            { value: 'now', label: t('principal.broadcast.now'), icon: 'send' },
            { value: 'later', label: t('principal.broadcast.later'), icon: 'clock' },
          ]}
          style={{ height: 52 }}
        />
        {d.later ? (
          <View style={[styles.row, { gap: 10, alignItems: 'flex-start' }]}>
            <DateField label={t('principal.broadcast.date')} value={d.date} onChange={(v) => set({ date: v })} min={isoDate(new Date())} sundays style={{ flex: 1 }} />
            <TimeField label={t('principal.broadcast.time')} value={d.time} onChange={(v) => set({ time: v })} from="06:00" to="21:00" style={{ flex: 1 }} />
          </View>
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        <SectionHead
          title={t('principal.broadcast.attachment')}
          action={
            <Text variant="xs" color="muted" weight={600}>
              {t('principal.broadcast.attachmentHint')}
            </Text>
          }
        />
        <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
          {file ? (
            <View style={[styles.row, styles.fileChip, { borderColor: colors.lineStrong, backgroundColor: colors.surface }]}>
              <Icon name="document" size={ICON_SIZE.sm} rawColor={colors.ink2} />
              <Text variant="sm" color="ink2" numberOfLines={1} style={{ maxWidth: 140 }}>
                {file.name}
              </Text>
              {file.size ? (
                <Text variant="xs" color="muted" weight={600}>
                  {fileSize(file.size)}
                </Text>
              ) : null}
              <IconButton icon="close" variant="bare" size="sm" label={t('staff.homework.remove', { name: file.name })} onPress={() => setFile(null)} />
            </View>
          ) : null}
          <Chip label={t('principal.broadcast.addFile')} icon="paperclip" onPress={() => void pick()} style={{ height: 46 }} />
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <SectionHead
          title={t('principal.broadcast.preview')}
          action={
            <Text variant="xs" color="muted" weight={600}>
              {staffOnly ? t('principal.broadcast.onStaffPhone') : t('principal.broadcast.onParentPhone')}
            </Text>
          }
        />
        <Well style={{ paddingVertical: 18, paddingHorizontal: 16, gap: 10 }}>
          <Card pad={0} style={[styles.row, { padding: 12, paddingHorizontal: 14, borderRadius: 18, gap: 12, alignItems: 'flex-start' }]}>
            <View style={[styles.appIcon, { backgroundColor: colors.brand }]}>
              <Icon name="school" size={20} rawColor={colors.onBrand} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <View style={[styles.row, { gap: 6 }]}>
                <Text variant="xs" weight={700} color="muted" numberOfLines={1} style={{ flex: 1 }}>
                  {`EduFlow · ${school?.name ?? ''}`}
                </Text>
                <Text variant="xxs" color="muted" weight={600}>
                  {d.later ? clock(d.time) : t('principal.broadcast.nowWord')}
                </Text>
              </View>
              <Text variant="sm" weight={700} numberOfLines={1}>
                {d.title || t('principal.broadcast.titlePlaceholder')}
              </Text>
              <Text variant="xs" color="ink2" numberOfLines={2}>
                {(d.body || t('principal.broadcast.messagePlaceholder')).replace(/\s+/g, ' ')}
              </Text>
            </View>
          </Card>
          <Text variant="xxs" color="muted" weight={600} align="center">
            {file ? t('principal.broadcast.opensWith', { name: file.name }) : t('principal.broadcast.opens')}
          </Text>
        </Well>
      </View>

      <View style={{ gap: 10 }}>
        <Button
          title={blocked ?? (d.later ? t('principal.broadcast.schedule', { when: whenLabel }) : t('principal.broadcast.send', { target }))}
          icon={blocked ? undefined : d.later ? 'clock' : 'send'}
          size="lg"
          fullWidth
          disabled={!!blocked}
          loading={send.isPending}
          onPress={() => send.mutate()}
        />
        {!blocked ? (
          <Text variant="xs" color="muted" align="center">
            {staffOnly ? t('principal.broadcast.viaStaff', { list: viaAll.join(', ') }) : t('principal.broadcast.via', { list: viaAll.join(', ') })}
          </Text>
        ) : null}
      </View>

      <AudiencePicker
        kind={picker}
        onClose={() => setPicker(null)}
        grades={sections.data?.grades ?? []}
        sections={sections.data?.sections ?? []}
        picked={picker === 'grades' ? d.grades : d.sections}
        onChange={(list) => set(picker === 'grades' ? { grades: list } : { sections: list })}
      />
    </Screen>
  );
}

function reachMain(r: { families: number; staff: number }, audience: Audience, t: (k: string, o?: Record<string, unknown>) => string) {
  if (audience === 'staff') return t('principal.broadcast.staffCount', { count: r.staff });
  const fam = t('principal.broadcast.familiesCount', { count: r.families, formatted: r.families.toLocaleString('en-IN') });
  return r.staff ? `${fam} · ${t('principal.broadcast.staffCount', { count: r.staff })}` : fam;
}

function reachSub(r: { families: number; teachers: number; support: number; staff: number }, audience: Audience, t: (k: string, o?: Record<string, unknown>) => string) {
  if (audience === 'staff') return t('principal.broadcast.subStaff', { teachers: r.teachers, support: r.support });
  if (audience === 'everyone') return t('principal.broadcast.subSchool', { count: r.families.toLocaleString('en-IN'), teachers: r.teachers, support: r.support });
  if (audience === 'parents') return t('principal.broadcast.subParents', { count: r.families.toLocaleString('en-IN') });
  if (audience === 'route') return t('principal.broadcast.subRoute', { count: r.families });
  return t('principal.broadcast.subSome', { count: r.families.toLocaleString('en-IN') });
}

function AudiencePicker({
  kind,
  onClose,
  grades,
  sections,
  picked,
  onChange,
}: {
  kind: 'grades' | 'sections' | null;
  onClose: () => void;
  grades: string[];
  sections: { id: string; short_label: string; grade: string }[];
  picked: string[];
  onChange: (list: string[]) => void;
}) {
  const { t } = useTranslation();
  const flip = (v: string) => onChange(picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v]);
  return (
    <Sheet visible={!!kind} onClose={onClose} title={kind === 'grades' ? t('principal.broadcast.pickGrades') : t('principal.broadcast.pickSections')}>
      <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
        {kind === 'grades'
          ? grades.map((g) => <Chip key={g} label={/^\d+$/.test(g) ? t('principal.attendance.gradeN', { grade: g }) : g} selected={picked.includes(g)} onPress={() => flip(g)} />)
          : sections.map((s) => <Chip key={s.id} label={s.short_label} selected={picked.includes(s.id)} onPress={() => flip(s.id)} />)}
      </View>
      <Button title={t('principal.broadcast.done', { count: picked.length })} size="lg" fullWidth onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  tile: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileSm: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  fileChip: { height: 46, paddingLeft: 14, gap: 8, borderRadius: 23, borderWidth: 1 },
  appIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
