/* More: fees, notifications, parent–teacher meetings, profile and linked children. */
import { Bell, CalendarCheck, ChevronRight, ShieldCheck, Users, Wallet } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { MList, MRow, MSection, MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { Unavailable } from '@/components/states'
import { useAuth } from '@/auth/AuthProvider'
import { humanize } from '@/lib/format'
import type { Blocker } from '@/lib/blockers'
import { AccountSection } from '@/roles/_shared/AccountSection'
import { ToneIcon } from '@/roles/_shared/ui'
import { useParent } from './context'

const blockedScreen = (title: string, blocker: Blocker) => () => <MobileScreen title={title}><Unavailable blocker={blocker} /></MobileScreen>

export function MoreScreen() {
  const { user, membership } = useAuth()
  const { children } = useParent()
  const nav = useMobileNav()
  const chevron = <ChevronRight size={18} className="text-stone-l" />
  return (
    <MobileScreen title="More" eyebrow={user?.full_name}>
      <MSection>
        <MList>
          <MRow icon={<ToneIcon icon={Wallet} tone="slate" round />} title="Fees" sub="Not connected yet" right={chevron} onClick={() => nav.push({ title: 'Fees', render: blockedScreen('Fees', 'fees') })} />
          <MRow icon={<ToneIcon icon={Bell} tone="slate" round />} title="Notifications" sub="Not connected yet" right={chevron} onClick={() => nav.push({ title: 'Notifications', render: blockedScreen('Notifications', 'notifications') })} />
          <MRow icon={<ToneIcon icon={CalendarCheck} tone="slate" round />} title="Parent–teacher meeting" sub="Not connected yet" right={chevron} onClick={() => nav.push({ title: 'PTM', render: blockedScreen('PTM', 'messages') })} />
        </MList>
      </MSection>
      <MSection title="Linked children">
        <MList>
          {children.map(c => (
            <MRow key={c.s.id} icon={<Avatar name={c.s.full_name} size={36} />} title={c.s.full_name}
              sub={`Class ${c.classShort}${c.roll ? ` · Roll ${c.roll}` : ''} · ${c.s.admission_number} · ${humanize(c.s.status)}`} />
          ))}
          {children.length === 0 && <MRow icon={<ToneIcon icon={Users} tone="slate" round />} title="No children linked" sub="Contact the school office" />}
        </MList>
      </MSection>
      <div className="mt-5 flex items-start gap-2.5 rounded-[14px] bg-slate-p px-4 py-3 text-[13px] text-slate">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" />
        <span>Only {children.length ? children.map(c => c.s.first_name).join(' and ') : 'your own children'} {children.length === 1 ? 'is' : 'are'} linked to your account. To add a child or change details, contact {membership?.school.name ?? 'the school office'}.</span>
      </div>
      <AccountSection current="parent" />
    </MobileScreen>
  )
}
