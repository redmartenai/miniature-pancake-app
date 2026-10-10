/**
 * Typed calls for every backend endpoint the web app uses. Paths and shapes come from the backend's
 * OpenAPI contract (legendary-waffle-skl docs/api/openapi.yaml → src/api/schema.d.ts).
 * Nothing here is invented: an endpoint missing from the contract has no function.
 */
import { apiListAll, apiRequest, type Query, type Schemas } from './client'

export type S = Schemas
export type Scope = 'platform' | 'school' | 'campus' | 'academic_year' | 'department' | 'section' | 'assigned' | 'child' | 'self' | 'own'
export type AttendanceStatus = S['AttendanceStatusEnum']
export type DayStatus = S['DayOutStatusEnum']

export interface Page<T> { next: string | null; previous: string | null; results: T[] }

/* ───────── auth & identity (public auth endpoints send no token) ───────── */

export const auth = {
  passwordLogin: (body: S['PasswordLoginInRequest']) =>
    apiRequest<S['AuthSessionOut']>('/auth/password/login', { method: 'POST', body, auth: false }),
  otpRequest: (phone: string) =>
    apiRequest<S['OtpRequestOut']>('/auth/otp/request', { method: 'POST', body: { phone }, auth: false }),
  otpVerify: (body: S['OtpVerifyInRequest']) =>
    apiRequest<S['AuthSessionOut']>('/auth/otp/verify', { method: 'POST', body, auth: false }),
  logout: (refresh?: string) =>
    apiRequest<void>('/auth/logout', { method: 'POST', body: refresh ? { refresh } : {}, schoolId: null }),
  changePassword: (body: S['PasswordChangeInRequest']) =>
    apiRequest<void>('/auth/password/change', { method: 'POST', body, schoolId: null }),
  sessions: () => apiRequest<S['SessionOut'][]>('/auth/sessions', { schoolId: null }),
  revokeSession: (id: string) => apiRequest<void>(`/auth/sessions/${id}`, { method: 'DELETE', schoolId: null }),
}

export const me = {
  get: () => apiRequest<S['MeOut']>('/me', { schoolId: null }),
  /** Effective grants in a school: `{codename: [scopes]}`. */
  permissions: (schoolId: string) => apiRequest<S['MyPermissionsOut']>('/me/permissions', { schoolId }),
}

/* ───────── tenancy & branding ───────── */

export const branding = {
  /** Public: the branding for a web host (school subdomain or verified custom domain). */
  resolve: (host: string) => apiRequest<S['ResolvedBrandingOut']>('/branding/resolve', { query: { host }, auth: false }),
  /** The signed-in school's branding (needs X-School-Id). */
  current: (schoolId: string) => apiRequest<S['BrandingOut']>('/branding', { schoolId }),
  lookup: (code: string) => apiRequest<S['SchoolPublicOut']>('/schools/lookup', { query: { code }, auth: false }),
}

export const school = {
  get: () => apiRequest<S['SchoolOut']>('/school'),
}

/* ───────── academics ───────── */

export const academics = {
  years: (q: Query = {}) => apiListAll<S['AcademicYearOut']>('/academic-years', q),
  grades: () => apiListAll<S['GradeOut']>('/grades', { status: 'active' }),
  sections: (q: Query = {}) => apiListAll<S['SectionOut']>('/sections', q),
  subjects: () => apiListAll<S['SubjectOut']>('/subjects', { status: 'active' }),
  departments: () => apiListAll<S['DepartmentOut']>('/departments'),
}

/* ───────── people ───────── */

export const people = {
  students: (q: Query = {}) => apiListAll<S['StudentOut']>('/students', q),
  student: (id: string) => apiRequest<S['StudentOut']>(`/students/${id}`),
  staff: (q: Query = {}) => apiListAll<S['StaffOut']>('/staff', q),
  staffMember: (id: string) => apiRequest<S['StaffOut']>(`/staff/${id}`),
  guardians: (q: Query = {}) => apiListAll<S['GuardianOut']>('/guardians', q),
  studentGuardians: (q: Query = {}) => apiListAll<S['StudentGuardianOut']>('/student-guardians', q),
  enrollments: (q: Query = {}) => apiListAll<S['EnrollmentOut']>('/enrollments', q),
  teacherAssignments: (q: Query = {}) => apiListAll<S['TeacherAssignmentOut']>('/teacher-assignments', q),
}

