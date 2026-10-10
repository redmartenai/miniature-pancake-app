import { ChevronRight, House, IndianRupee, Inbox, UserPlus, Wallet } from 'lucide-react'
import { MobileApp, MobileScreen, MList, MRow, MSection, useMobileNav, type MobileTab } from '@/components/shell/Mobile'
import { Unavailable } from '@/components/states'
import { useCorrections, useNow } from '@/api/queries'
import { useAuth } from '@/auth/AuthProvider'
import { dateLabel, firstName, greeting, plural } from '@/lib/format'
import { SwipeApprovals } from '@/roles/_shared/SwipeApprovals'
import { MetricChip, ToneIcon } from '@/roles/_shared/ui'
import { AccountSection } from '@/roles/_shared/AccountSection'
import { useCan } from '@/roles/principal/web/shared'

/** The admin office's phone — money in, money out, families joining, decisions waiting. */
export function AdminMobileApp() {
  const can = useCan()
  const canApprove = can('attendance.approve')
  const pending = useCorrections('pending', canApprove)
  const blocked = (title: string, blocker: 'fees' | 'payroll' | 'admissions') => () => (
    <MobileScreen title={title}><Unavailable blocker={blocker} /></MobileScreen>
  )
  const tabs: MobileTab[] = [
    { id: 'home', label: 'Home', icon: House, render: () => <HomeTab /> },
    { id: 'fees', label: 'Fees', icon: IndianRupee, render: blocked('Fees', 'fees') },
    { id: 'payroll', label: 'Payroll', icon: Wallet, render: blocked('Payroll', 'payroll') },
    { id: 'admissions', label: 'Admissions', icon: UserPlus, render: blocked('Admissions', 'admissions') },
    ...(canApprove ? [{ id: 'approvals', label: 'Approvals', icon: Inbox, badge: pending.data?.length ?? 0, render: () => <SwipeApprovals /> }] : []),
  ]
  return <MobileApp tabs={tabs} />
}

function HomeTab() {
  const { user } = useAuth()
  const now = useNow()
  const nav = useMobileNav()
  const can = useCan()
  const pending = useCorrections('pending', can('attendance.approve'))
  const waiting = pending.data?.length ?? 0
  return (
    <MobileScreen eyebrow={dateLabel(now, { weekday: 'long', day: 'numeric', month: 'long' })} title={`${greeting(now)}, ${firstName(user?.full_name ?? '')}`}>
      <div className="grid grid-cols-3 gap-2">
        <MetricChip label="Today" tone="stone" value="—" sub="Fees not connected" />
        <MetricChip label="Overdue" tone="stone" value="—" sub="Fees not connected" />
        <MetricChip label="Waiting" tone={waiting ? 'copper' : 'forest'} value={can('attendance.approve') ? waiting : '—'} sub="decisions" onClick={can('attendance.approve') ? () => nav.setTab('approvals') : undefined} />
      </div>
      {waiting > 0 && (
        <MSection title="Your desk">
          <MList>
            <MRow icon={<ToneIcon icon={Inbox} tone="amber" size={36} />} title={`${plural(waiting, 'attendance correction')} to decide`} sub="Swipe to approve or decline"
              onClick={() => nav.setTab('approvals')} right={<ChevronRight size={16} className="text-stone-l" />} />
          </MList>
        </MSection>
      )}
      <MSection title="Money and admissions">
        <div className="space-y-2">
          <Unavailable blocker="fees" compact />
          <Unavailable blocker="payroll" compact />
          <Unavailable blocker="admissions" compact />
        </div>
      </MSection>
      <AccountSection current="admin" />
    </MobileScreen>
  )
}
