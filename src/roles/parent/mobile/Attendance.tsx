/* Attendance calendar: month grids from GET /students/{id}/attendance?month=YYYY-MM. */
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react'
import { useState } from 'react'
import { IconButton, cx, ease } from '@/components/ui'
import { MSection, MobileScreen } from '@/components/shell/Mobile'
import { QueryState } from '@/components/states'
import { useStudentMonth } from '@/api/queries'
import { isoDate, monthLabel, toDate } from '@/lib/format'
import { DAY_STATUS } from '@/roles/_shared/attendance'
import { MCard } from '@/roles/_shared/ui'
import { shiftMonth } from '@/roles/principal/web/StudentSheet'

const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function AttendanceScreen({ studentId, name, classShort }: { studentId: string; name: string; classShort: string }) {
  return (
    <MobileScreen title="Attendance" eyebrow={`${name} · Class ${classShort}`}>
      <MonthCalendar studentId={studentId} withSummary />
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 px-1 text-[12.5px] text-stone">
        {[['bg-forest-p ring-1 ring-forest/20', 'Present'], ['bg-copper-p ring-1 ring-copper/30', 'Late'], ['bg-rust', 'Absent'], ['bg-slate-p ring-1 ring-slate/20', 'Half day'], ['bg-paper ring-1 ring-stone-p', 'Excused']].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5"><span className={cx('h-3 w-3 rounded-[4px]', c)} />{l}</span>
        ))}
      </div>
    </MobileScreen>
  )
}

/** One month as a calendar, with month navigation. Shared with the teacher's student view. */
export function MonthCalendar({ studentId, withSummary }: { studentId: string; withSummary?: boolean }) {
  const current = isoDate().slice(0, 7)
  const [month, setMonth] = useState(current)
  const q = useStudentMonth(studentId, month)
  const today = isoDate()
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="font-display text-[18px] text-ink">{monthLabel(month)}</span>
        <div className="flex items-center gap-1">
          <IconButton icon={ChevronLeft} label="Previous month" onClick={() => setMonth(m => shiftMonth(m, -1))} />
          <IconButton icon={ChevronRight} label="Next month" onClick={() => month < current && setMonth(m => shiftMonth(m, 1))} className={month >= current ? 'opacity-30' : ''} />
        </div>
      </div>
      <QueryState q={q}>
        {m => {
          const s = m.summary
          const inSchool = s.present + s.late + s.half_day
          const lead = (toDate(`${month}-01`).getDay() + 6) % 7
          return (
            <>
              {withSummary && (
                <>
                  <MCard tone={s.absent ? 'copper' : 'forest'}>
                    <div className="flex items-center gap-3">
                      <span className={cx('grid h-12 w-12 place-items-center rounded-full', s.absent ? 'bg-copper text-on-copper' : 'bg-forest text-on-forest')}><Flame size={22} /></span>
                      <div>
                        <div className="font-display text-[28px] tabular leading-none text-ink">{s.marked_days ? `${inSchool}/${s.marked_days}` : '—'}</div>
                        <div className="mt-1 text-[13.5px] text-charcoal-2">{s.marked_days ? 'days in school this month' : 'No registers this month yet'}</div>
                      </div>
                    </div>
                  </MCard>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {([['Present', s.present, 'text-ink'], ['Absent', s.absent, s.absent ? 'text-rust' : 'text-ink'], ['Late', s.late, s.late ? 'text-copper-d' : 'text-ink']] as const).map(([k, v, c]) => (
                      <MCard key={k} className="!p-3"><div className="text-[12px] text-stone">{k}</div><div className={cx('font-display text-[22px] tabular', c)}>{v}</div></MCard>
                    ))}
                  </div>
                </>
              )}
              <MSection>
                <MCard>
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {WD.map((w, i) => <div key={i} className="pb-1 text-[11px] font-medium text-stone">{w}</div>)}
                    {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
                    {m.days.map((d, i) => (
                      <motion.div key={d.date} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.008, duration: 0.3, ease: ease.out }}
                        title={`${d.date} · ${d.status ? DAY_STATUS[d.status].label : 'Not enrolled'}`}
                        className={cx('grid aspect-square place-items-center rounded-[9px] text-[13px] tabular', d.status ? DAY_STATUS[d.status].cell : 'text-stone-l', d.date === today && 'ring-2 ring-ink/70')}>
                        {Number(d.date.slice(8))}
                      </motion.div>
                    ))}
                  </div>
                </MCard>
              </MSection>
            </>
          )
        }}
      </QueryState>
    </div>
  )
}
