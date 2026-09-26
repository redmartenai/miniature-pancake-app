import { http } from '@/api/client';

// ------------------------------------------------------------------ communication

export type Scope = 'school' | 'grades' | 'sections' | 'staff';
export type Channel = 'push' | 'in_app' | 'sms' | 'whatsapp' | 'email';

export type Audience = {
  scope: Scope | 'route';
  grades: string[];
  class_ids: string[];
  /** "6–8", "N–5", or "6-B, 7-A" for sections; the route name for a route. */
  label: string;
  parents_only: boolean;
  kind: 'school' | 'parents' | 'families' | 'staff' | 'grades' | 'sections' | 'route';
};

export type ChannelStat = { sent: number; read: number; failed: number };

export type AnnouncementSummary = {
  id: string;
  title: string;
  kind: string;
  published_at: string;
  scheduled: boolean;
  channels: Channel[];
  audience: Audience;
  recipients: number;
  read: number;
  read_rate: number | null;
  /** "app" (push + in-app inbox), "sms", "whatsapp", "email". */
  by_channel: Partial<Record<'app' | 'sms' | 'whatsapp' | 'email', ChannelStat>>;
  author: string | null;
  circular_no?: number | null;
};

export type Circular = {
  id: string;
  number: number;
  title: string;
  published_at: string;
  due_on: string | null;
  recipients: number;
  acknowledged: number;
  rate: number | null;
  state: 'done' | 'pending' | 'closed';
  audience: Audience;
  document_id: string | null;
};

export type MeetingRequest = {
  id: string;
  conversation_id: string;
  status: 'requested' | 'booked' | 'cancelled';
  topic: string;
  starts_at: string;
  ends_at: string;
  location: string;
  event: string | null;
  parent: { name: string; initials: string } | null;
  children: { name: string; class: string }[];
};

export type Draft = {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  channels: Channel[];
  scheduled_at: string | null;
  requires_ack: boolean;
  ack_due_on: string | null;
  circular: boolean;
  attachment: { name: string; size: number } | null;
  saved_at: string;
};

export type SmsCredits = { balance: number; bought: number; used: number };

export type CommunicationData = {
  counts: { messages: number; meetings: number };
  recent: AnnouncementSummary[];
  circulars: Circular[];
  meetings: MeetingRequest[];
  drafts: Draft[];
  quiet_hours: { start: string; end: string };
  sms_credits: SmsCredits;
  fields: string[];
  limit: number;
  grades: string[];
  sections: { id: string; label: string; grade: string }[];
};

export type Estimate = {
  empty: boolean;
  families: number;
  parents: number;
  people: number;
  sections: number;
  staff: number;
  push: number;
  families_on_app: number;
  families_without_app: number;
  sms: number;
  whatsapp: number;
  email: number;
  sms_credits: SmsCredits;
};

export type AudienceBody = { scope: Scope; grades: string[]; class_ids: string[]; parents_only: boolean };

export type Preview = {
  sample: { name: string; child: string; class: string } | null;
  push: { title: string; body: string };
  sms: { text: string; length: number };
  email: { subject: string; body: string };
};

export const communicationApi = {
  page: () => http.get<CommunicationData>('/console/communication'),
  estimate: (body: AudienceBody) => http.post<Estimate>('/console/communication/estimate', body),
  preview: (body: AudienceBody & { title: string; body: string }) => http.post<Preview>('/console/communication/preview', body),
  compose: (form: FormData) =>
    http.upload<(Draft | AnnouncementSummary) & { status: 'draft' | 'published' }>('/console/communication/announcements', form),
  deleteDraft: (id: string) => http.del<void>(`/console/communication/drafts/${id}`),
  reports: () => http.get<{ items: AnnouncementSummary[]; sms_credits: SmsCredits }>('/console/communication/reports'),
  circulars: () => http.get<{ items: Circular[] }>('/console/communication/circulars'),
  remind: (id: string) => http.post<{ reminded: number }>(`/console/communication/circulars/${id}/remind`),
  meetings: () => http.get<{ requested: MeetingRequest[]; booked: MeetingRequest[] }>('/console/communication/meetings'),
  decide: (id: string, action: 'accept' | 'propose', startsAt?: string) =>
    http.post<unknown>(`/console/communication/meetings/${id}/${action}`, startsAt ? { starts_at: startsAt } : {}),
};

