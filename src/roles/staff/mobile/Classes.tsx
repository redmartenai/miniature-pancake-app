/* Their classes → a class → a child. Roster and today's marks are live; homework, marks and remarks are not built yet. */
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { ChevronRight, Users } from 'lucide-react'
import { Avatar, EmptyState, Pill, Tabs, cx, type Tone } from '@/components/ui'
import { MList, MSection, MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { ErrorState, Loading, QueryState, Unavailable } from '@/components/states'
import { useEnrollments, useGuardianDetails, useGuardiansOf, useRoster } from '@/api/queries'
import { humanize, isoDate, time } from '@/lib/format'
import { STATUS } from '@/roles/_shared/attendance'
import { MCard } from '@/roles/_shared/ui'
import { MonthCalendar } from '@/roles/parent/mobile/Attendance'
import { RegisterScreen } from './Register'
import { useTeacher, type MyClass } from './shared'

export function ClassesTab() {
  const t = useTeacher()
  const nav = useMobileNav()
  const list = t.data?.classes ?? []
  const children = list.reduce((a, c) => a + (c.students ?? 0), 0)
  return (
    <MobileScreen title="Classes" eyebrow={t.data ? `${t.data.subjects.join(', ') || 'Teacher'} · ${list.length} classes · ${children} children` : undefined}>
      {t.isPending ? <Loading rows={4} /> : t.error ? <ErrorState error={t.error} onRetry={t.refetch} /> : list.length === 0 ? (
        <EmptyState icon={Users} title="No classes assigned" body="Your classes appear here once the office assigns you to a section for this year." />
      ) : (
        <MSection>
          <MList>
            {list.map(c => (
              <motion.button key={c.id} whileTap={{ scale: 0.985, backgroundColor: 'rgba(240,235,226,.7)' }}
                onClick={() => nav.push({ title: `Class ${c.short}`, render: () => <ClassDetail cls={c} /> })}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                <span className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-[13px] font-display text-[18px]', c.mine ? 'bg-forest text-on-forest' : 'bg-paper text-ink')}>{c.short}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[15.5px] font-medium text-ink">Class {c.short}</span>
                    {c.mine && <Pill tone="forest">Your class</Pill>}
                  </div>
                  <div className="truncate text-[13px] text-stone">{c.students ?? 0} children{c.subjects.length ? ` · ${c.subjects.join(', ')}` : ''}</div>
                </div>
                <ChevronRight size={18} className="text-stone-l" />
              </motion.button>
            ))}
          </MList>
        </MSection>
      )}
    </MobileScreen>
  )
}

export function ClassDetail({ cls }: { cls: MyClass }) {
  const nav = useMobileNav()
  const [view, setView] = useState<'students' | 'homework'>('students')
  const roster = useRoster(cls.id, isoDate())
  const enrollments = useEnrollments({ section_id: cls.id })
  const r = roster.data
  const present = r?.marked ? r.students.filter(s => s.status && s.status !== 'absent' && s.status !== 'excused').length : null
  const kids = [...(enrollments.data ?? [])].sort((a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true }) || a.student.full_name.localeCompare(b.student.full_name))
  const statusOf = (id: string) => r?.students.find(s => s.id === id)?.status ?? null

  return (
    <MobileScreen title={`Class ${cls.short}`} eyebrow={`${cls.students ?? kids.length} children${cls.mine ? ' · your class' : ''}`}>
      <div className="grid grid-cols-3 gap-2">
        <Tile label="In today" value={present === null ? '—' : `${present}/${r!.students.length}`} tone={present === null ? 'copper' : 'forest'} sub={present === null ? (roster.error ? 'Not your register' : 'Not marked') : `at ${r!.marked_at ? time(r!.marked_at) : '—'}`} />
        <Tile label="Subjects" value={String(cls.subjects.length)} tone="slate" sub={cls.subjects.join(', ') || 'class teacher'} />
        <Tile label="Children" value={String(kids.length)} tone="forest" sub="enrolled" />
      </div>

      {r && !r.marked && (
        <MCard className="mt-3 flex items-center justify-between border-copper/30 bg-copper-p" onClick={() => nav.push({ title: `${cls.short} register`, render: () => <RegisterScreen sectionId={cls.id} short={cls.short} /> })}>
          <span className="text-[14.5px] font-medium text-copper-d">The {cls.short} register isn’t in yet</span>
          <span className="text-[13.5px] font-semibold text-copper-d">Take it</span>
        </MCard>
      )}

      <Tabs className="mt-4" value={view} onChange={setView} tabs={[{ id: 'students', label: 'Children', count: kids.length }, { id: 'homework', label: 'Homework' }]} />
      <AnimatePresence mode="wait" initial={false}>
        {view === 'students' ? (
          <motion.div key="students" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            {enrollments.isPending ? <Loading rows={4} /> : enrollments.error ? <ErrorState error={enrollments.error} onRetry={() => enrollments.refetch()} compact /> : (
              <MList className="mt-3">
                {kids.map(e => {
                  const st = statusOf(e.student.id)
                  return (
                    <motion.button key={e.id} whileTap={{ scale: 0.985, backgroundColor: 'rgba(240,235,226,.7)' }}
                      onClick={() => nav.push({ title: e.student.full_name, render: () => <StudentDetail studentId={e.student.id} name={e.student.full_name} sub={`${cls.short}${e.roll_number ? ` · Roll ${e.roll_number}` : ''}`} /> })}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left">
                      <Avatar name={e.student.full_name} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[15px] font-medium text-ink">{e.student.full_name}</span>
                          {st && st !== 'present' && <span className={cx('text-[11.5px] font-medium', st === 'absent' ? 'text-rust' : 'text-[#8a5f14]')}>{STATUS[st].label}</span>}
                        </div>
                        <div className="text-[12.5px] text-stone">{e.roll_number ? `Roll ${e.roll_number}` : 'No roll number'}</div>
                      </div>
                      <ChevronRight size={17} className="shrink-0 text-stone-l" />
                    </motion.button>
                  )
                })}
              </MList>
            )}
          </motion.div>
        ) : (
          <motion.div key="homework" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }} className="mt-3">
            <Unavailable blocker="homework" />
          </motion.div>
        )}
      </AnimatePresence>
    </MobileScreen>
  )
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: Tone }) {
  return (
    <div className="rounded-[14px] border border-line bg-ivory-2 px-3 py-2.5">
      <div className="truncate text-[11.5px] text-stone">{label}</div>
      <div className={cx('font-display text-[22px] leading-tight tabular', tone === 'rust' ? 'text-rust' : tone === 'copper' ? 'text-copper-d' : 'text-ink')}>{value}</div>
      <div className="truncate text-[11.5px] text-stone">{sub}</div>
    </div>
  )
}

