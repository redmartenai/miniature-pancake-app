/* Small building blocks shared by the parent screens. */
import { AnimatePresence, motion } from 'framer-motion'
import { useId, type ReactNode } from 'react'
import { Avatar, cx, ease, spring } from '@/components/ui'
import { useParent } from './context'

/** Pill segmented control between children, with avatar and class. Hidden with one child. */
export function ChildSwitcher({ className }: { className?: string }) {
  const { children, child, setChildId } = useParent()
  const group = useId()
  if (children.length < 2) return null
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      className={cx('flex gap-1 rounded-full border border-line bg-paper p-1', className)} role="tablist" aria-label="Choose child">
      {children.map(c => {
        const on = c.s.id === child?.s.id
        return (
          <button key={c.s.id} role="tab" aria-selected={on} onClick={() => setChildId(c.s.id)} className="relative flex min-h-[44px] flex-1 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-left">
            {on && <motion.span layoutId={`child-pill-${group}`} className="absolute inset-0 rounded-full bg-ivory-2 shadow-1 ring-1 ring-line" transition={spring} />}
            <span className="relative"><Avatar name={c.s.full_name} size={32} /></span>
            <span className="relative min-w-0">
              <span className={cx('block truncate text-[14.5px] font-semibold leading-tight transition-colors', on ? 'text-ink' : 'text-stone')}>{c.s.first_name}</span>
              <span className="block text-[11.5px] leading-tight text-stone">Class {c.classShort}</span>
            </span>
          </button>
        )
      })}
    </motion.div>
  )
}

/** Crossfade child-dependent content when the selected child changes. */
export function ChildFade({ children }: { children: ReactNode }) {
  const { child } = useParent()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={child?.s.id ?? 'none'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.26, ease: ease.out }}>
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: ease.out } } }
