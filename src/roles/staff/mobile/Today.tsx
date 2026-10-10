/* Today: the register first, then the day from the published timetable, then what needs the teacher. */
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Bell, Check } from 'lucide-react'
import { IconButton, LiveDot, Pill, cx, ease, spring } from '@/components/ui'
import { MSection, MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { ErrorState, Loading, Unavailable } from '@/components/states'
import { useMySchedule, useNow, useRoster } from '@/api/queries'
import type { S } from '@/api/endpoints'
import { dateLabel, firstName, greeting, isoDate, minsUntil, time } from '@/lib/format'
import { MCard } from '@/roles/_shared/ui'
import { ClassDetail } from './Classes'
import { RegisterScreen } from './Register'
import { useTeacher, type MyClass } from './shared'

export function TodayTab() {
  const now = useNow()
  const t = useTeacher()
  const nav = useMobileNav()
  return (
    <MobileScreen title={`${greeting(now)}, ${firstName(t.staff?.full_name ?? '')}`} eyebrow={dateLabel(now, { weekday: 'long', day: 'numeric', month: 'long' })}
      actions={<IconButton icon={Bell} label="Notifications" onClick={() => nav.push({ title: 'Notifications', render: () => <MobileScreen title="Notifications"><Unavailable blocker="notifications" /></MobileScreen> })} />}>
      {t.isPending ? <Loading rows={3} /> : t.error ? <ErrorState error={t.error} onRetry={t.refetch} /> : t.noStaffRecord ? (
        <Unavailable blocker="staffAttendance">Your account isn't linked to a staff record at this school yet, so there are no classes to show. The school office links it when accepting your invitation.</Unavailable>
      ) : (
        <>
          {t.data?.classTeacherOf && <RegisterCard cls={t.data.classTeacherOf} />}
          <DayStrip classes={t.data?.classes ?? []} />
          <MSection title="Needs you">
            <Unavailable blocker="homework" compact>Homework to review, parents waiting for a reply, marks due and announcements to acknowledge need the homework, messaging, assessment and announcement APIs (Phases 7–9).</Unavailable>
          </MSection>
        </>
      )}
    </MobileScreen>
  )
}

function RegisterCard({ cls }: { cls: MyClass }) {
  const nav = useMobileNav()
  const roster = useRoster(cls.id, isoDate())
  const open = () => nav.push({ title: `${cls.short} register`, render: () => <RegisterScreen sectionId={cls.id} short={cls.short} /> })
  const r = roster.data
  const count = r?.students.length ?? cls.students ?? 0
  if (roster.isPending) return <Loading rows={2} />
  if (roster.error) return <ErrorState error={roster.error} onRetry={() => roster.refetch()} compact />
  const st = r!.students.map(s => s.status ?? 'present')
  const absent = st.filter(s => s === 'absent' || s === 'excused').length
  const late = st.filter(s => s === 'late').length
  return (
    <AnimatePresence mode="wait" initial={false}>
      {!r!.marked ? (
        <motion.button key="todo" onClick={open} whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.3, ease: ease.out }}
          className="relative block w-full overflow-hidden rounded-[22px] bg-copper p-5 text-left text-on-copper shadow-[0_18px_36px_-18px_rgba(36,31,27,.6)]">
          <div className="flex items-center gap-2 text-[12.5px] font-medium opacity-85"><LiveDot tone="amber" /> Not taken yet</div>
          <div className="mt-2 font-display text-[27px] leading-[1.12] !text-on-copper">Take the {cls.short} register</div>
          <div className="mt-1 text-[14.5px] opacity-85">{count} children · everyone starts present</div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[13px] opacity-80">About nine seconds</span>
            <span className="flex h-11 items-center gap-1.5 rounded-full bg-ivory px-4 text-[14.5px] font-semibold text-copper-d">Start <ArrowRight size={16} /></span>
          </div>
        </motion.button>
      ) : (
        <motion.button key="done" onClick={open} whileTap={{ scale: 0.98 }} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring}
          className="block w-full rounded-[22px] bg-forest p-5 text-left text-on-forest">
          <div className="flex items-center gap-3">
            <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring, delay: 0.1 }}
              className="grid h-10 w-10 place-items-center rounded-full bg-ivory/15"><Check size={20} strokeWidth={2.8} /></motion.span>
            <div>
              <div className="font-display text-[21px] leading-tight !text-on-forest">{cls.short} register saved</div>
              <div className="text-[13px] opacity-80">at {r!.marked_at ? time(r!.marked_at) : '—'}{r!.locked ? ' · locked' : ''}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {([['Present', count - absent - late], ['Late', late], ['Away', absent]] as const).map(([k, v]) => (
              <div key={k} className="rounded-[12px] bg-ivory/10 px-3 py-2">
                <div className="text-[11.5px] opacity-75">{k}</div>
                <div className="font-display text-[22px] leading-none tabular !text-on-forest">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[12.5px] opacity-70">{r!.locked ? 'Tap to request a correction' : 'Tap to change a mark'}</div>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

/** Today's periods from GET /schedule/me. */
function DayStrip({ classes }: { classes: MyClass[] }) {
  const now = useNow()
  const nav = useMobileNav()
  const today = isoDate()
  const q = useMySchedule(today, today)
  const periods: S['ScheduleEntryOut'][] = (q.data?.entries ?? []).filter(e => e.date === today).sort((a, b) => a.period.start_time.localeCompare(b.period.start_time))
  const hm = now.slice(11, 16)
  const current = periods.find(p => time(p.period.start_time) <= hm && hm < time(p.period.end_time))
  const next = periods.find(p => time(p.period.start_time) > hm)
  const focus = current ?? next
  const open = (sectionId: string) => {
    const c = classes.find(x => x.id === sectionId)
    if (c) nav.push({ title: `Class ${c.short}`, render: () => <ClassDetail cls={c} /> })
  }
  const label = (e: S['ScheduleEntryOut']) => classes.find(c => c.id === e.section.id)?.short ?? e.section.name

  return (
    <MSection title="Your day" action={<span className="text-[12px] text-stone">{q.data ? `${periods.length} periods` : ''}</span>}>
      {q.isPending ? <Loading rows={1} /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} compact /> : periods.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line px-4 py-4 text-center text-[13.5px] text-stone">No periods on the published timetable today.</p>
      ) : (
        <>
          {focus && (
            <MCard className="mb-2" onClick={() => open(focus.section.id)}>
              <div className="flex items-center justify-between">
                <Pill tone={current ? 'forest' : 'slate'} dot>{current ? 'Teaching now' : `Next · in ${minsUntil(hm, time(focus.period.start_time))}`}</Pill>
                <span className="text-[12.5px] tabular text-stone">{time(focus.period.start_time)}–{time(focus.period.end_time)}</span>
              </div>
              <div className="mt-2 font-display text-[22px] leading-tight text-ink">{label(focus)} · {focus.subject?.name ?? focus.title}</div>
              <div className="text-[13px] text-stone">{focus.period.name}{focus.room ? ` · ${focus.room.name}` : ''}</div>
            </MCard>
          )}
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {periods.map(p => {
              const past = time(p.period.end_time) <= hm
              const isNow = p === current
              return (
                <motion.button key={`${p.slot_id}-${p.date}`} whileTap={{ scale: 0.95 }} onClick={() => open(p.section.id)}
                  className={cx('min-h-[64px] w-[82px] shrink-0 rounded-[14px] border px-2.5 py-2 text-left', isNow ? 'border-forest bg-forest-p' : past ? 'border-line-2 bg-paper/60 opacity-60' : 'border-line bg-ivory-2')}>
                  <div className="text-[11px] tabular text-stone">P{p.period.number} · {time(p.period.start_time)}</div>
                  <div className={cx('font-display text-[19px] leading-tight', isNow ? 'text-forest' : 'text-ink')}>{label(p)}</div>
                  <div className="truncate text-[11px] text-stone">{past ? 'Done' : p.room?.name ?? p.subject?.name ?? ''}</div>
                </motion.button>
              )
            })}
          </div>
        </>
      )}
    </MSection>
  )
}
