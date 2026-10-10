/* EduFlow — the student app. */
import { motion } from 'framer-motion'
import { BookOpen, ChartColumn, ClipboardList, Clock, House, MapPin, UserRound } from 'lucide-react'
import { MobileApp, MobileScreen, MSection, useMobileNav } from '@/components/shell/Mobile'
import { Avatar, cx } from '@/components/ui'
import { ErrorState, Loading, QueryState, Unavailable } from '@/components/states'
import { useEnrollments, useMySchedule, useNow, useStudentMonth, useStudents } from '@/api/queries'
import type { S } from '@/api/endpoints'
import { addDays, dateLabel, firstName, greeting, isoDate, minsUntil, startOfWeek, time, toMin } from '@/lib/format'
import type { Blocker } from '@/lib/blockers'
import { AccountSection } from '@/roles/_shared/AccountSection'
import { MCard, Metric } from '@/roles/_shared/ui'
import { MonthCalendar } from '@/roles/parent/mobile/Attendance'

const blocked = (title: string, blocker: Blocker) => () => <MobileScreen title={title}><Unavailable blocker={blocker} /></MobileScreen>

export function StudentMobileApp() {
  return (
    <MobileApp
      tabs={[
        { id: 'home', label: 'Home', icon: House, render: () => <HomeTab /> },
        { id: 'learn', label: 'Learn', icon: BookOpen, render: blocked('Learn', 'lms') },
        { id: 'homework', label: 'Homework', icon: ClipboardList, render: blocked('Homework', 'homework') },
        { id: 'results', label: 'Results', icon: ChartColumn, render: blocked('Results', 'assessment') },
        { id: 'me', label: 'Me', icon: UserRound, render: () => <MeTab /> },
      ]}
    />
  )
}

/** The student's own record (GET /students with `self` scope returns only it). */
function useMe() {
  const s = useStudents()
  const me = s.data?.[0] ?? null
  const e = useEnrollments({ student_id: me?.id ?? '' }, !!me)
  return { me, enrollment: e.data?.[0] ?? null, isPending: s.isPending, error: s.error, refetch: () => s.refetch() }
}

function HomeTab() {
  const now = useNow()
  const nav = useMobileNav()
  const { me, enrollment, isPending, error, refetch } = useMe()
  const month = useStudentMonth(me?.id ?? null, isoDate().slice(0, 7))
  const today = isoDate()
  const todayMark = month.data?.days.find(d => d.date === today)?.status
  const s = month.data?.summary
  const inSchool = s ? s.present + s.late + s.half_day : 0
  const cls = enrollment ? `${enrollment.grade.name} · ${enrollment.section.name}` : ''
  return (
    <MobileScreen title={`${greeting(now)}, ${firstName(me?.full_name ?? '')}`} eyebrow={`${dateLabel(now, { weekday: 'long', day: 'numeric', month: 'long' })}${cls ? ` · ${cls}` : ''}`}>
      {isPending ? <Loading rows={3} /> : error ? <ErrorState error={error} onRetry={refetch} /> : !me ? (
        <Unavailable blocker="lms">Your account isn't linked to a student record yet. The school office links it when you accept your invitation.</Unavailable>
      ) : (
        <>
          <MCard className="paper-grain p-5">
            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-forest">This month</div>
            <div className="mt-1 font-display text-[40px] leading-none text-ink">{s?.marked_days ? `${inSchool}/${s.marked_days}` : '—'}</div>
            <div className="mt-1 text-[13px] text-stone">{s?.marked_days ? 'days in school' : 'No registers yet this month'}</div>
            <div className="mt-2 text-[13px] text-charcoal-2">
              {todayMark === 'present' || todayMark === 'late' || todayMark === 'half_day' ? 'Today is counted. Keep it going tomorrow.'
                : todayMark === 'absent' ? 'Marked absent today.'
                : 'Today counts once your teacher takes the register.'}
            </div>
            {month.data && (
              <div className="mt-4 flex gap-1">
                {month.data.days.filter(d => d.date <= today && d.status && d.status !== 'not_marked' && d.status !== 'upcoming').slice(-12).map(d => (
                  <span key={d.date} title={d.date} className={cx('h-2 flex-1 rounded-full', d.status === 'absent' ? 'bg-rust' : d.status === 'late' ? 'bg-amber' : 'bg-forest-l')} />
                ))}
              </div>
            )}
          </MCard>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MCard className="p-4" onClick={() => nav.setTab('homework')}>
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-stone"><ClipboardList size={14} /> Homework</div>
              <div className="mt-2 font-display text-[32px] leading-none text-stone-l">—</div>
              <div className="mt-0.5 text-[11.5px] text-stone">not connected yet</div>
            </MCard>
            <MCard className="p-4" onClick={() => nav.setTab('results')}>
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-stone"><ChartColumn size={14} /> Next paper</div>
              <div className="mt-2 font-display text-[32px] leading-none text-stone-l">—</div>
              <div className="mt-0.5 text-[11.5px] text-stone">not connected yet</div>
            </MCard>
          </div>
          <TodaySchedule />
        </>
      )}
    </MobileScreen>
  )
}

