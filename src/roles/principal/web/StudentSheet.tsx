import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Mail, Phone } from 'lucide-react'
import { useState } from 'react'
import { Avatar, Eyebrow, IconButton, Sheet, cx, ease } from '@/components/ui'
import { QueryState, Unavailable } from '@/components/states'
import type { S } from '@/api/endpoints'
import { useEnrollments, useGuardianDetails, useGuardiansOf, useStudent, useStudentMonth } from '@/api/queries'
import { dateLabel, humanize, isoDate, monthLabel, toDate } from '@/lib/format'
import { DAY_STATUS } from '@/roles/_shared/attendance'
import { Legend, Metric } from '@/roles/_shared/ui'

export const shiftMonth = (ym: string, n: number) => {
  const d = toDate(`${ym}-01`)
  d.setMonth(d.getMonth() + n)
  return isoDate(d).slice(0, 7)
}

export function StudentSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [shown, setShown] = useState(id)
  if (id && id !== shown) setShown(id) // keep content while the dialog animates out
  const q = useStudent(shown)
  return (
    <Sheet open={!!id} onClose={onClose} variant="dialog" title={q.data?.full_name ?? 'Student'}>
      {shown && <QueryState q={q}>{s => <StudentDetail s={s} />}</QueryState>}
    </Sheet>
  )
}

function StudentDetail({ s }: { s: S['StudentOut'] }) {
  const enr = useEnrollments({ student_id: s.id })
  const e = enr.data?.[0]
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5">
        <Avatar name={s.full_name} size={52} />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] text-charcoal-2">{e ? `${e.grade.name} · ${e.section.name}${e.roll_number ? ` · Roll ${e.roll_number}` : ''}` : 'Not enrolled this year'}</div>
          <div className="text-[12.5px] text-stone">Admission no. {s.admission_number} · {humanize(s.status)}</div>
        </div>
      </div>

      <MonthStrip studentId={s.id} />

      <section className="grid grid-cols-3 gap-3 rounded-[12px] bg-paper/60 p-3.5">
        <Metric label="Date of birth" value={s.date_of_birth ? dateLabel(s.date_of_birth, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
        <Metric label="Admitted" value={s.admission_date ? dateLabel(s.admission_date, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
        <Metric label="Gender" value={s.gender ? humanize(s.gender) : '—'} />
      </section>

      <Family studentId={s.id} />

      <section className="space-y-2">
        <Eyebrow>Marks · fees · remarks</Eyebrow>
        <Unavailable blocker="assessment" compact />
        <Unavailable blocker="fees" compact />
        <Unavailable blocker="remarks" compact />
      </section>
    </div>
  )
}

/** One month of attendance from GET /students/{id}/attendance?month=YYYY-MM. */
export function MonthStrip({ studentId }: { studentId: string }) {
  const [month, setMonth] = useState(isoDate().slice(0, 7))
  const q = useStudentMonth(studentId, month)
  const current = isoDate().slice(0, 7)
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Eyebrow className="!mb-0">Attendance · {monthLabel(month)}</Eyebrow>
        <div className="flex items-center gap-1">
          <IconButton icon={ChevronLeft} label="Previous month" onClick={() => setMonth(m => shiftMonth(m, -1))} />
          <IconButton icon={ChevronRight} label="Next month" onClick={() => month < current && setMonth(m => shiftMonth(m, 1))} className={month >= current ? 'opacity-30' : ''} />
        </div>
      </div>
      <QueryState q={q}>
        {m => {
          const marked = m.summary.marked_days
          const inSchool = m.summary.present + m.summary.late + m.summary.half_day
          return (
            <>
              <div className="flex flex-wrap gap-[3px]">
                {m.days.filter(d => d.status && d.status !== 'upcoming').map((d, i) => (
                  <motion.span key={d.date} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.01, duration: 0.25, ease: ease.out }}
                    title={`${dateLabel(d.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${DAY_STATUS[d.status!].label}`}
                    className={cx('h-3 w-3 rounded-[3px]', d.status === 'present' ? 'bg-forest-l' : d.status === 'late' ? 'bg-amber' : d.status === 'absent' ? 'bg-rust' : d.status === 'half_day' ? 'bg-slate-l' : d.status === 'excused' ? 'bg-stone-l' : 'bg-line-2')} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <Legend items={[{ label: 'Present', className: 'bg-forest-l' }, { label: 'Late', className: 'bg-amber' }, { label: 'Absent', className: 'bg-rust' }, { label: 'Not marked', className: 'bg-line-2' }]} />
                <span className="text-[12.5px] tabular text-stone">{marked ? `${inSchool}/${marked} days in school` : 'No registers this month'}</span>
              </div>
            </>
          )
        }}
      </QueryState>
    </section>
  )
}

function Family({ studentId }: { studentId: string }) {
  const links = useGuardiansOf(studentId)
  const details = useGuardianDetails(studentId)
  return (
    <section>
      <Eyebrow>Family</Eyebrow>
      <QueryState q={links} empty={l => (l.length ? null : <div className="rounded-[10px] border border-dashed border-line px-3 py-4 text-[13px] text-stone">No guardian on record.</div>)}>
        {l => (
          <div className="grid gap-3 sm:grid-cols-2">
            {l.map(g => {
              const d = details.data?.find(x => x.id === g.guardian.id)
              return (
                <div key={g.id} className="rounded-[12px] border border-line-2 p-3.5">
                  <div className="font-medium text-ink">{g.guardian.full_name} <span className="font-normal text-stone">· {humanize(g.relationship)}{g.is_primary ? ' · primary' : ''}</span></div>
                  {d?.phone && <a href={`tel:${d.phone.replace(/\s/g, '')}`} className="mt-1.5 flex items-center gap-2 text-[13px] text-charcoal-2 hover:text-forest"><Phone size={13} /> {d.phone}</a>}
                  {d?.email && <a href={`mailto:${d.email}`} className="mt-1 flex items-center gap-2 truncate text-[13px] text-charcoal-2 hover:text-forest"><Mail size={13} /> {d.email}</a>}
                </div>
              )
            })}
          </div>
        )}
      </QueryState>
    </section>
  )
}
