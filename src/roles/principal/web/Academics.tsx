import { BookOpen } from 'lucide-react'
import { Card, CardHeader, EmptyState, Page, PageHeader, Pill } from '@/components/ui'
import { ErrorState, Loading, Unavailable } from '@/components/states'
import { assignmentStaff, useClasses, useSubjects, useTeacherAssignments, useCurrentYear } from '@/api/queries'

const surname = (n: string) => n.replace(/^(Mr|Ms|Mrs|Dr)\.\s*/, '').split(' ').slice(-1)[0]

/**
 * The design's submission matrix (classes × subjects). Who teaches each cell is live
 * (GET /teacher-assignments); the marks status in each cell needs the assessment API.
 */
export function AcademicsPage() {
  const year = useCurrentYear()
  const classes = useClasses()
  const subjects = useSubjects()
  const assignments = useTeacherAssignments()
  const used = (subjects.data ?? []).filter(s => assignments.data?.some(a => a.subject?.id === s.id))
  const cell = (sectionId: string, subjectId: string) => assignments.data?.find(a => a.section.id === sectionId && a.subject?.id === subjectId)
  const pending = classes.isPending || subjects.isPending || assignments.isPending
  const error = classes.error ?? subjects.error ?? assignments.error

  return (
    <Page>
      <PageHeader eyebrow={`Academics${year.data ? ` · ${year.data.name}` : ''}`} title="Classes × subjects"
        subtitle={classes.data && used.length ? `${classes.data.length} classes and ${used.length} subjects with an assigned teacher this year.` : undefined} />
      <Unavailable blocker="assessment" className="mb-5">
        Unit test results, the submitted / ready-to-publish status of each cell, publishing to parents and the "who to chase" list need the assessment API (mark sheets, Phase 8). Teacher assignments below are live.
      </Unavailable>

      <Card padded={false} className="p-4 md:p-5">
        <CardHeader eyebrow="Teaching matrix" title="Who teaches what" action={<Pill tone="slate">{assignments.data?.length ?? 0} assignments</Pill>} />
        {pending ? <Loading rows={5} /> : error ? <ErrorState error={error} onRetry={classes.refetch} compact /> : !classes.data?.length || !used.length ? (
          <EmptyState icon={BookOpen} title="No subject assignments yet" body="Assign teachers to sections and subjects to fill this matrix." />
        ) : (
          <div className="scroll-quiet overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-1.5 text-[12.5px]">
              <thead>
                <tr>
                  <th className="w-14 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-stone">Class</th>
                  {used.map(s => <th key={s.id} className="text-left text-[11px] font-medium uppercase tracking-[0.08em] text-stone">{s.short_name || s.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {classes.data.map(c => (
                  <tr key={c.id}>
                    <td className="font-display text-[17px] text-ink">{c.short}</td>
                    {used.map(s => {
                      const a = cell(c.id, s.id)
                      return (
                        <td key={s.id} className="p-0">
                          <div className={a ? 'flex h-[48px] flex-col justify-center rounded-[9px] border border-line bg-ivory px-2' : 'flex h-[48px] items-center px-2'}>
                            {a ? <span className="truncate text-[12px] text-charcoal" title={assignmentStaff(a).name}>{surname(assignmentStaff(a).name)}</span> : <span className="text-stone-l">—</span>}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  )
}
