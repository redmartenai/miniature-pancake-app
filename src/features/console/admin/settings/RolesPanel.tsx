import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useConsoleQuery } from '@/features/console/api';
import { CardHead, Panel } from '@/features/console/Page';
import { formatDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Button, Card, Checkbox, Chip, Icon, pointer, Skeleton, Text, TextField, TileIcon, useToast } from '@/ui';

import {
  ACTIONS,
  adminApi,
  SCOPES,
  type ActionKey,
  type ModuleChange,
  type ModuleKey,
  type ModuleRow,
  type RoleDetail,
  type RoleSummary,
  type Scope,
} from '../api';
import { Dialog, Dropdown } from '../Overlay';

type Draft = Partial<Record<ModuleKey, ModuleChange>>;

export function useRoleName() {
  const { t } = useTranslation();
  return (r: Pick<RoleSummary, 'key' | 'name' | 'system'>) =>
    r.system ? t(`console.admin.roles.${r.key}` as never, { defaultValue: r.name }) : r.name;
}

/** Roles & permissions: role chips, the module × action matrix with data scopes, and the unsaved-changes bar. */
export function RolesPanel({ roles, canEdit }: { roles: RoleSummary[]; canEdit: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const roleName = useRoleName();
  const [selected, setSelected] = useState('teacher');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);
  const key = roles.some((r) => r.key === selected) ? selected : (roles[0]?.key ?? 'teacher');
  const detail = useConsoleQuery(['admin', 'role', key], () => adminApi.role(key));
  const role = detail.data;
  const draft = drafts[key] ?? {};
  const setDraft = (next: Draft) => setDrafts((d) => ({ ...d, [key]: next }));
  const editable = canEdit && !!role?.editable;

  const refresh = () => qc.invalidateQueries({ queryKey: ['console'] });
  const save = useMutation({
    mutationFn: () => adminApi.saveRole(key, draft),
    onSuccess: (res) => {
      setDraft({});
      toast(t('console.admin.settings.rolesPanel.savedToast', { role: roleName(res), count: res.saved ?? 0 }));
      refresh();
    },
    onError: (e) => toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : String(e), 'danger'),
  });
  const remove = useMutation({
    mutationFn: () => adminApi.deleteRole(key),
    onSuccess: () => {
      toast(t('console.admin.settings.rolesPanel.deleted', { role: role?.name ?? '' }));
      setDeleting(false);
      setSelected('teacher');
      refresh();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : String(e), 'danger'),
  });
  const unassign = useMutation({
    mutationFn: (userId: string) => adminApi.removeMember(key, userId),
    onSuccess: refresh,
  });

  const changes = useMemo(() => describe(draft, role, t), [draft, role, t]);

  return (
    <View style={{ gap: 20 }}>
      <Panel pad={22} gap={18}>
        <CardHead
          title={
            <View style={{ gap: 2 }}>
              <Text variant="h2" accessibilityRole="header">
                {t('console.admin.settings.rolesPanel.title')}
              </Text>
              <Text variant="sm" color="muted">
                {t('console.admin.settings.rolesPanel.subtitle')}
              </Text>
            </View>
          }
          right={
            canEdit ? (
              <Button
                title={t('console.admin.settings.rolesPanel.custom')}
                icon="plus"
                variant="secondary"
                size="sm"
                onPress={() => setCreating(true)}
              />
            ) : null
          }
        />

        <View
          style={styles.chips}
          accessibilityRole={'group' as never}
          accessibilityLabel={t('console.admin.settings.rolesPanel.chooseRole')}>
          {roles.map((r) => (
            <Chip
              key={r.key}
              label={roleName(r)}
              count={r.users.toLocaleString('en-IN')}
              selected={r.key === key}
              onPress={() => setSelected(r.key)}
              style={
                drafts[r.key] && Object.keys(drafts[r.key]).length && r.key !== key
                  ? { borderColor: colors.brandLine, borderStyle: 'dashed' }
                  : undefined
              }
            />
          ))}
        </View>

        {role ? (
          <RoleWell
            role={role}
            editable={editable}
            canEdit={canEdit}
            onDelete={() => setDeleting(true)}
            onAdd={() => setAdding(true)}
            onRemove={(id) => unassign.mutate(id)}
          />
        ) : (
          <Skeleton height={64} style={{ borderRadius: 14 }} />
        )}

        {role ? (
          <Matrix role={role} draft={draft} editable={editable} onChange={setDraft} />
        ) : (
          <Skeleton height={560} style={{ borderRadius: 16 }} />
        )}

        <View style={[styles.callout, { backgroundColor: colors.brandSoft, borderColor: colors.brandLine }]}>
          <Icon name="shield" size={18} rawColor={colors.brandInk} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="sm" weight={700}>
              {t('console.admin.settings.rolesPanel.calloutTitle')}
            </Text>
            <Text variant="xs" color="ink2">
              {t('console.admin.settings.rolesPanel.calloutBody')}
            </Text>
          </View>
        </View>
      </Panel>

      {changes.length ? (
        <Card pad={0} style={[styles.bar, { borderColor: colors.brandLine }]}>
          <View
            accessibilityRole={'region' as never}
            accessibilityLabel={t('console.admin.settings.rolesPanel.unsavedRegion')}
            style={styles.barInner}>
            <View style={[styles.row, { gap: 10, flex: 1, minWidth: 0 }]}>
              <View style={[styles.dot, { backgroundColor: colors.warn }]} />
              <Text variant="sm" weight={700}>
                {t('console.admin.settings.rolesPanel.unsaved')}
              </Text>
              <Text variant="sm" color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                · {role ? roleName(role) : ''}: {changes.join(', ')}
              </Text>
            </View>
            <View style={[styles.row, { gap: 10 }]}>
              <Button title={t('console.admin.settings.rolesPanel.discard')} variant="ghost" onPress={() => setDraft({})} />
              <Button
                title={t('console.admin.settings.rolesPanel.save')}
                icon="check"
                loading={save.isPending}
                onPress={() => save.mutate()}
              />
            </View>
          </View>
        </Card>
      ) : null}

      <NewRoleDialog visible={creating} roles={roles} onClose={() => setCreating(false)} onCreated={(k) => setSelected(k)} />
      {role && !role.system ? (
        <>
          <Dialog
            visible={deleting}
            onClose={() => setDeleting(false)}
            title={t('console.admin.settings.rolesPanel.deleteTitle', { role: role.name })}
            footer={
              <>
                <Button title={t('common.cancel')} variant="ghost" onPress={() => setDeleting(false)} />
                <Button
                  title={t('console.admin.settings.rolesPanel.deleteRole')}
                  variant="danger"
                  loading={remove.isPending}
                  onPress={() => remove.mutate()}
                />
              </>
            }>
            <Text variant="sm" color="ink2">
              {t('console.admin.settings.rolesPanel.deleteBody', { count: role.users })}
            </Text>
          </Dialog>
          <AddMemberDialog visible={adding} role={role} onClose={() => setAdding(false)} />
        </>
      ) : null}
    </View>
  );
}

