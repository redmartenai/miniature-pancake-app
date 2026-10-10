/* Small pieces shared by several role surfaces (lifted from the supplied design's per-role helpers). */
import clsx from 'clsx'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx, ease, fadeUp, spring, toneClass, type Tone } from '@/components/ui'

/** Small square icon badge in a tone. */
export function ToneIcon({ icon: Icon, tone = 'stone', size = 34, round }: { icon: LucideIcon; tone?: Tone; size?: number; round?: boolean }) {
  return (
    <span style={{ width: size, height: size }} className={cx('grid shrink-0 place-items-center', round ? 'rounded-full' : 'rounded-[10px]', toneClass[tone].bg, toneClass[tone].text)}>
      <Icon size={Math.round(size * 0.47)} strokeWidth={1.9} />
    </span>
  )
}

/** Key/value metric row. */
export function Metric({ label, value, tone }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[11.5px] text-stone">{label}</div>
      <div className={cx('tabular text-[14px] font-medium', tone ? toneClass[tone].text : 'text-ink')}>{value}</div>
    </div>
  )
}

export function Legend({ items }: { items: { label: string; className: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[12px] text-stone">
      {items.map(i => (
        <span key={i.label} className="inline-flex items-center gap-1.5"><span className={cx('h-2.5 w-2.5 rounded-[3px]', i.className)} />{i.label}</span>
      ))}
    </div>
  )
}

/** Horizontal labelled bar. */
export function HBar({ label, value, max, tone = 'forest', right }: { label: ReactNode; value: number; max: number; tone?: Tone; right?: ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
        <span className="min-w-0 truncate text-charcoal">{label}</span>
        <span className="shrink-0 tabular font-medium text-ink">{right ?? value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line-2">
        <motion.div className={cx('h-full rounded-full', toneClass[tone].dot)} initial={{ width: 0 }} animate={{ width: `${max ? Math.min(1, value / max) * 100 : 0}%` }} transition={{ duration: 0.8, ease: ease.out }} />
      </div>
    </div>
  )
}

/** A compact, glanceable number for phone dashboards. */
export function MetricChip({ label, value, sub, tone = 'forest', onClick, className }: {
  label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; onClick?: () => void; className?: string
}) {
  const Comp = onClick ? motion.button : motion.div
  return (
    <Comp variants={fadeUp} whileTap={onClick ? { scale: 0.96 } : undefined} onClick={onClick}
      className={clsx('flex min-w-0 flex-col rounded-[14px] border border-line bg-ivory-2 px-3 py-2.5 text-left shadow-1', className)}>
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-stone">
        <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', toneClass[tone].dot)} />
        <span className="truncate">{label}</span>
      </span>
      <span className="mt-1 font-display tabular text-[22px] leading-none text-ink">{value}</span>
      {sub && <span className="mt-1 truncate text-[11.5px] text-stone">{sub}</span>}
    </Comp>
  )
}

/** A card-shaped block that participates in MobileScreen's stagger. */
export function MCard({ children, className, onClick, tone }: { children: ReactNode; className?: string; onClick?: () => void; tone?: Tone }) {
  const C = onClick ? motion.button : motion.div
  return (
    <C onClick={onClick} whileTap={onClick ? { scale: 0.985 } : undefined}
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
      className={cx('block w-full rounded-[18px] border p-4 text-left shadow-1', tone ? `${toneClass[tone].bg} border-transparent` : 'border-line bg-ivory-2', className)}>
      {children}
    </C>
  )
}

/** Thumb-sized choice chips with a shared sliding highlight. */
export function ChoiceChips<T extends string>({ options, value, onChange, group, className }: {
  options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; group: string; className?: string
}) {
  return (
    <div className={cx('flex flex-wrap gap-2', className)}>
      {options.map(o => {
        const on = o.id === value
        return (
          <motion.button key={o.id} type="button" whileTap={{ scale: 0.95 }} onClick={() => onChange(o.id)}
            className={cx('relative min-h-[44px] rounded-full border px-4 text-[14px] font-medium transition-colors', on ? 'border-forest text-on-forest' : 'border-line bg-ivory-2 text-charcoal-2')}>
            {on && <motion.span layoutId={`chip-${group}`} transition={spring} className="absolute inset-0 rounded-full bg-forest" />}
            <span className="relative">{o.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

export const textareaClass = 'w-full resize-none rounded-[12px] border border-line bg-ivory-2 px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-stone-l focus:border-forest-l focus:ring-4 focus:ring-forest/10'
