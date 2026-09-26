import { http } from '@/api/client';

/* ------------------------------------------------------------------ settings */

export const MODULES = [
  'students',
  'attendance',
  'homework',
  'assignments',
  'exams',
  'timetable',
  'messages',
  'documents',
  'fees',
  'transport',
  'reports',
] as const;
export const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'download', 'publish'] as const;
export const SCOPES = ['school', 'classes', 'own', 'none'] as const;

export type ModuleKey = (typeof MODULES)[number];
export type ActionKey = (typeof ACTIONS)[number];
export type Scope = (typeof SCOPES)[number];

export type RoleSummary = {
  key: string;
  name: string;
  system: boolean;
  users: number;
  editable: boolean;
  based_on?: string | null;
  description?: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  actor: string | null;
  action: string;
  module: string;
  summary: string;
  target_type: string;
  target_id: string;
  ip: string | null;
  device: string;
};

export type Cell = { allowed: boolean; locked: boolean; na: boolean };
export type ModuleRow = { module: ModuleKey; cells: Record<ActionKey, Cell>; data_scope: Scope; scope_locked: boolean };
export type RoleDetail = RoleSummary & {
  changed_at: string | null;
  modules: ModuleRow[];
  members: { id: string; name: string; initials: string }[];
  saved?: number;
};

export type RolesList = { roles: RoleSummary[]; recent: AuditEntry[]; can_edit: boolean };

export type Term = { name: string; starts_on: string; ends_on: string };
export type Holiday = { date: string; name: string };

export type Profile = {
  name: string;
  short_name: string;
  code: string;
  campus: string;
  address: string;
  city: string;
  state: string;
  logo_url: string;
  primary_color: string;
  email: string;
  website: string;
  contacts: { office: string; transport: string };
  languages: string[];
};

export type Calendar = {
  academic_year: { name: string; starts_on: string; ends_on: string } | null;
  terms: Term[];
  holidays: Holiday[];
  upcoming_holidays: number;
  attendance_cutoff: string;
};

export type NotificationSettings = {
  quiet_hours: [string, string];
  channels: { key: 'in_app' | 'push' | 'sms' | 'whatsapp' | 'email'; connected: boolean }[];
  templates: { absence: string };
  absence_alerts: boolean;
};

export type Integration = {
  key: 'payments' | 'sms' | 'whatsapp' | 'biometric' | 'gps';
  status: 'live' | 'test' | 'off';
  detail: string | null;
};

export type SettingsOverview = {
  can_edit: boolean;
  profile: Profile;
  calendar: Calendar;
  roles: number;
  notifications: NotificationSettings;
  integrations: Integration[];
  security: {
    sign_in: string;
    two_step: boolean;
    staff: number;
    staff_with_password: number;
    audit_entries_30d: number;
    sensitive_30d: number;
  };
  billing: {
    plan: string | null;
    students: number;
    staff: number;
    sms_month: number;
    sms_delivered_month: number;
    sms_credits: number | null;
  };
};

export type AuditPage = {
  items: AuditEntry[];
  total: number;
  page: number;
  page_size: number;
  modules: string[];
  actors: { id: string; name: string }[];
};

export type ModuleChange = Partial<Record<ActionKey, boolean>> & { data_scope?: Scope };

/* ---------------------------------------------------------------- attendance */

export type Mark = 'p' | 'a' | 'l' | 'f';

export type HeatSection = { id: string; label: string; grade: string; values: (number | null)[] };

export type Chronic = {
  id: string;
  name: string;
  initials: string;
  class: string;
  roll_no: number;
  days: number;
  since: string;
  marks: Mark[];
  ytd: number | null;
  reason_given: boolean;
  guardian: { user_id: string; name: string; phone: string; phone_masked: string } | null;
  contact: { channel: 'alert' | 'call' | 'handoff'; outcome: 'sent' | 'reached' | 'no_answer'; at: string; by: string | null } | null;
};

export type Slip = {
  id: string;
  code: string;
  class: string;
  date: string;
  student: string | null;
  more: number;
  from: string;
  to: string;
  reason: string;
  requested_by: string | null;
  requested_at: string;
  status: 'pending' | 'approved' | 'declined' | 'sent_back' | 'withdrawn';
  undo_until: string | null;
};

