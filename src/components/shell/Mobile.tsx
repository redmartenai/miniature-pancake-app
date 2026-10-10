/**
 * Mobile shell: a phone frame + a tiny stack navigator.
 * Each <MobileApp> owns its own navigation, overlays and toasts, so several phones can live on one page
 * while each keeps its own state.
 */
import { AnimatePresence, LayoutGroup, motion, useScroll, useTransform } from 'framer-motion'
import clsx from 'clsx'
import { ChevronLeft, type LucideIcon } from 'lucide-react'
import { createContext, useCallback, useContext, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { OverlayRootContext, ToastProvider, spring, ease } from '@/components/ui'
import { useNow } from '@/api/queries'

/* ───────────────────────── navigation ───────────────────────── */

export interface PushedScreen { title?: string; render: () => ReactNode }
interface StackEntry extends PushedScreen { key: string }

export interface MobileTab { id: string; label: string; icon: LucideIcon; badge?: number; render: () => ReactNode }

interface NavCtx {
  push: (s: PushedScreen) => void
  pop: () => void
  popToRoot: () => void
  depth: number
  tab: string
  setTab: (id: string) => void
}
const NavContext = createContext<NavCtx | null>(null)
export function useMobileNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useMobileNav must be used inside <MobileApp>')
  return ctx
}

let keySeq = 0

export function MobileApp({ tabs, initialTab, hideTabBar }: { tabs: MobileTab[]; initialTab?: string; hideTabBar?: boolean }) {
  const [tab, setTabState] = useState(initialTab ?? tabs[0].id)
  const [stacks, setStacks] = useState<Record<string, StackEntry[]>>({})
  const [dir, setDir] = useState<'push' | 'pop' | 'tab'>('tab')
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null)
  const groupId = useId() // scope layoutIds so phones side by side don't animate into each other

  const stack = stacks[tab] ?? []
  const push = useCallback((s: PushedScreen) => { setDir('push'); setStacks(st => ({ ...st, [tab]: [...(st[tab] ?? []), { ...s, key: `s${++keySeq}` }] })) }, [tab])
  const pop = useCallback(() => { setDir('pop'); setStacks(st => ({ ...st, [tab]: (st[tab] ?? []).slice(0, -1) })) }, [tab])
  const popToRoot = useCallback(() => { setDir('pop'); setStacks(st => ({ ...st, [tab]: [] })) }, [tab])
  const setTab = useCallback((id: string) => {
    if (id === tab) { popToRoot(); return }
    setDir('tab'); setTabState(id)
  }, [tab, popToRoot])

  const ctx = useMemo<NavCtx>(() => ({ push, pop, popToRoot, depth: stack.length, tab, setTab }), [push, pop, popToRoot, stack.length, tab, setTab])
  const top = stack[stack.length - 1]
  const current = tabs.find(t => t.id === tab) ?? tabs[0]
  const screenKey = top ? top.key : `root-${tab}`

  const variants = {
    enter: (d: string) => (d === 'push' ? { x: '100%', opacity: 1 } : d === 'pop' ? { x: '-28%', opacity: 0.6 } : { opacity: 0, y: 8 }),
    center: { x: 0, y: 0, opacity: 1 },
    exit: (d: string) => (d === 'push' ? { x: '-28%', opacity: 0.6 } : d === 'pop' ? { x: '100%', opacity: 1 } : { opacity: 0 }),
  }

  return (
    <OverlayRootContext.Provider value={overlay}>
      <NavContext.Provider value={ctx}>
        <ToastProvider>
          <LayoutGroup id={groupId}>
          <div className="relative flex h-full w-full flex-col overflow-hidden bg-ivory pt-[env(safe-area-inset-top)] md:pt-0">
            <StatusBar />
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <AnimatePresence initial={false} custom={dir} mode="popLayout">
                <motion.div key={screenKey} custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
                  transition={dir === 'tab' ? { duration: 0.28, ease: ease.out } : { type: 'spring', stiffness: 380, damping: 40 }}
                  className="absolute inset-0 bg-ivory shadow-[-20px_0_40px_-30px_rgba(36,31,27,.35)]">
                  {top ? top.render() : current.render()}
                </motion.div>
              </AnimatePresence>
            </div>
            {!hideTabBar && <TabBar tabs={tabs} active={tab} onChange={setTab} />}
            <div ref={setOverlay} className="pointer-events-none absolute inset-0 z-40 [&>*]:pointer-events-auto" />
          </div>
          </LayoutGroup>
        </ToastProvider>
      </NavContext.Provider>
    </OverlayRootContext.Provider>
  )
}