// ------------------------------------------------------------------ documents

export type DocAccess = {
  kind: 'school' | 'staff' | 'parents' | 'students' | 'route' | 'private' | 'family' | 'teachers' | 'class_teacher' | 'accountant';
  label: string;
  restricted: boolean;
  owner_is_management?: boolean;
};

export type DocRow = {
  id: string;
  title: string;
  name: string;
  description: string;
  type: 'pdf' | 'doc' | 'xls' | 'img' | 'file';
  pages: number;
  size: number;
  version: number;
  owner: string | null;
  date: string;
  updated_at: string;
  access: DocAccess;
  downloads: number;
  folder_id: string | null;
};

export type Folder = { id: string; name: string; parent_id: string | null; locked: boolean; count: number };

export type DocumentsData = {
  folders: Folder[];
  total_files: number;
  storage: { used: number; quota: number };
  folder: { id: string; name: string; locked: boolean; path: { id: string; name: string }[] } | null;
  items: DocRow[];
  total: number;
  limit: number;
  sections: { id: string; label: string; grade: string }[];
};

export type PermissionSubject = 'principal' | 'staff' | 'class_teacher' | 'teachers' | 'parents' | 'students' | 'accountant';
export type PermissionRow = {
  subject: PermissionSubject;
  scope: string;
  route?: boolean;
  view: boolean;
  download: boolean;
  upload: boolean;
  fixed: ('view' | 'download' | 'upload')[];
};

export type AccessEntry = {
  id: string;
  user: { name: string; initials: string } | null;
  role: string;
  action: 'download' | 'view' | 'permissions' | 'upload';
  at: string;
  device: string;
};

export type DocDetail = DocRow & {
  reach: { downloaded: number; of: number; unit: 'families' | 'staff' };
  permissions: PermissionRow[];
  recent: AccessEntry[];
  mime: string | null;
};

export type DocQuery = { folder?: string | null; q?: string; access?: string; type?: string; limit?: number };

export const documentsApi = {
  list: (p: DocQuery) => {
    const qs = new URLSearchParams();
    if (p.folder) qs.set('folder', p.folder);
    if (p.q) qs.set('q', p.q);
    if (p.access) qs.set('access', p.access);
    if (p.type) qs.set('type', p.type);
    if (p.limit) qs.set('limit', String(p.limit));
    return http.get<DocumentsData>(`/console/documents?${qs.toString()}`);
  },
  detail: (id: string) => http.get<DocDetail>(`/console/documents/${id}`),
  log: (id: string) => http.get<{ title: string; total: number; items: AccessEntry[] }>(`/console/documents/${id}/log`),
  savePermissions: (id: string, rows: Omit<PermissionRow, 'scope' | 'fixed' | 'route'>[]) =>
    http.patch<DocDetail>(`/console/documents/${id}/permissions`, { rows }),
  upload: (form: FormData) => http.upload<DocRow>('/console/documents', form),
  newFolder: (body: { name: string; parent_id?: string | null; locked: boolean }) => http.post<Folder>('/console/documents/folders', body),
  updateFolder: (id: string, body: { name?: string; locked?: boolean }) => http.patch<Folder>(`/console/documents/folders/${id}`, body),
  deleteFolder: (id: string) => http.del<void>(`/console/documents/folders/${id}`),
  fileUrl: (id: string) => `/console/documents/${id}/file`,
};

// ------------------------------------------------------------------ reports

