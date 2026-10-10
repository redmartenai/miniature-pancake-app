/* EduFlow UI kit — paper, ink, forest & copper. Import everything from '@/components/ui'. */
import { AnimatePresence, animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'
import clsx from 'clsx'
import {
  createContext, useContext, useEffect, useId, useRef, useState, useCallback,
  type ButtonHTMLAttributes, type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, X, type LucideIcon } from 'lucide-react'
import { ease, fadeUp, spring, stagger, tap } from './motion'
import { initials } from '@/lib/format'

export * from './motion'
export { clsx as cx }

/* ───────────────────────── tones ───────────────────────── */

export type Tone = 'forest' | 'copper' | 'amber' | 'rust' | 'slate' | 'stone' | 'ink'

export const toneClass: Record<Tone, { bg: string; text: string; dot: string; solid: string; ring: string }> = {
  forest: { bg: 'bg-forest-p', text: 'text-forest', dot: 'bg-forest-l', solid: 'bg-forest text-on-forest', ring: 'ring-forest/20' },
  copper: { bg: 'bg-copper-p', text: 'text-copper-d', dot: 'bg-copper', solid: 'bg-copper text-on-copper', ring: 'ring-copper/25' },
  amber: { bg: 'bg-amber-p', text: 'text-[#8a5f14]', dot: 'bg-amber', solid: 'bg-amber text-ink', ring: 'ring-amber/30' },
  rust: { bg: 'bg-rust-p', text: 'text-rust', dot: 'bg-rust', solid: 'bg-rust text-ivory', ring: 'ring-rust/25' },
  slate: { bg: 'bg-slate-p', text: 'text-slate', dot: 'bg-slate-l', solid: 'bg-slate text-ivory', ring: 'ring-slate/20' },
  stone: { bg: 'bg-paper', text: 'text-stone', dot: 'bg-stone-l', solid: 'bg-stone text-ivory', ring: 'ring-stone/20' },
  ink: { bg: 'bg-ink/5', text: 'text-ink', dot: 'bg-ink', solid: 'bg-ink text-ivory', ring: 'ring-ink/15' },
}

export const severityTone = { critical: 'rust', high: 'copper', watch: 'amber' } as const satisfies Record<string, Tone>

/* ───────────────────────── Card ───────────────────────── */

export function Card({ children, className, interactive, onClick, as = 'div', padded = true }: {
  children: ReactNode; className?: string; interactive?: boolean; onClick?: () => void; as?: 'div' | 'section' | 'article'; padded?: boolean
}) {
  const M = motion[as]
  return (
    <M
      variants={fadeUp}
      onClick={onClick}
      whileHover={interactive ? { y: -2, boxShadow: '0 14px 30px -16px rgba(36,31,27,.24)' } : undefined}
      whileTap={interactive ? { scale: 0.995 } : undefined}
      transition={{ duration: 0.25, ease: ease.out }}
      className={clsx('rounded-[14px] border border-line bg-ivory-2 shadow-1', padded && 'p-5', interactive && 'cursor-pointer', className)}
    >
      {children}
    </M>
  )
}

export function CardHeader({ title, eyebrow, action, className }: { title: ReactNode; eyebrow?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h3 className="font-display text-[19px] leading-tight">{title}</h3>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export const Eyebrow = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={clsx('mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-stone', className)}>{children}</div>
)

/* ───────────────────────── Page header (web) ───────────────────────── */

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <motion.header variants={fadeUp} className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="font-display text-[34px] leading-[1.08] md:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-stone">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.header>
  )
}

/** Wrap a page's content to get staggered entrance for every Card/PageHeader inside. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div initial="hidden" animate="show" variants={stagger(0.045)} className={clsx('mx-auto w-full max-w-[1320px]', className)}>
      {children}
    </motion.div>
  )
}

/* ───────────────────────── Button ───────────────────────── */

