/* Admin web — local helpers shared by the admin pages. */
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx, inputClass, spring } from '@/components/ui'

export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={cx(inputClass, 'pl-9 pr-8')} />
      {value && (
        <button aria-label="Clear search" onClick={() => onChange('')} className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-stone hover:bg-paper">
          <X size={13} />
        </button>
      )}
    </div>
  )
}

/** Compact segmented control with a shared layoutId pill. */
export function Segmented<T extends string>({ value, onChange, options, id }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; id: string }) {
  return (
    <div className="no-scrollbar inline-flex max-w-full gap-0.5 overflow-x-auto rounded-[10px] border border-line bg-ivory-2 p-0.5">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} className={cx('relative shrink-0 rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition-colors', value === o.value ? 'text-on-forest' : 'text-stone hover:text-ink')}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-[8px] bg-forest" transition={spring} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
