import { Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Avatar, Card, EmptyState, Page, PageHeader, Pill, Tabs, Table, Td, Tr, cx, inputClass, type Tone } from '@/components/ui'
import { ErrorState, Loading, Unavailable } from '@/components/states'
import { useClasses, useEnrollments, useStudents } from '@/api/queries'
import type { S } from '@/api/endpoints'
import { dateLabel, humanize } from '@/lib/format'
import { StudentSheet } from './StudentSheet'

type Status = 'all' | S['StudentStatusEnum']
export const studentStatusTone: Record<S['StudentStatusEnum'], Tone> = { active: 'forest', inactive: 'amber', graduated: 'slate', left: 'stone' }

export interface StudentRow { s: S['StudentOut']; classId: string | null; classShort: string; roll: string }

/** Students with their current-year class and roll number (GET /students + /enrollments). */
export function useStudentRows() {
  const students = useStudents()
  const enrollments = useEnrollments()
  const classes = useClasses()
  const rows = useMemo<StudentRow[] | undefined>(() => {
    if (!students.data) return undefined
    const byStudent = new Map((enrollments.data ?? []).map(e => [e.student.id, e]))
    const short = new Map((classes.data ?? []).map(c => [c.id, c.short]))
    return students.data.map(s => {
      const e = byStudent.get(s.id)
      return { s, classId: e?.section.id ?? null, classShort: e ? short.get(e.section.id) ?? e.section.name : '—', roll: e?.roll_number ?? '' }
    }).sort((a, b) => a.classShort.localeCompare(b.classShort, undefined, { numeric: true }) || a.roll.localeCompare(b.roll, undefined, { numeric: true }) || a.s.full_name.localeCompare(b.s.full_name))
  }, [students.data, enrollments.data, classes.data])
  return { rows, classes: classes.data ?? [], isPending: students.isPending, error: students.error, refetch: () => { students.refetch(); enrollments.refetch() } }
}

export function StudentsPage() {
  const { rows, classes, isPending, error, refetch } = useStudentRows()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [cls, setCls] = useState('all')
  const [status, setStatus] = useState<Status>('active')
  const [limit, setLimit] = useState(40)
  const openId = params.get('s')

  const scoped = (rows ?? []).filter(r => (cls === 'all' || r.classId === cls) && (!q.trim() || `${r.s.full_name} ${r.s.admission_number} ${r.classShort}`.toLowerCase().includes(q.trim().toLowerCase())))
  const visible = scoped.filter(r => status === 'all' || r.s.status === status)
  const count = (st: Status) => scoped.filter(r => st === 'all' || r.s.status === st).length
  const active = (rows ?? []).filter(r => r.s.status === 'active').length

  return (
    <Page>
      <PageHeader eyebrow="Students" title={rows ? `${active} children on the rolls` : 'Students'}
        subtitle="Search by name or admission number; open a child for attendance and family contacts." />
      <Card padded={false} className="p-4 md:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block lg:w-[300px]">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or admission no." aria-label="Search students" className={cx(inputClass, 'pl-9')} />
          </label>
          <select value={cls} onChange={e => setCls(e.target.value)} className={cx(inputClass, 'lg:w-[160px]')} aria-label="Class">
            <option value="all">All classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>Class {c.short}</option>)}
          </select>
          <Tabs<Status> size="sm" className="lg:ml-auto" value={status} onChange={setStatus}
            tabs={[{ id: 'active', label: 'Active', count: count('active') }, { id: 'inactive', label: 'Inactive', count: count('inactive') }, { id: 'left', label: 'Left', count: count('left') }, { id: 'all', label: 'All', count: count('all') }]} />
        </div>
        <Unavailable blocker="monitoring" compact className="mb-4">
          Average marks, fees overdue and the risk score the design sorts by need the assessment, fees and monitoring APIs (Phases 8, 10, 11). Attendance is in each child's record.
        </Unavailable>

        {isPending ? <Loading rows={6} /> : error ? <ErrorState error={error} onRetry={refetch} compact /> : visible.length === 0 ? (
          <EmptyState icon={Users} title="No students match" body="Try another class, status or a shorter search." />
        ) : (
          <Table head={['Student', 'Class', 'Admitted', 'Status']}>
            {visible.slice(0, limit).map(r => (
              <Tr key={r.s.id} onClick={() => setParams({ s: r.s.id })}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.s.full_name} size={30} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">{r.s.full_name}</div>
                      <div className="text-[11.5px] text-stone">{r.roll ? `Roll ${r.roll} · ` : ''}{r.s.admission_number}</div>
                    </div>
                  </div>
                </Td>
                <Td className="text-charcoal-2">{r.classShort}</Td>
                <Td className="tabular text-stone">{r.s.admission_date ? dateLabel(r.s.admission_date, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</Td>
                <Td><Pill tone={studentStatusTone[r.s.status]}>{humanize(r.s.status)}</Pill></Td>
              </Tr>
            ))}
          </Table>
        )}
        {visible.length > limit && (
          <div className="mt-4 flex items-center justify-between text-[13px] text-stone">
            <span>Showing {limit} of {visible.length}</span>
            <button onClick={() => setLimit(l => l + 60)} className="font-medium text-forest hover:underline">Show more</button>
          </div>
        )}
      </Card>
      <StudentSheet id={openId} onClose={() => setParams({})} />
    </Page>
  )
}
