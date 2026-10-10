/** Parent mobile app — "I stopped calling the office. I just know." */
import { BookOpen, BusFront, Ellipsis, House, MessageCircle } from 'lucide-react'
import { MobileApp, MobileScreen } from '@/components/shell/Mobile'
import { Unavailable } from '@/components/states'
import type { Blocker } from '@/lib/blockers'
import { ParentProvider } from './context'
import { HomeScreen } from './Home'
import { MoreScreen } from './More'

const blocked = (title: string, blocker: Blocker) => () => <MobileScreen title={title}><Unavailable blocker={blocker} /></MobileScreen>

export function ParentMobileApp() {
  return (
    <ParentProvider>
      <MobileApp
        tabs={[
          { id: 'home', label: 'Today', icon: House, render: () => <HomeScreen /> },
          { id: 'learning', label: 'Learning', icon: BookOpen, render: blocked('Learning', 'homework') },
          { id: 'bus', label: 'Bus', icon: BusFront, render: blocked('Bus', 'transport') },
          { id: 'messages', label: 'Messages', icon: MessageCircle, render: blocked('Messages', 'messages') },
          { id: 'more', label: 'More', icon: Ellipsis, render: () => <MoreScreen /> },
        ]}
      />
    </ParentProvider>
  )
}
