import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDate } from '@/lib/format';
import { appendFiles, type PickedFile } from '@/lib/pick';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Bar, Button, Chip, Icon, ICON_SIZE, IconButton, Link, pointer, Search, Switch, Text, TextField, useToast } from '@/ui';

import { ConsolePage } from '../../Page';
import { DataTable, TableFoot, type Column } from '../../Table';
import { documentsApi, type DocRow, type DocumentsData, type Folder } from '../api';
import { Dialog, Dropdown, errorText, FieldLabel, FilterButton } from '../common';
import { DocPanel } from './DocPanel';
import { AccessPill, size, TypeBadge } from './parts';

const PAGE = 11;
const ACCESS = ['', 'school', 'staff', 'parents', 'restricted'] as const;
const TYPES = ['', 'pdf', 'doc', 'xls', 'img'] as const;

/** PDocuments: folders, a searchable permission-aware table, and the selected document's panel. */
export function DocumentsPage() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [folder, setFolder] = useState<string | null | undefined>(undefined);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [access, setAccess] = useState('');
  const [type, setType] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'folder' | 'upload' | 'rename' | null>(null);

  // Debounce the search box.
  useEffect(() => {
    const id = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const schoolId = useSession((s) => s.schoolId);
  // Keep the last listing on screen while a new folder or filter loads.
  const query = useQuery({
    queryKey: ['console', schoolId, 'documents', folder ?? 'all', search, access, type, limit],
    queryFn: () => documentsApi.list({ folder, q: search, access, type, limit }),
    placeholderData: keepPreviousData,
  });
  const data = query.data;
  // Open on the busiest folder (this year's circulars) the first time.
  useEffect(() => {
    if (folder === undefined && data) {
      const busiest = [...data.folders].sort((a, b) => b.count - a.count)[0];
      setFolder(busiest?.id ?? null);
    }
  }, [data, folder]);
  useEffect(() => {
    if (data?.items.length && (!selected || !data.items.some((d) => d.id === selected)) && selected !== '') setSelected(data.items[0].id);
  }, [data, selected]);

  const current = data?.folder ?? null;
  const columns: Column<DocRow>[] = [
    {
      key: 'name',
      title: t('console.engage.docs.colName'),
      flex: 1.8,
      render: (d) => (
        <View style={[styles.row, { gap: 12, alignSelf: 'stretch' }]}>
          <TypeBadge doc={d} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700} numberOfLines={1}>
              {d.name}
            </Text>
            <Text variant="xs" color="muted" numberOfLines={1}>
              {d.description}
            </Text>
          </View>
        </View>
      ),
    },
    {
      key: 'owner',
      title: t('console.engage.docs.colOwner'),
      width: 108,
      render: (d) => (
        <View style={{ alignSelf: 'stretch' }}>
          <Text variant="sm" weight={600} numberOfLines={1}>
            {d.owner?.replace(/^Dr\.\s+/, '') ?? '—'}
          </Text>
          <Text variant="xs" color="muted">
            {formatDate(d.date)}
          </Text>
        </View>
      ),
    },
    { key: 'access', title: t('console.engage.docs.colAccess'), width: 154, render: (d) => <AccessPill access={d.access} /> },
    {
      key: 'size',
      title: t('console.engage.docs.colSize'),
      width: 64,
      align: 'right',
      render: (d) => (
        <Text variant="sm" num align="right">
          {size(d.size)}
        </Text>
      ),
    },
    {
      key: 'dl',
      title: (
        <View accessible accessibilityLabel={t('console.engage.docs.colDownloads')}>
          <Icon name="download" size={14} rawColor={colors.muted} />
        </View>
      ),
      width: 62,
      align: 'right',
      render: (d) => (
        <Text variant="sm" weight={700} num align="right">
          {d.downloads.toLocaleString('en-IN')}
        </Text>
      ),
    },
  ];

  return (
    <ConsolePage
      title={t('console.engage.docs.title')}
      crumbs={[{ label: t('console.shell.group.engage') }]}
      subtitle={
        data ? t('console.engage.docs.subtitle', { count: data.total_files, formatted: data.total_files.toLocaleString('en-IN') }) : ' '
      }
      actions={
        <>
          <Button title={t('console.engage.docs.newFolder')} icon="folder" variant="secondary" onPress={() => setDialog('folder')} />
          <Button title={t('console.engage.docs.upload')} icon="upload" onPress={() => setDialog('upload')} />
        </>
      }
      loading={query.isLoading && !data}
      error={query.error}
      onRetry={() => void query.refetch()}>
      {data ? (
        <View style={[styles.row, { gap: 22, alignItems: 'flex-start' }]}>
          <FolderTree data={data} value={current?.id ?? null} onChange={(id) => (setFolder(id), setLimit(PAGE), setSelected(null))} />

          <View style={[styles.card, { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={{ padding: 16, paddingBottom: 14, gap: 12 }}>
              <View style={[styles.row, { justifyContent: 'space-between', gap: 12 }]}>
                <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
                  <View style={[styles.row, { gap: 6, flexWrap: 'wrap' }]} accessibilityLabel={t('console.shell.breadcrumb')}>
                    <Pressable accessibilityRole="link" onPress={() => setFolder(null)} style={pointer}>
                      <Text variant="xs" color="muted" weight={600}>
                        {t('console.engage.docs.all')}
                      </Text>
                    </Pressable>
                    {(current?.path ?? []).map((p) => (
                      <View key={p.id} style={[styles.row, { gap: 6 }]}>
                        <Icon name="chevronRight" size={11} rawColor={colors.faint} />
                        <Pressable accessibilityRole="link" onPress={() => setFolder(p.id)} style={pointer}>
                          <Text variant="xs" color={p.id === current?.id ? 'ink2' : 'muted'} weight={600}>
                            {p.name}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                  <View style={[styles.row, { gap: 4, alignItems: 'baseline' }]}>
                    <Text variant="h3" numberOfLines={1}>
                      {current ? current.path.map((p) => p.name).join(' ') : t('console.engage.docs.all')}
                    </Text>
                    <Text variant="xs" color="muted">
                      {` · ${t('console.engage.docs.files', { count: data.total })}`}
                    </Text>
                  </View>
                </View>
                {current ? (
                  <FolderMenu
                    folder={data.folders.find((f) => f.id === current.id)!}
                    onRename={() => setDialog('rename')}
                    onDeleted={() => setFolder(null)}
                  />
                ) : null}
              </View>
              <View style={[styles.row, { gap: 10 }]}>
                <Search value={q} onChangeText={setQ} placeholder={t('console.engage.docs.searchFolder')} style={{ flex: 1, height: 38 }} />
                <Dropdown
                  label={t('console.engage.docs.accessFilter')}
                  items={ACCESS.map((a) => ({ key: a || 'any', label: t(`console.engage.docs.af_${a || 'any'}`), selected: access === a }))}
                  onSelect={(k) => (setAccess(k === 'any' ? '' : k), setLimit(PAGE))}
                  trigger={(open) => (
                    <FilterButton
                      label={t('console.engage.docs.accessIs', { value: t(`console.engage.docs.af_${access || 'any'}`).toLowerCase() })}
                      onPress={open}
                    />
                  )}
                />
                <Dropdown
                  label={t('console.engage.docs.typeFilter')}
                  align="right"
                  width={180}
                  items={TYPES.map((a) => ({ key: a || 'any', label: t(`console.engage.docs.tf_${a || 'any'}`), selected: type === a }))}
                  onSelect={(k) => (setType(k === 'any' ? '' : k), setLimit(PAGE))}
                  trigger={(open) => (
                    <FilterButton
                      label={t('console.engage.docs.typeIs', { value: t(`console.engage.docs.tf_${type || 'any'}`).toLowerCase() })}
                      onPress={open}
                    />
                  )}
                />
              </View>
            </View>
            <DataTable
              columns={columns}
              rows={data.items}
              rowKey={(d) => d.id}
              dense
              rowHeight={63}
              onRowPress={(d) => setSelected(d.id)}
              isSelected={(d) => d.id === selected}
              empty={
                <Text color="muted">{search || access || type ? t('console.engage.docs.noMatch') : t('console.engage.docs.empty')}</Text>
              }
            />
            <TableFoot
              right={
                data.total > data.items.length ? (
                  <Pressable accessibilityRole="button" onPress={() => setLimit((l) => l + 50)} style={[styles.row, pointer, { gap: 4 }]}>
                    <Text variant="sm" weight={700} rawColor={colors.brandInk}>
                      {t('console.engage.docs.showMore', { count: Math.min(50, data.total - data.items.length) })}
                    </Text>
                    <Icon name="chevronDown" size={14} rawColor={colors.brandInk} />
                  </Pressable>
                ) : null
              }>
              {t('console.engage.docs.foot', { shown: data.items.length, total: data.total })}
            </TableFoot>
          </View>

          <View style={{ width: 256 }}>{selected ? <DocPanel id={selected} onClose={() => setSelected('')} /> : null}</View>
        </View>
      ) : null}
      {data ? (
        <>
          <NewFolderDialog
            visible={dialog === 'folder'}
            onClose={() => setDialog(null)}
            folders={data.folders}
            parent={current?.id ?? null}
            onMade={(f) => setFolder(f.id)}
          />
          <UploadDialog
            visible={dialog === 'upload'}
            onClose={() => setDialog(null)}
            data={data}
            folder={current?.id ?? null}
            onDone={(d) => setSelected(d.id)}
          />
          {current ? (
            <RenameDialog
              visible={dialog === 'rename'}
              onClose={() => setDialog(null)}
              folder={data.folders.find((f) => f.id === current.id)!}
            />
          ) : null}
        </>
      ) : null}
    </ConsolePage>
  );
}

function FolderTree({ data, value, onChange }: { data: DocumentsData; value: string | null; onChange: (id: string | null) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const children = (parent: string | null) => data.folders.filter((f) => f.parent_id === parent);
  const pct = data.storage.quota ? (data.storage.used / data.storage.quota) * 100 : 0;
  const item = (f: Folder | null, depth: number) => {
    const on = (f?.id ?? null) === value;
    const icon = f?.locked ? 'lock' : 'folder';
    return (
      <Pressable
        key={f?.id ?? 'all'}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={f ? `${f.name}${f.locked ? `, ${t('console.engage.docs.locked')}` : ''}` : t('console.engage.docs.all')}
        onPress={() => onChange(f?.id ?? null)}
        style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.folder,
          pointer,
          { marginLeft: depth * 22, backgroundColor: on ? colors.brandSoft : hovered ? colors.subtle : 'transparent' },
        ]}>
        <Icon name={icon} size={ICON_SIZE.sm} rawColor={on ? colors.brandInk : colors.ink2} />
        <Text
          numberOfLines={1}
          style={[styles.folderText, { color: on ? colors.brandInk : colors.ink, fontFamily: on ? fonts.bold : fonts.medium }]}>
          {f ? f.name : t('console.engage.docs.all')}
        </Text>
      </Pressable>
    );
  };
  const tree = (parent: string | null, depth: number): React.ReactNode[] =>
    children(parent).flatMap((f) => [item(f, depth), ...tree(f.id, depth + 1)]);
  return (
    <View
      style={[styles.card, styles.tree, { backgroundColor: colors.surface, borderColor: colors.line }]}
      accessibilityRole={'navigation' as never}
      accessibilityLabel={t('console.engage.docs.folders')}>
      {item(null, 0)}
      {tree(null, 0)}
      <View style={[styles.storage, { borderTopColor: colors.line }]}>
        <Text variant="xs" weight={600}>
          {t('console.engage.docs.storage')}
        </Text>
        <Bar
          value={Math.max(pct, 0.6)}
          size="thin"
          accessibilityLabel={t('console.engage.docs.storageUsed', { used: size(data.storage.used), quota: size(data.storage.quota) })}
        />
        <Text variant="xxs" color="muted" weight={600}>
          {t('console.engage.docs.storageUsed', { used: size(data.storage.used), quota: size(data.storage.quota).replace('.0 ', ' ') })}
        </Text>
      </View>
    </View>
  );
}

function FolderMenu({ folder, onRename, onDeleted }: { folder: Folder; onRename: () => void; onDeleted: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const client = useQueryClient();
  const act = useMutation({
    mutationFn: async (key: string) => {
      if (key === 'lock') return documentsApi.updateFolder(folder.id, { locked: !folder.locked });
      if (key === 'delete') return documentsApi.deleteFolder(folder.id);
      return undefined;
    },
    onSuccess: (_r, key) => {
      if (key === 'delete') onDeleted();
      toast(
        key === 'delete'
          ? t('console.engage.docs.folderDeleted')
          : folder.locked
            ? t('console.engage.docs.unlocked')
            : t('console.engage.docs.lockedToast'),
      );
      void client.invalidateQueries({ queryKey: ['console'] });
    },
    onError: (e) => toast(errorText(e, t('console.engage.somethingWrong')), 'danger'),
  });
  return (
    <Dropdown
      label={t('console.engage.docs.folderActions')}
      align="right"
      items={[
        { key: 'rename', label: t('console.engage.docs.rename'), icon: 'edit' },
        { key: 'lock', label: folder.locked ? t('console.engage.docs.unlock') : t('console.engage.docs.lock'), icon: 'lock' },
        { key: 'delete', label: t('console.engage.docs.deleteFolder'), icon: 'close', danger: true, disabled: folder.count > 0 },
      ]}
      onSelect={(k) => (k === 'rename' ? onRename() : act.mutate(k))}
      trigger={(open) => <IconButton icon="more" size="md" label={t('console.engage.docs.folderActions')} onPress={open} />}
    />
  );
}

function NewFolderDialog({
  visible,
  onClose,
  folders,
  parent,
  onMade,
}: {
  visible: boolean;
  onClose: () => void;
  folders: Folder[];
  parent: string | null;
  onMade: (f: Folder) => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [under, setUnder] = useState<string | null>(parent);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    if (visible) {
      setName('');
      setUnder(parent);
      setLocked(false);
    }
  }, [visible, parent]);
  const make = useMutation({
    mutationFn: () => documentsApi.newFolder({ name: name.trim(), parent_id: under, locked }),
    onSuccess: (f) => {
      toast(t('console.engage.docs.folderMade', { name: f.name }));
      void client.invalidateQueries({ queryKey: ['console'] });
      onMade(f);
      onClose();
    },
    onError: (e) => toast(errorText(e, t('console.engage.somethingWrong')), 'danger'),
  });
  const parentName = folders.find((f) => f.id === under)?.name ?? t('console.engage.docs.topLevel');
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('console.engage.docs.newFolder')}
      width={480}
      footer={
        <>
          <Button title={t('console.engage.cancel')} variant="ghost" onPress={onClose} />
          <Button
            title={t('console.engage.docs.create')}
            icon="folder"
            disabled={!name.trim()}
            loading={make.isPending}
            onPress={() => make.mutate()}
          />
        </>
      }>
      <TextField
        label={t('console.engage.docs.folderName')}
        value={name}
        onChangeText={setName}
        maxLength={80}
        placeholder={t('console.engage.docs.folderPlaceholder')}
        autoFocus
      />
      <View style={{ gap: 8 }}>
        <FieldLabel>{t('console.engage.docs.inside')}</FieldLabel>
        <Dropdown
          label={t('console.engage.docs.inside')}
          width={300}
          items={[
            { key: 'top', label: t('console.engage.docs.topLevel'), selected: under === null },
            ...folders.map((f) => ({ key: f.id, label: f.name, selected: f.id === under })),
          ]}
          onSelect={(k) => setUnder(k === 'top' ? null : k)}
          trigger={(open) => <FilterButton label={parentName} icon="folder" onPress={open} style={{ alignSelf: 'flex-start' }} />}
        />
      </View>
      <View style={[styles.row, { gap: 12 }]}>
        <View style={{ flex: 1 }}>
          <Text variant="sm" weight={700}>
            {t('console.engage.docs.lockFolder')}
          </Text>
          <Text variant="xs" color="muted">
            {t('console.engage.docs.lockHint')}
          </Text>
        </View>
        <Switch value={locked} onChange={setLocked} label={t('console.engage.docs.lockFolder')} />
      </View>
    </Dialog>
  );
}

function RenameDialog({ visible, onClose, folder }: { visible: boolean; onClose: () => void; folder: Folder }) {
  const { t } = useTranslation();
  const toast = useToast();
  const client = useQueryClient();
  const [name, setName] = useState(folder.name);
  useEffect(() => setName(folder.name), [folder.name, visible]);
  const save = useMutation({
    mutationFn: () => documentsApi.updateFolder(folder.id, { name: name.trim() }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['console'] });
      onClose();
    },
    onError: (e) => toast(errorText(e, t('console.engage.somethingWrong')), 'danger'),
  });
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('console.engage.docs.rename')}
      width={440}
      footer={
        <>
          <Button title={t('console.engage.cancel')} variant="ghost" onPress={onClose} />
          <Button title={t('console.engage.docs.save')} disabled={!name.trim()} loading={save.isPending} onPress={() => save.mutate()} />
        </>
      }>
      <TextField label={t('console.engage.docs.folderName')} value={name} onChangeText={setName} maxLength={80} autoFocus />
    </Dialog>
  );
}

