import { motion } from 'framer-motion'
import { Bus, ClipboardCheck, IndianRupee, Inbox, UserCheck, Users } from 'lucide-react'
import { AnimatedNumber, Card, CardHeader, Eyebrow, LiveDot, Page, cx, fadeUp, toneClass, type Tone } from '@/components/ui'
import { Unavailable } from '@/components/states'
import { TwoCol } from '@/components/shell/Web'
import { useCorrections, useNow, useSchoolProfile } from '@/api/queries'
import { useAuth } from '@/auth/AuthProvider'
import { dateLabel, firstName, greeting, isoDate, plural } from '@/lib/format'
import type { LucideIcon } from 'lucide-react'
import { useWall } from '@/roles/_shared/attendance'
import { Wall } from './Wall'
import { ActivityStream } from './ActivityStream'
import { useCan } from './shared'

export function MonitoringCenter() {
  return (
    <Page>
      <Hero />
      <div className="mt-5">
        <TwoCol
          main={
            <Card padded={false} className="p-4 md:p-5">
              <CardHeader eyebrow="Monitoring" title="What needs attention right now" />
              <Unavailable blocker="monitoring">
                Alerts with an owner, a reason and an escalation path (late marks, attendance risk, fee defaulters, delayed buses)
                need the monitoring engine (/principal/pulse, /console/dashboard), planned for Phase 11. Registers and corrections below are live.
              </Unavailable>
            </Card>
          }
          side={<><Wall /><ActivityStream /></>}
        />
      </div>
    </Page>
  )
}

function Hero() {
  const { user } = useAuth()
  const profile = useSchoolProfile()
  const now = useNow()
  const can = useCan()
  const wall = useWall(isoDate())
  const pending = useCorrections('pending', can('attendance.approve'))
  const total = wall.tiles?.length ?? 0
  const att = wall.totals.total ? wall.totals.in / wall.totals.total : null

  const line = wall.tiles
    ? total === 0 ? 'No classes are set up for the current academic year yet.'
      : `${wall.marked} of ${plural(total, 'register')} ${wall.marked === 1 ? 'is' : 'are'} in${att !== null ? `, and ${Math.round(att * 100)}% of marked children are in school` : ''}.`
    : 'Reading today’s registers…'
  const focus = wall.tiles && total > wall.marked ? `${total - wall.marked} ${total - wall.marked === 1 ? 'classroom hasn’t' : 'classrooms haven’t'} taken the register yet.` : wall.tiles && total ? 'Every classroom has taken the register.' : ''

  return (
    <motion.section variants={fadeUp} className="paper-grain relative overflow-hidden rounded-[18px] border border-line bg-ivory-2 p-5 shadow-1 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-3xl">
          <Eyebrow>Monitoring Center · {dateLabel(now, { weekday: 'long', day: 'numeric', month: 'long' })}</Eyebrow>
          <h1 className="font-display text-[32px] leading-[1.08] md:text-[42px]">{greeting(now)}, {firstName(user?.full_name ?? '')}.</h1>
          <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-charcoal-2">{line}</p>
          {focus && (
            <p className={cx('mt-2 inline-flex items-center gap-2 text-[15px] font-medium', total > wall.marked ? 'text-copper-d' : 'text-forest')}>
              <span className={cx('h-2 w-2 rounded-full', total > wall.marked ? 'bg-copper' : 'bg-forest-l')} />{focus}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 rounded-[14px] border border-line bg-ivory/80 px-4 py-3 backdrop-blur">
          <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-stone"><LiveDot /> Live</span>
          <motion.span key={now.slice(11, 16)} initial={{ opacity: 0.4, y: -3 }} animate={{ opacity: 1, y: 0 }} className="font-display text-[34px] leading-none tabular text-ink">{now.slice(11, 16)}</motion.span>
          <span className="text-[12px] text-stone">{[profile.data?.name, profile.data?.city].filter(Boolean).join(' · ')}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <PulseTile icon={Users} label="Children in today" tone={att === null ? 'stone' : att >= 0.9 ? 'forest' : att >= 0.8 ? 'amber' : 'rust'}
          value={att === null ? null : Math.round(att * 100)} format={n => `${Math.round(n)}%`}
          sub={att === null ? 'No registers yet' : `${wall.totals.in} of ${wall.totals.total} marked`} />
        <PulseTile icon={ClipboardCheck} label="Registers in" tone={total && wall.marked === total ? 'forest' : 'copper'}
          value={wall.tiles ? wall.marked : null} format={n => `${Math.round(n)}/${total}`}
          sub={!wall.tiles ? 'Loading' : wall.marked === total ? 'Every classroom done' : `${total - wall.marked} still waiting`} />
        <PulseTile icon={UserCheck} label="Staff in" tone="stone" value={null} sub="Staff check-in not connected" />
        <PulseTile icon={Bus} label="Buses arrived" tone="stone" value={null} sub="Transport not connected" />
        <PulseTile icon={IndianRupee} label="Fees this month" tone="stone" value={null} sub="Fees not connected" />
        <PulseTile icon={Inbox} label="Approvals pending" tone={pending.data?.length ? 'amber' : 'forest'}
          value={can('attendance.approve') ? pending.data?.length ?? null : null}
          sub={!can('attendance.approve') ? 'Not part of your role' : pending.data?.length ? 'Attendance corrections' : 'Queue clear'} />
      </div>
    </motion.section>
  )
}

function PulseTile({ icon: Icon, label, value, format, sub, tone }: {
  icon: LucideIcon; label: string; value: number | null; format?: (n: number) => string; sub: string; tone: Tone
}) {
  return (
    <Card padded={false} className="flex min-w-0 flex-col justify-between gap-2 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12.5px] text-stone">{label}</span>
        <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-[7px]', toneClass[tone].bg, toneClass[tone].text)}><Icon size={13} /></span>
      </div>
      {value === null
        ? <span className="font-display text-[26px] leading-none text-stone-l">—</span>
        : <AnimatedNumber value={value} format={format} className="font-display text-[26px] leading-none text-ink" />}
      <div className={cx('truncate text-[12px]', tone === 'rust' || tone === 'copper' ? toneClass[tone].text : 'text-stone')}>{sub}</div>
    </Card>
  )
}
