/* Home — "Today" for the selected child. The nine-second read. */
import { motion } from 'framer-motion'
import { Bell, CalendarDays, CircleAlert, CircleCheck, Clock, Quote, TrendingUp, Users, Wallet } from 'lucide-react'
import { EmptyState, IconButton, cx, toneClass, type Tone } from '@/components/ui'
import { MSection, MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { ErrorState, Loading, Unavailable } from '@/components/states'
import { useNow, useStudentMonth } from '@/api/queries'
import { useAuth } from '@/auth/AuthProvider'
import { dateLabel, firstName, greeting, isoDate } from '@/lib/format'
import { MCard } from '@/roles/_shared/ui'
import { AttendanceScreen } from './Attendance'
import { ChildFade, ChildSwitcher, item } from './bits'
import { useParent, type Child } from './context'

export function HomeScreen() {
  const { user } = useAuth()
  const { child, isPending, error, refetch } = useParent()
  const now = useNow()
  const nav = useMobileNav()
  return (
    <MobileScreen title={`${greeting(now)}, ${firstName(user?.full_name ?? '')}`} eyebrow={dateLabel(now, { weekday: 'long', day: 'numeric', month: 'long' })}
      actions={<IconButton icon={Bell} label="Notifications" onClick={() => nav.push({ title: 'Notifications', render: () => <MobileScreen title="Notifications"><Unavailable blocker="notifications" /></MobileScreen> })} />}>
      {isPending ? <Loading rows={4} /> : error ? <ErrorState error={error} onRetry={refetch} /> : !child ? (
        <EmptyState icon={Users} title="No children linked yet" body="Your children appear here once the school links them to your account." />
      ) : (
        <>
          <ChildSwitcher />
          <ChildFade>
            <TodayHero c={child} />
            <MSection title={`${child.s.first_name}'s day`} className="!mt-5">
              <Unavailable blocker="notifications" compact>Bus arrivals, homework posted and notes from teachers appear here once the notifications API exists (Phase 9).</Unavailable>
            </MSection>
            <Tiles c={child} />
            <MSection title="Worth a look"><Unavailable blocker="monitoring" compact /></MSection>
          </ChildFade>
        </>
      )}
    </MobileScreen>
  )
}

/** The one sentence: today's mark from the month view. */
function TodayHero({ c }: { c: Child }) {
  const today = isoDate()
  const q = useStudentMonth(c.s.id, today.slice(0, 7))
  const st = q.data?.days.find(d => d.date === today)?.status
  const name = c.s.first_name
  const [tone, text, sub]: [Tone, string, string] =
    st === 'present' ? ['forest', `${name} is in class.`, 'Marked present today.']
    : st === 'late' ? ['copper', `${name} reached a little late today.`, 'Marked late — in class now.']
    : st === 'half_day' ? ['slate', `${name} is in for half the day.`, 'Marked half day.']
    : st === 'absent' ? ['rust', `${name} is marked absent today.`, 'If this is unexpected, contact the class teacher.']
    : st === 'excused' ? ['stone', `${name} is excused today.`, 'Marked excused.']
    : ['amber', `Waiting for the ${c.classShort} register.`, `You'll see ${name}'s mark here once it is taken.`]
  if (q.isPending) return <Loading rows={1} className="mt-3" />
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} compact />
  return (
    <motion.div variants={item} className={cx('mt-3 rounded-[18px] p-4', toneClass[tone].bg)}>
      <div className="flex items-start gap-3">
        <span className={cx('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full', toneClass[tone].solid)}>
          {tone === 'forest' ? <CircleCheck size={19} /> : tone === 'rust' ? <CircleAlert size={19} /> : <Clock size={19} />}
        </span>
        <div>
          <div className="font-display text-[21px] leading-tight text-ink">{text}</div>
          <div className="mt-0.5 text-[13.5px] text-charcoal-2">{sub}</div>
        </div>
      </div>
    </motion.div>
  )
}

function NotYet({ label, icon: Icon }: { label: string; icon: typeof Wallet }) {
  return (
    <MCard className="!p-3.5">
      <div className="flex items-center justify-between text-[12.5px] text-stone">{label} <Icon size={15} /></div>
      <div className="mt-1 font-display text-[24px] leading-none text-stone-l">—</div>
      <div className="mt-1 text-[12px] text-stone">Not connected yet</div>
    </MCard>
  )
}

function Tiles({ c }: { c: Child }) {
  const nav = useMobileNav()
  const q = useStudentMonth(c.s.id, isoDate().slice(0, 7))
  const s = q.data?.summary
  const rate = s?.marked_days ? (s.present + s.late + s.half_day) / s.marked_days : null
  return (
    <MSection title="At a glance">
      <div className="grid grid-cols-2 gap-2.5">
        <MCard onClick={() => nav.push({ title: 'Attendance', render: () => <AttendanceScreen studentId={c.s.id} name={firstName(c.s.full_name)} classShort={c.classShort} /> })} className="!p-3.5">
          <div className="flex items-center justify-between text-[12.5px] text-stone">Attendance <CalendarDays size={15} /></div>
          <div className={cx('mt-1 font-display text-[28px] tabular leading-none', rate === null ? 'text-stone-l' : rate >= 0.9 ? 'text-ink' : rate >= 0.75 ? 'text-copper-d' : 'text-rust')}>{rate === null ? '—' : `${Math.round(rate * 100)}%`}</div>
          <div className="mt-1 text-[12.5px] text-stone">{s?.marked_days ? `this month · ${s.marked_days} days` : 'No registers this month'}</div>
        </MCard>
        <NotYet label="Average marks" icon={TrendingUp} />
        <NotYet label="Fees" icon={Wallet} />
        <NotYet label="Latest note" icon={Quote} />
      </div>
    </MSection>
  )
}