type BtnVariant = 'primary' | 'copper' | 'outline' | 'ghost' | 'danger' | 'soft'
const btnBase = 'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors disabled:opacity-45'
const btnVariant: Record<BtnVariant, string> = {
  primary: 'bg-forest text-on-forest hover:bg-forest-d shadow-[0_1px_0_rgba(255,255,255,.12)_inset,0_8px_18px_-10px_rgba(36,31,27,.45)]',
  copper: 'bg-copper text-on-copper hover:bg-copper-d shadow-[0_8px_18px_-10px_rgba(36,31,27,.45)]',
  outline: 'border border-line bg-ivory-2 text-charcoal hover:border-stone-p hover:bg-paper',
  ghost: 'text-charcoal-2 hover:bg-paper',
  danger: 'border border-rust/25 bg-rust-p text-rust hover:bg-rust hover:text-ivory',
  soft: 'bg-forest-p text-forest hover:bg-forest-p/70',
}
const btnSize = { sm: 'h-8 rounded-[8px] px-3 text-[13px]', md: 'h-10 rounded-[10px] px-4 text-[14px]', lg: 'h-12 rounded-[12px] px-5 text-[15px]' }

export function Button({ variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, className, children, block, ...rest }:
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'style'> & {
    variant?: BtnVariant; size?: keyof typeof btnSize; icon?: LucideIcon; iconRight?: LucideIcon; block?: boolean
  }) {
  return (
    <motion.button whileTap={rest.disabled ? undefined : tap} className={clsx(btnBase, btnVariant[variant], btnSize[size], block && 'w-full', className)} {...rest}>
      {Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} />}
      {children}
      {IconRight && <IconRight size={size === 'sm' ? 14 : 16} strokeWidth={2} />}
    </motion.button>
  )
}

export function IconButton({ icon: Icon, label, onClick, className, badge, tone = 'ghost' }: { icon: LucideIcon; label: string; onClick?: () => void; className?: string; badge?: number; tone?: 'ghost' | 'outline' }) {
  return (
    <motion.button whileTap={tap} aria-label={label} title={label} onClick={onClick}
      className={clsx('relative grid h-9 w-9 place-items-center rounded-[10px] text-charcoal-2 transition-colors', tone === 'outline' ? 'border border-line bg-ivory-2 hover:bg-paper' : 'hover:bg-paper', className)}>
      <Icon size={18} strokeWidth={1.8} />
      {!!badge && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}
          className="absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-copper px-1 text-[10px] font-semibold text-ivory ring-2 ring-ivory">
          {badge > 99 ? '99+' : badge}
        </motion.span>
      )}
    </motion.button>
  )
}

/* ───────────────────────── Pill / Dot ───────────────────────── */

export function Pill({ tone = 'stone', children, className, dot, icon: Icon }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean; icon?: LucideIcon }) {
  const t = toneClass[tone]
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12px] font-medium', t.bg, t.text, className)}>
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', t.dot)} />}
      {Icon && <Icon size={12} strokeWidth={2.2} />}
      {children}
    </span>
  )
}

export function LiveDot({ tone = 'forest', className }: { tone?: Tone; className?: string }) {
  return (
    <span className={clsx('relative inline-flex h-2 w-2', className)}>
      <motion.span className={clsx('absolute inset-0 rounded-full', toneClass[tone].dot)} animate={{ scale: [1, 2.4], opacity: [0.55, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }} />
      <span className={clsx('relative h-2 w-2 rounded-full', toneClass[tone].dot)} />
    </span>
  )
}

/* ───────────────────────── Avatar ───────────────────────── */

const AVATAR_TONES = ['bg-[#E4EDE9] text-forest', 'bg-[#F7EDE0] text-copper-d', 'bg-[#E7EBEE] text-slate', 'bg-[#F1EADC] text-[#7B5F42]', 'bg-[#EEDCC4] text-[#6B5346]', 'bg-[#CFE0E6] text-[#3E4A54]']
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)