export function StudentDetail({ studentId, name, sub }: { studentId: string; name: string; sub: string }) {
  const links = useGuardiansOf(studentId)
  const details = useGuardianDetails(studentId)
  return (
    <MobileScreen title={name} eyebrow={sub}>
      <MSection title="Attendance">
        <MonthCalendar studentId={studentId} />
      </MSection>
      <MSection title="Marks & remarks"><Unavailable blocker="assessment" compact /></MSection>
      <MSection title="Family">
        <QueryState q={links} empty={l => (l.length ? null : <p className="rounded-[14px] border border-dashed border-line px-4 py-4 text-center text-[13.5px] text-stone">No guardian on record.</p>)}>
          {l => (
            <MList>
              {l.map(g => {
                const d = details.data?.find(x => x.id === g.guardian.id)
                return (
                  <div key={g.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={g.guardian.full_name} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-medium text-ink">{g.guardian.full_name}</div>
                      <div className="text-[12.5px] text-stone">{humanize(g.relationship)}{d?.phone ? ` · ${d.phone}` : ''}</div>
                    </div>
                    {d?.phone && <a href={`tel:${d.phone.replace(/\s/g, '')}`} className="text-[13.5px] font-medium text-forest">Call</a>}
                  </div>
                )
              })}
            </MList>
          )}
        </QueryState>
        <Unavailable blocker="messages" compact className="mt-3">Messaging the family in-app needs the messaging API (Phase 9).</Unavailable>
      </MSection>
    </MobileScreen>
  )
}
