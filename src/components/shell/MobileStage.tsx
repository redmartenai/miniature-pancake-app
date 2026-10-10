/*
 * Mobile experiences: full screen on a phone; on larger screens the app sits in the design's phone frame
 * beside a short panel with the school, the signed-in person and the account menu.
 */
import { motion } from 'framer-motion'
import { Monitor } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ToastProvider, ease, fadeUp, stagger } from '@/components/ui'
import { useAuth } from '@/auth/AuthProvider'
import { EXPERIENCE_LABEL, type Experience } from '@/auth/experience'
import { Logo } from './Logo'
import { PhoneFrame } from './Mobile'
import { AccountMenu } from './AccountMenu'

export function MobileStage({ role, children }: { role: Experience; children: ReactNode }) {
  const { membership } = useAuth()
  const web = role === 'principal' ? '/principal' : role === 'admin' ? '/admin' : null
  return (
    <div className="paper-grain min-h-dvh bg-ivory md:flex md:items-center md:justify-center md:gap-16 md:px-8 md:py-10">
      <motion.aside initial="hidden" animate="show" variants={stagger(0.06)} className="hidden w-[340px] md:block">
        <motion.div variants={fadeUp}><Link to="/" className="mb-10 inline-flex"><Logo /></Link></motion.div>
        <motion.div variants={fadeUp} className="text-[12px] font-medium uppercase tracking-[0.14em] text-copper">{EXPERIENCE_LABEL[role].sub}</motion.div>
        <motion.h1 variants={fadeUp} className="mt-3 font-display text-[34px] leading-[1.08]">{membership?.school.name}</motion.h1>
        <motion.div variants={fadeUp} className="mt-7 rounded-[14px] border border-line bg-ivory-2 p-2">
          <ToastProvider><AccountMenu current={role} placement="down" /></ToastProvider>
        </motion.div>
        {web && (
          <motion.div variants={fadeUp} className="mt-4">
            <Link to={web} className="inline-flex items-center gap-1.5 rounded-[10px] border border-line bg-ivory-2 px-3 py-2 text-[13.5px] text-charcoal hover:bg-paper"><Monitor size={15} /> Web version</Link>
          </motion.div>
        )}
      </motion.aside>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: ease.out, delay: 0.1 }}>
        <PhoneFrame>{children}</PhoneFrame>
      </motion.div>
    </div>
  )
}