export function Avatar({ name, size = 36, className, ring }: { name: string; size?: number; className?: string; ring?: boolean }) {
  return (
    <span style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      className={clsx('inline-grid shrink-0 place-items-center rounded-full font-semibold tracking-wide', AVATAR_TONES[hash(name) % AVATAR_TONES.length], ring && 'ring-2 ring-ivory-2', className)}>
      {initials(name)}
    </span>
  )
}

export function AvatarStack({ names, max = 4, size = 28 }: { names: string[]; max?: number; size?: number }) {
  return (
    <div className="flex -space-x-2">
      {names.slice(0, max).map(n => <Avatar key={n} name={n} size={size} ring />)}
      {names.length > max && <span style={{ width: size, height: size }} className="grid place-items-center rounded-full bg-paper text-[11px] font-medium text-stone ring-2 ring-ivory-2">+{names.length - max}</span>}
    </div>
  )
}

/* ───────────────────────── Numbers & charts ───────────────────────── */

export function AnimatedNumber({ value, format = (n: number) => Math.round(n).toLocaleString('en-IN'), className, duration = 0.9 }: { value: number; format?: (n: number) => string; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const mv = useMotionValue(0)
  const text = useTransform(mv, v => format(v))
  useEffect(() => {
    if (!inView) return
    const c = animate(mv, value, { duration, ease: ease.out })
    return c.stop
  }, [inView, value, mv, duration])
  return <motion.span ref={ref} className={clsx('tabular', className)}>{text}</motion.span>
}

export function Sparkline({ data, width = 120, height = 34, tone = 'forest', fill = true, className }: { data: number[]; width?: number; height?: number; tone?: Tone; fill?: boolean; className?: string }) {
  const id = useId()
  if (data.length < 2) return null
  const min = Math.min(...data), max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - 3 - ((v - min) / span) * (height - 6)])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const color = { forest: 'var(--color-forest-l)', copper: 'var(--color-copper)', amber: '#E0A53F', rust: '#A4483A', slate: '#7C8894', stone: '#B6AFA3', ink: '#241F1B' }[tone]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={clsx('overflow-visible', className)} aria-hidden>
      {fill && (
        <>
          <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: color }} stopOpacity=".18" /><stop offset="1" style={{ stopColor: color }} stopOpacity="0" /></linearGradient></defs>
          <motion.path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
        </>
      )}
      <motion.path d={d} fill="none" style={{ stroke: color }} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: ease.out }} />
      <motion.circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.6} style={{ fill: color }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 }} />
    </svg>
  )
}

/** Circular progress. value is 0..1 */
export function Ring({ value, size = 64, stroke = 6, tone = 'forest', children, track = '#EDE8DF' }: { value: number; size?: number; stroke?: number; tone?: Tone; children?: ReactNode; track?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = { forest: 'var(--color-forest)', copper: 'var(--color-copper)', amber: '#E0A53F', rust: '#A4483A', slate: '#4E5A66', stone: '#8B8377', ink: '#241F1B' }[tone]
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} style={{ stroke: color }} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, value))) }} transition={{ duration: 1.1, ease: ease.out }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

export function Progress({ value, tone = 'forest', className, height = 6 }: { value: number; tone?: Tone; className?: string; height?: number }) {
  return (
    <div className={clsx('w-full overflow-hidden rounded-full bg-line-2', className)} style={{ height }}>
      <motion.div className={clsx('h-full rounded-full', toneClass[tone].dot)} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} transition={{ duration: 0.9, ease: ease.out }} />
    </div>
  )
}

