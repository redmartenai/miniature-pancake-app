/**
 * Approvals that exist in the backend today: attendance corrections (POST /attendance/corrections/{id}/approve|decline).
 * Leave, refunds, admissions, expenses and marks corrections from the design have no API yet.
 */
import clsx from 'clsx'
import { ArrowRight, CalendarDays, ClipboardCheck } from 'lucide-react'
import { isApiError } from '@/api/client'
import type { S } from '@/api/endpoints'
import { useDecideCorrection } from '@/api/queries'
import { useAuth } from '@/auth/AuthProvider'
import { Avatar, Pill, useToast, type Tone } from '@/components/ui'
import { errorCopy } from '@/components/states'
import { dateLabel, hoursBetween, localIso, nowIso } from '@/lib/format'
import { STATUS } from './attendance'

export type Correction = S['CorrectionOut']

export const hoursWaiting = (c: Correction, now = nowIso()) => Math.max(0, Math.round(hoursBetween(localIso(c.created_at), now)))

export function waitingLabel(h: number) {
  if (h < 1) return 'Just in'
  if (h < 24) return `Waiting ${h} h`
  const days = Math.floor(h / 24)
  return `Waiting ${days} day${days > 1 ? 's' : ''}`
}

/** Waiting longer than a day — copper; otherwise simply pending — amber. */
export const waitingTone = (h: number): Tone => (h >= 24 ? 'copper' : 'amber')

export const correctionTitle = (c: Correction) => `${c.record.student.full_name}: ${STATUS[c.old_status].label} → ${STATUS[c.new_status].label}`

/** The content of a correction request: what changes, for whom, when, why and who asked. */
export function CorrectionBody({ c, dense, selfName }: { c: Correction; dense?: boolean; selfName?: string }) {
  const h = hoursWaiting(c)
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Pill tone="slate" icon={ClipboardCheck}>Attendance correction</Pill>
        {c.status === 'pending' && <Pill tone={waitingTone(h)} dot>{waitingLabel(h)}</Pill>}
      </div>
      <h3 className={clsx('font-display leading-tight text-ink', dense ? 'mt-2.5 text-[18px]' : 'mt-4 text-[23px]')}>{c.record.student.full_name}</h3>
      <div className={clsx('flex flex-wrap items-center gap-1.5', dense ? 'mt-1.5' : 'mt-2')}>
        <Pill tone={STATUS[c.old_status].tone}>{STATUS[c.old_status].label}</Pill>
        <ArrowRight size={14} className="text-stone" />
        <Pill tone={STATUS[c.new_status].tone}>{STATUS[c.new_status].label}</Pill>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[13.5px] text-charcoal-2">
        <CalendarDays size={14} className="text-stone" />
        {dateLabel(c.record.date, { weekday: 'long', day: 'numeric', month: 'short' })} · {c.record.section.name}
      </div>
      <p className={clsx('text-charcoal-2', dense ? 'mt-2 text-[13.5px] leading-snug' : 'mt-3 text-[15px] leading-relaxed')}>{c.reason}</p>
      <div className={clsx('flex items-center gap-2.5', dense ? 'mt-3' : 'mt-5')}>
        <Avatar name={c.requested_by.full_name} size={dense ? 26 : 32} />
        <div className="min-w-0 truncate text-[13.5px] font-medium text-ink">{c.requested_by.full_name === selfName ? 'You' : c.requested_by.full_name}</div>
      </div>
    </div>
  )
}

/** Approve or decline with a toast; explains the backend's refusals (e.g. deciding one's own request). */
export function useCorrectionDecision() {
  const m = useDecideCorrection()
  const toast = useToast()
  const { user } = useAuth()
  const decide = async (c: Correction, decision: 'approve' | 'decline') => {
    try {
      await m.mutateAsync({ id: c.id, decision })
      toast(decision === 'approve' ? `Approved · ${c.record.student.full_name}'s record is corrected` : 'Declined · the record stays as it was', decision === 'approve' ? 'forest' : 'rust')
      return true
    } catch (e) {
      const own = c.requested_by.full_name === user?.full_name
      toast(isApiError(e) && e.status === 403 && own ? "You can't decide your own request — another approver must" : errorCopy(e).title, 'rust')
      return false
    }
  }
  return { decide, pending: m.isPending }
}
