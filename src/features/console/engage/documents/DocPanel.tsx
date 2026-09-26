import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { downloadFile } from '@/lib/download';
import { formatDate, formatTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Button, Icon, IconButton, pointer, Text, useToast } from '@/ui';

import { useConsoleQuery } from '../../api';
import { DataTable, type Column } from '../../Table';
import { documentsApi, type AccessEntry, type PermissionRow } from '../api';
import { Dialog, errorText, stamp } from '../common';
import { size, TypeBadge } from './parts';

const CELLS = ['view', 'download', 'upload'] as const;

/** The right-hand panel: preview, facts, the permissions matrix, recent access, Download / Full log. */
export function DocPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const q = useConsoleQuery(['doc', id], () => documentsApi.detail(id));
  const d = q.data;
  const [rows, setRows] = useState<PermissionRow[]>([]);
  const [log, setLog] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (d) setRows(d.permissions);
  }, [d]);
  const dirty = !!d && JSON.stringify(rows) !== JSON.stringify(d.permissions);
  const save = useMutation({
    mutationFn: () =>
      documentsApi.savePermissions(
        id,
        rows.filter((r) => r.subject !== 'principal').map(({ subject, view, download, upload }) => ({ subject, view, download, upload })),
      ),
    onSuccess: () => {
      toast(t('console.engage.docs.permissionsSaved'));
      void client.invalidateQueries({ queryKey: ['console'] });
    },
    onError: (e) => toast(errorText(e, t('console.engage.somethingWrong')), 'danger'),
  });
  const download = async () => {
    if (!d) return;
    setBusy(true);
    try {
      await downloadFile(documentsApi.fileUrl(d.id), d.name);
      void client.invalidateQueries({ queryKey: ['console'] });
    } catch (e) {
      toast(errorText(e, t('console.engage.somethingWrong')), 'danger');
    } finally {
      setBusy(false);
    }
  };
  const flip = (subject: string, cell: (typeof CELLS)[number]) =>
    setRows((prev) =>
      prev.map((r) => {
        if (r.subject !== subject) return r;
        const next = { ...r, [cell]: !r[cell] };
        // Downloading needs viewing; turning view off turns download off.
        if (cell === 'download' && next.download) next.view = true;
        if (cell === 'view' && !next.view) next.download = false;
        return next;
      }),
    );

  if (!d) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text variant="sm" color="muted">
          {t('console.engage.loading')}
        </Text>
      </View>
    );
  }
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
      accessibilityLabel={t('console.engage.docs.details', { name: d.name })}>
      <View style={[styles.row, { gap: 10, alignItems: 'flex-start' }]}>
        <TypeBadge doc={d} size={30} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="sm" weight={700} numberOfLines={2}>
            {d.name}
          </Text>
          <Text variant="xxs" color="muted" weight={600}>
            {t('console.engage.docs.sizeVersion', { size: size(d.size), version: d.version })}
          </Text>
        </View>
        <IconButton icon="close" variant="bare" size="sm" label={t('console.engage.close')} onPress={onClose} />
      </View>

      <View
        style={[styles.preview, { backgroundColor: colors.sunken }]}
        accessibilityRole="image"
        accessibilityLabel={t('console.engage.docs.previewA11y', { name: d.name })}>
        <View style={[styles.page, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={[styles.line, { width: '38%', backgroundColor: colors.brandLine }]} />
          {[92, 86, 90, 70].map((w, i) => (
            <View key={i} style={[styles.line, { width: `${w}%`, backgroundColor: colors.line }]} />
          ))}
          <View style={[styles.box, { borderColor: colors.lineStrong }]} />
          <View style={[styles.line, { width: '60%', backgroundColor: colors.line }]} />
        </View>
        {d.pages ? (
          <Text variant="xxs" color="muted" weight={600} style={styles.pageNo}>
            {t('console.engage.docs.pageOf', { n: 1, total: d.pages })}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: 6 }}>
        <Meta label={t('console.engage.docs.owner')} value={d.owner ?? '—'} />
        <Meta label={t('console.engage.docs.updated')} value={`${formatDate(d.updated_at)}, ${formatTime(d.updated_at)}`} />
        <Meta
          label={t('console.engage.docs.downloadsLabel')}
          value={t(`console.engage.docs.reach_${d.reach.unit}`, { n: d.reach.downloaded, of: d.reach.of })}
        />
      </View>

      <View style={{ gap: 2 }}>
        <View style={[styles.row, styles.permHead, { borderBottomColor: colors.line }]}>
          <Text variant="eyebrow" color="muted" style={{ flex: 1 }}>
            {t('console.engage.docs.permissions')}
          </Text>
          {(['eye', 'download', 'upload'] as const).map((icon, i) => (
            <View key={icon} style={styles.cell} accessible accessibilityLabel={t(`console.engage.docs.cell_${CELLS[i]}`)}>
              <Icon name={icon} size={14} rawColor={colors.muted} />
            </View>
          ))}
        </View>
        {rows.map((r, i) => (
          <View
            key={r.subject}
            style={[styles.row, styles.permRow, i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
            <Text variant="xs" weight={600} numberOfLines={1} style={{ flex: 1 }}>
              {subjectLabel(t, r)}
            </Text>
            {CELLS.map((cell) => {
              const fixed = r.subject === 'principal' || r.fixed.includes(cell);
              const on = r[cell];
              return (
                <Pressable
                  key={cell}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${subjectLabel(t, r)} · ${t(`console.engage.docs.cell_${cell}`)}${fixed ? ` (${t('console.engage.docs.fixed')})` : ''}`}
                  accessibilityState={{ checked: on, disabled: fixed }}
                  disabled={fixed}
                  onPress={() => flip(r.subject, cell)}
                  style={[styles.cell, !fixed && pointer]}>
                  <View
                    style={[
                      styles.check,
                      {
                        backgroundColor: on ? colors.brand : colors.surface,
                        borderColor: on ? colors.brand : colors.lineStrong,
                        opacity: fixed ? 0.45 : 1,
                      },
                    ]}>
                    {on ? <Icon name="check" size={12} rawColor={colors.onBrand} bold /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
        <Text variant="xxs" color="muted" style={{ marginTop: 8 }}>
          {t('console.engage.docs.fadedNote')}
        </Text>
        {dirty ? (
          <View style={[styles.row, { gap: 8, marginTop: 8 }]}>
            <Button
              title={t('console.engage.docs.savePermissions')}
              size="sm"
              loading={save.isPending}
              onPress={() => save.mutate()}
              style={{ flex: 1 }}
            />
            <Button title={t('console.engage.cancel')} variant="ghost" size="sm" onPress={() => setRows(d.permissions)} />
          </View>
        ) : null}
      </View>

      <View style={[styles.audited, { backgroundColor: colors.brandSoft }]}>
        <Icon name="shield" size={15} rawColor={colors.brandInk} />
        <Text variant="xs" color="ink2" style={{ flex: 1 }}>
          <Text variant="xs" weight={700} color="ink">
            {t('console.engage.docs.auditedTitle')}
          </Text>
          {` ${t('console.engage.docs.auditedBody')}`}
        </Text>
      </View>

      <View style={{ gap: 2 }}>
        <Text variant="eyebrow" color="muted" style={{ marginBottom: 6 }}>
          {t('console.engage.docs.recentAccess')}
        </Text>
        {d.recent.map((e, i) => (
          <View
            key={e.id}
            style={[
              styles.row,
              { gap: 10, paddingVertical: 8 },
              i < d.recent.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line },
            ]}>
            <Avatar initials={e.user?.initials} name={e.user?.name} size="xs" tone={([1, 3, 2] as const)[i % 3]} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="xs" weight={700} numberOfLines={1}>
                {e.role ? `${e.user?.name ?? '—'} · ${t(`console.engage.docs.role_${e.role}`)}` : (e.user?.name ?? '—')}
              </Text>
              <Text variant="xxs" color="muted" numberOfLines={1}>
                {`${t(`console.engage.docs.act_${e.action}`)} · ${whenShort(t, e.at)}`}
              </Text>
            </View>
          </View>
        ))}
        {!d.recent.length ? (
          <Text variant="xs" color="muted">
            {t('console.engage.docs.noAccess')}
          </Text>
        ) : null}
      </View>

      <View style={[styles.row, { gap: 8 }]}>
        <Button
          title={t('console.engage.docs.download')}
          icon="download"
          variant="secondary"
          loading={busy}
          onPress={() => void download()}
          style={{ flex: 1 }}
        />
        <Button title={t('console.engage.docs.fullLog')} variant="ghost" onPress={() => setLog(true)} />
      </View>
      <FullLog id={d.id} name={d.name} visible={log} onClose={() => setLog(false)} />
    </View>
  );
}

/** "1:48 PM" today, "21 Sep" before. */
function whenShort(t: (k: string, o?: Record<string, unknown>) => string, iso: string) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? formatTime(d) : formatDate(d);
}

export function subjectLabel(
  t: (k: string, o?: Record<string, unknown>) => string,
  r: Pick<PermissionRow, 'subject' | 'scope' | 'route'>,
): string {
  if (r.subject === 'principal' || r.subject === 'accountant' || r.subject === 'staff') return t(`console.engage.docs.sub_${r.subject}`);
  if (r.route) return t('console.engage.docs.sub_route', { scope: r.scope });
  if (!r.scope) return t(`console.engage.docs.sub_${r.subject}_all`);
  return t(`console.engage.docs.sub_${r.subject}`, { scope: r.scope });
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.row, { justifyContent: 'space-between', gap: 10 }]}>
      <Text variant="xs" color="muted">
        {label}
      </Text>
      <Text variant="xs" weight={600} numberOfLines={1} style={{ flexShrink: 1 }} align="right">
        {value}
      </Text>
    </View>
  );
}

function FullLog({ id, name, visible, onClose }: { id: string; name: string; visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const q = useConsoleQuery(['doc-log', id], () => documentsApi.log(id), { enabled: visible });
  const columns: Column<AccessEntry>[] = [
    {
      key: 'who',
      title: t('console.engage.docs.colWho'),
      flex: 2,
      render: (e) => (e.role ? `${e.user?.name ?? '—'} · ${t(`console.engage.docs.role_${e.role}`)}` : (e.user?.name ?? '—')),
    },
    { key: 'what', title: t('console.engage.docs.colWhat'), width: 170, render: (e) => t(`console.engage.docs.act_${e.action}`) },
    { key: 'when', title: t('console.engage.docs.colWhen'), width: 170, render: (e) => stamp(t, e.at, formatTime, (x) => formatDate(x)) },
    { key: 'device', title: t('console.engage.docs.colDevice'), flex: 1, render: (e) => e.device || '—' },
  ];
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('console.engage.docs.logTitle', { name })}
      subtitle={q.data ? t('console.engage.docs.logSub', { count: q.data.total }) : undefined}
      width={860}>
      <View style={{ marginHorizontal: -24, marginTop: -16 }}>
        <DataTable
          columns={columns}
          rows={q.data?.items ?? []}
          rowKey={(e) => e.id}
          dense
          empty={<Text color="muted">{t('console.engage.loading')}</Text>}
        />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 16 },
  preview: { height: 150, borderRadius: 14, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  page: {
    width: 94,
    height: 124,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 10,
    gap: 6,
  },
  line: { height: 4, borderRadius: 2 },
  box: { height: 16, borderWidth: 1, borderStyle: 'dashed', borderRadius: 3, marginVertical: 2 },
  pageNo: { position: 'absolute', right: 10, bottom: 8 },
  permHead: { paddingBottom: 8, borderBottomWidth: 1 },
  permRow: { paddingVertical: 8 },
  cell: { width: 34, alignItems: 'center', justifyContent: 'center' },
  check: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  audited: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, alignItems: 'flex-start' },
});
