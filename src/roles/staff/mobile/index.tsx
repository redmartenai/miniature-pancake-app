/* The teacher's phone. */
import { GraduationCap, MessageCircle, Sun, UserRound, Users } from 'lucide-react'
import { MobileApp, MobileScreen } from '@/components/shell/Mobile'
import { Unavailable } from '@/components/states'
import { useRoster } from '@/api/queries'
import { isoDate } from '@/lib/format'
import { ClassesTab } from './Classes'
import { MeTab } from './Me'
import { TodayTab } from './Today'
import { useTeacher } from './shared'

export function StaffMobileApp() {
  const t = useTeacher()
  const mine = t.data?.classTeacherOf
  const roster = useRoster(mine?.id ?? null, isoDate())
  const registerOpen = roster.data ? !roster.data.marked : false
  return (
    <MobileApp
      tabs={[
        { id: 'today', label: 'Today', icon: Sun, badge: registerOpen ? 1 : 0, render: () => <TodayTab /> },
        { id: 'classes', label: 'Classes', icon: Users, render: () => <ClassesTab /> },
        { id: 'learn', label: 'Learn', icon: GraduationCap, render: () => <MobileScreen title="Learn"><Unavailable blocker="lms" /></MobileScreen> },
        { id: 'messages', label: 'Messages', icon: MessageCircle, render: () => <MobileScreen title="Messages"><Unavailable blocker="messages" /></MobileScreen> },
        { id: 'me', label: 'Me', icon: UserRound, render: () => <MeTab /> },
      ]}
    />
  )
}
