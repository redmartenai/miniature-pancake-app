import { Inbox, LayoutGrid, Sparkles, Sun, Users } from 'lucide-react'
import { MobileApp, MobileScreen, type MobileTab } from '@/components/shell/Mobile'
import { Unavailable } from '@/components/states'
import { useCorrections } from '@/api/queries'
import { SwipeApprovals } from '@/roles/_shared/SwipeApprovals'
import { useCan } from '@/roles/principal/web/shared'
import { TodayTab } from './TodayTab'
import { WallTab } from './WallTab'
import { PeopleTab } from './PeopleTab'

/** The principal's phone — the wall, in their pocket. */
export function PrincipalMobileApp() {
  const can = useCan()
  const canApprove = can('attendance.approve')
  const pending = useCorrections('pending', canApprove)
  const tabs: MobileTab[] = [
    { id: 'today', label: 'Today', icon: Sun, render: () => <TodayTab /> },
    { id: 'wall', label: 'Wall', icon: LayoutGrid, render: () => <WallTab /> },
    ...(canApprove ? [{ id: 'approvals', label: 'Approvals', icon: Inbox, badge: pending.data?.length ?? 0, render: () => <SwipeApprovals /> }] : []),
    { id: 'ask', label: 'Ask', icon: Sparkles, render: () => <MobileScreen eyebrow="Ask EduFlow" title="Ask"><Unavailable blocker="ask" /></MobileScreen> },
    ...(can('staff.read') ? [{ id: 'people', label: 'People', icon: Users, render: () => <PeopleTab /> }] : []),
  ]
  return <MobileApp tabs={tabs} />
}