export type StudentsAttendance = {
  date: string;
  today: string;
  is_today: boolean;
  registers: { sections: number; marked: number; last_marked_at: string | null; roll_at: string | null };
  roll: {
    total: number;
    marked_total: number;
    in_school: number;
    percent: number | null;
    previous_date: string;
    previous_percent: number | null;
    absent: number;
    absent_percent: number | null;
    explained: number;
    unexplained: number;
    late: number;
    late_grades: string[];
  };
  alerts: { pending: number; sent: number; enabled: boolean };
  teachers: { total: number; in: number; on_leave: string[] };
  heat: { days: string[]; groups: { key: 'junior' | 'senior'; from: string | null; to: string | null; sections: HeatSection[] }[] };
  insight: {
    flagged: { label: string; today: number; run: number; since: string; peak: number | null; peak_date: string | null }[];
    floor: number | null;
  };
  chronic: Chronic[];
  corrections: Slip[];
};

export type StaffAttendance = {
  date: string;
  is_today: boolean;
  marked: number;
  teachers: { total: number; in: number };
  support: { total: number; in: number };
  status: { present: number; late: number; absent: number; leave: number; unmarked: number };
  days: string[];
  heat: { key: 'teachers' | 'support'; total: number; values: (number | null)[] }[];
  missing: { id: string; name: string; status: 'absent' | 'leave' }[];
  checkins: {
    id: string;
    name: string;
    initials: string;
    kind: 'teacher' | 'support';
    status: 'present' | 'late' | 'absent' | 'leave';
    check_in: string | null;
    check_out: string | null;
    source: 'app' | 'biometric' | 'office';
  }[];
};

export type Absentee = {
  id: string;
  name: string;
  class: string;
  roll_no: number;
  status: 'absent' | 'late';
  note: string;
  explained: boolean;
  alerted: boolean;
  guardian: { name: string; phone: string } | null;
};

export const adminApi = {
  settings: () => http.get<SettingsOverview>('/console/settings'),
  saveProfile: (body: Partial<Omit<Profile, 'contacts'>> & { contacts?: Partial<Profile['contacts']> }) =>
    http.patch<Profile>('/console/settings/profile', body),
  saveCalendar: (body: { terms: Term[]; holidays: Holiday[] }) => http.put<Calendar>('/console/settings/calendar', body),
  saveNotifications: (body: { quiet_hours?: [string, string]; absence_template?: string; absence_alerts?: boolean }) =>
    http.patch<NotificationSettings>('/console/settings/notifications', body),
  roles: () => http.get<RolesList>('/console/settings/roles'),
  role: (key: string) => http.get<RoleDetail>(`/console/settings/roles/${key}`),
  saveRole: (key: string, modules: Partial<Record<ModuleKey, ModuleChange>>) =>
    http.put<RoleDetail>(`/console/settings/roles/${key}`, { modules }),
  createRole: (name: string, basedOn: string) => http.post<RoleDetail>('/console/settings/roles', { name, based_on: basedOn }),
  deleteRole: (key: string) => http.del<null>(`/console/settings/roles/${key}`),
  addMember: (key: string, userId: string) => http.post<RoleDetail>(`/console/settings/roles/${key}/members`, { user_id: userId }),
  removeMember: (key: string, userId: string) => http.del<RoleDetail>(`/console/settings/roles/${key}/members`, { user_id: userId }),
  staff: (q: string) =>
    http.get<{ items: { id: string; name: string; title: string }[] }>(`/console/settings/staff?q=${encodeURIComponent(q)}`),
  audit: (params: Record<string, string | number | undefined>) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    return http.get<AuditPage>(`/console/settings/audit${qs ? `?${qs}` : ''}`);
  },

  students: (date?: string) => http.get<StudentsAttendance>(`/console/attendance${date ? `?date=${date}` : ''}`),
  staffAttendance: (date?: string) => http.get<StaffAttendance>(`/console/attendance?view=staff${date ? `&date=${date}` : ''}`),
  absentees: (date: string, sections: string[]) =>
    http.get<{ date: string; items: Absentee[] }>(
      `/console/attendance/absentees?date=${date}&sections=${encodeURIComponent(sections.join(','))}`,
    ),
  sendAlerts: () => http.post<{ students: number; guardians: number }>('/console/attendance/alerts'),
  logCall: (studentId: string, outcome: 'reached' | 'no_answer', note: string) =>
    http.post<StudentsAttendance>('/console/attendance/contacts', { student_id: studentId, outcome, note }),
  handoff: () => http.post<{ handed: number; to: string[] }>('/console/attendance/handoff'),
  decide: (id: string, decision: 'approve' | 'decline') =>
    http.post<{ corrections: Slip[] }>(`/console/attendance/corrections/${id}/decide`, { decision }),
  undo: (id: string) => http.post<{ corrections: Slip[] }>(`/console/attendance/corrections/${id}/undo`),
};
