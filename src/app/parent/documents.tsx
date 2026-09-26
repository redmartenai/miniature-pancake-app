import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { DocumentItem, StudentDocuments } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { downloadFile, openFile } from '@/lib/download';
import { fileSize, formatDate, weekdayName } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import {
  AppBar,
  Avatar,
  Button,
  Card,
  Chip,
  ErrorState,
  Icon,
  ICON_SIZE,
  IconButton,
  ListRow,
  LoadingCards,
  Pill,
  Screen,
  SectionHead,
  SegmentedControl,
  Sheet,
  Text,
  TextField,
  TileIcon,
  useToast,
  type IconName,
  type TileTone,
} from '@/ui';

type Requestable = 'bonafide' | 'character' | 'study';

/** ParentDocuments: report cards, fee receipts, circulars and certificates for each child. */
export default function ParentDocuments() {
  const { t } = useTranslation();
  const family = useFamily();
  const [childId, setChildId] = useState<string | undefined>(family.selected?.id);
  const child = family.students.find((s) => s.id === childId) ?? family.selected;
  const studentId = child?.id;
  const [sheet, setSheet] = useState(false);
  const docs = useQuery({ queryKey: ['documents', studentId], queryFn: () => api.documents(studentId as string), enabled: !!studentId });
  const data = docs.data;
  const issued = data?.certificates.filter((c) => c.state === 'ready').length ?? 0;

  return (
    <Screen
      dock
      gap={18}
      refreshing={docs.isRefetching}
      onRefresh={docs.refetch}
      header={<AppBar back title={t('parent.documents.title')} subtitle={t('parent.documents.subtitle')} />}>
      {family.students.length > 1 ? (
        <SegmentedControl
          value={studentId ?? ''}
          onChange={setChildId}
          options={family.students.map((s, i) => ({
            value: s.id,
            label: `${s.first_name} · ${s.class.short_label}`,
            badge: <Avatar initials={s.initials} size="xs" tone={i ? 4 : 1} />,
          }))}
          style={{ height: 52 }}
        />
      ) : null}
      {family.isParent ? (
        <View style={{ gap: 8 }}>
          <Button title={t('parent.documents.request')} icon="plus" size="lg" fullWidth onPress={() => setSheet(true)} />
          <Text variant="xs" color="muted" align="center">
            {t('parent.documents.requestHint')}
          </Text>
        </View>
      ) : null}
      {docs.error ? <ErrorState error={docs.error} onRetry={docs.refetch} /> : null}
      {docs.isLoading ? <LoadingCards count={3} /> : null}
      {data ? (
        <>
          <Section title={t('parent.documents.reportCards')} items={data.report_cards} icon="award" tone="lav" />
          <Section
            title={t('parent.documents.receipts')}
            items={data.receipts.map((r) => ({ ...r, title: r.date ? `${r.title} · ${formatDate(r.date)}` : r.title }))}
            icon="receipt"
            tone="mint"
            subtitle={(r) => r.subtitle.replace(/^Receipt /, '')}
          />
          <Section
            title={t('parent.documents.circulars')}
            items={data.circulars}
            icon="speaker"
            tone="info"
            subtitle={(d) => [d.date ? formatDate(d.date, { year: true }) : null, fileSize(d.size)].filter(Boolean).join(' · ')}
          />
          <Certificates data={data} issued={issued} onRequest={() => setSheet(true)} />
        </>
      ) : null}
      {studentId && child ? <RequestSheet visible={sheet} onClose={() => setSheet(false)} studentId={studentId} name={child.first_name} data={data} /> : null}
    </Screen>
  );
}

function Section({
  title,
  items,
  icon,
  tone,
  subtitle,
}: {
  title: string;
  items: DocumentItem[];
  icon: IconName;
  tone: TileTone;
  subtitle?: (d: DocumentItem) => string;
}) {
  const { t } = useTranslation();
  if (!items.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <SectionHead
        title={title}
        action={
          <Text variant="xs" color="muted" weight={600}>
            {t('parent.documents.files', { count: items.length })}
          </Text>
        }
      />
      <Card pad={0} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
        {items.map((d, i) => (
          <ListRow
            key={d.id}
            inset={0}
            last={i === items.length - 1}
            icon={icon}
            iconTone={tone}
            title={d.title}
            subtitle={subtitle ? subtitle(d) : [d.subtitle, fileSize(d.size)].filter(Boolean).join(' · ')}
            right={<FileActions doc={d} />}
          />
        ))}
      </Card>
    </View>
  );
}

