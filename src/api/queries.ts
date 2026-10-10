/**
 * Server state for the screens. One hook per resource; derived views (a class with its teacher and
 * headcount) are built here from canonical resources, never fabricated.
 * Every query is scoped to the active school: switching school clears the cache (AuthProvider).
 */
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/auth/AuthProvider'
import { isoDate, nowIso } from '@/lib/format'
import { academics, attendance, audit, me, people, rbac, schedule, school, type AttendanceEntry, type S } from './endpoints'

/** The device clock as local ISO, ticking every 30 seconds. */
export function useNow(intervalMs = 30_000): string {
  const [now, setNow] = useState(nowIso)
  useEffect(() => {
    const t = setInterval(() => setNow(nowIso()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

const useSchoolId = () => useAuth().schoolId

export function useSchoolProfile() {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['school', sid], queryFn: school.get, enabled: !!sid, staleTime: 5 * 60_000 })
}

export function useCurrentYear() {
  const sid = useSchoolId()
  return useQuery({
    queryKey: ['academic-years', sid, 'current'],
    queryFn: async () => (await academics.years({ is_current: true }))[0] ?? null,
    enabled: !!sid,
    staleTime: 5 * 60_000,
  })
}

export function useSections() {
  const sid = useSchoolId()
  const year = useCurrentYear()
  const yearId = year.data?.id
  const q = useQuery({
    queryKey: ['sections', sid, yearId],
    queryFn: () => academics.sections({ academic_year_id: yearId, status: 'active' }),
    enabled: !!sid && year.isSuccess,
    staleTime: 5 * 60_000,
  })
  return { ...q, isPending: year.isPending || (year.isSuccess && q.isPending), error: year.error ?? q.error }
}

export function useSubjects() {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['subjects', sid], queryFn: academics.subjects, enabled: !!sid, staleTime: 5 * 60_000 })
}

export function useGrades() {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['grades', sid], queryFn: academics.grades, enabled: !!sid, staleTime: 5 * 60_000 })
}

export function useStudents(q: Record<string, string> = {}, enabled = true) {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['students', sid, q], queryFn: () => people.students(q), enabled: !!sid && enabled })
}

export function useStudent(id: string | null) {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['student', sid, id], queryFn: () => people.student(id!), enabled: !!sid && !!id })
}

export function useStaffList(enabled = true) {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['staff', sid], queryFn: () => people.staff(), enabled: !!sid && enabled })
}

/** The signed-in member's own staff record (staff.read with `self` scope returns it). */
export function useMyStaff() {
  const { schoolId, membership } = useAuth()
  return useQuery({
    queryKey: ['staff', schoolId, 'me', membership?.id],
    queryFn: async () => (await people.staff()).find(s => s.membership_id === membership?.id) ?? null,
    enabled: !!schoolId && !!membership,
  })
}

/** Active enrollments in the current academic year (optionally for one section or student). */
export function useEnrollments(filter: { section_id?: string; student_id?: string } = {}, enabled = true) {
  const sid = useSchoolId()
  const year = useCurrentYear()
  const q = useQuery({
    queryKey: ['enrollments', sid, year.data?.id, filter],
    queryFn: () => people.enrollments({ academic_year_id: year.data?.id, status: 'active', ...filter }),
    enabled: !!sid && year.isSuccess && enabled,
  })
  return { ...q, isPending: enabled && (year.isPending || q.isPending), error: year.error ?? q.error }
}

export function useTeacherAssignments(filter: { staff_id?: string; section_id?: string } = {}, enabled = true) {
  const sid = useSchoolId()
  const year = useCurrentYear()
  const q = useQuery({
    queryKey: ['teacher-assignments', sid, year.data?.id, filter],
    queryFn: () => people.teacherAssignments({ academic_year_id: year.data?.id, status: 'active', ...filter }),
    enabled: !!sid && year.isSuccess && enabled,
  })
  return { ...q, isPending: enabled && (year.isPending || q.isPending), error: year.error ?? q.error }
}

export const assignmentStaff = (a: S['TeacherAssignmentOut']) => {
  const s = a.staff as { id?: string; full_name?: string }
  return { id: String(s.id ?? ''), name: String(s.full_name ?? 'Teacher') }
}

/* ───────── classes (sections) as the screens see them ───────── */

export interface ClassInfo {
  id: string
  /** "9B" style label (the section code, as the backend's ClassRef.short_label). */
  short: string
  /** "Grade 9 · B" style label. */
  label: string
  gradeId: string
  gradeName: string
  classTeacher: { id: string; name: string } | null
  students: number | null
}

