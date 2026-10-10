import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { ChevronRight, ClipboardCheck, Inbox, Leaf } from 'lucide-react'
import { MobileScreen, MSection, MList, MRow, useMobileNav } from '@/components/shell/Mobile'
import { ease, fadeUp } from '@/components/ui'
import { Unavailable } from '@/components/states'
import { useCorrections, useNow } from '@/api/queries'
import { useAuth } from '@/auth/AuthProvider'
import { dateLabel, firstName, greeting, isoDate, plural, time, weekday } from '@/lib/format'
import { useWall } from '@/roles/_shared/attendance'
import { MetricChip, ToneIcon } from '@/roles/_shared/ui'
import { useCan } from '@/roles/principal/web/shared'
import { AccountSection } from '@/roles/_shared/AccountSection'

export function TodayTab() {
  const { user } = useAuth()
  const now = useNow()
  const nav = useMobileNav()
  const can = useCan()
  const wall = useWall(isoDate())
  const pending = useCorrections('pending', can('attendance.approve'))
  const total = wall.tiles?.length ?? 0
  const waiting = total - wall.marked
  const att = wall.totals.total ? wall.totals.in / wall.totals.total : null
  const needs = [
    waiting > 0 && { id: 'registers', icon: ClipboardCheck, tone: 'copper' as const, title: `${plural(waiting, 'register')} not taken yet`, sub: 'Open the wall to see which classrooms', go: () => nav.setTab('wall') },
    !!pending.data?.length && { id: 'approvals', icon: Inbox, tone: 'amber' as const, title: `${plural(pending.data.length, 'attendance correction')} to decide`, sub: 'Swipe to approve or decline', go: () => nav.setTab('approvals') },
  ].filter(Boolean) as { id: string; icon: typeof Inbox; tone: 'copper' | 'amber'; title: string; sub: string; go: () => void }[]

  return (
    <MobileScreen eyebrow={`${weekday(now)} ${dateLabel(now, { day: 'numeric', month: 'long' })} · ${time(now)}`} title={`${greeting(now)}, ${firstName(user?.full_name ?? '')}`}>
      <motion.div variants={fadeUp} className="px-1">
        <p className="text-[15px] leading-relaxed text-charcoal-2">
          {wall.tiles ? (total ? `${wall.marked} of ${plural(total, 'register')} in${att !== null ? `; ${Math.round(att * 100)}% of marked children are in school` : ''}.` : 'No classes are set up for this year yet.') : 'Reading today’s registers…'}
        </p>
      </motion.div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <MetricChip label="In" tone={att === null ? 'amber' : att >= 0.9 ? 'forest' : 'copper'} value={att === null ? '—' : `${Math.round(att * 100)}%`} sub={`${wall.totals.in} kids`} />
        <MetricChip label="Registers" tone={total && !waiting ? 'forest' : 'amber'} value={`${wall.marked}/${total}`} sub={waiting ? `${waiting} waiting` : 'All in'} onClick={() => nav.setTab('wall')} />
        <MetricChip label="Staff" tone="stone" value="—" sub="Not connected" />
        <MetricChip label="Buses" tone="stone" value="—" sub="Not connected" />
      </div>

      <MSection title={`Needs you${needs.length ? ` · ${needs.length}` : ''}`} className="!mt-6">
        <AnimatePresence initial={false}>
          {needs.length ? (
            <MList>
              {needs.map(n => (
                <MRow key={n.id} icon={<ToneIcon icon={n.icon} tone={n.tone} size={36} />} title={n.title} sub={n.sub} onClick={n.go}
                  right={<ChevronRight size={16} className="shrink-0 text-stone-l" />} />
              ))}
            </MList>
          ) : wall.tiles && (
            <motion.div key="calm" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: ease.out }}
              className={clsx('flex items-center gap-3 rounded-[16px] border border-forest/15 bg-forest-p px-4 py-4')}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ivory-2 text-forest"><Leaf size={18} /></span>
              <div>
                <div className="font-display text-[17px] text-ink">Nothing urgent. A calm morning.</div>
                <div className="text-[13px] text-forest">Registers are in and the queue is clear.</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </MSection>

      <MSection title="On your radar">
        <Unavailable blocker="monitoring" compact />
      </MSection>
      <AccountSection current="principal" />
    </MobileScreen>
  )
}
