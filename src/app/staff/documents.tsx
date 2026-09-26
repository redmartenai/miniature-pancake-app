import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { StaffDocument } from '@/api/types';
import { downloadFile } from '@/lib/download';
import { fileSize, formatDate } from '@/lib/format';
import { appendFiles, type PickedFile } from '@/lib/pick';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import type { Pastel } from '@/theme/tokens';
import {
  AppBar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Icon,
  ICON_SIZE,
  LoadingCards,
  Pill,
  pointer,
  Screen,
  Search,
  SegmentedControl,
  Sheet,
  Text,
  TextField,
  useToast,
  type IconName,
} from '@/ui';

const SECTION: Record<string, { tone: Pastel; icon: IconName }> = {
  lesson_plan: { tone: 'blue', icon: 'book' },
  question_paper: { tone: 'lav', icon: 'clipboard' },
  circular: { tone: 'pink', icon: 'speaker' },
  payslip: { tone: 'blue', icon: 'receipt' },
  certificate: { tone: 'blue', icon: 'award' },
  policy: { tone: 'mint', icon: 'document' },
};
const UPLOAD_KINDS = ['lesson_plan', 'question_paper', 'certificate'] as const;

/** StaffDocuments: your lesson plans, question papers, circulars, payslips and certificates, plus the staff library. */
export default function StaffDocuments() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const me = useQuery({ queryKey: ['staff-me'], queryFn: api.staffMe });
  const [scope, setScope] = useState<'mine' | 'school'>('mine');
  const [q, setQ] = useState('');
  const [uploading, setUploading] = useState(false);
  const query = useQuery({ queryKey: ['staff-documents', scope], queryFn: () => api.staffDocuments(scope) });
  const sections = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (query.data?.sections ?? [])
      .map((s) => ({ ...s, items: term ? s.items.filter((d) => [d.title, d.subtitle, d.owner ?? ''].some((v) => v.toLowerCase().includes(term))) : s.items }))
      .filter((s) => s.items.length || (!term && scope === 'mine'));
  }, [query.data, q, scope]);

  return (
    <Screen
      dock
      gap={16}
      refreshing={query.isRefetching}
      onRefresh={query.refetch}
      header={
        <AppBar
          back={() => (router.canGoBack() ? router.back() : router.navigate('/staff/me'))}
          subtitle={[user?.full_name, me.data?.profile.employee_id].filter(Boolean).join(' · ')}
          title={t('staff.documents.title')}
        />
      }>
      <SegmentedControl
        value={scope}
        onChange={setScope}
        options={[
          { value: 'mine', label: t('staff.documents.mine') },
          { value: 'school', label: t('staff.documents.school') },
        ]}
        style={{ height: 52 }}
      />
      <View style={[styles.row, { gap: 10 }]}>
        <Search value={q} onChangeText={setQ} placeholder={t('staff.documents.search')} style={{ flex: 1, height: 48 }} />
        <Button title={t('staff.documents.upload')} icon="upload" height={48} onPress={() => setUploading(true)} />
      </View>
      {query.error ? <ErrorState error={query.error} onRetry={query.refetch} /> : null}
      {!query.data ? <LoadingCards count={3} /> : null}
      {query.data && !sections.length ? <EmptyState icon="folder" title={q ? t('staff.documents.noMatch', { q }) : t('staff.documents.empty')} /> : null}
      {sections.map((s) => (
        <Section key={s.key} kind={s.key} items={s.items} dept={me.data?.profile.designation ?? ''} />
      ))}
      <UploadSheet visible={uploading} onClose={() => setUploading(false)} />
    </Screen>
  );
}