export const sectionShort = (s: Pick<S['SectionOut'], 'code' | 'name' | 'grade'>) => s.code || `${s.grade.name} ${s.name}`
export const sectionLabel = (s: Pick<S['SectionOut'], 'name' | 'grade'>) => `${s.grade.name} · ${s.name}`

/** Every active class this member can see, with its class teacher and enrolled headcount. */
export function useClasses(opts: { withCounts?: boolean } = {}) {
  const sections = useSections()
  const assignments = useTeacherAssignments({}, sections.isSuccess)
  const enrollments = useEnrollments({}, !!opts.withCounts && sections.isSuccess)
  const data = useMemo<ClassInfo[] | undefined>(() => {
    if (!sections.data) return undefined
    const counts = new Map<string, number>()
    for (const e of enrollments.data ?? []) counts.set(e.section.id, (counts.get(e.section.id) ?? 0) + 1)
    return sections.data
      .map(s => {
        const ct = assignments.data?.find(a => a.section.id === s.id && a.is_class_teacher)
        return {
          id: s.id, short: sectionShort(s), label: sectionLabel(s), gradeId: s.grade.id, gradeName: s.grade.name,
          classTeacher: ct ? assignmentStaff(ct) : null,
          students: opts.withCounts && enrollments.data ? counts.get(s.id) ?? 0 : null,
        }
      })
      .sort((a, b) => a.short.localeCompare(b.short, undefined, { numeric: true }))
  }, [sections.data, assignments.data, enrollments.data, opts.withCounts])
  return {
    data,
    isPending: sections.isPending,
    error: sections.error ?? assignments.error ?? enrollments.error,
    refetch: () => { sections.refetch(); assignments.refetch(); enrollments.refetch() },
  }
}

/* ───────── attendance ───────── */

export function useRegisters(date: string) {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['attendance-sessions', sid, date], queryFn: () => attendance.sessions({ date }), enabled: !!sid, refetchInterval: 60_000 })
}

export function useRoster(sectionId: string | null, date = isoDate()) {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['roster', sid, sectionId, date], queryFn: () => attendance.roster(sectionId!, date), enabled: !!sid && !!sectionId })
}

export function useStudentMonth(studentId: string | null, month: string) {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['student-month', sid, studentId, month], queryFn: () => attendance.studentMonth(studentId!, month), enabled: !!sid && !!studentId })
}

export function useCorrections(status?: 'pending' | 'approved' | 'declined', enabled = true) {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['corrections', sid, status ?? 'all'], queryFn: () => attendance.corrections(status ? { status } : {}), enabled: !!sid && enabled })
}

export function useDecideCorrection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: 'approve' | 'decline'; note?: string }) =>
      decision === 'approve' ? attendance.approveCorrection(id, note) : attendance.declineCorrection(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corrections'] })
      qc.invalidateQueries({ queryKey: ['attendance-sessions'] })
      qc.invalidateQueries({ queryKey: ['roster'] })
    },
  })
}

export function useSubmitRegister(sectionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { entries: AttendanceEntry[]; client_id: string; date?: string }) => attendance.submit(sectionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roster'] })
      qc.invalidateQueries({ queryKey: ['attendance-sessions'] })
    },
  })
}

/* ───────── schedule ───────── */

export function useMySchedule(from: string, to: string, enabled = true) {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['schedule-me', sid, from, to], queryFn: () => schedule.mine(from, to), enabled: !!sid && enabled })
}

/* ───────── access & audit ───────── */

export function useRoles() {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['roles', sid], queryFn: rbac.roles, enabled: !!sid })
}

export function usePermissionCatalog() {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['permissions', sid], queryFn: rbac.permissions, enabled: !!sid, staleTime: 10 * 60_000 })
}

export function useMemberships(enabled = true) {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['memberships', sid], queryFn: rbac.memberships, enabled: !!sid && enabled })
}

export function useAuditPage(filter: { action?: string } = {}, enabled = true) {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['audit', sid, filter], queryFn: () => audit.page(filter), enabled: !!sid && enabled })
}

export function useGuardiansOf(studentId: string | null) {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['student-guardians', sid, studentId], queryFn: () => people.studentGuardians({ student_id: studentId! }), enabled: !!sid && !!studentId })
}

export function useGuardianDetails(studentId: string | null) {
  const sid = useSchoolId()
  return useQuery({ queryKey: ['guardians', sid, studentId], queryFn: () => people.guardians({ student_id: studentId! }), enabled: !!sid && !!studentId })
}

export function useMePermissions() {
  const { schoolId } = useAuth()
  return useQuery({ queryKey: ['me-permissions', schoolId], queryFn: () => me.permissions(schoolId!), enabled: !!schoolId })
}
