/* The signed-in teacher: their staff record, the classes they teach and the one they're class teacher of. */
import { useMemo } from 'react'
import { useClasses, useMyStaff, useTeacherAssignments, type ClassInfo } from '@/api/queries'

export interface MyClass extends ClassInfo { subjects: string[]; mine: boolean }

export function useTeacher() {
  const me = useMyStaff()
  const assignments = useTeacherAssignments({ staff_id: me.data?.id ?? '' }, !!me.data)
  const classes = useClasses({ withCounts: true })
  const data = useMemo(() => {
    if (!classes.data || !assignments.data) return undefined
    const m = new Map<string, MyClass>()
    for (const a of assignments.data) {
      const c = classes.data.find(x => x.id === a.section.id)
      if (!c) continue
      const v = m.get(c.id) ?? { ...c, subjects: [], mine: false }
      if (a.subject && !v.subjects.includes(a.subject.name)) v.subjects.push(a.subject.name)
      if (a.is_class_teacher) v.mine = true
      m.set(c.id, v)
    }
    const list = [...m.values()].sort((a, b) => Number(b.mine) - Number(a.mine) || a.short.localeCompare(b.short, undefined, { numeric: true }))
    return { classes: list, classTeacherOf: list.find(c => c.mine) ?? null, subjects: [...new Set(list.flatMap(c => c.subjects))] }
  }, [classes.data, assignments.data])
  return {
    staff: me.data,
    data,
    isPending: me.isPending || (!!me.data && (assignments.isPending || classes.isPending)),
    error: me.error ?? assignments.error ?? classes.error,
    noStaffRecord: me.isSuccess && !me.data,
    refetch: () => { me.refetch(); assignments.refetch(); classes.refetch() },
  }
}