/** Now / next from GET /schedule/me. */
function TodaySchedule() {
  const now = useNow()
  const nav = useMobileNav()
  const today = isoDate()
  const q = useMySchedule(today, today)
  const hm = now.slice(11, 16)
  const list = (q.data?.entries ?? []).filter(e => e.date === today).sort((a, b) => a.period.start_time.localeCompare(b.period.start_time))
  const current = list.find(p => time(p.period.start_time) <= hm && hm < time(p.period.end_time))
  const next = list.find(p => time(p.period.start_time) > hm)
  return (
    <MSection title="Today" action={<button onClick={() => nav.setTab('me')} className="text-[12.5px] font-medium text-forest">Full timetable</button>}>
      <QueryState q={q}>
        {() => (
          <div className="divide-y divide-line-2 rounded-[18px] border border-line bg-ivory-2">
            {current ? <NowRow label="Now" e={current} hm={hm} live /> : (
              <div className="px-4 py-3.5 text-[14px] text-stone">{!list.length ? 'No classes on the timetable today.' : next ? 'School starts soon.' : 'Classes are over for today.'}</div>
            )}
            {next && <NowRow label={`Next · in ${minsUntil(hm, time(next.period.start_time))}`} e={next} hm={hm} />}
          </div>
        )}
      </QueryState>
    </MSection>
  )
}

function NowRow({ label, e, hm, live }: { label: string; e: S['ScheduleEntryOut']; hm: string; live?: boolean }) {
  const start = time(e.period.start_time), end = time(e.period.end_time)
  const total = Math.max(1, toMin(end) - toMin(start))
  const elapsed = Math.max(0, Math.min(total, toMin(hm) - toMin(start)))
  return (
    <div className="px-4 py-3.5">
      <span className={cx('text-[11.5px] font-semibold uppercase tracking-[0.12em]', live ? 'text-forest' : 'text-stone')}>{label}</span>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="font-display text-[19px] text-ink">{e.subject?.name ?? e.title}</span>
        {live && <span className="flex items-center gap-1 text-[12px] tabular text-stone"><Clock size={12} /> {total - elapsed} min left</span>}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-stone">{e.teacher && <>{e.teacher.full_name} · </>}<MapPin size={12} /> {e.room?.name ?? '—'} · {start}–{end}</div>
      {live && <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line-2"><motion.div className="h-full rounded-full bg-forest-l" initial={{ width: 0 }} animate={{ width: `${(elapsed / total) * 100}%` }} /></div>}
    </div>
  )
}

function MeTab() {
  const { me, enrollment } = useMe()
  const monday = startOfWeek(isoDate())
  const week = useMySchedule(monday, addDays(monday, 5), !!me)
  const days = [...new Set((week.data?.entries ?? []).map(e => e.date))].sort()
  return (
    <MobileScreen title="Me" eyebrow={enrollment ? `${enrollment.grade.name} · ${enrollment.section.name}` : undefined}>
      {me && (
        <>
          <MCard className="flex items-center gap-3">
            <Avatar name={me.full_name} size={52} />
            <div className="min-w-0">
              <div className="font-display text-[20px] leading-tight text-ink">{me.full_name}</div>
              <div className="text-[13px] text-stone">Admission no. {me.admission_number}</div>
            </div>
          </MCard>
          <MCard className="mt-3 grid grid-cols-3 gap-3">
            <Metric label="Class" value={enrollment ? enrollment.section.name : '—'} />
            <Metric label="Roll" value={enrollment?.roll_number || '—'} />
            <Metric label="Year" value={enrollment?.academic_year.name ?? '—'} />
          </MCard>
          <MSection title="Attendance"><MonthCalendar studentId={me.id} /></MSection>
          <MSection title="This week">
            <QueryState q={week} empty={() => (days.length ? null : <p className="rounded-[14px] border border-dashed border-line px-4 py-4 text-center text-[13.5px] text-stone">No published timetable this week.</p>)}>
              {w => (
                <div className="space-y-2.5">
                  {days.map(d => (
                    <div key={d} className="rounded-[16px] border border-line bg-ivory-2 px-4 py-3">
                      <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-stone">{dateLabel(d, { weekday: 'long', day: 'numeric', month: 'short' })}</div>
                      {w.entries.filter(e => e.date === d).sort((a, b) => a.period.start_time.localeCompare(b.period.start_time)).map(e => (
                        <div key={e.slot_id} className="flex items-baseline justify-between gap-2 py-1 text-[13.5px]">
                          <span className="text-ink">{e.subject?.name ?? e.title}</span>
                          <span className="shrink-0 tabular text-stone">{time(e.period.start_time)} · {e.room?.name ?? ''}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </QueryState>
          </MSection>
          <MSection title="House & achievements"><Unavailable blocker="lms" compact /></MSection>
        </>
      )}
      <AccountSection current="student" />
    </MobileScreen>
  )
}
