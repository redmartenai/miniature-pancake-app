import { BookOpen, UserCheck, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Avatar, Card, CardHeader, EmptyState, Page, PageHeader, Pill, Sheet, Tabs, cx, type Tone } from '@/components/ui'
import { ErrorState, Loading, QueryState, Unavailable } from '@/components/states'
import { assignmentStaff, useClasses, useStaffList, useTeacherAssignments } from '@/api/queries'
import type { S } from '@/api/endpoints'
import { dateLabel, humanize } from '@/lib/format'
import { Metric } from '@/roles/_shared/ui'

export const staffStatusTone: Record<S['StaffStatusEnum'], Tone> = { active: 'forest', on_leave: 'amber', left: 'stone' }
type Filter = 'teaching' | 'non_teaching' | 'all'

/** Each staff member's active assignments in the current year: classes taught, subjects, class-teacher duty. */
export function useStaffTeaching() {
  const a = useTeacherAssignments()
  const classes = useClasses()
  return useMemo(() => {
    const short = new Map((classes.data ?? []).map(c => [c.id, c.short]))
    const m = new Map<string, { classes: string[]; subjects: string[]; classTeacherOf: string[] }>()
    for (const x of a.data ?? []) {
      const id = assignmentStaff(x).id
      const v = m.get(id) ?? { classes: [], subjects: [], classTeacherOf: [] }
      const c = short.get(x.section.id) ?? x.section.name
      if (!v.classes.includes(c)) v.classes.push(c)
      if (x.subject && !v.subjects.includes(x.subject.name)) v.subjects.push(x.subject.name)
      if (x.is_class_teacher) v.classTeacherOf.push(c)
      m.set(id, v)
    }
    return m
  }, [a.data, classes.data])
}

export function StaffPage() {
  const staff = useStaffList()
  const teaching = useStaffTeaching()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('teaching')
  const openId = params.get('t')
  const list = (staff.data ?? []).filter(s => s.status !== 'left' && (filter === 'all' || s.staff_type === filter)).sort((a, b) => a.full_name.localeCompare(b.full_name))
  const count = (f: Filter) => (staff.data ?? []).filter(s => s.status !== 'left' && (f === 'all' || s.staff_type === f)).length
  const onLeave = (staff.data ?? []).filter(s => s.status === 'on_leave').length

  return (
    <Page>
      <PageHeader eyebrow="Staff" title={staff.data ? `${count('all')} people on the staff` : 'Staff'}
        subtitle={staff.data ? `${count('teaching')} teaching, ${count('non_teaching')} non-teaching${onLeave ? `, ${onLeave} on leave` : ''}.` : undefined} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs<Filter> size="sm" value={filter} onChange={setFilter}
              tabs={[{ id: 'teaching', label: 'Teaching', count: count('teaching') }, { id: 'non_teaching', label: 'Non-teaching', count: count('non_teaching') }, { id: 'all', label: 'All', count: count('all') }]} />
          </div>
          <Unavailable blocker="monitoring" compact>
            Teacher scorecards (punctuality, marks on time, homework reviewed, parent reply time, class results) need staff attendance, assessment, homework and messaging APIs that the backend doesn't have yet.
          </Unavailable>
          {staff.isPending ? <Loading rows={4} /> : staff.error ? <ErrorState error={staff.error} onRetry={() => staff.refetch()} /> : (
            <div className="grid content-start gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {list.map(t => {
                const tt = teaching.get(t.id)
                return (
                  <Card key={t.id} interactive onClick={() => setParams({ t: t.id })} className="h-full">
                    <div className="flex items-start gap-3">
                      <Avatar name={t.full_name} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-ink">{t.full_name}</div>
                        <div className="truncate text-[12px] text-stone">{t.designation || humanize(t.staff_type)}{tt?.classTeacherOf.length ? ` · Class teacher ${tt.classTeacherOf.join(', ')}` : ''}</div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <Pill tone={staffStatusTone[t.status]}>{humanize(t.status)}</Pill>
                          {t.department && <Pill tone="slate">{t.department.name}</Pill>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5">
                      <Metric label="Classes" value={tt?.classes.join(', ') || '—'} />
                      <Metric label="Subjects" value={tt?.subjects.join(', ') || '—'} />
                    </div>
                  </Card>
                )
              })}
              {list.length === 0 && <Card className="sm:col-span-2"><EmptyState icon={Users} title="Nobody in this group" /></Card>}
            </div>
          )}
        </div>

        <Card padded={false} className="h-fit p-4 md:p-5">
          <CardHeader eyebrow="Today" title="Who is in" action={<Pill tone="stone" icon={UserCheck}>—</Pill>} />
          <Unavailable blocker="staffAttendance" compact />
        </Card>
      </div>
      <StaffSheet id={openId} onClose={() => setParams({})} />
    </Page>
  )
}

export function StaffSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const staff = useStaffList()
  const assignments = useTeacherAssignments({ staff_id: id ?? '' }, !!id)
  const classes = useClasses()
  const t = staff.data?.find(s => s.id === id)
  const short = new Map((classes.data ?? []).map(c => [c.id, c.short]))
  return (
    <Sheet open={!!id && !!t} onClose={onClose} variant="dialog" title={t?.full_name ?? ''}>
      {t && (
        <div className="space-y-5">
          <div className="flex items-center gap-3.5">
            <Avatar name={t.full_name} size={52} />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] text-charcoal-2">{t.designation || humanize(t.staff_type)}{t.department ? ` · ${t.department.name}` : ''}</div>
              <div className="text-[12.5px] text-stone">Employee ID {t.employee_id}{t.campus ? ` · ${t.campus.name}` : ''}</div>
            </div>
            <Pill tone={staffStatusTone[t.status]}>{humanize(t.status)}</Pill>
          </div>
          <section className="grid grid-cols-3 gap-3 rounded-[12px] bg-paper/60 p-3.5">
            <Metric label="Joined" value={t.joining_date ? dateLabel(t.joining_date, { month: 'short', year: 'numeric' }) : '—'} />
            <Metric label="Type" value={humanize(t.staff_type)} />
            <Metric label="Status" value={humanize(t.status)} />
          </section>
          <section>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-stone">Teaching this year</div>
            <QueryState q={assignments} empty={a => (a.length ? null : <div className="rounded-[10px] border border-dashed border-line px-3 py-4 text-[13px] text-stone">No active class assignments.</div>)}>
              {a => (
                <div className="divide-y divide-line-2 rounded-[12px] border border-line-2">
                  {a.map(x => (
                    <div key={x.id} className="flex items-center gap-3 px-3.5 py-2.5">
                      <span className={cx('grid h-9 w-9 place-items-center rounded-[10px] font-display text-[14px]', x.is_class_teacher ? 'bg-forest text-on-forest' : 'bg-paper text-ink')}>{short.get(x.section.id) ?? x.section.name}</span>
                      <div className="min-w-0 flex-1 text-[13.5px] text-ink">{x.subject?.name ?? 'Class teacher'}</div>
                      {x.is_class_teacher && <Pill tone="forest">Class teacher</Pill>}
                      {!x.subject && !x.is_class_teacher && <BookOpen size={14} className="text-stone" />}
                    </div>
                  ))}
                </div>
              )}
            </QueryState>
          </section>
          <Unavailable blocker="staffAttendance" compact />
        </div>
      )}
    </Sheet>
  )
}
