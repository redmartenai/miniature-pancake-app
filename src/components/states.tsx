/* Loading, error and "not connected yet" states, shared by every screen. */
import { motion } from 'framer-motion'
import { CircleAlert, PlugZap, RotateCcw, ShieldX, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { isApiError } from '@/api/client'
import { BLOCKERS, type Blocker } from '@/lib/blockers'
import { Button, Card, cx, fadeUp } from '@/components/ui'

/** Quiet skeleton lines while data loads. */
export function Loading({ label = 'Loading', rows = 3, className }: { label?: string; rows?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className={cx('space-y-2.5 py-2', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <motion.div key={i} className="h-10 rounded-[10px] bg-paper" animate={{ opacity: [0.55, 1, 0.55] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.12 }} />
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  )
}

/** What went wrong, in words a person can act on. Branches on the error code, never the message. */
export function errorCopy(error: unknown): { title: string; body: string; icon: typeof CircleAlert } {
  if (isApiError(error)) {
    if (error.code === 'network_error') return { title: "Can't reach EduFlow", body: error.message, icon: WifiOff }
    if (error.code === 'permission_denied' || error.code === 'tenant_forbidden') return { title: 'Not available to your role', body: 'Your school has not given your role access to this. Ask your administrator if you need it.', icon: ShieldX }
    if (error.code === 'not_found') return { title: 'Not found', body: "This record doesn't exist or isn't visible to you.", icon: CircleAlert }
    if (error.code === 'rate_limited') return { title: 'Too many attempts', body: `Please wait ${error.retryAfterSeconds ?? 30} seconds and try again.`, icon: CircleAlert }
    return { title: 'Something went wrong', body: `${error.message}${error.requestId ? ` (ref ${error.requestId.slice(0, 8)})` : ''}`, icon: CircleAlert }
  }
  return { title: 'Something went wrong', body: 'Please try again.', icon: CircleAlert }
}

export function ErrorState({ error, onRetry, compact }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  const c = errorCopy(error)
  return (
    <motion.div role="alert" variants={fadeUp} initial="hidden" animate="show" className={cx('flex flex-col items-center text-center', compact ? 'px-4 py-6' : 'px-6 py-12')}>
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-rust-p text-rust"><c.icon size={22} strokeWidth={1.7} /></span>
      <h4 className="font-display text-[18px]">{c.title}</h4>
      <p className="mt-1 max-w-sm text-[13.5px] text-stone">{c.body}</p>
      {onRetry && <Button className="mt-4" size="sm" variant="outline" icon={RotateCcw} onClick={onRetry}>Try again</Button>}
    </motion.div>
  )
}

/** Renders loading / error / content for a query-like object. */
export function QueryState<T>({ q, children, loading, empty }: {
  q: { data: T | undefined; isPending: boolean; error: unknown; refetch: () => unknown }
  children: (data: T) => ReactNode
  loading?: ReactNode
  empty?: (data: T) => ReactNode | null
}) {
  if (q.isPending) return <>{loading ?? <Loading />}</>
  if (q.error || q.data === undefined) return <ErrorState error={q.error} onRetry={() => q.refetch()} compact />
  const e = empty?.(q.data)
  return <>{e ?? children(q.data)}</>
}

/**
 * The screen exists in the supplied design but the backend has no API for it yet.
 * Shows the screen's place and says exactly what is missing; never shows made-up data.
 */
export function Unavailable({ blocker, children, compact, className }: { blocker: Blocker; children?: ReactNode; compact?: boolean; className?: string }) {
  const b = BLOCKERS[blocker]
  return (
    <div data-blocker={blocker} className={cx('flex items-start gap-3 rounded-[14px] border border-dashed border-stone-p bg-paper/50', compact ? 'p-3' : 'p-4', className)}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-slate-p text-slate"><PlugZap size={17} strokeWidth={1.8} /></span>
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-ink">{b.title} isn't connected yet</div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-stone">
          {children ?? <>This needs {b.needs}, which the EduFlow backend doesn't provide yet ({b.phase}).</>}
        </p>
      </div>
    </div>
  )
}

/** A whole page that is waiting on the backend: the page header stays, the body explains. */
export function UnavailableCard({ blocker, title, eyebrow }: { blocker: Blocker; title?: string; eyebrow?: string }) {
  return (
    <Card>
      {(title || eyebrow) && (
        <div className="mb-3">
          {eyebrow && <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-stone">{eyebrow}</div>}
          {title && <h3 className="font-display text-[19px] leading-tight">{title}</h3>}
        </div>
      )}
      <Unavailable blocker={blocker} />
    </Card>
  )
}