function FileActions({ doc }: { doc: DocumentItem }) {
  const { t } = useTranslation();
  const toast = useToast();
  const name = `${doc.title.replace(/[^\w\-]+/g, '_')}.pdf`;
  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger');
  return (
    <View style={{ flexDirection: 'row' }}>
      <IconButton icon="eye" variant="bare" size="lg" label={t('parent.documents.view', { name: doc.title })} onPress={() => void openFile(doc.download, name).catch(fail)} />
      <IconButton icon="download" variant="bare" size="lg" label={t('parent.documents.download', { name: doc.title })} onPress={() => void downloadFile(doc.download, name).catch(fail)} />
    </View>
  );
}

function Certificates({ data, issued, onRequest }: { data: StudentDocuments; issued: number; onRequest: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rows = data.certificates.filter((c) => c.kind === 'bonafide' || c.kind === 'transfer' || c.state !== 'available');
  return (
    <View style={{ gap: 10 }}>
      <SectionHead
        title={t('parent.documents.certificates')}
        action={
          <Text variant="xs" color="muted" weight={600}>
            {issued ? t('parent.documents.issued', { count: issued }) : t('parent.documents.noneIssued')}
          </Text>
        }
      />
      <Card pad={0} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
        {rows.map((c, i) => {
          const locked = c.state === 'locked';
          const sub =
            c.state === 'locked'
              ? t('parent.documents.lockedHint')
              : c.state === 'requested'
                ? t('parent.documents.processing')
                : c.state === 'ready'
                  ? t('parent.documents.ready')
                  : c.state === 'declined'
                    ? t('parent.documents.declined')
                    : t('parent.documents.processing');
          return (
            <ListRow
              key={c.kind}
              inset={0}
              last={i === rows.length - 1}
              icon="document"
              iconTone={locked ? 'neutral' : 'brand'}
              title={c.title}
              subtitle={sub}
              right={
                locked ? (
                  <View style={styles.locked}>
                    <Icon name="lock" size={ICON_SIZE.sm} rawColor={colors.muted} />
                    <Text variant="sm" weight={600} color="muted">
                      {t('parent.documents.locked')}
                    </Text>
                  </View>
                ) : c.state === 'ready' && c.document ? (
                  <FileActions doc={c.document} />
                ) : c.state === 'requested' ? (
                  <Pill label={t('parent.documents.requested', { date: c.requested_on ? `${weekdayName(c.requested_on, true)} ${formatDate(c.requested_on)}` : '' })} tone="warn" />
                ) : (
                  <Button title={t('parent.documents.requestOne')} variant="secondary" height={44} onPress={onRequest} />
                )
              }
            />
          );
        })}
      </Card>
    </View>
  );
}

function RequestSheet({ visible, onClose, studentId, name, data }: { visible: boolean; onClose: () => void; studentId: string; name: string; data?: StudentDocuments }) {
  const { t } = useTranslation();
  const toast = useToast();
  const client = useQueryClient();
  const options = (data?.certificates ?? []).filter((c): c is typeof c & { kind: Requestable } => c.kind !== 'transfer' && c.state !== 'requested');
  const [kind, setKind] = useState<Requestable>('bonafide');
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState<string>();
  const send = useMutation({
    mutationFn: () => api.requestCertificate(studentId, kind, purpose.trim() || undefined),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['documents', studentId] });
      toast(t('parent.documents.sent'));
      setPurpose('');
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong')),
  });
  return (
    <Sheet visible={visible} onClose={onClose} title={t('parent.documents.sheetTitle')} message={t('parent.documents.sheetBody', { name })}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((c) => (
          <Chip
            key={c.kind}
            label={c.title}
            selected={kind === c.kind}
            onPress={() => {
              setKind(c.kind);
              setError(undefined);
            }}
          />
        ))}
      </View>
      <TextField label={t('parent.documents.purpose')} placeholder={t('parent.documents.purposePlaceholder')} value={purpose} onChangeText={setPurpose} maxLength={200} error={error} />
      <Button title={t('parent.documents.send')} size="lg" fullWidth loading={send.isPending} disabled={!options.some((c) => c.kind === kind)} onPress={() => send.mutate()} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  locked: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
});