function StatusBar() {
  const now = useNow()
  return (
    <div className="hidden h-[44px] shrink-0 items-end justify-between px-7 pb-1.5 text-[14px] font-semibold text-ink md:flex" aria-hidden>
      <span className="tabular">{now.slice(11, 16)}</span>
      <span className="flex items-center gap-1.5" aria-hidden>
        <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor" /><rect x="4.5" y="5" width="3" height="6" rx="1" fill="currentColor" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" fill="currentColor" /><rect x="13.5" y="0" width="3" height="11" rx="1" fill="currentColor" /></svg>
        <svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 2.2c2.1 0 4 .8 5.4 2.1l1.1-1.1A9.2 9.2 0 0 0 7.5.6 9.2 9.2 0 0 0 1 3.2l1.1 1.1a7.6 7.6 0 0 1 5.4-2.1Zm0 3.2c1.2 0 2.3.5 3.1 1.2l1.1-1.1a6 6 0 0 0-8.4 0l1.1 1.1c.8-.7 1.9-1.2 3.1-1.2Zm0 3.2c.4 0 .8.2 1 .4L7.5 10 6.5 9c.2-.2.6-.4 1-.4Z" fill="currentColor" /></svg>
        <svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="3.5" stroke="currentColor" opacity=".4" fill="none" /><rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" /><path d="M23 4v4c.8-.3 1.3-1.1 1.3-2S23.8 4.3 23 4Z" fill="currentColor" opacity=".45" /></svg>
      </span>
    </div>
  )
}

