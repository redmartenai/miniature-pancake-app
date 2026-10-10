import { useState } from 'react'
import { CalendarDays, SearchX, UserCheck, Users } from 'lucide-react'
import { Avatar, Card, CardHeader, EmptyState, Page, PageHeader, Pill, Stat, Table, Td, Tr } from '@/components/ui'
import { ErrorState, Loading, Unavailable } from '@/components/states'
import { TwoCol } from '@/components/shell/Web'
import { useStaffList } from '@/api/queries'
import type { S } from '@/api/endpoints'
import { dateLabel, humanize } from '@/lib/format'
import { staffStatusTone } from '@/roles/principal/web/Staff'
import { SearchInput, Segmented } from './shared'

type Type = 'all' | S['StaffTypeEnum']

export function StaffPage() {
  const staff = useStaffList()
  const [q, setQ] = useState('')
  const [type, setType] = useState<Type>('all')
  const all = (staff.data ?? []).filter(s => s.status !== 'left')
  const n = q.trim().toLowerCase()
  const rows = all
    .filter(s => type === 'all' || s.staff_type === type)
    .filter(s => !n || `${s.full_name} ${s.designation} ${s.employee_id} ${s.department?.name ?? ''}`.toLowerCase().includes(n))
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
  const onLeave = all.filter(s => s.status === 'on_leave').length
  const teaching = all.filter(s => s.staff_type === 'teaching').length

  return (
    <Page>
      <PageHeader eyebrow="Staff & HR" title="Your people"
        subtitle={staff.data ? `${all.length} on the rolls — ${teaching} teaching and ${all.length - teaching} non-teaching.${onLeave ? ` ${onLeave} on leave.` : ''}` : undefined} />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="On the rolls" value={all.length} icon={Users} tone="slate" sub={`${teaching} teaching · ${all.length - teaching} non-teaching`} />
        <Stat label="On leave" value={onLeave} icon={CalendarDays} tone="amber" sub="Staff status marked on leave" />
        <Stat label="Departments" value={new Set(all.map(s => s.department?.id).filter(Boolean)).size} icon={UserCheck} tone="forest" sub="with at least one person" />
      </div>

      <TwoCol
        main={
          <Card padded={false}>
            <div className="flex flex-col gap-3 border-b border-line-2 p-4 md:flex-row md:items-center md:p-5">
              <SearchInput value={q} onChange={setQ} placeholder="Search name, designation or ID" className="md:max-w-[300px] md:flex-1" />
              <Segmented id="staff-type" value={type} onChange={setType} options={[{ value: 'all', label: 'All' }, { value: 'teaching', label: 'Teaching' }, { value: 'non_teaching', label: 'Non-teaching' }]} />
            </div>
            {staff.isPending ? <div className="p-5"><Loading rows={6} /></div> : staff.error ? <ErrorState error={staff.error} onRetry={() => staff.refetch()} /> : rows.length === 0 ? (
              <EmptyState icon={SearchX} title="Nobody matches" body="Try another name or type." />
            ) : (
              <div className="px-4 pb-2 md:px-5">
                <Table head={['Name', 'Department', 'Employee ID', 'Joined', 'Status']} className="[&_table]:min-w-[720px]">
                  {rows.map(s => (
                    <Tr key={s.id}>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={s.full_name} size={30} />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-ink">{s.full_name}</div>
                            <div className="truncate text-[12px] text-stone">{s.designation || humanize(s.staff_type)}</div>
                          </div>
                        </div>
                      </Td>
                      <Td className="text-[13px]">{s.department?.name ?? '—'}</Td>
                      <Td className="text-[13px] tabular text-stone">{s.employee_id}</Td>
                      <Td className="text-[13px] tabular text-stone">{s.joining_date ? dateLabel(s.joining_date, { month: 'short', year: 'numeric' }) : '—'}</Td>
                      <Td><Pill tone={staffStatusTone[s.status]} dot>{humanize(s.status)}</Pill></Td>
                    </Tr>
                  ))}
                </Table>
              </div>
            )}
            <div className="p-4 md:p-5"><Unavailable blocker="staffAttendance" compact>Leave balance, punctuality and today's check-in need staff attendance and leave APIs.</Unavailable></div>
          </Card>
        }
        side={
          <Card>
            <CardHeader eyebrow="Leave requests" title="Waiting for a decision" />
            <Unavailable blocker="leave" compact />
          </Card>
        }
      />
    </Page>
  )
}