export type ReportKey =
  | 'attendance_register'
  | 'class_performance'
  | 'fee_collection'
  | 'defaulters'
  | 'staff_attendance'
  | 'transport_utilisation'
  | 'admissions_funnel';
export type Fmt = 'pdf' | 'xlsx';
export type RunInfo = { id: string; at: string; format: Fmt; rows: number; size: number; title: string; file: string };
export type Person = { id: string; name: string; title: string };

export type Schedule = {
  id: string;
  name: string;
  report: string;
  format: Fmt;
  frequency: 'daily' | 'weekly' | 'monthly';
  weekday: number;
  day_of_month: number;
  at: string;
  recipients: Person[];
  enabled: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
};

export type CustomDef = { key: string; id: string; name: string; module: string; columns: string[]; formats: Fmt[]; last: RunInfo | null };

export type ReportFilters = { start: string; end: string; grades: string[]; sections: string[]; term: string | null; describe?: string };

export type ReportsData = {
  filters: ReportFilters;
  options: { terms: string[]; grades: string[]; sections: { id: string; label: string; grade: string }[] };
  charts: {
    attendance: { months: { month: string; to_date: boolean; students: number | null; staff: number | null }[] };
    unit_tests: {
      grades: { grade: string; ut1: number | null; ut2: number | null }[];
      school: { ut1: number | null; ut2: number | null };
      improved: number;
      compared: number;
      worst: { grade: string; drop: number; subject: string | null; subject_drop: number | null } | null;
    };
    fees: {
      months: { month: string; collected: number }[];
      billed: number;
      target: number;
      target_percent: number;
      collected: number;
      gap: number;
    };
  };
  schedules: Schedule[];
  library: { key: ReportKey; formats: Fmt[]; last: RunInfo | null }[];
  custom: CustomDef[];
  custom_modules: Record<string, [string, string][]>;
  recipients: Person[];
  can_export: boolean;
  refreshed_at: string;
};

export type Delivery = {
  id: string;
  at: string;
  schedule: string;
  report: string;
  format: Fmt;
  user: string | null;
  channel: 'in_app' | 'email';
  address: string;
  status: string;
  file: string;
};

export type FilterParams = { term?: string | null; grades?: string[]; sections?: string[]; from?: string; to?: string };

function filterQuery(p: FilterParams): string {
  const qs = new URLSearchParams();
  if (p.term) qs.set('term', p.term);
  if (p.grades?.length) qs.set('grades', p.grades.join(','));
  if (p.sections?.length) qs.set('sections', p.sections.join(','));
  if (p.from) qs.set('from', p.from);
  if (p.to) qs.set('to', p.to);
  return qs.toString();
}

export const reportsApi = {
  page: (p: FilterParams) => http.get<ReportsData>(`/console/reports?${filterQuery(p)}`),
  generate: (report: string, format: Fmt, p: FilterParams) =>
    http.post<RunInfo>('/console/reports/generate', {
      report,
      format,
      term: p.term,
      grades: p.grades,
      sections: p.sections,
      from: p.from,
      to: p.to,
    }),
  schedule: (body: {
    name: string;
    report: string;
    format: Fmt;
    frequency: string;
    weekday: number;
    day_of_month: number;
    at: string;
    recipient_ids: string[];
  }) => http.post<Schedule>('/console/reports/schedules', body),
  toggle: (id: string, enabled: boolean) => http.patch<Schedule>(`/console/reports/schedules/${id}`, { enabled }),
  runNow: (id: string) => http.post<RunInfo>(`/console/reports/schedules/${id}/run`),
  removeSchedule: (id: string) => http.del<void>(`/console/reports/schedules/${id}`),
  deliveries: () => http.get<{ items: Delivery[] }>('/console/reports/deliveries'),
  saveCustom: (body: { name: string; module: string; columns: string[] }) => http.post<CustomDef>('/console/reports/custom', body),
  removeCustom: (id: string) => http.del<void>(`/console/reports/custom/${id}`),
};
