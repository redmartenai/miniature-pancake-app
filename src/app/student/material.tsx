import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { StudyMaterial } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { downloadFile, openFile } from '@/lib/download';
import { fileSize, formatDate } from '@/lib/format';
import { useOffline } from '@/state/offline';
import { useTheme } from '@/theme/ThemeProvider';
import { pastel, type Pastel } from '@/theme/tokens';
import {
  AppBar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Icon,
  ICON_SIZE,
  IconButton,
  LoadingCards,
  Pill,
  Screen,
  Search,
  SectionHead,
  Text,
  useToast,
  Well,
  type IconName,
} from '@/ui';

const KIND_ICON: Record<StudyMaterial['kind'], IconName> = { notes: 'document', video: 'video', slides: 'presentation', worksheet: 'edit', map: 'edit' };
const KIND_TONE: Record<StudyMaterial['kind'], Pastel> = { notes: 'butter', video: 'pink', slides: 'pink', worksheet: 'mint', map: 'lav' };

const fileName = (m: StudyMaterial) => `${m.title.replace(/[^\w\s-]+/g, '').replace(/\s+/g, '_')}.pdf`;

/** StuMaterial: notes, videos, slides and worksheets from every subject teacher; new ones first. */
export default function StudentMaterial() {
  const { t } = useTranslation();
  const { subject: subjectParam } = useLocalSearchParams<{ subject?: string }>();
  const family = useFamily();
  const id = family.selected?.id;
  const query = useQuery({ queryKey: ['materials', id, ''], queryFn: () => api.materials(id as string), enabled: !!id });
  const [subject, setSubject] = useState<string>(subjectParam ?? '');
  const [search, setSearch] = useState('');
  useEffect(() => {
    if (subjectParam !== undefined) setSubject(subjectParam);
  }, [subjectParam]);
  const data = query.data;

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.items ?? []).filter(
      (m) =>
        (!subject || m.subject.code === subject) &&
        (!q || [m.title, m.description, m.author ?? '', m.subject.name, t(`student.material.kind.${m.kind}`)].some((s) => s.toLowerCase().includes(q))),
    );
  }, [data, subject, search, t]);
  const fresh = items.filter((m) => m.new);
  const earlier = items.filter((m) => !m.new);
  const [featured, ...restNew] = fresh;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const allThisMonth = earlier.every((m) => m.published_at.slice(0, 7) === thisMonth);

  return (
    <Screen
      dock
      refreshing={query.isRefetching}
      onRefresh={query.refetch}
      header={
        <AppBar
          back={() => (router.canGoBack() ? router.back() : router.navigate('/student/classes'))}
          subtitle={data ? (data.new_total ? t('student.material.newWeek', { count: data.new_total }) : t('student.material.allCaught')) : undefined}
          title={t('student.material.title')}
        />
      }>
      <Search value={search} onChangeText={setSearch} placeholder={t('student.material.search')} style={{ height: 44 }} />
      {data?.subjects.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" style={{ marginHorizontal: -20, flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
          <Chip label={t('student.material.all')} selected={!subject} onPress={() => setSubject('')} style={{ height: 44 }} />
          {data.subjects.map((s) => (
            <Chip key={s.code} label={s.name} count={s.new || undefined} selected={subject === s.code} onPress={() => setSubject(s.code)} style={{ height: 44 }} />
          ))}
        </ScrollView>
      ) : null}
      {query.error ? <ErrorState error={query.error} onRetry={query.refetch} /> : null}
      {!data ? <LoadingCards count={3} /> : null}
      {data && !items.length ? <EmptyState icon="book" title={search ? t('student.material.noMatch', { query: search }) : t('student.material.none')} /> : null}

      {fresh.length ? (
        <>
          <SectionHead
            title={t('student.material.newThisWeek')}
            action={
              <Text variant="xs" color="muted" weight={600}>
                {t('student.material.items', { count: fresh.length })}
              </Text>
            }
          />
          {featured ? <Featured item={featured} /> : null}
          {restNew.length ? (
            <Card pastel="peach" pad={0} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
              {restNew.map((m, i) => (
                <Row key={m.id} item={m} last={i === restNew.length - 1} />
              ))}
            </Card>
          ) : null}
        </>
      ) : null}
      {earlier.length ? (
        <>
          <SectionHead
            title={fresh.length ? t('student.material.earlier') : t('student.material.everything')}
            action={
              allThisMonth ? (
                <Text variant="xs" color="muted" weight={600}>
                  {t('student.material.thisMonth')}
                </Text>
              ) : undefined
            }
          />
          <Card pastel="blue" pad={0} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
            {earlier.map((m, i) => (
              <Row key={m.id} item={m} last={i === earlier.length - 1} />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function meta(m: StudyMaterial, t: (k: string, o?: Record<string, unknown>) => string): string {
  const kind = t(`student.material.kind.${m.kind}`);
  if (m.kind === 'video') return [kind, m.duration_minutes ? t('student.material.minutes', { count: m.duration_minutes }) : null].filter(Boolean).join(' · ');
  const file = [m.kind === 'slides' && m.pages ? t('student.material.slides', { count: m.pages }) : 'PDF', m.size ? fileSize(m.size) : null].filter(Boolean).join(', ');
  return m.kind === 'map' ? file : `${kind} · ${file}`;
}

/** Open a material the right way: play a video link, view a document, or save it. */
function useOpen(item: StudyMaterial) {
  const { t } = useTranslation();
  const toast = useToast();
  const markSaved = useOffline((s) => s.markSaved);
  return useMutation({
    mutationFn: async (action: 'view' | 'save') => {
      if (item.url && (item.kind === 'video' || !item.download)) {
        if (Platform.OS === 'web') window.open(item.url, '_blank', 'noopener');
        else await Linking.openURL(item.url);
        return;
      }
      if (!item.download) throw new ApiError(404, 'missing', t('student.material.unavailable'));
      if (action === 'view') await openFile(item.download, fileName(item));
      else {
        await downloadFile(item.download, fileName(item));
        markSaved(item.id);
      }
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
}

function Tile({ item, size = 40, brand }: { item: StudyMaterial; size?: number; brand?: boolean }) {
  const { colors } = useTheme();
  const p = brand ? { bg: colors.brandSoft, ink: colors.brandInk } : pastel(colors, KIND_TONE[item.kind]);
  return (
    <View style={{ width: size, height: size, borderRadius: size > 40 ? 13 : 12, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={KIND_ICON[item.kind]} size={ICON_SIZE.md} rawColor={p.ink} />
    </View>
  );
}

function Featured({ item: m }: { item: StudyMaterial }) {
  const { t } = useTranslation();
  const open = useOpen(m);
  const video = m.kind === 'video';
  return (
    <Card pastel="blue" pad={16} style={{ gap: 14 }}>
      <View style={[styles.row, { gap: 12, alignItems: 'flex-start' }]}>
        <Tile item={m} size={44} brand />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={[styles.row, { gap: 8 }]}>
            <Pill label={t('student.material.new')} tone="brand" dot={false} />
            <Text variant="xxs" color="muted" weight={700} numberOfLines={1} style={{ flexShrink: 1 }}>
              {m.subject.name} · {t(`student.material.kind.${m.kind}`)}
            </Text>
          </View>
          <Text variant="h4" style={{ marginTop: 4 }}>
            {m.title}
          </Text>
          <Text variant="xs" color="muted">
            {[m.author, formatDate(m.published_at), video ? meta(m, t) : ['PDF', m.size ? fileSize(m.size) : null].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      {m.description ? (
        <Well style={{ padding: 14, gap: 6 }}>
          <Text variant="sm" color="ink2">
            {m.description}
          </Text>
          {m.pages ? (
            <Text variant="xxs" color="muted" weight={600}>
              {t(m.kind === 'slides' ? 'student.material.slides' : 'student.material.pages', { count: m.pages })}
            </Text>
          ) : null}
        </Well>
      ) : null}
      <View style={[styles.row, { gap: 10 }]}>
        <Button
          title={video ? t('student.material.play') : t('student.material.view', { kind: t(`student.material.kind.${m.kind}`).toLowerCase() })}
          icon={video ? 'play' : 'eye'}
          height={48}
          loading={open.isPending && open.variables === 'view'}
          onPress={() => open.mutate('view')}
          style={{ flex: 1 }}
        />
        {m.download ? (
          <Button
            title={m.size ? fileSize(m.size) : t('student.material.save')}
            icon="download"
            variant="secondary"
            height={48}
            accessibilityLabel={t('student.material.downloadLabel', { title: m.title, size: m.size ? fileSize(m.size) : '' })}
            loading={open.isPending && open.variables === 'save'}
            onPress={() => open.mutate('save')}
          />
        ) : null}
      </View>
    </Card>
  );
}

function Row({ item: m, last }: { item: StudyMaterial; last: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const saved = useOffline((s) => s.saved.includes(m.id));
  const open = useOpen(m);
  // Videos play; slides and maps are for looking at; notes and worksheets are for keeping.
  const action: { icon: IconName; label: string; mode: 'view' | 'save' } =
    m.kind === 'video'
      ? { icon: 'play', label: t('student.material.playLabel', { title: m.title }), mode: 'view' }
      : m.kind === 'slides' || m.kind === 'map' || saved
        ? { icon: 'eye', label: t('student.material.viewLabel', { title: m.title }), mode: 'view' }
        : { icon: 'download', label: t('student.material.downloadLabel', { title: m.title, size: m.size ? fileSize(m.size) : '' }), mode: 'save' };
  return (
    <View style={[styles.row, { gap: 12, paddingVertical: 12 }, !last && { borderBottomWidth: 1, borderBottomColor: colors.pHr }]}>
      <Tile item={m} />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text variant="sm" weight={700} numberOfLines={1}>
          {m.title}
        </Text>
        <Text variant="xs" color="muted" numberOfLines={1}>
          {[m.author, formatDate(m.published_at)].filter(Boolean).join(' · ')}
        </Text>
        <View style={[styles.row, { gap: 6, marginTop: 2, flexWrap: 'wrap' }]}>
          {m.new ? <Pill label={t('student.material.new')} tone="brand" dot={false} style={{ height: 20, paddingHorizontal: 8 }} /> : null}
          <Text variant="xxs" color="muted" weight={600}>
            {meta(m, t)}
          </Text>
          {saved ? (
            <View style={[styles.row, { gap: 3 }]}>
              <Icon name="check" size={12} rawColor={colors.ok} bold />
              <Text variant="xxs" weight={700} color="ok">
                {t('student.material.savedOffline')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <IconButton icon={action.icon} size="lg" label={action.label} disabled={open.isPending} onPress={() => open.mutate(action.mode)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
