/**
 * The parent's linked children and which one is selected. The list is whatever GET /students returns for
 * this member — the backend's `child` scope limits it to their own children; the UI never widens it.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useClasses, useEnrollments, useStudents } from '@/api/queries'
import type { S } from '@/api/endpoints'

export interface Child { s: S['StudentOut']; classShort: string; sectionId: string | null; roll: string }

interface ParentCtx { children: Child[]; child: Child | null; setChildId: (id: string) => void; isPending: boolean; error: unknown; refetch: () => void }
const Ctx = createContext<ParentCtx | null>(null)

export function ParentProvider({ children: tree }: { children: ReactNode }) {
  const students = useStudents({ status: 'active' })
  const enrollments = useEnrollments()
  const classes = useClasses()
  const [childId, setChild] = useState<string | null>(null)
  const list = useMemo<Child[]>(() => (students.data ?? []).map(s => {
    const e = enrollments.data?.find(x => x.student.id === s.id)
    return { s, sectionId: e?.section.id ?? null, roll: e?.roll_number ?? '', classShort: e ? classes.data?.find(c => c.id === e.section.id)?.short ?? e.section.name : '—' }
  }).sort((a, b) => a.s.first_name.localeCompare(b.s.first_name)), [students.data, enrollments.data, classes.data])
  const value = useMemo<ParentCtx>(() => ({
    children: list,
    child: list.find(c => c.s.id === childId) ?? list[0] ?? null,
    // Scope guard: only ever select one of the listed (own) children.
    setChildId: (id: string) => { if (list.some(c => c.s.id === id)) setChild(id) },
    isPending: students.isPending,
    error: students.error,
    refetch: () => { students.refetch(); enrollments.refetch() },
  }), [list, childId, students, enrollments])
  return <Ctx.Provider value={value}>{tree}</Ctx.Provider>
}

export function useParent() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useParent must be used inside <ParentProvider>')
  return c
}