/** "Transport → View, Reports → Export" for the unsaved bar. */
function describe(draft: Draft, role: RoleDetail | undefined, t: (k: string, o?: Record<string, unknown>) => string): string[] {
  if (!role) return [];
  const out: string[] = [];
  for (const row of role.modules) {
    const d = draft[row.module];
    if (!d) continue;
    const mod = t(`console.admin.modules.${row.module}`);
    const acts = ACTIONS.filter((a) => d[a] !== undefined).map((a) => (d[a] ? '' : '−') + t(`console.admin.actions.${a}`));
    if (acts.length) out.push(`${mod} → ${acts.join(', ')}`);
    if (d.data_scope)
      out.push(t('console.admin.settings.rolesPanel.scopeChange', { module: mod, scope: t(`console.admin.scopes.${d.data_scope}`) }));
  }
  return out;
}

function RoleWell({
  role,
  editable,
  canEdit,
  onDelete,
  onAdd,
  onRemove,
}: {
  role: RoleDetail;
  editable: boolean;
  canEdit: boolean;
  onDelete: () => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const roleName = useRoleName();
  const kind = role.system ? t('console.admin.settings.rolesPanel.systemRole') : t('console.admin.settings.rolesPanel.customRole');
  const rule = !role.system
    ? t('console.admin.settings.rolesPanel.editableCustom')
    : role.editable
      ? t('console.admin.settings.rolesPanel.editableSystem')
      : t('console.admin.settings.rolesPanel.lockedSystem');
  const changed = role.changed_at
    ? t('console.admin.settings.rolesPanel.changed', { date: formatDate(role.changed_at.slice(0, 10)) })
    : t('console.admin.settings.rolesPanel.neverChanged');
  return (
    <View style={[styles.well, { backgroundColor: colors.sunken }]}>
      <View style={[styles.row, { justifyContent: 'space-between', gap: 14 }]}>
        <View style={[styles.row, { gap: 10, flexShrink: 1 }]}>
          <TileIcon icon={role.system ? 'users' : 'key'} size="sm" />
          <View style={{ flexShrink: 1 }}>
            <Text variant="sm" weight={700}>
              {t('console.admin.settings.rolesPanel.head', {
                role: roleName(role),
                users: t('console.admin.settings.rolesPanel.users', { count: role.users }),
              })}
            </Text>
            <Text variant="xs" color="muted">
              {kind} · {rule} · {changed}
            </Text>
          </View>
        </View>
        <View style={[styles.row, { gap: 14 }]}>
          <Legend />
          {!role.system && canEdit ? (
            <Button title={t('console.admin.settings.rolesPanel.deleteRole')} variant="ghost" size="sm" onPress={onDelete} />
          ) : null}
        </View>
      </View>
      {!role.system ? (
        <View
          style={[
            styles.row,
            { gap: 8, flexWrap: 'wrap', paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderColor: colors.line, borderStyle: 'dashed' },
          ]}>
          <Text variant="xxs" color="muted" weight={700} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {t('console.admin.settings.rolesPanel.members')}
          </Text>
          {role.members.length ? (
            role.members.map((m) => (
              <View key={m.id} style={[styles.member, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <Text variant="xs" weight={600}>
                  {m.name}
                </Text>
                {editable ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('console.admin.settings.rolesPanel.removeMember', { name: m.name })}
                    onPress={() => onRemove(m.id)}
                    style={pointer}
                    hitSlop={6}>
                    <Icon name="close" size={12} rawColor={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
            ))
          ) : (
            <Text variant="xs" color="muted">
              {t('console.admin.settings.rolesPanel.noMembers')}
            </Text>
          )}
          {editable ? (
            <Button title={t('console.admin.settings.rolesPanel.addMember')} icon="plus" variant="ghost" size="sm" onPress={onAdd} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Legend() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const box = { width: 14, height: 14, borderRadius: 4 };
  return (
    <View style={[styles.row, { gap: 14 }]}>
      <View style={[styles.row, { gap: 6 }]}>
        <View style={[box, { backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }]}>
          <Icon name="check" size={10} rawColor={colors.onBrand} bold />
        </View>
        <Text style={[styles.legend, { color: colors.muted }]}>{t('console.admin.settings.rolesPanel.legendAllowed')}</Text>
      </View>
      <View style={[styles.row, { gap: 6 }]}>
        <View style={[box, { borderWidth: 1.5, borderColor: colors.lineStrong, backgroundColor: colors.surface, opacity: 0.45 }]} />
        <Text style={[styles.legend, { color: colors.muted }]}>{t('console.admin.settings.rolesPanel.legendLocked')}</Text>
      </View>
      <View style={[styles.row, { gap: 6 }]}>
        <Text style={[styles.legend, { color: colors.muted, fontFamily: fonts.bold }]}>—</Text>
        <Text style={[styles.legend, { color: colors.muted }]}>{t('console.admin.settings.rolesPanel.legendNa')}</Text>
      </View>
      <View style={[styles.row, { gap: 6 }]}>
        <View style={[box, { backgroundColor: colors.brandSoft, borderWidth: 1, borderColor: colors.brandLine }]} />
        <Text style={[styles.legend, { color: colors.muted }]}>{t('console.admin.settings.rolesPanel.legendUnsaved')}</Text>
      </View>
    </View>
  );
}

const MODULE_W = 170;
const SCOPE_W = 170;

function Matrix({ role, draft, editable, onChange }: { role: RoleDetail; draft: Draft; editable: boolean; onChange: (d: Draft) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const roleName = useRoleName()(role);
  const setCell = (row: ModuleRow, patch: ModuleChange) => {
    const cur = { ...(draft[row.module] ?? {}), ...patch };
    // Drop entries that are back to the saved value.
    for (const a of ACTIONS) if (cur[a] !== undefined && cur[a] === row.cells[a].allowed) delete cur[a];
    if (cur.data_scope !== undefined && cur.data_scope === row.data_scope) delete cur.data_scope;
    const next = { ...draft, [row.module]: cur };
    if (!Object.keys(cur).length) delete next[row.module];
    onChange(next);
  };
  const scopeOptions = SCOPES.map((s) => ({ value: s, label: t(`console.admin.scopes.${s}`) }));

  return (
    <View style={[styles.table, { backgroundColor: colors.surface, borderColor: colors.line }]} accessibilityRole={'table' as never}>
      <View style={[styles.tr, { backgroundColor: colors.subtle, borderBottomColor: colors.line }]} accessibilityRole={'row' as never}>
        <View style={[styles.th, { width: MODULE_W, paddingLeft: 16 }]} accessibilityRole={'columnheader' as never}>
          <Text style={[styles.thText, { color: colors.muted, fontSize: 11 }]}>{t('console.admin.settings.rolesPanel.module')}</Text>
        </View>
        {ACTIONS.map((a) => (
          <View key={a} style={[styles.th, styles.actionCol, { paddingHorizontal: 2 }]} accessibilityRole={'columnheader' as never}>
            <Text style={[styles.thText, { color: colors.muted, textAlign: 'center' }]}>{t(`console.admin.actions.${a}`)}</Text>
          </View>
        ))}
        <View style={[styles.th, { width: SCOPE_W, paddingLeft: 10, paddingRight: 16 }]} accessibilityRole={'columnheader' as never}>
          <Text style={[styles.thText, { color: colors.muted, fontSize: 11 }]}>{t('console.admin.settings.rolesPanel.dataScope')}</Text>
        </View>
      </View>
      {role.modules.map((row, i) => {
        const d = draft[row.module] ?? {};
        const scope: Scope = d.data_scope ?? row.data_scope;
        const note = t(`console.admin.moduleNotes.${row.module}` as never, { defaultValue: '' });
        const mod = t(`console.admin.modules.${row.module}`);
        return (
          <View
            key={row.module}
            style={[styles.tr, { borderBottomColor: colors.line, borderBottomWidth: i === role.modules.length - 1 ? 0 : 1 }]}
            accessibilityRole={'row' as never}>
            <View style={[styles.td, { width: MODULE_W, paddingLeft: 16, paddingRight: 12, gap: 1 }]}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 18, color: colors.ink }}>{mod}</Text>
              {note ? (
                <Text variant="xxs" color="muted" weight={600}>
                  {note}
                </Text>
              ) : null}
            </View>
            {ACTIONS.map((a) => (
              <ActionCell
                key={a}
                row={row}
                action={a}
                value={d[a]}
                role={roleName}
                module={mod}
                editable={editable && scope !== 'none'}
                onToggle={(v) => setCell(row, { [a]: v })}
              />
            ))}
            <View style={[styles.td, { width: SCOPE_W, paddingLeft: 10, paddingRight: 16 }]}>
              <Dropdown
                value={scope}
                options={scopeOptions}
                onChange={(v) => setCell(row, { data_scope: v })}
                label={t('console.admin.settings.rolesPanel.scopeLabel', { module: mod })}
                disabled={!editable || row.scope_locked}
                locked={row.scope_locked}
                changed={d.data_scope !== undefined}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ActionCell({
  row,
  action,
  value,
  role,
  module,
  editable,
  onToggle,
}: {
  row: ModuleRow;
  action: ActionKey;
  value: boolean | undefined;
  role: string;
  module: string;
  editable: boolean;
  onToggle: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const cell = row.cells[action];
  const act = t(`console.admin.actions.${action}`);
  const changed = value !== undefined;
  if (cell.na) {
    return (
      <View style={[styles.td, styles.actionCol]}>
        <Text
          accessibilityRole="image"
          accessibilityLabel={t('console.admin.settings.rolesPanel.cellNa', { role, module, action: act })}
          style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 13 }}>
          —
        </Text>
      </View>
    );
  }
  const checked = value ?? cell.allowed;
  return (
    <View style={[styles.td, styles.actionCol, changed && { backgroundColor: colors.brandSoft }]}>
      <View style={{ opacity: cell.locked ? 0.45 / 0.5 : 1 }}>
        <Checkbox
          checked={checked}
          disabled={cell.locked || !editable}
          label={t(cell.locked ? 'console.admin.settings.rolesPanel.cellLocked' : 'console.admin.settings.rolesPanel.cellLabel', {
            role,
            module,
            action: act,
          })}
          onChange={onToggle}
        />
      </View>
    </View>
  );
}

function NewRoleDialog({
  visible,
  roles,
  onClose,
  onCreated,
}: {
  visible: boolean;
  roles: RoleSummary[];
  onClose: () => void;
  onCreated: (key: string) => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const roleName = useRoleName();
  const [name, setName] = useState('');
  const [basedOn, setBasedOn] = useState('');
  const create = useMutation({
    mutationFn: () => adminApi.createRole(name.trim(), basedOn),
    onSuccess: (role) => {
      toast(t('console.admin.settings.rolesPanel.created', { role: role.name }));
      qc.invalidateQueries({ queryKey: ['console'] });
      onCreated(role.key);
      setName('');
      setBasedOn('');
      onClose();
    },
  });
  const error = create.error instanceof ApiError ? (create.error.fieldMessage('name') ?? create.error.fieldMessage()) : undefined;
  const options = [
    { value: '', label: t('console.admin.settings.rolesPanel.nothing') },
    ...roles.filter((r) => r.key !== 'principal').map((r) => ({ value: r.key, label: roleName(r) })),
  ];
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('console.admin.settings.rolesPanel.newTitle')}
      subtitle={t('console.admin.settings.rolesPanel.newSubtitle')}
      footer={
        <>
          <Button title={t('common.cancel')} variant="ghost" onPress={onClose} />
          <Button
            title={t('console.admin.settings.rolesPanel.create')}
            disabled={!name.trim()}
            loading={create.isPending}
            onPress={() => create.mutate()}
          />
        </>
      }>
      <TextField
        label={t('console.admin.settings.rolesPanel.name')}
        placeholder={t('console.admin.settings.rolesPanel.namePlaceholder')}
        value={name}
        onChangeText={setName}
        error={error}
        maxLength={60}
      />
      <View style={{ gap: 7 }}>
        <Text variant="xs" weight={600} color="ink2">
          {t('console.admin.settings.rolesPanel.basedOn')}
        </Text>
        <Dropdown
          value={basedOn}
          options={options}
          onChange={setBasedOn}
          label={t('console.admin.settings.rolesPanel.basedOn')}
          style={{ height: 40 }}
        />
      </View>
    </Dialog>
  );
}

function AddMemberDialog({ visible, role, onClose }: { visible: boolean; role: RoleDetail; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const staff = useConsoleQuery(['admin', 'staff-picker', q], () => adminApi.staff(q), { enabled: visible });
  const add = useMutation({
    mutationFn: (id: string) => adminApi.addMember(role.key, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['console'] }),
  });
  const members = new Set(role.members.map((m) => m.id));
  return (
    <Dialog visible={visible} onClose={onClose} title={t('console.admin.settings.rolesPanel.pickStaff', { role: role.name })}>
      <TextField icon="search" placeholder={t('console.admin.settings.rolesPanel.searchStaff')} value={q} onChangeText={setQ} autoFocus />
      <View>
        {(staff.data?.items ?? []).map((s) => (
          <View key={s.id} style={[styles.row, { paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderColor: colors.line }]}>
            <View style={{ flex: 1 }}>
              <Text variant="sm" weight={700}>
                {s.name}
              </Text>
              <Text variant="xs" color="muted">
                {s.title}
              </Text>
            </View>
            {members.has(s.id) ? (
              <Icon name="check" size={16} rawColor={colors.ok} />
            ) : (
              <Button
                title={t('console.admin.settings.rolesPanel.add')}
                size="sm"
                variant="secondary"
                loading={add.isPending && add.variables === s.id}
                onPress={() => add.mutate(s.id)}
              />
            )}
          </View>
        ))}
        {staff.data && !staff.data.items.length ? (
          <Text variant="sm" color="muted">
            {t('console.admin.settings.rolesPanel.noStaff')}
          </Text>
        ) : null}
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  well: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  legend: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, height: 26 },
  table: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: 1 },
  th: { justifyContent: 'center', paddingVertical: 10 },
  thText: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 12.5, letterSpacing: 0.2, textTransform: 'uppercase' },
  td: { justifyContent: 'center', paddingVertical: 10 },
  actionCol: { flexGrow: 1, flexBasis: 0, minWidth: 0, alignItems: 'center', paddingHorizontal: 2 },
  callout: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  bar: { borderWidth: 1 },
  barInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 14,
    paddingLeft: 22,
    paddingRight: 18,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
