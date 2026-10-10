import { BookOpen, Bus, CalendarCheck, GraduationCap, Inbox, Megaphone, Radar, School, Sparkles, UserCheck, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { WebShell, type NavGroup, type NavItem } from '@/components/shell/Web'
import { useCorrections, useRegisters, useSections } from '@/api/queries'
import { isoDate } from '@/lib/format'
import { MonitoringCenter } from './Monitoring'
import { StudentsPage } from './Students'
import { StaffPage } from './Staff'
import { AcademicsPage } from './Academics'
import { AttendancePage } from './Attendance'
import { ApprovalsPage } from './Approvals'
import { AskPage, CampusPage, CommunicationPage, FeesPage, TransportPage } from './Blocked'
import { BASE, useCan } from './shared'

function usePrincipalNav(): NavGroup[] {
  const can = useCan()
  const canApprove = can('attendance.approve')
  const pending = useCorrections('pending', canApprove)
  const sections = useSections()
  const registers = useRegisters(isoDate())
  return useMemo(() => {
    const unmarked = sections.data && registers.data ? Math.max(0, sections.data.length - registers.data.length) : 0
    const gate = (items: (NavItem & { need?: string })[]) => items.filter(i => !i.need || can(i.need))
    const groups: NavGroup[] = [
      { items: [{ to: BASE, label: 'Monitoring Center', icon: Radar }, { to: `${BASE}/campus`, label: 'Campus 3D', icon: School }] },
      { label: 'People', items: gate([
        { to: `${BASE}/students`, label: 'Students', icon: GraduationCap, need: 'student.read' },
        { to: `${BASE}/staff`, label: 'Staff', icon: UserCheck, need: 'staff.read' },
      ]) },
      { label: 'Teaching', items: gate([
        { to: `${BASE}/academics`, label: 'Academics', icon: BookOpen, need: 'section.read' },
        { to: `${BASE}/attendance`, label: 'Attendance', icon: CalendarCheck, badge: unmarked, badgeTone: 'rust', need: 'attendance.read' },
      ]) },
      { label: 'Operations', items: [
        ...gate([{ to: `${BASE}/approvals`, label: 'Approvals', icon: Inbox, badge: pending.data?.length ?? 0, badgeTone: 'copper', need: 'attendance.approve' }]),
        { to: `${BASE}/communication`, label: 'Communication', icon: Megaphone },
        { to: `${BASE}/fees`, label: 'Fees', icon: Wallet },
        { to: `${BASE}/transport`, label: 'Transport', icon: Bus },
      ] },
      { label: 'Intelligence', items: [{ to: `${BASE}/ask`, label: 'Ask EduFlow', icon: Sparkles }] },
    ]
    return groups.filter(g => g.items.length)
  }, [can, pending.data, sections.data, registers.data])
}

export function PrincipalWebApp() {
  const nav = usePrincipalNav()
  const can = useCan()
  return (
    <Routes>
      <Route element={<WebShell role="principal" nav={nav} mobileHref="/m/principal" />}>
        <Route index element={<MonitoringCenter />} />
        {can('student.read') && <Route path="students" element={<StudentsPage />} />}
        {can('staff.read') && <Route path="staff" element={<StaffPage />} />}
        <Route path="academics" element={<AcademicsPage />} />
        {can('attendance.read') && <Route path="attendance" element={<AttendancePage />} />}
        {can('attendance.approve') && <Route path="approvals" element={<ApprovalsPage />} />}
        <Route path="communication" element={<CommunicationPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="transport" element={<TransportPage />} />
        <Route path="ask" element={<AskPage />} />
        <Route path="campus" element={<CampusPage />} />
        <Route path="*" element={<Navigate to={BASE} replace />} />
      </Route>
    </Routes>
  )
}
