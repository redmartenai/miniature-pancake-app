import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Logo } from '@/components/shell/Logo'
import { ToastProvider, ease } from '@/components/ui'

/** Paper page with the (school's) logo and one centred card — shared by every signed-out screen. */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <ToastProvider>
      <div className="paper-grain flex min-h-dvh flex-col items-center justify-center bg-ivory px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: ease.out }} className="w-full max-w-[420px]">
          <div className="mb-8 flex justify-center"><Logo /></div>
          <div className="rounded-[18px] border border-line bg-ivory-2 p-6 shadow-2 sm:p-7">
            <h1 className="font-display text-[28px] leading-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-[14px] text-stone">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-5 text-center text-[12.5px] text-stone">{footer}</div>}
        </motion.div>
      </div>
    </ToastProvider>
  )
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <div role="alert" className="mb-4 rounded-[10px] border border-rust/25 bg-rust-p px-3 py-2.5 text-[13px] text-rust">{children}</div>
}

export const FieldError = ({ children }: { children?: ReactNode }) => (children ? <span className="mt-1 block text-[12px] text-rust">{children}</span> : null)