type UploadAccess = 'school' | 'staff' | 'parents' | 'private';

function UploadDialog({
  visible,
  onClose,
  data,
  folder,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  data: DocumentsData;
  folder: string | null;
  onDone: (d: DocRow) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const client = useQueryClient();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [into, setInto] = useState<string | null>(folder);
  const [access, setAccess] = useState<UploadAccess>('staff');
  const [classes, setClasses] = useState<string[]>([]);
  useEffect(() => {
    if (visible) {
      setFile(null);
      setTitle('');
      setDescription('');
      setInto(folder);
      setAccess('staff');
      setClasses([]);
    }
  }, [visible, folder]);
  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if ((a.size ?? 0) > 25 * 1024 * 1024) return toast(t('console.engage.docs.tooBig'), 'danger');
    setFile({ uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream', file: a.file, size: a.size });
    if (!title) setTitle(a.name.replace(/\.[^.]+$/, ''));
  };
  const send = useMutation({
    mutationFn: async () => {
      const f = new FormData();
      await appendFiles(f, 'file', [file!]);
      f.append('title', title.trim());
      f.append('description', description.trim());
      if (into) f.append('folder_id', into);
      f.append('access', access);
      f.append('class_ids', JSON.stringify(classes));
      return documentsApi.upload(f);
    },
    onSuccess: (d) => {
      toast(
        d.version > 1
          ? t('console.engage.docs.uploadedVersion', { name: d.name, version: d.version })
          : t('console.engage.docs.uploaded', { name: d.name }),
      );
      void client.invalidateQueries({ queryKey: ['console'] });
      onDone(d);
      onClose();
    },
    onError: (e) => toast(errorText(e, t('console.engage.somethingWrong')), 'danger'),
  });
  const folderName = data.folders.find((f) => f.id === into)?.name ?? t('console.engage.docs.topLevel');
  const grades = useMemo(() => Array.from(new Set(data.sections.map((s) => s.grade))), [data.sections]);
  const blocked = !file || !title.trim() || (access === 'parents' && !classes.length);
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('console.engage.docs.uploadTitle')}
      subtitle={t('console.engage.docs.uploadSub')}
      width={620}
      footer={
        <>
          <Button title={t('console.engage.cancel')} variant="ghost" onPress={onClose} />
          <Button
            title={t('console.engage.docs.upload')}
            icon="upload"
            disabled={blocked}
            loading={send.isPending}
            onPress={() => send.mutate()}
          />
        </>
      }>
      <Pressable
        accessibilityRole="button"
        onPress={() => void pick()}
        style={[styles.drop, pointer, { borderColor: colors.lineStrong, backgroundColor: colors.subtle }]}>
        <Icon name={file ? 'document' : 'upload'} size={20} rawColor={colors.brandInk} />
        <View style={{ flex: 1 }}>
          <Text variant="sm" weight={700}>
            {file ? file.name : t('console.engage.docs.chooseFile')}
          </Text>
          <Text variant="xs" color="muted">
            {file ? size(file.size ?? 0) : t('console.engage.docs.fileHint')}
          </Text>
        </View>
        {file ? <Link label={t('console.engage.docs.change')} onPress={() => void pick()} icon={null} /> : null}
      </Pressable>
      <TextField
        label={t('console.engage.docs.docTitle')}
        value={title}
        onChangeText={setTitle}
        maxLength={160}
        hint={t('console.engage.docs.versionHint')}
      />
      <TextField
        label={t('console.engage.docs.description')}
        value={description}
        onChangeText={setDescription}
        maxLength={160}
        placeholder={t('console.engage.docs.descriptionPlaceholder')}
      />
      <View style={{ gap: 8 }}>
        <FieldLabel>{t('console.engage.docs.folder')}</FieldLabel>
        <Dropdown
          label={t('console.engage.docs.folder')}
          width={300}
          items={[
            { key: 'top', label: t('console.engage.docs.topLevel'), selected: into === null },
            ...data.folders.map((f) => ({
              key: f.id,
              label: f.name,
              selected: f.id === into,
              icon: (f.locked ? 'lock' : 'folder') as 'lock',
            })),
          ]}
          onSelect={(k) => setInto(k === 'top' ? null : k)}
          trigger={(open) => <FilterButton label={folderName} icon="folder" onPress={open} style={{ alignSelf: 'flex-start' }} />}
        />
      </View>
      <View style={{ gap: 8 }}>
        <FieldLabel>{t('console.engage.docs.whoCanSee')}</FieldLabel>
        <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
          {(['school', 'staff', 'parents', 'private'] as UploadAccess[]).map((a) => (
            <Chip
              key={a}
              label={t(`console.engage.docs.up_${a}`)}
              selected={access === a}
              onPress={() => setAccess(a)}
              icon={access === a ? 'check' : undefined}
            />
          ))}
        </View>
        {access === 'parents' ? (
          <View style={[styles.well, { backgroundColor: colors.sunken }]}>
            {grades.map((g) => (
              <View key={g} style={[styles.row, { gap: 6, flexWrap: 'wrap' }]}>
                {data.sections
                  .filter((s) => s.grade === g)
                  .map((s) => (
                    <Chip
                      key={s.id}
                      label={s.label}
                      selected={classes.includes(s.id)}
                      onPress={() => setClasses((c) => (c.includes(s.id) ? c.filter((x) => x !== s.id) : [...c, s.id]))}
                      style={{ height: 30, paddingHorizontal: 10 }}
                    />
                  ))}
              </View>
            ))}
          </View>
        ) : null}
        <Text variant="xs" color="muted">
          {t('console.engage.docs.matrixHint')}
        </Text>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  tree: { width: 200, padding: 8, gap: 2 },
  folder: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 38, paddingHorizontal: 12, borderRadius: 10 },
  folderText: { flex: 1, fontSize: 13.5, lineHeight: 18 },
  storage: { borderTopWidth: 1, marginTop: 12, paddingTop: 16, paddingHorizontal: 10, paddingBottom: 10, gap: 8 },
  drop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14 },
  well: { padding: 12, borderRadius: 14, gap: 8 },
});