/** Simple vertical bars. data: [{label, value, tone?}] */
export function Bars({ data, height = 140, format = (n: number) => String(Math.round(n)), max: maxIn }: { data: { label: string; value: number; tone?: Tone }[]; height?: number; format?: (n: number) => string; max?: number }) {
  const max = maxIn ?? Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={d.label} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[11px] tabular text-stone opacity-0 transition-opacity group-hover:opacity-100">{format(d.value)}</span>
          <motion.div className={clsx('w-full max-w-[38px] rounded-t-[6px]', toneClass[d.tone ?? 'forest'].dot)}
            initial={{ height: 0 }} animate={{ height: `${(d.value / max) * (height - 40)}px` }} transition={{ duration: 0.8, delay: i * 0.04, ease: ease.out }} />
          <span className="w-full truncate text-center text-[11px] text-stone">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ───────────────────────── Stat tile ───────────────────────── */

export function Stat({ label, value, format, sub, tone = 'forest', icon: Icon, trend, className }: {
  label: string; value: number; format?: (n: number) => string; sub?: ReactNode; tone?: Tone; icon?: LucideIcon; trend?: number[]; className?: string
}) {
  return (
    <Card className={clsx('flex flex-col justify-between gap-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-stone">{label}</span>
        {Icon && <span className={clsx('grid h-8 w-8 place-items-center rounded-[9px]', toneClass[tone].bg, toneClass[tone].text)}><Icon size={16} /></span>}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <AnimatedNumber value={value} format={format} className="font-display text-[30px] leading-none text-ink" />
          {sub && <div className="mt-1.5 text-[12.5px] text-stone">{sub}</div>}
        </div>
        {trend && <Sparkline data={trend} tone={tone} width={92} height={32} />}
      </div>
    </Card>
  )
}

/* ───────────────────────── Tabs / Segmented ───────────────────────── */

export function Tabs<T extends string>({ tabs, value, onChange, className, size = 'md' }: { tabs: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string; size?: 'sm' | 'md' }) {
  const group = useId()
  return (
    <div className={clsx('no-scrollbar flex gap-1 overflow-x-auto rounded-[11px] bg-paper p-1', className)} role="tablist">
      {tabs.map(t => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={clsx('relative shrink-0 rounded-[8px] font-medium transition-colors', size === 'sm' ? 'px-2.5 py-1 text-[12.5px]' : 'px-3.5 py-1.5 text-[13.5px]', value === t.id ? 'text-ink' : 'text-stone hover:text-charcoal')}>
          {value === t.id && <motion.span layoutId={`tab-${group}`} className="absolute inset-0 rounded-[8px] bg-ivory-2 shadow-1" transition={spring} />}
          <span className="relative inline-flex items-center gap-1.5">
            {t.label}
            {t.count !== undefined && <span className={clsx('rounded-full px-1.5 text-[11px] tabular', value === t.id ? 'bg-forest-p text-forest' : 'bg-line-2 text-stone')}>{t.count}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}

/* ───────────────────────── Overlays ───────────────────────── */

/** Where overlays (sheets, toasts) render. Mobile phones provide their own frame-local root. */
export const OverlayRootContext = createContext<HTMLElement | null>(null)
const useOverlayRoot = () => useContext(OverlayRootContext) ?? (typeof document !== 'undefined' ? document.body : null)

/** Bottom sheet — the primary mobile overlay; on web it renders as a centered dialog. */
export function Sheet({ open, onClose, title, children, footer, variant = 'auto' }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; variant?: 'auto' | 'sheet' | 'dialog' }) {
  const root = useOverlayRoot()
  const inPhone = useContext(OverlayRootContext) !== null
  const asSheet = variant === 'sheet' || (variant === 'auto' && inPhone)
  if (!root) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={clsx(inPhone ? 'absolute' : 'fixed', 'inset-0 z-50 flex', asSheet ? 'items-end' : 'items-center justify-center p-4')}>
          <motion.div className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div role="dialog" aria-modal
            initial={asSheet ? { y: '100%' } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={asSheet ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={asSheet ? { y: '100%' } : { opacity: 0, y: 10, scale: 0.98 }}
            transition={asSheet ? { type: 'spring', stiffness: 380, damping: 38 } : { duration: 0.3, ease: ease.out }}
            drag={asSheet ? 'y' : false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose() }}
            className={clsx('relative flex max-h-[88%] w-full flex-col bg-ivory-2 shadow-3', asSheet ? 'rounded-t-[26px]' : 'max-h-[86vh] max-w-[560px] rounded-[18px]')}>
            {asSheet && <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-stone-p" />}
            {title && (
              <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-4">
                <h3 className="font-display text-[20px] leading-tight">{title}</h3>
                <IconButton icon={X} label="Close" onClick={onClose} />
              </div>
            )}
            <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-1">{children}</div>
            {footer && <div className="shrink-0 border-t border-line-2 px-5 py-3.5">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    root,
  )
}

/* ───────────────────────── Toasts ───────────────────────── */

interface Toast { id: number; text: string; tone: Tone }
const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {})
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children, placement = 'bottom' }: { children: ReactNode; placement?: 'bottom' | 'top' }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const root = useOverlayRoot()
  const inPhone = useContext(OverlayRootContext) !== null
  const push = useCallback((text: string, tone: Tone = 'forest') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, text, tone }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800)
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      {root && createPortal(
        <div className={clsx(inPhone ? 'absolute' : 'fixed', 'pointer-events-none inset-x-0 z-[60] flex flex-col items-center gap-2 px-4', placement === 'top' ? 'top-14' : inPhone ? 'bottom-24' : 'bottom-6')}>
          <AnimatePresence>
            {toasts.map(t => (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={spring}
                className="pointer-events-auto flex max-w-[360px] items-center gap-2.5 rounded-[12px] bg-ink px-4 py-2.5 text-[13.5px] text-ivory shadow-3">
                <span className={clsx('grid h-5 w-5 shrink-0 place-items-center rounded-full', toneClass[t.tone].solid)}><Check size={12} strokeWidth={3} /></span>
                {t.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        root,
      )}
    </ToastContext.Provider>
  )
}

/* ───────────────────────── Forms ───────────────────────── */

export const inputClass = 'h-10 w-full rounded-[10px] border border-line bg-ivory-2 px-3 text-[14px] text-ink outline-none transition-[border,box-shadow] placeholder:text-stone-l focus:border-forest-l focus:ring-4 focus:ring-forest/10'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-charcoal-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-stone">{hint}</span>}
    </label>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={clsx('relative h-6 w-10 shrink-0 rounded-full transition-colors', checked ? 'bg-forest' : 'bg-stone-p')} type="button">
      <motion.span layout transition={spring} className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-ivory-2 shadow-1', checked ? 'right-0.5' : 'left-0.5')} />
    </button>
  )
}

/* ───────────────────────── Misc ───────────────────────── */

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-forest-p text-forest"><Icon size={24} strokeWidth={1.6} /></span>
      <h4 className="font-display text-[19px]">{title}</h4>
      {body && <p className="mt-1.5 max-w-xs text-[13.5px] text-stone">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  )
}

export const Divider = ({ className }: { className?: string }) => <div className={clsx('h-px bg-line-2', className)} />

/** Table primitives tuned for dense school data. */
export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('scroll-quiet overflow-x-auto', className)}>
      <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left text-[13.5px]">
        <thead>
          <tr>{head.map((h, i) => <th key={i} className="sticky top-0 border-b border-line bg-ivory-2 px-3 py-2.5 text-[11.5px] font-medium uppercase tracking-[0.08em] text-stone first:pl-0">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <td className={clsx('border-b border-line-2 px-3 py-3 align-middle first:pl-0', className)}>{children}</td>
)
export const Tr = ({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) => (
  <motion.tr variants={fadeUp} onClick={onClick} className={clsx('transition-colors', onClick && 'cursor-pointer hover:bg-paper/60', className)}>{children}</motion.tr>
)
