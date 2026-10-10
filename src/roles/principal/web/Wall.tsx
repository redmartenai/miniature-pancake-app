import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { Check, Clock, LayoutGrid } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, EmptyState, Pill, spring } from '@/components/ui'
import { ErrorState, Loading } from '@/components/states'
import { firstName, isoDate, time } from '@/lib/format'
import { inSchool, totalOf, useWall, type TileState } from '@/roles/_shared/attendance'
import { BASE, HEX } from './shared'

const PALETTE: Record<TileState, { bg: string; border: string; ink: string }> = {
  awaiting: { bg: HEX.amberP, border: HEX.amber, ink: '#8a5f14' },
  marked: { bg: HEX.forestP, border: HEX.forestL, ink: HEX.forest },
}

/** One wall, one glance: every classroom and whether today's register is in (GET /attendance/sessions?date=). */
export function Wall() {
  const wall = useWall(isoDate())
  const navigate = useNavigate()
  const tiles = wall.tiles

  return (
    <Card padded={false} className="p-4 md:p-5">
      <CardHeader eyebrow="One wall. One glance." title="Classrooms right now"
        action={tiles && <Pill tone={wall.marked === tiles.length ? 'forest' : 'copper'} dot>{wall.marked}/{tiles.length} in</Pill>} />
      {wall.isPending ? <Loading rows={3} /> : wall.error ? <ErrorState error={wall.error} onRetry={wall.refetch} compact /> : !tiles?.length ? (
        <EmptyState icon={LayoutGrid} title="No classes yet" body="Sections for the current academic year appear here once they are set up." />
      ) : (
        <LayoutGroup>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-2">
            {tiles.map(t => {
              const p = PALETTE[t.state]
              const c = t.register?.counts
              return (
                <motion.button key={t.cls.id} layout transition={{ layout: spring }} onClick={() => navigate(`${BASE}/attendance`)}
                  initial={false} animate={{ backgroundColor: p.bg, borderColor: p.border }} style={{ borderWidth: 1, borderStyle: 'solid' }}
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                  className="relative min-h-[92px] overflow-hidden rounded-[12px] p-3 text-left"
                  title={t.state === 'marked' ? 'Open attendance' : 'Register not taken yet'}>
                  {t.state === 'awaiting' && (
                    <motion.span className="pointer-events-none absolute inset-0 rounded-[12px] border-2" style={{ borderColor: HEX.amber }}
                      animate={{ opacity: [0.7, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }} />
                  )}
                  <div className="flex items-start justify-between gap-1">
                    <motion.span layout="position" className="font-display text-[22px] leading-none" animate={{ color: p.ink }}>{t.cls.short}</motion.span>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span key={t.state} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={spring}
                        className="grid h-5 w-5 place-items-center rounded-full text-ivory" style={{ background: t.state === 'marked' ? HEX.forest : HEX.amber }}>
                        {t.state === 'marked' ? <Check size={12} strokeWidth={3} /> : <Clock size={11} strokeWidth={2.4} />}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <div className="mt-2.5 text-[12.5px] font-medium" style={{ color: p.ink }}>
                    {c ? <><span className="tabular">{inSchool(c)}/{totalOf(c)}</span> in · {time(t.register!.submitted_at)}</> : 'Awaiting teacher'}
                  </div>
                  <div className="truncate text-[11.5px] text-stone">
                    {t.register && t.cls.classTeacher && t.register.taken_by.id !== t.cls.classTeacher.id
                      ? `Taken by ${firstName(t.register.taken_by.full_name)}`
                      : t.cls.classTeacher?.name ?? 'No class teacher assigned'}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </LayoutGroup>
      )}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-stone">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-forest-l" />Marked</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber" />Awaiting teacher</span>
      </div>
    </Card>
  )
}
