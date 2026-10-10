/*
 * "Ask EduFlow" (⌘K). The supplied design answers natural-language questions about the school; the backend
 * has no search/question endpoint yet, so the palette keeps its place and says so instead of guessing.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ease } from '@/components/ui'
import { Unavailable } from '@/components/states'

export function AskPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 50) }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div role="dialog" aria-modal aria-label="Ask EduFlow" initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: ease.out }} className="relative w-full max-w-[640px] overflow-hidden rounded-[18px] border border-line bg-ivory-2 shadow-3">
            <div className="flex items-center gap-3 border-b border-line-2 px-4">
              <Search size={18} className="text-stone" />
              <input ref={input} value={q} onChange={e => setQ(e.target.value)} placeholder="Ask about attendance, fees, staff…" aria-label="Question"
                className="h-14 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-stone-l" />
              <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-stone hover:bg-paper"><X size={16} /></button>
            </div>
            <div className="p-4"><Unavailable blocker="ask" /></div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