function Section({ kind, items, dept }: { kind: string; items: StaffDocument[]; dept: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const meta = SECTION[kind] ?? SECTION.policy;
  const note =
    kind === 'lesson_plan'
      ? t('staff.documents.sharedDept', { dept: dept === 'Mathematics' ? 'Maths' : dept })
      : kind === 'question_paper'
        ? t('staff.documents.confidential')
        : kind === 'circular'
          ? t('staff.documents.fromPrincipal')
          : kind === 'payslip'
            ? t('staff.documents.audited')
            : kind === 'certificate'
              ? t('staff.documents.verifiedByHr')
              : '';
  return (
    <Card pastel={meta.tone} pad={0} style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
      <View style={[styles.row, { justifyContent: 'space-between', gap: 8, paddingBottom: 6 }]}>
        <Text variant="xxs" color="muted" weight={800} style={{ letterSpacing: 1.3, textTransform: 'uppercase' }}>
          {t(`staff.documents.section_${kind}`)}
        </Text>
        <View style={[styles.row, { gap: 4 }]}>
          {kind === 'payslip' ? <Icon name="shield" size={12} rawColor={colors.muted} /> : null}
          <Text variant="xs" color="muted" weight={600}>
            {note}
          </Text>
        </View>
      </View>
      {items.length ? (
        items.map((d, i) => <DocRow key={d.id} d={d} icon={meta.icon} last={i === items.length - 1} />)
      ) : (
        <Text variant="sm" color="muted" style={{ paddingVertical: 14 }}>
          {t('staff.documents.none')}
        </Text>
      )}
    </Card>
  );
}

function DocRow({ d, icon, last }: { d: StaffDocument; icon: IconName; last: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const download = useMutation({
    mutationFn: () => downloadFile(d.download as string, `${d.title.replace(/[^\w\s-]+/g, '').replace(/\s+/g, '_')}.${d.ext.toLowerCase() || 'pdf'}`),
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
  const detail = d.locked
    ? [d.subtitle, d.locked_until ? t('staff.documents.opens', { date: formatDate(d.locked_until) }) : null]
    : d.kind === 'question_paper' && d.status === 'submitted'
      ? [t('staff.documents.sentToCell', { date: formatDate(d.date) })]
      : d.kind === 'question_paper'
        ? [d.subtitle, formatDate(d.date)]
        : d.kind === 'payslip'
          ? [d.subtitle, formatDate(d.date), d.ext]
          : d.kind === 'certificate'
            ? [t('staff.documents.uploaded', { date: formatDate(d.date) }), d.ext]
            : [d.subtitle, d.ext, d.size ? fileSize(d.size) : null, formatDate(d.date)];
  const status =
    d.locked ? (
      <Pill label={t('staff.documents.examCellOnly')} tone="outline" dot={false} />
    ) : d.status === 'accepted' ? (
      <Pill label={t('staff.documents.accepted')} tone="ok" dot={false} style={{ backgroundColor: colors.surface }} />
    ) : d.status === 'verified' ? (
      <Pill label={t('staff.documents.verified')} tone="ok" dot={false} style={{ backgroundColor: colors.surface }} />
    ) : d.status === 'in_review' ? (
      <Pill label={t('staff.documents.inReview')} tone="warn" dot={false} style={{ backgroundColor: colors.surface }} />
    ) : d.status === 'submitted' ? (
      <Pill label={t('staff.documents.submitted')} tone="info" dot={false} style={{ backgroundColor: colors.surface }} />
    ) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={d.locked ? t('staff.documents.lockedLabel', { title: d.title }) : t('staff.documents.downloadLabel', { title: d.title })}
      disabled={d.locked || !d.download}
      onPress={() => download.mutate()}
      style={[styles.row, { gap: 12, paddingVertical: 12 }, !last && { borderBottomWidth: 1, borderBottomColor: colors.pHr }, !d.locked && pointer]}>
      <View style={[styles.tile, { backgroundColor: d.locked ? colors.sunken : colors.surface }]}>
        <Icon name={d.locked ? 'lock' : icon} size={ICON_SIZE.sm} rawColor={d.locked ? colors.muted : colors.brandInk} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={[styles.row, { gap: 6 }]}>
          <Text variant="sm" weight={700} color={d.locked ? 'muted' : 'ink'} numberOfLines={1} style={{ flexShrink: 1 }}>
            {d.title}
          </Text>
          {d.new ? <Badge value={t('staff.documents.new')} /> : null}
        </View>
        <Text variant="xs" color="muted" numberOfLines={1}>
          {detail.filter(Boolean).join(' · ')}
        </Text>
      </View>
      {status ?? (
        // The whole row downloads; this is just the affordance.
        <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={d.kind === 'lesson_plan' && d.mine ? 'more' : 'download'} size={ICON_SIZE.md} rawColor={colors.ink2} />
        </View>
      )}
    </Pressable>
  );
}

function UploadSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const client = useQueryClient();
  const [kind, setKind] = useState<(typeof UPLOAD_KINDS)[number]>('lesson_plan');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);
  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setFile({ uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream', file: a.file, size: a.size });
    if (!title) setTitle(a.name.replace(/\.[^.]+$/, ''));
  };
  const upload = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('kind', kind);
      form.append('title', title.trim());
      form.append('subtitle', subtitle.trim());
      await appendFiles(form, 'file', [file!]);
      return api.uploadStaffDocument(form);
    },
    onSuccess: () => {
      toast(t(`staff.documents.uploaded_${kind}`));
      setTitle('');
      setSubtitle('');
      setFile(null);
      void client.invalidateQueries({ queryKey: ['staff-documents'] });
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger'),
  });
  return (
    <Sheet visible={visible} onClose={onClose} title={t('staff.documents.uploadTitle')} message={t(`staff.documents.uploadHint_${kind}`)}>
      <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
        {UPLOAD_KINDS.map((k) => (
          <Chip key={k} label={t(`staff.documents.kind_${k}`)} selected={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>
      <Button title={file ? file.name : t('staff.documents.chooseFile')} icon={file ? 'document' : 'paperclip'} variant="secondary" size="lg" fullWidth onPress={() => void pick()} />
      <TextField label={t('staff.documents.titleLabel')} value={title} onChangeText={setTitle} maxLength={160} />
      <TextField label={t('staff.documents.forLabel')} value={subtitle} onChangeText={setSubtitle} maxLength={160} placeholder={t('staff.documents.forPlaceholder')} />
      <Button title={t('staff.documents.upload')} icon="upload" size="lg" fullWidth disabled={!file || !title.trim()} loading={upload.isPending} onPress={() => upload.mutate()} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  tile: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
