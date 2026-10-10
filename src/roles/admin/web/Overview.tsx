import { motion } from 'framer-motion'
import { ArrowRight, Check, Inbox, Lock, ShieldAlert, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, Button, Card, CardHeader, EmptyState, Page, PageHeader, listItem } from '@/components/ui'
import { QueryState, Unavailable } from '@/components/states'
import { TwoCol } from '@/components/shell/Web'
import { useAuditPage, useCorrections, useMemberships, useNow } from '@/api/queries'
import { useAuth } from '@/auth/AuthProvider'
import { ago, dateLabel, firstName, greeting, plural } from '@/lib/format'
import { auditActionLabel, isSensitive } from '@/roles/_shared/audit'
import { CorrectionBody, useCorrectionDecision } from '@/roles/_shared/approvals'
import { useCan } from '@/roles/principal/web/shared'

/** Member user id → name, for audit rows (GET /memberships). */
export function useActorNames() {
  const can = useCan()
  const m = useMemberships(can('user.read'))
  return (id: string | null) => (id && m.data?.find(x => x.user.id === id)?.user.full_name) || (id ? 'A member' : 'System')
}

export function Overview() {
  const { user } = useAuth()
  const now = useNow()
  const can = useCan()
  const canApprove = can('attendance.approve')
  const desk = useCorrections('pending', canApprove)
  const audit = useAuditPage({}, can('audit.read'))
  const nameOf = useActorNames()
  const { decide, pending: busy } = useCorrectionDecision()
  const sensitive = (audit.data?.results ?? []).filter(e => isSensitive(e.action)).slice(0, 6)

  return (
    <Page>
      <PageHeader eyebrow={`Admin office · ${dateLabel(now, { weekday: 'long', day: 'numeric', month: 'long' })}`}
        title={`${greeting(now)}, ${firstName(user?.full_name ?? '')}.`}
        subtitle={canApprove ? (desk.data ? `${desk.data.length ? plural(desk.data.length, 'attendance correction') + ' waiting on you' : 'Nothing waiting on you'}.` : undefined) : undefined} />

      <Unavailable blocker="fees" className="mb-5">
        Today's collections, the month's total, overdue fees and payroll status need the fees and payroll APIs (fees: Phase 10; payroll: not yet planned).
      </Unavailable>

      <TwoCol
        main={<>
          <Card>
            <CardHeader eyebrow="Payroll" title="This month's salaries" />
            <Unavailable blocker="payroll" compact />
          </Card>

          <Card>
            <CardHeader eyebrow="Your desk" title={canApprove && desk.data?.length ? `${plural(desk.data.length, 'decision')} waiting on you` : 'Nothing waiting on you'} />
            {canApprove ? (
              <QueryState q={desk} empty={l => (l.length ? null : <EmptyState icon={Inbox} title="Desk is clear" body="Attendance corrections land here for a decision." />)}>
                {l => (
                  <div className="space-y-3">
                    {l.slice(0, 5).map(c => (
                      <motion.div key={c.id} variants={listItem} initial="hidden" animate="show" className="rounded-[13px] border border-line p-4">
                        <CorrectionBody c={c} dense selfName={user?.full_name} />
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" icon={X} disabled={busy} onClick={() => decide(c, 'decline')}>Decline</Button>
                          <Button size="sm" icon={Check} disabled={busy} onClick={() => decide(c, 'approve')}>Approve</Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </QueryState>
            ) : <p className="text-[13.5px] text-stone">Your role doesn't decide attendance corrections.</p>}
            <Unavailable blocker="fees" compact className="mt-4">Refunds, expenses and admission approvals join this desk with the fees and admissions APIs.</Unavailable>
          </Card>

          <Card>
            <CardHeader eyebrow="Admissions" title="Families in the pipeline" />
            <Unavailable blocker="admissions" compact />
          </Card>
        </>}
        side={<>
          <Card>
            <CardHeader eyebrow="Finance watch" title="What the engine flagged" />
            <Unavailable blocker="monitoring" compact />
          </Card>

          {can('audit.read') && (
            <Card>
              <CardHeader eyebrow="Audit" title="Recent sensitive actions"
                action={<Link to="/admin/audit" className="inline-flex items-center gap-1 text-[13px] font-medium text-forest hover:underline">Full log <ArrowRight size={14} /></Link>} />
              <QueryState q={audit} empty={() => (sensitive.length ? null : <EmptyState icon={Lock} title="Nothing sensitive yet" />)}>
                {() => (
                  <div>
                    {sensitive.map(e => (
                      <motion.div key={e.id} variants={listItem} initial="hidden" animate="show" className="flex gap-3 border-b border-line-2 py-2.5 last:border-0">
                        <Avatar name={nameOf(e.actor_id)} size={28} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] text-charcoal"><span className="font-medium text-ink">{nameOf(e.actor_id)}</span> · {auditActionLabel(e.action).toLowerCase()}</div>
                          <div className="truncate text-[12px] text-stone">{e.target_type}{e.outcome !== 'success' ? ` · ${e.outcome}` : ''}</div>
                        </div>
                        <span className="shrink-0 text-[11.5px] text-stone-l">{ago(e.occurred_at, now)}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </QueryState>
              <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-paper/70 px-3 py-2 text-[12px] text-stone">
                <ShieldAlert size={14} className="shrink-0 text-copper" /> Entries are append-only. Nobody — including you — can edit them.
              </div>
            </Card>
          )}
        </>}
      />
    </Page>
  )
}