/* ───────── timetable ───────── */

export const schedule = {
  mine: (dateFrom: string, dateTo: string) => apiRequest<S['ScheduleOut']>('/schedule/me', { query: { date_from: dateFrom, date_to: dateTo } }),
  student: (id: string, dateFrom: string, dateTo: string) =>
    apiRequest<S['ScheduleOut']>(`/students/${id}/schedule`, { query: { date_from: dateFrom, date_to: dateTo } }),
  section: (id: string, dateFrom: string, dateTo: string) =>
    apiRequest<S['ScheduleOut']>(`/sections/${id}/schedule`, { query: { date_from: dateFrom, date_to: dateTo } }),
}

/* ───────── attendance ───────── */

export interface AttendanceEntry { student_id: string; status: AttendanceStatus; note?: string }

export const attendance = {
  /** The register screen for a section (needs attendance.create). */
  roster: (sectionId: string, date?: string) => apiRequest<S['ClassRosterOut']>(`/classes/${sectionId}/roster`, { query: { date } }),
  /** Take or retake a register. Exceptions only — a student left out is present. `client_id` makes retries idempotent. */
  submit: (sectionId: string, body: { entries: AttendanceEntry[]; client_id: string; date?: string }) =>
    apiRequest<S['AttendanceSummaryOut']>(`/classes/${sectionId}/attendance`, { method: 'POST', body }),
  /** A student's month: a status per day and a summary. `month` is YYYY-MM. */
  studentMonth: (studentId: string, month: string) =>
    apiRequest<S['AttendanceMonthOut']>(`/students/${studentId}/attendance`, { query: { month } }),
  sessions: (q: Query = {}) => apiListAll<S['RegisterOut']>('/attendance/sessions', q),
  records: (q: Query = {}) => apiListAll<S['RecordOut']>('/attendance/records', q),
  corrections: (q: Query = {}) => apiListAll<S['CorrectionOut']>('/attendance/corrections', q),
  requestCorrection: (body: S['CorrectionInRequest']) => apiRequest<S['CorrectionOut']>('/attendance/corrections', { method: 'POST', body }),
  approveCorrection: (id: string, note?: string) =>
    apiRequest<S['CorrectionOut']>(`/attendance/corrections/${id}/approve`, { method: 'POST', body: note ? { note } : {} }),
  declineCorrection: (id: string, note?: string) =>
    apiRequest<S['CorrectionOut']>(`/attendance/corrections/${id}/decline`, { method: 'POST', body: note ? { note } : {} }),
}

/* ───────── access control & audit ───────── */

export const rbac = {
  roles: () => apiRequest<S['RoleOut'][]>('/roles'),
  permissions: () => apiRequest<S['PermissionOut'][]>('/permissions'),
  updateRole: (id: string, body: S['PatchedRoleUpdateInRequest']) => apiRequest<S['RoleOut']>(`/roles/${id}`, { method: 'PATCH', body }),
  memberships: () => apiRequest<S['MembershipOut'][]>('/memberships'),
}

export const audit = {
  /**
   * One page of the append-only audit log, newest first. The backend view returns a cursor page
   * (`audit/api/views.py` uses CursorPagination) although the OpenAPI document declares a bare array.
   */
  page: (q: Query = {}) => apiRequest<Page<S['AuditEventOut']>>('/audit-events', { query: { page_size: 100, ...q } }),
}

/** Pull the `cursor` out of a `next` URL for cursor pagination. */
export function nextCursor(next: string | null): string | undefined {
  if (!next) return undefined
  return new URL(next, 'http://x').searchParams.get('cursor') ?? undefined
}
