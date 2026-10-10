/* Principal pages that exist in the design but have no backend API yet. */
import { BlockedPage } from '@/components/BlockedPage'

export const CommunicationPage = () => (
  <BlockedPage eyebrow="Communication" title="What the school is saying, and hearing" blocker="announcements" cards={[
    { eyebrow: 'New announcement', title: 'Say it once, to everyone who needs it' },
    { eyebrow: 'Announcements', title: 'Who has read what' },
    { eyebrow: 'Parent sentiment', title: 'What parents are telling us', blocker: 'messages' },
    { eyebrow: 'Waiting 24h+', title: 'Parents without a reply', blocker: 'messages' },
  ]} />
)

export const FeesPage = () => (
  <BlockedPage eyebrow="Fees · view only" title="Fee collection" blocker="fees" cards={[
    { eyebrow: 'Top defaulters', title: 'Families most behind', wide: true },
    { eyebrow: 'By class', title: 'Collection' },
    { eyebrow: 'Recent', title: 'Payments received' },
  ]} />
)

export const TransportPage = () => (
  <BlockedPage eyebrow="Transport · live" title="Buses and routes" blocker="transport" cards={[
    { eyebrow: 'Fleet', title: 'Morning routes', wide: true },
  ]} />
)

export const AskPage = () => (
  <BlockedPage eyebrow="Ask EduFlow" title="Ask your school a question" blocker="ask" cards={[
    { eyebrow: 'Answer', title: 'A named list, read live from school data', wide: true },
  ]} />
)

export const CampusPage = () => (
  <BlockedPage eyebrow="Campus 3D" title="Every classroom, live" blocker="campus3d" cards={[
    { eyebrow: 'Needs cover', title: 'Periods without a teacher', blocker: 'staffAttendance' },
    { eyebrow: 'Bus bay', title: 'Buses on campus', blocker: 'transport' },
  ]} />
)
