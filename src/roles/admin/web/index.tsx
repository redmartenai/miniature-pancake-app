import { useMemo } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { IndianRupee, LayoutDashboard, ScrollText, ShieldCheck, UserPlus, Users, Wallet } from 'lucide-react'
import { WebShell, type NavGroup, type NavItem } from '@/components/shell/Web'
import { BlockedPage } from '@/components/BlockedPage'
import { useCorrections } from '@/api/queries'
import { useCan } from '@/roles/principal/web/shared'
import { Overview } from './Overview'
import { StaffPage } from './Staff'
import { AccessPage } from './Access'
import { AuditPage } from './Audit'

function useAdminNav(): NavGroup[] {
  const can = useCan()
  const pending = useCorrections('pending', can('attendance.approve'))
  return useMemo(() => {
    const gate = (items: (NavItem & { need?: string })[]) => items.filter(i => !i.need || can(i.need))
    const groups: NavGroup[] = [
      { items: [{ to: '/admin', label: 'Control room', icon: LayoutDashboard, badge: pending.data?.length ?? 0, badgeTone: 'copper' }] },
      { label: 'Money', items: [
        { to: '/admin/fees', label: 'Fees', icon: IndianRupee },
        { to: '/admin/payroll', label: 'Payroll & salary', icon: Wallet },
      ] },
      { label: 'People', items: [
        { to: '/admin/admissions', label: 'Admissions', icon: UserPlus },
        ...gate([{ to: '/admin/staff', label: 'Staff & HR', icon: Users, need: 'staff.read' }]),
      ] },
      { label: 'Control', items: gate([
        { to: '/admin/access', label: 'Access control', icon: ShieldCheck, need: 'role.read' },
        { to: '/admin/audit', label: 'Audit log', icon: ScrollText, need: 'audit.read' },
      ]) },
    ]
    return groups.filter(g => g.items.length)
  }, [can, pending.data])
}

export function AdminWebApp() {
  const nav = useAdminNav()
  const can = useCan()
  return (
    <Routes>
      <Route element={<WebShell role="admin" nav={nav} mobileHref="/m/admin" />}>
        <Route index element={<Overview />} />
        <Route path="fees" element={<BlockedPage eyebrow="Fees" title="Fees & collections" blocker="fees" cards={[
          { eyebrow: 'Ledger', title: 'Every family, every instalment', wide: true },
          { eyebrow: 'Defaulters', title: 'Families behind on fees' },
          { eyebrow: 'Collections', title: 'Payments received' },
          { eyebrow: 'Fee structure', title: 'Grade-wise annual fees', wide: true },
        ]} />} />
        <Route path="payroll" element={<BlockedPage eyebrow="Payroll" title="Payroll" blocker="payroll" cards={[
          { eyebrow: 'Salary register', title: 'Every salary, line by line', wide: true },
          { eyebrow: 'Cost by department', title: 'Monthly salary cost' },
          { eyebrow: 'History', title: 'Previous runs' },
        ]} />} />
        <Route path="admissions" element={<BlockedPage eyebrow="Admissions" title="Admissions pipeline" blocker="admissions" cards={[
          { eyebrow: 'Pipeline', title: 'Enquiry → visit → assessment → offer → enrolled', wide: true },
          { eyebrow: 'Conversion', title: 'How many enquiries enrol' },
          { eyebrow: 'Where families hear about us', title: 'Sources' },
        ]} />} />
        {can('staff.read') && <Route path="staff" element={<StaffPage />} />}
        {can('role.read') && <Route path="access" element={<AccessPage />} />}
        {can('audit.read') && <Route path="audit" element={<AuditPage />} />}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}
