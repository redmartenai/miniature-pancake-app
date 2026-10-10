import { AnimatePresence, motion } from 'framer-motion'
import { Check, ClipboardCheck, Inbox, X } from 'lucide-react'
import { Avatar, Button, Card, CardHeader, EmptyState, Page, PageHeader, Pill, cx, listItem } from '@/components/ui'
import { QueryState, Unavailable } from '@/components/states'
import { useCorrections, useNow } from '@/api/queries'
import { ago, dateLabel, localIso, plural } from '@/lib/format'
import { STATUS } from '@/roles/_shared/attendance'
import { correctionTitle, hoursWaiting, useCorrectionDecision } from '@/roles/_shared/approvals'
import { ToneIcon } from '@/roles/_shared/ui'

export function ApprovalsPage() {
  const now = useNow()
  const pendingQ = useCorrections('pending')
  const allQ = useCorrections()
  const { decide, pending: busy } = useCorrectionDecision()

  const pending = [...(pendingQ.data ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const decided = (allQ.data ?? []).filter(c => c.status !== 'pending').sort((a, b) => (b.decided_at ?? '').localeCompare(a.decided_at ?? ''))
  const stale = pending.filter(c => hoursWaiting(c, now) >= 24).length

  return (
    <Page>
      <PageHeader eyebrow="Approvals"
        title={pendingQ.isPending ? 'Approvals' : pending.length ? `${plural(pending.length, 'decision')} waiting on you` : 'Nothing waiting on you'}
        subtitle={stale ? `${stale} ${stale === 1 ? 'has' : 'have'} been waiting more than a day. Each one is somebody blocked.` : 'Attendance corrections for locked registers land here.'} />

      <Card padded={false} className="p-4 md:p-5">
        <QueryState q={pendingQ}>
          {() => (
            <div className="space-y-2.5">
              <AnimatePresence initial={false} mode="popLayout">
                {pending.map(c => {
                  const h = hoursWaiting(c, now)
                  const old = h >= 24
                  return (
                    <motion.div key={c.id} layout variants={listItem} initial="hidden" animate="show" exit="exit"
                      className={cx('flex flex-col gap-3 rounded-[13px] border bg-ivory-2 p-4 sm:flex-row sm:items-center', old ? 'border-rust/30' : 'border-line')}>
                      <ToneIcon icon={ClipboardCheck} tone="slate" size={38} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-ink">{correctionTitle(c)}</span>
                          <Pill tone="slate">Attendance fix</Pill>
                        </div>
                        <div className="mt-0.5 text-[13px] text-charcoal-2">{c.reason}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-stone">
                          <span className="inline-flex items-center gap-1.5"><Avatar name={c.requested_by.full_name} size={18} />{c.requested_by.full_name}</span>
                          <span>· {dateLabel(c.record.date)} · {c.record.section.name}</span>
                          <span className={cx('tabular', old ? 'font-medium text-rust' : '')}>· waiting {h < 1 ? 'under an hour' : `${h}h`}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="outline" icon={X} disabled={busy} onClick={() => decide(c, 'decline')}>Decline</Button>
                        <Button size="sm" icon={Check} disabled={busy} onClick={() => decide(c, 'approve')}>Approve</Button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              {pending.length === 0 && <EmptyState icon={Inbox} title="Queue clear" body="No one is waiting on a decision from you." />}
            </div>
          )}
        </QueryState>
        <Unavailable blocker="leave" compact className="mt-4">
          Leave, refunds, admissions, expenses and marks corrections from the design join this queue when their APIs exist (leave: Phase 6; fees: Phase 10; marks: Phase 8).
        </Unavailable>
      </Card>

      <Card padded={false} className="mt-5 p-4 md:p-5">
        <CardHeader eyebrow="History" title="Decided" action={<Pill>{decided.length}</Pill>} />
        <QueryState q={allQ} empty={() => (decided.length ? null : <EmptyState icon={Inbox} title="No decisions yet" body="Approved and declined requests will collect here." />)}>
          {() => (
            <div className="divide-y divide-line-2">
              {decided.map(c => (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full', c.status === 'approved' ? 'bg-forest-p text-forest' : 'bg-rust-p text-rust')}>
                    {c.status === 'approved' ? <Check size={13} strokeWidth={2.6} /> : <X size={13} strokeWidth={2.6} />}
                  </span>
                  <div className="min-w-0 flex-1 truncate text-[13.5px] text-ink">
                    {c.record.student.full_name} <span className="text-stone">· {STATUS[c.old_status].label} → {STATUS[c.new_status].label} · {c.requested_by.full_name}</span>
                  </div>
                  <span className="shrink-0 text-[12px] text-stone">{c.status === 'approved' ? 'Approved' : 'Declined'}{c.decided_by ? ` by ${c.decided_by.full_name}` : ''} {c.decided_at ? ago(localIso(c.decided_at), now) : ''}</span>
                </div>
              ))}
            </div>
          )}
        </QueryState>
      </Card>
    </Page>
  )
}
