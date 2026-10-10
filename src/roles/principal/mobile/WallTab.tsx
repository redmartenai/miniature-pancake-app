import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import clsx from 'clsx'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { MobileScreen, MSection, MList, MRow } from '@/components/shell/Mobile'
import { Avatar, LiveDot, Pill, Sheet, softSpring } from '@/components/ui'
import { ErrorState, Loading, QueryState, Unavailable } from '@/components/states'
import { attendance } from '@/api/endpoints'
import { useNow } from '@/api/queries'
import { useAuth } from '@/auth/AuthProvider'
import { isoDate, time } from '@/lib/format'
import { STATUS, inSchool, totalOf, useWall, type TileState, type WallTile } from '@/roles/_shared/attendance'

const TILE_BG: Record<TileState, { bg: string; border: string }> = {
  marked: { bg: 'var(--color-forest-p)', border: 'var(--color-forest-l)' },
  awaiting: { bg: '#FBF0D9', border: '#EFD7A3' },
}

export function WallTab() {
  const now = useNow()
  const wall = useWall(isoDate())
  const [open, setOpen] = useState<WallTile | null>(null)
  const tiles = wall.tiles ?? []

  return (
    <MobileScreen eyebrow={<span className="inline-flex items-center gap-2"><LiveDot /> Live · {time(now)}</span>} title="The wall">
      {wall.isPending ? <Loading rows={4} /> : wall.error ? <ErrorState error={wall.error} onRetry={wall.refetch} /> : (
        <>
          <motion.p variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="px-1 text-[14.5px] text-charcoal-2">
            {wall.marked} of {tiles.length} registers in.{' '}
            {tiles.length && wall.marked === tiles.length ? <span className="font-medium text-forest">Every child is accounted for.</span> : 'The rest are on their way.'}
          </motion.p>
          <LayoutGroup>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {tiles.map(t => <Tile key={t.cls.id} tile={t} onOpen={() => setOpen(t)} />)}
            </div>
          </LayoutGroup>
          <div className="mt-3 flex items-center gap-3 px-1 text-[11.5px] text-stone">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-forest-l" />Marked</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber" />Awaiting</span>
          </div>
        </>
      )}

      <MSection title="Buses" className="!mt-6"><Unavailable blocker="transport" compact /></MSection>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? `Class ${open.cls.short}` : ''}>
        {open && <ClassDetail tile={open} />}
      </Sheet>
    </MobileScreen>
  )
}

function Tile({ tile: t, onOpen }: { tile: WallTile; onOpen: () => void }) {
  const c = t.register?.counts
  return (
    <motion.button layout transition={softSpring} onClick={onOpen} whileTap={{ scale: 0.96 }}
      initial={false} animate={{ backgroundColor: TILE_BG[t.state].bg, borderColor: TILE_BG[t.state].border }}
      className="relative flex h-[108px] flex-col justify-between overflow-hidden rounded-[16px] border p-3.5 text-left"
      aria-label={`Class ${t.cls.short}, ${t.state === 'marked' ? 'register marked' : 'register not taken'}`}>
      <div className="flex items-start justify-between">
        <span className="font-display text-[26px] leading-none text-ink">{t.cls.short}</span>
        {t.state === 'marked'
          ? <motion.span initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={softSpring} className="grid h-6 w-6 place-items-center rounded-full bg-forest text-on-forest"><Check size={13} strokeWidth={3} /></motion.span>
          : <motion.span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber" animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={t.state} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
          {c ? (
            <>
              <div className="font-display tabular text-[19px] leading-none text-forest-d">{inSchool(c)}<span className="text-[14px] text-forest/70">/{totalOf(c)}</span></div>
              <div className="mt-1 truncate text-[12px] text-forest">in · {time(t.register!.submitted_at)}</div>
            </>
          ) : (
            <>
              <div className="text-[13.5px] font-semibold text-[#8a5f14]">Awaiting</div>
              <div className="truncate text-[12px] text-[#8a5f14]/85">{t.cls.classTeacher?.name ?? 'No class teacher'}</div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  )
}

/** Who is away in a marked class (GET /attendance/records?session_id=). */
function ClassDetail({ tile: t }: { tile: WallTile }) {
  const { schoolId } = useAuth()
  const r = t.register
  const records = useQuery({
    queryKey: ['attendance-records', schoolId, 'session', r?.id],
    queryFn: () => attendance.records({ session_id: r!.id }),
    enabled: !!r,
  })
  if (!r) {
    return (
      <div>
        <p className="text-[14px] text-charcoal-2">The register hasn’t been taken yet{t.cls.classTeacher ? ` · ${t.cls.classTeacher.name} is the class teacher` : ''}.</p>
        <Unavailable blocker="notifications" compact className="mt-4">Sending the teacher a reminder needs the notifications API (Phase 9).</Unavailable>
      </div>
    )
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(STATUS) as (keyof typeof STATUS)[]).filter(k => r.counts[k]).map(k => <Pill key={k} tone={STATUS[k].tone}>{r.counts[k]} {STATUS[k].label.toLowerCase()}</Pill>)}
      </div>
      <p className="mt-2 text-[13px] text-stone">Taken by {r.taken_by.full_name} at {time(r.submitted_at)}{r.locked ? ' · locked' : ''}</p>
      <QueryState q={records}>
        {list => {
          const away = list.filter(x => x.status !== 'present')
          return away.length ? (
            <MList className="mt-3">
              {away.map(x => <MRow key={x.id} icon={<Avatar name={x.student.full_name} size={32} />} title={x.student.full_name} sub={x.note || undefined}
                right={<Pill tone={STATUS[x.status].tone}>{STATUS[x.status].label}</Pill>} />)}
            </MList>
          ) : <p className={clsx('mt-3 rounded-[12px] bg-forest-p px-3 py-3 text-[13.5px] text-forest')}>Everyone is present.</p>
        }}
      </QueryState>
    </div>
  )
}
