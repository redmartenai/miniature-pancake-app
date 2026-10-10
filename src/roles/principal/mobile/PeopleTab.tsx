import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { MobileScreen, MSection, MList, MRow } from '@/components/shell/Mobile'
import { Avatar, Pill, Sheet } from '@/components/ui'
import { ErrorState, Loading, Unavailable } from '@/components/states'
import { useStaffList } from '@/api/queries'
import { dateLabel, humanize } from '@/lib/format'
import { staffStatusTone, useStaffTeaching } from '@/roles/principal/web/Staff'
import { Metric } from '@/roles/_shared/ui'

export function PeopleTab() {
  const staff = useStaffList()
  const teaching = useStaffTeaching()
  const [openId, setOpenId] = useState<string | null>(null)
  const teachers = (staff.data ?? []).filter(s => s.staff_type === 'teaching' && s.status !== 'left').sort((a, b) => a.full_name.localeCompare(b.full_name))
  const others = (staff.data ?? []).filter(s => s.staff_type !== 'teaching' && s.status !== 'left').sort((a, b) => a.full_name.localeCompare(b.full_name))
  const open = staff.data?.find(s => s.id === openId) ?? null
  const tt = open ? teaching.get(open.id) : undefined

  return (
    <MobileScreen eyebrow={staff.data ? `${teachers.length} teachers · ${others.length} staff` : 'Staff'} title="People">
      {staff.isPending ? <Loading rows={5} /> : staff.error ? <ErrorState error={staff.error} onRetry={() => staff.refetch()} /> : (
        <>
          <Unavailable blocker="monitoring" compact>Scorecards and "needs support" grouping need staff attendance, marks, homework and messaging APIs.</Unavailable>
          {[['Teachers', teachers], ['Office & support', others]].map(([label, list]) => (list as typeof teachers).length > 0 && (
            <MSection key={label as string} title={`${label} · ${(list as typeof teachers).length}`}>
              <MList>
                {(list as typeof teachers).map(t => {
                  const x = teaching.get(t.id)
                  return (
                    <MRow key={t.id} onClick={() => setOpenId(t.id)} icon={<Avatar name={t.full_name} size={40} />} title={t.full_name}
                      sub={<>{t.designation || humanize(t.staff_type)}{x?.classTeacherOf.length ? ` · ${x.classTeacherOf.join(', ')}` : ''}{t.status === 'on_leave' && <span className="text-copper-d"> · on leave</span>}</>}
                      right={<ChevronRight size={16} className="shrink-0 text-stone-l" />} />
                  )
                })}
              </MList>
            </MSection>
          ))}
        </>
      )}

      <Sheet open={!!open} onClose={() => setOpenId(null)} title={open?.full_name}>
        {open && (
          <div>
            <div className="flex items-center gap-4">
              <Avatar name={open.full_name} size={64} />
              <div className="min-w-0 flex-1">
                <Pill tone={staffStatusTone[open.status]} dot>{humanize(open.status)}</Pill>
                <div className="mt-1.5 text-[13.5px] text-charcoal-2">{open.designation || humanize(open.staff_type)}</div>
                <div className="text-[12.5px] text-stone">{open.department?.name ?? ''}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-[14px] border border-line bg-ivory p-3.5">
              <Metric label="Classes" value={tt?.classes.join(', ') || '—'} />
              <Metric label="Subjects" value={tt?.subjects.join(', ') || '—'} />
              <Metric label="Class teacher" value={tt?.classTeacherOf.join(', ') || '—'} />
              <Metric label="Joined" value={open.joining_date ? dateLabel(open.joining_date, { month: 'short', year: 'numeric' }) : '—'} />
            </div>
            <Unavailable blocker="messages" compact className="mt-4">Sending a note to a teacher needs the messaging API (Phase 9).</Unavailable>
          </div>
        )}
      </Sheet>
    </MobileScreen>
  )
}
