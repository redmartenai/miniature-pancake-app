/* Me: who they are at school; scorecard, announcements, leave and payslip wait on their APIs. */
import { Avatar } from '@/components/ui'
import { MSection, MobileScreen } from '@/components/shell/Mobile'
import { Unavailable } from '@/components/states'
import { useAuth } from '@/auth/AuthProvider'
import { dateLabel, humanize } from '@/lib/format'
import { AccountSection } from '@/roles/_shared/AccountSection'
import { MCard, Metric } from '@/roles/_shared/ui'
import { useTeacher } from './shared'

export function MeTab() {
  const { user } = useAuth()
  const t = useTeacher()
  const s = t.staff
  return (
    <MobileScreen title="Me" eyebrow={s?.designation || undefined}>
      <MCard className="flex items-center gap-3">
        <Avatar name={user?.full_name ?? '?'} size={52} />
        <div className="min-w-0">
          <div className="font-display text-[20px] leading-tight text-ink">{user?.full_name}</div>
          <div className="truncate text-[13px] text-stone">{user?.email ?? user?.phone}</div>
        </div>
      </MCard>
      {s && (
        <MCard className="mt-3 grid grid-cols-2 gap-3">
          <Metric label="Employee ID" value={s.employee_id} />
          <Metric label="Department" value={s.department?.name ?? '—'} />
          <Metric label="Joined" value={s.joining_date ? dateLabel(s.joining_date, { month: 'short', year: 'numeric' }) : '—'} />
          <Metric label="Status" value={humanize(s.status)} />
          <Metric label="Class teacher of" value={t.data?.classTeacherOf?.short ?? '—'} />
          <Metric label="Teaches" value={t.data?.subjects.join(', ') || '—'} />
        </MCard>
      )}
      <MSection title="How your week looks to the school"><Unavailable blocker="monitoring" compact /></MSection>
      <MSection title="Last 30 days"><Unavailable blocker="staffAttendance" compact /></MSection>
      <MSection title="From the principal"><Unavailable blocker="announcements" compact /></MSection>
      <MSection title="Leave"><Unavailable blocker="leave" compact /></MSection>
      <MSection title="Payslip"><Unavailable blocker="payroll" compact /></MSection>
      <AccountSection current="staff" />
    </MobileScreen>
  )
}