function TabBar({ tabs, active, onChange }: { tabs: MobileTab[]; active: string; onChange: (id: string) => void }) {
  return (
    <nav aria-label="Tabs" className="relative z-30 shrink-0 border-t border-line-2 bg-ivory-2/92 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl md:pb-[22px]">
      <div className="flex">
        {tabs.map(t => {
          const on = t.id === active
          return (
            <button key={t.id} onClick={() => onChange(t.id)} className="relative flex flex-1 flex-col items-center gap-0.5 py-1" aria-current={on ? 'page' : undefined}>
              <span className="relative grid h-8 w-14 place-items-center">
                {on && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-forest-p" transition={spring} />}
                <t.icon size={20} strokeWidth={on ? 2.1 : 1.7} className={clsx('relative transition-colors', on ? 'text-forest' : 'text-stone')} />
                {!!t.badge && (
                  <motion.span key={t.badge} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={spring}
                    className="absolute right-1.5 top-0 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-copper px-1 text-[9.5px] font-semibold text-ivory ring-2 ring-ivory-2">
                    {t.badge > 9 ? '9+' : t.badge}
                  </motion.span>
                )}
              </span>
              <span className={clsx('text-[10.5px] font-medium transition-colors', on ? 'text-forest' : 'text-stone')}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/* ───────────────────────── screen ───────────────────────── */

/**
 * A scrolling mobile screen with an iOS-style large title that collapses into the nav bar.
 * Pushed screens automatically get a back button.
 */
export function MobileScreen({ title, eyebrow, actions, children, className, large = true, onBack, footer, hero }: {
  title: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; large?: boolean; onBack?: () => void; footer?: ReactNode; hero?: ReactNode
}) {
  const nav = useContext(NavContext)
  const ref = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: ref })
  const smallOpacity = useTransform(scrollY, large ? [30, 60] : [0, 1], [0, 1])
  const border = useTransform(scrollY, [0, 20], ['rgba(226,220,209,0)', 'rgba(226,220,209,1)'])
  const back = onBack ?? (nav && nav.depth > 0 ? nav.pop : undefined)

  return (
    <div className="flex h-full flex-col">
      <motion.header style={{ borderColor: border }} className="relative z-10 flex h-11 shrink-0 items-center justify-between border-b bg-ivory/90 px-3 backdrop-blur-lg">
        <div className="flex min-w-[64px] items-center">
          {back && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={back} className="-ml-1 flex items-center gap-0.5 rounded-lg px-1 py-1 text-[15px] font-medium text-forest">
              <ChevronLeft size={24} strokeWidth={2.2} /> Back
            </motion.button>
          )}
        </div>
        <motion.div style={{ opacity: smallOpacity }} className="absolute inset-x-20 truncate text-center text-[15.5px] font-semibold text-ink">{title}</motion.div>
        <div className="flex min-w-[64px] items-center justify-end gap-1">{actions}</div>
      </motion.header>
      <div ref={ref} className={clsx('no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain', className)}>
        {hero}
        {large && (
          <div className="px-5 pb-3 pt-1">
            {eyebrow && <div className="mb-0.5 text-[12.5px] font-medium text-stone">{eyebrow}</div>}
            <h1 className="font-display text-[30px] leading-[1.1]">{title}</h1>
          </div>
        )}
        <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }} className="px-4 pb-8">
          {children}
        </motion.div>
      </div>
      {footer && <div className="shrink-0 border-t border-line-2 bg-ivory-2/95 px-4 py-3 backdrop-blur">{footer}</div>}
    </div>
  )
}

/** Grouped list section (iOS-style inset group) */
export function MSection({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: ease.out } } }} className={clsx('mt-5 first:mt-1', className)}>
      {(title || action) && (
        <div className="mb-2 flex items-baseline justify-between px-1">
          {title && <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </motion.section>
  )
}

/** Tappable row inside an MSection list */
export function MRow({ icon, title, sub, right, onClick, className }: { icon?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void; className?: string }) {
  const Comp = onClick ? motion.button : motion.div
  return (
    <Comp whileTap={onClick ? { scale: 0.985, backgroundColor: 'rgba(240,235,226,.7)' } : undefined} onClick={onClick}
      className={clsx('flex w-full items-center gap-3 px-4 py-3 text-left', className)}>
      {icon}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium text-ink">{title}</div>
        {sub && <div className="truncate text-[13px] text-stone">{sub}</div>}
      </div>
      {right}
    </Comp>
  )
}

export const MList = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={clsx('divide-y divide-line-2 overflow-hidden rounded-[16px] border border-line bg-ivory-2', className)}>{children}</div>
)

/* ───────────────────────── device frame ───────────────────────── */

/**
 * On phones the app fills the screen. On larger screens it sits in a device frame.
 * `framed` forces the frame (used on /live where several phones sit side by side).
 */
export function PhoneFrame({ children, framed, className, scale = 1 }: { children: ReactNode; framed?: boolean; className?: string; scale?: number }) {
  return (
    <div className={clsx(framed ? '' : 'h-dvh w-full md:h-auto md:w-auto', className)} style={scale !== 1 ? { zoom: scale } : undefined}>
      <div className={clsx(
        'relative overflow-hidden bg-ivory',
        framed ? 'h-[844px] w-[390px] rounded-[54px] p-[11px] shadow-phone [background:#1b1714]' : 'h-full w-full md:h-[844px] md:w-[390px] md:rounded-[54px] md:p-[11px] md:shadow-phone md:[background:#1b1714]',
      )}>
        <div className={clsx('relative h-full w-full overflow-hidden', framed ? 'rounded-[44px]' : 'md:rounded-[44px]')}>
          <div className={clsx('pointer-events-none absolute left-1/2 top-[10px] z-[70] h-[30px] w-[112px] -translate-x-1/2 rounded-full bg-[#0d0b0a]', !framed && 'hidden md:block')} />
          {children}
          <div className={clsx('pointer-events-none absolute bottom-[7px] left-1/2 z-[70] h-[5px] w-[128px] -translate-x-1/2 rounded-full bg-ink/80', !framed && 'hidden md:block')} />
        </div>
      </div>
    </div>
  )
}
