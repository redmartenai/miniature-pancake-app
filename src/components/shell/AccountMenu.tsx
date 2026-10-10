/* Who is signed in, the experiences their roles open, their schools, and sign-out. */
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { ChevronsUpDown, LogOut, School } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, useToast } from '@/components/ui'
import { useAuth } from '@/auth/AuthProvider'
import { EXPERIENCE_LABEL, homePath, type Experience } from '@/auth/experience'
import { errorCopy } from '@/components/states'

export function roleTitle(roles: { name: string; title: string }[]): string {
  return roles.map(r => r.title || r.name).join(' · ') || 'Member'
}

export function AccountMenu({ current, placement = 'up' }: { current: Experience; placement?: 'up' | 'down' }) {
  const { user, membership, experiences, selectable, schoolId, activateSchool, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  if (!user) return null

  const switchSchool = async (id: string) => {
    setBusy(true)
    try {
      await activateSchool(id)
      setOpen(false)
      navigate('/', { replace: true })
    } catch (e) {
      toast(errorCopy(e).title, 'rust')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2 }}
            className={clsx('absolute left-0 right-0 z-40 overflow-hidden rounded-[12px] border border-line bg-ivory-2 p-1 shadow-2', placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2')}>
            {experiences.length > 1 && (
              <>
                <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-stone-l">Your roles here</div>
                {experiences.map(e => (
                  <Link key={e} to={homePath(e, EXPERIENCE_LABEL[e].web && window.innerWidth >= 1024)} onClick={() => setOpen(false)}
                    className={clsx('block rounded-[8px] px-3 py-2 hover:bg-paper', e === current && 'bg-paper')}>
                    <div className="text-[13.5px] font-medium text-ink">{EXPERIENCE_LABEL[e].label}</div>
                    <div className="text-[12px] text-stone">{EXPERIENCE_LABEL[e].sub}</div>
                  </Link>
                ))}
              </>
            )}
            {selectable.length > 1 && (
              <>
                <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-stone-l">Schools</div>
                {selectable.map(m => (
                  <button key={m.id} disabled={busy || m.school.id === schoolId} onClick={() => switchSchool(m.school.id)}
                    className={clsx('flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left hover:bg-paper disabled:cursor-default', m.school.id === schoolId && 'bg-paper')}>
                    <School size={14} className="shrink-0 text-stone" />
                    <span className="truncate text-[13.5px] text-ink">{m.school.name}</span>
                  </button>
                ))}
              </>
            )}
            <button onClick={() => signOut()} className="mt-1 flex w-full items-center gap-2 rounded-[8px] border-t border-line-2 px-3 py-2 text-[13px] text-stone hover:bg-paper hover:text-ink">
              <LogOut size={14} /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left hover:bg-paper">
        <Avatar name={user.full_name} size={34} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-medium text-ink">{user.full_name}</div>
          <div className="truncate text-[12px] text-stone">{membership ? roleTitle(membership.roles) : 'No school selected'}</div>
        </div>
        <ChevronsUpDown size={15} className="text-stone" />
      </button>
    </div>
  )
}
