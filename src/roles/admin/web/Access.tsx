import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, KeyRound, Lock, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Avatar, Button, Card, CardHeader, EmptyState, Page, PageHeader, Pill, Sheet, Tabs, cx, listItem, spring, useToast } from '@/components/ui'
import { ErrorState, Loading, QueryState, errorCopy } from '@/components/states'
import { TwoCol } from '@/components/shell/Web'
import { useQueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/client'
import { rbac, type S, type Scope } from '@/api/endpoints'
import { useAuditPage, useNow, usePermissionCatalog, useRoles } from '@/api/queries'
import { ago, humanize } from '@/lib/format'
import { ChoiceChips } from '@/roles/_shared/ui'
import { useCan } from '@/roles/principal/web/shared'
import { useActorNames } from './Overview'

const ACTIONS = ['read', 'create', 'update', 'delete', 'approve', 'manage', 'assign', 'disable'] as const
const SCOPES: { id: Scope; label: string; example: string }[] = [
  { id: 'school', label: 'Whole school', example: 'Every record in the school' },
  { id: 'campus', label: 'Own campus', example: 'Records of the member’s campus' },
  { id: 'department', label: 'Own department', example: 'Records of the member’s department' },
  { id: 'academic_year', label: 'Academic year', example: 'Records of the current year' },
  { id: 'section', label: 'Assigned classes', example: 'Sections the member teaches' },
  { id: 'assigned', label: 'Assigned individuals', example: 'Students or riders assigned to them' },
  { id: 'child', label: 'Own children', example: 'A parent’s own children' },
  { id: 'self', label: 'Own record', example: 'Only their own record' },
  { id: 'own', label: 'Created by them', example: 'Records they created' },
]
const scopeLabel = (s: Scope) => SCOPES.find(x => x.id === s)?.label ?? humanize(s)

/** A role's reach, summarised by its scope on student records (the design's "what each role can reach"). */
const reachOf = (r: S['RoleOut']) => {
  const s = r.permissions['student.read'] as Scope[] | undefined
  return s?.length ? s.map(scopeLabel).join(' + ') : 'No student records'
}

export function AccessPage() {
  const roles = useRoles()
  const catalog = usePermissionCatalog()
  const can = useCan()
  const now = useNow()
  const nameOf = useActorNames()
  const changes = useAuditPage({ action: 'authz.role.updated' })
  const [roleId, setRoleId] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const list = useMemo(() => [...(roles.data ?? [])].sort((a, b) => Number(b.is_system) - Number(a.is_system) || a.name.localeCompare(b.name)), [roles.data])
  const role = list.find(r => r.id === roleId) ?? list.find(r => r.key === 'teacher') ?? list[0]

  const resources = useMemo(() => {
    const m = new Map<string, Map<string, string>>()
    for (const p of catalog.data ?? []) {
      const [res, act] = p.codename.split('.')
      if (!m.has(res)) m.set(res, new Map())
      m.get(res)!.set(act, p.description)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [catalog.data])

  const locked = role?.key === 'school_admin'
  const editable = can('role.update') && !locked
  const granted = role ? Object.values(role.permissions).filter(s => s.length).length : 0

  return (
    <Page>
      <PageHeader eyebrow="Access control" title="Who can do what"
        subtitle="Every request is checked in the same order: who you are, the role you hold, the permission, and finally which records you are allowed to see. Changes here are live and audited." />

      <Card className="mb-5">
        <CardHeader eyebrow="The chain every request passes" title={`How a ${role?.name.toLowerCase() ?? 'member'} request is decided`} />
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { k: 'User', v: 'A signed-in member of this school' },
            { k: 'Role', v: role?.name ?? '—' },
            { k: 'Permission', v: 'e.g. student.read' },
            { k: 'Action', v: role?.permissions['student.read']?.length ? 'read' : 'none on students' },
            { k: 'Data scope', v: role ? reachOf(role) : '—' },
            { k: 'Record', v: 'Returned only if inside the scope; otherwise “not found”' },
          ].map((s, i, arr) => (
            <motion.div key={s.k} layout className="relative rounded-[12px] border border-line bg-paper/50 p-3">
              <div className="flex items-center gap-2">
                <span className={cx('grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold', i === 4 ? 'bg-copper text-on-copper' : 'bg-forest text-on-forest')}>{i + 1}</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">{s.k}</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={(role?.id ?? '') + s.v} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
                  className="mt-1.5 text-[13px] leading-snug text-ink">{s.v}</motion.div>
              </AnimatePresence>
              {i < arr.length - 1 && <ArrowRight size={14} className="absolute -right-[11px] top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-ivory-2 text-stone xl:block" />}
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-[12px] border border-copper/25 bg-copper-p/60 px-4 py-3">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-copper-d" />
          <p className="text-[13.5px] text-charcoal"><span className="font-semibold text-ink">Never rely on frontend hiding.</span> Every API enforces Role + Permission + Data Scope on the server. Hiding a button is a courtesy; the check is the rule.</p>
        </div>
      </Card>

      <TwoCol
        main={
          <Card padded={false}>
            {roles.isPending || catalog.isPending ? <div className="p-5"><Loading rows={8} /></div> : roles.error || catalog.error ? <ErrorState error={roles.error ?? catalog.error} onRetry={() => { roles.refetch(); catalog.refetch() }} /> : !role ? (
              <EmptyState icon={ShieldCheck} title="No roles yet" />
            ) : (
              <>
                <div className="flex flex-col gap-3 p-4 md:p-5">
                  <Tabs value={role.id} onChange={setRoleId} tabs={list.map(r => ({ id: r.id, label: r.name }))} className="w-fit max-w-full" />
                  <div className="flex flex-wrap items-center gap-2 text-[13px] text-stone">
                    <Pill tone="slate">{reachOf(role)}</Pill>
                    <span><span className="tabular text-ink">{granted}</span> permissions{role.is_system ? ' · system role' : ' · custom role'}</span>
                    {locked && <Pill tone="copper" icon={Lock}>Locked so the school can't lock itself out</Pill>}
                    {!can('role.update') && <Pill tone="stone">Read only for your role</Pill>}
                  </div>
                </div>
                <div className="scroll-quiet overflow-x-auto px-4 pb-4 md:px-5">
                  <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[13.5px]">
                    <thead>
                      <tr>
                        <th className="border-b border-line py-2.5 pr-3 text-left text-[11.5px] font-medium uppercase tracking-[0.08em] text-stone">Module</th>
                        {ACTIONS.map(a => <th key={a} className="border-b border-line px-1 py-2.5 text-center text-[11.5px] font-medium uppercase tracking-[0.08em] text-stone">{a}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {resources.map(([res, acts]) => {
                        const any = [...acts.keys()].some(a => role.permissions[`${res}.${a}`]?.length)
                        return (
                          <tr key={res}>
                            <td className="border-b border-line-2 py-2 pr-3">
                              <span className={cx('font-medium', any ? 'text-ink' : 'text-stone-l')}>{humanize(res)}</span>
                              {!any && <span className="ml-2 text-[11.5px] text-stone-l">no access</span>}
                            </td>
                            {ACTIONS.map(a => {
                              if (!acts.has(a)) return <td key={a} className="border-b border-line-2" />
                              const code = `${res}.${a}`
                              const scopes = (role.permissions[code] ?? []) as Scope[]
                              const on = scopes.length > 0
                              return (
                                <td key={a} className="border-b border-line-2 px-1 py-1.5 text-center">
                                  <motion.button whileTap={editable ? { scale: 0.85 } : undefined} onClick={() => editable && setEditing(code)} disabled={!editable}
                                    aria-pressed={on} aria-label={`${role.name} ${code}${on ? `: ${scopes.join(', ')}` : ': not granted'}`} title={`${acts.get(a)}${on ? ` · ${scopes.map(scopeLabel).join(', ')}` : ''}`}
                                    className={cx('relative mx-auto grid h-8 w-8 place-items-center rounded-[9px] border transition-colors disabled:cursor-default',
                                      on ? 'border-forest/30 bg-forest-p text-forest' : 'border-dashed border-stone-p text-stone-l', editable && (on ? 'hover:bg-forest-p/70' : 'hover:border-stone hover:bg-paper'))}>
                                    <AnimatePresence initial={false} mode="popLayout">
                                      {on && <motion.span key="on" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, opacity: 0 }} transition={spring}><Check size={15} strokeWidth={2.8} /></motion.span>}
                                    </AnimatePresence>
                                    {on && !scopes.includes('school') && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-copper ring-2 ring-ivory-2" />}
                                  </motion.button>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <p className="mt-3 flex items-center gap-1.5 text-[12px] text-stone"><span className="h-2.5 w-2.5 rounded-full bg-copper" /> Narrower than the whole school — hover a cell to see its scope.</p>
                </div>
              </>
            )}
          </Card>
        }
        side={<>
          <Card>
            <CardHeader eyebrow="Data scope by role" title="What each role can reach" />
            <div className="space-y-1">
              {list.map(r => (
                <button key={r.id} onClick={() => setRoleId(r.id)} className={cx('flex w-full items-start gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors', r.id === role?.id ? 'bg-forest-p/70' : 'hover:bg-paper/70')}>
                  <KeyRound size={15} className={cx('mt-0.5 shrink-0', r.id === role?.id ? 'text-forest' : 'text-stone')} />
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium text-ink">{r.name} <span className="font-normal text-stone">→ {reachOf(r)}</span></div>
                    <div className="text-[12px] text-stone">{r.is_system ? 'System role' : 'Custom role'}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader eyebrow="Audit" title="Recent permission changes" />
            <QueryState q={changes} empty={p => (p.results.length ? null : <EmptyState icon={ShieldCheck} title="No changes yet" body="Every change on this page is recorded here." />)}>
              {p => (
                <div>
                  {p.results.slice(0, 8).map(c => (
                    <motion.div key={c.id} layout variants={listItem} initial="hidden" animate="show" className="flex gap-3 border-b border-line-2 py-2.5 last:border-0">
                      <Avatar name={nameOf(c.actor_id)} size={26} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-ink">Changed role permissions{c.outcome !== 'success' ? ` · ${c.outcome}` : ''}</div>
                        <div className="text-[11.5px] text-stone">{nameOf(c.actor_id)} · {ago(c.occurred_at, now)}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </QueryState>
          </Card>
        </>}
      />
      {role && <GrantSheet role={role} code={editing} onClose={() => setEditing(null)} description={(catalog.data ?? []).find(p => p.codename === editing)?.description} />}
    </Page>
  )
}

/** Grant a permission with one scope, or revoke it. The server's escalation guards have the last word. */
function GrantSheet({ role, code, onClose, description }: { role: S['RoleOut']; code: string | null; onClose: () => void; description?: string }) {
  const qc = useQueryClient()
  const toast = useToast()
  const current = (code ? role.permissions[code] ?? [] : []) as Scope[]
  const [scope, setScope] = useState<Scope>('school')
  const [busy, setBusy] = useState(false)
  const [shownFor, setShownFor] = useState<string | null>(null)
  if (code && shownFor !== code) { setShownFor(code); setScope(current[0] ?? 'school') }

  const save = async (next: Scope[] | null) => {
    if (!code) return
    setBusy(true)
    const permissions = { ...role.permissions } as Record<string, Scope[]>
    if (next) permissions[code] = next
    else delete permissions[code]
    try {
      await rbac.updateRole(role.id, { permissions })
      await qc.invalidateQueries({ queryKey: ['roles'] })
      qc.invalidateQueries({ queryKey: ['audit'] })
      toast(next ? `${role.name} can now ${code.split('.')[1]} ${humanize(code.split('.')[0]).toLowerCase()} · logged` : `${role.name} can no longer ${code.split('.')[1]} ${humanize(code.split('.')[0]).toLowerCase()} · logged`, next ? 'forest' : 'rust')
      onClose()
    } catch (e) {
      toast(isApiError(e) && e.status === 403 ? 'You can only grant permissions you hold school-wide yourself' : errorCopy(e).title, 'rust')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={!!code} onClose={onClose} title={code ? `${role.name} · ${code}` : ''}
      footer={<div className="flex gap-2">
        {current.length > 0 && <Button variant="danger" disabled={busy} onClick={() => save(null)}>Revoke</Button>}
        <Button className="flex-1" disabled={busy || (current.length === 1 && current[0] === scope)} onClick={() => save([scope])}>{current.length ? 'Change scope' : 'Grant'}</Button>
      </div>}>
      {description && <p className="mb-3 text-[13.5px] text-charcoal-2">{description}</p>}
      <div className="mb-2 text-[12.5px] font-medium text-charcoal-2">Which records?</div>
      <ChoiceChips group={`scope-${role.id}`} value={scope} onChange={setScope} options={SCOPES.map(s => ({ id: s.id, label: s.label }))} />
      <p className="mt-2 text-[12.5px] text-stone">{SCOPES.find(s => s.id === scope)?.example}. A scope with no rule for this resource grants nothing.</p>
      {current.length > 0 && <p className="mt-3 text-[12.5px] text-stone">Currently: {current.map(scopeLabel).join(', ')}</p>}
    </Sheet>
  )
}
