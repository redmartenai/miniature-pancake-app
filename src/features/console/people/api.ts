import { http } from '@/api/client';
import { useConsoleQuery } from '@/features/console/api';

/* ------------------------------------------------------------------------------------------------ students */

export type FeeState = { status: 'paid' | 'due' | 'overdue' | 'none'; due_on: string | null; amount: string };

export type StudentRow = {
  id: string;
  name: string;
  initials: string;
  admission_no: string;
  is_new: boolean;
  class: { id: string; label: string };
  roll_no: number;
  attendance: number | null;
  ut2: number | null;
  fee: FeeState;
  transport: { route_id: string; route: string; stop: string } | null;
  parent: { name: string; relationship: string; phone_masked: string } | null;
};

export type Chip = 'all' | 'absent' | 'late' | 'overdue' | 'new';

export type Directory = {
  counts: Record<Chip, number>;
  summary: { enrolled: number; sections: number; first_grade: string | null; last_grade: string | null; academic_year: string | null };
  facets: {
    grades: string[];
    sections: string[];
    classes: { id: string; label: string; grade: string; section: string }[];
    routes: { id: string; label: string }[];
  };
  page: number;
  page_size: number;
  pages: number;
  total: number;
  items: StudentRow[];
};

export type DirectoryParams = {
  chip: Chip;
  q: string;
  grade: string;
  section: string;
  class: string;
  transport: string;
  fee: string;
  sort: string;
  page: number;
  pageSize: number;
};

export function directoryQuery(p: Partial<DirectoryParams>, withPage = true): string {
  const qs = new URLSearchParams();
  if (p.chip && p.chip !== 'all') qs.set('chip', p.chip);
  for (const key of ['q', 'grade', 'section', 'class', 'transport', 'fee', 'sort'] as const) {
    const v = p[key];
    if (v) qs.set(key, v);
  }
  if (withPage) {
    qs.set('page', String(p.page ?? 1));
    qs.set('page_size', String(p.pageSize ?? 12));
  }
  return qs.toString();
}

export type Interaction = {
  kind: 'thread' | 'meeting' | 'ack' | 'leave';
  at: string;
  title: string;
  with: string | null;
  detail: string;
  status: string;
  count?: number;
  reply_minutes?: number | null;
  conversation_id?: string;
  upcoming: boolean;
  days?: number;
  ends_at?: string;
};

export type Profile = {
  id: string;
  name: string;
  initials: string;
  is_active: boolean;
  house: string;
  academic_year: string | null;
  class: { id: string; label: string };
  roll_no: number;
  admission_no: string;
  date_of_birth: string | null;
  age: number | null;
  gender: string;
  today: { state: 'in_school' | 'late' | 'absent' | 'not_marked'; since: string | null; note: string };
  class_teacher: { name: string; subject: string | null; employee_id: string | null } | null;
  guardians: { id: string; name: string; relationship: string; is_primary: boolean; phone: string; phone_masked: string }[];
  siblings: { id: string; name: string; class: string; roll_no: number; class_teacher: string | null }[];
  counts: { homework: number; remarks: number; documents: number };
  attendance: {
    month: string;
    calendar: { date: string; state: 'present' | 'late' | 'absent' | 'holiday' | 'upcoming' }[];
    month_stats: { percent: number | null; on_time: number; late: number; absent: number };
    ytd: { present: number; days: number; percent: number | null; target: number };
    log: {
      date: string;
      status: 'absent' | 'late';
      raw_status: string;
      note: string;
      leave: { reason: string; status: string; decided_by: string | null } | null;
    }[];
    months: { month: string; days: number; absent: number; late: number; percent: number | null }[];
  };
  academics: {
    exams: {
      id: string;
      name: string;
      percent: number;
      grade: string;
      class_average: number | null;
      published_on: string | null;
      note: { body: string; author: string | null; on: string } | null;
    }[];
    previous_name: string | null;
    latest_name: string | null;
    latest_published_on: string | null;
    latest_percent: number | null;
    latest_grade: string | null;
    latest_class_average: number | null;
    previous_percent: number | null;
    subjects: {
      code: string;
      subject: string;
      teacher: string | null;
      previous: number | null;
      latest: number;
      grade: string;
      class_average: number | null;
      change: number | null;
    }[];
    watch: { lowest: string; lowest_percent: number; biggest_gain: string | null; gain: number | null } | null;
    next_exam: { name: string; held_on: string } | null;
    report_exam_id: string | null;
  };
  remarks: {
    id: string;
    author: string;
    author_role: 'class_teacher' | 'teacher';
    subject: string | null;
    tone: 'positive' | 'concern' | 'info';
    body: string;
    visibility: string;
    created_at: string;
    requires_ack: boolean;
    seen_at: string | null;
  }[];
  fees: {
    annual: string;
    categories: string[];
    paid: string;
    outstanding: string;
    receipts: number;
    status: FeeState;
    next: { id: string; title: string; amount: string; due_date: string; days: number } | null;
    upcoming: { id: string; title: string; amount: string; due_date: string }[];
    family_due: { on: string; total: string; children: { id: string; name: string; class: string; amount: string }[] } | null;
    last_payment: { amount: string; paid_at: string | null; receipt_no: string | null } | null;
    invoices: {
      id: string;
      title: string;
      category: string;
      amount: string;
      paid: string;
      balance: string;
      due_date: string;
      status: string;
    }[];
    payments: { id: string; title: string; amount: string; paid_at: string | null; receipt_no: string | null; method: string }[];
  };
  homework: {
    assigned: number;
    on_time: number;
    late: number;
    incomplete: number;
    percent: number | null;
    open: HomeworkItem[];
    flag: { title: string; subject: string; by: string; body: string; due_date: string } | null;
    all: HomeworkItem[];
  };
  interactions: Interaction[];
  transport: {
    route: { id: string; code: string; name: string };
    vehicle: string | null;
    stop: string;
    stop_no: number;
    stops: number;
    pickup_at: string;
    drop_leaves: string;
    drop_eta: string;
    boarded_at: string | null;
    arrived_at: string | null;
    drop: { status: string; eta: string | null } | null;
    driver: { name: string; initials: string; phone: string } | null;
    attendant: { name: string; initials: string } | null;
    delay_minutes: number | null;
  } | null;
  documents: {
    id: string;
    kind: string;
    title: string;
    subtitle: string;
    date: string | null;
    exam_id?: string;
    download?: string;
    size?: number;
  }[];
  primary_guardian_id: string | null;
};

export type HomeworkItem = {
  id: string;
  subject: string;
  code: string;
  title: string;
  assigned_on: string;
  due_date: string;
  teacher: string | null;
  status: string;
  grade: string;
  remark: string;
};

/* ------------------------------------------------------------------------------------------------ admissions */

export type Stage = 'enquiry' | 'application' | 'assessment' | 'documents' | 'offer' | 'admitted';
export const STAGES: Stage[] = ['enquiry', 'application', 'assessment', 'documents', 'offer', 'admitted'];
export type Source = 'website' | 'walk_in' | 'referral' | 'social';

export type Tag =
  | { kind: 'call_back' | 'tour' | 'prospectus' | 'new'; date: string | null }
  | { kind: 'document_due' | 'document_pending'; what: string }
  | { kind: 'form_fee_paid' | 'book_assessment' | 'book_slot' | 'verified' }
  | { kind: 'scored'; score: number; out_of: number }
  | { kind: 'slot'; at: string }
  | { kind: 'fee_due' | 'reply_by'; date: string | null }
  | { kind: 'fee_paid'; receipt: string };

export type AppCard = {
  id: string;
  application_no: string;
  child: string;
  grade: string;
  source: Source;
  guardian: { name: string; initials: string };
  stage: Stage;
  date: string;
  date_is_slot: boolean;
  tag: Tag;
  approval_id: string | null;
  closed: boolean;
  student_id: string | null;
};

export type AppDetail = AppCard & {
  guardian_phone: string;
  academic_year: string;
  enquired_on: string | null;
  follow_up: string;
  follow_up_on: string | null;
  form_fee_paid: boolean;
  documents_verified: boolean;
  documents_pending: string;
  assessment_at: string | null;
  assessment_score: number | null;
  offer_made_on: string | null;
  offer_reply_by: string | null;
  offer_accepted_on: string | null;
  fee_due_on: string | null;
  fee_receipt_no: string;
  admitted_on: string | null;
  closed_reason: string;
  sibling: { id: string; name: string; class: string } | null;
  events: { id: string; action: string; from_stage: string; to_stage: string; note: string; actor: string | null; at: string }[];
};

export type Admissions = {
  cycle: { academic_year: string; enquiries_open_on: string; applications_close_on: string; session_starts_on: string } | null;
  awaiting_approval: number;
  updated_at: string | null;
  funnel: {
    enquiries: number;
    still_open: number;
    applications: number;
    application_rate: number | null;
    assessed: number;
    assessed_rate: number | null;
    offers: number;
    offer_rate: number | null;
    admitted: number;
    accepted_rate: number | null;
  };
  sources: { source: Source; count: number; percent: number | null }[];
  dates: {
    next_assessment: { date: string; children: number } | null;
    next_offer_round: { name: string; on: string } | null;
    applications_close_on: string;
  };
  seats: {
    rows: { id: string; label: string; grades: string[]; seats: number; admitted: number; open: number }[];
    seats: number;
    admitted: number;
    open: number;
    offers_outstanding: number;
  };
  columns: { stage: Stage; count: number; items: AppCard[] }[];
  facets: { grades: string[]; sources: Source[] };
  classes: { id: string; label: string; grade: string }[];
};

/* ------------------------------------------------------------------------------------------------ staff */

export type StaffToday =
  | { state: 'leave'; leave_kind: string; from_date: string; to_date: string }
  | { state: 'not_in' | 'absent' }
  | { state: 'present' | 'late'; at: string | null; late: boolean }
  | { state: 'substituting'; at: string | null; late: boolean; class: string; period: number; for: string | null }
  | { state: 'teaching'; at: string | null; late: boolean; class: string };

export type StaffRow = {
  id: string;
  name: string;
  initials: string;
  employee_id: string | null;
  role: string;
  subject: string | null;
  role_note: string;
  classes: { labels: string[]; grades: [string, string] | null; sections: number; class_teacher_of: string | null } | null;
  attendance: number | null;
  periods: number | null;
  over_cap: boolean;
  today: StaffToday;
  phone: string;
};

export type LeaveRequest = {
  id: string;
  user_id: string;
  name: string;
  initials: string;
  leave_kind: string;
  from_date: string;
  to_date: string;
  days: number;
  half_day: boolean;
  reason: string;
  created_at: string;
  decide_today: boolean;
  support: boolean;
};

export type StaffPage = {
  tab: 'teaching' | 'support';
  counts: { teaching: number; support: number };
  summary: { total: number; closes_at: string; term: { name: string; week: number } | null };
  kpis: {
    present: { count: number; of: number; percent: number | null; late: number; last_in: string | null };
    leave: { count: number; people: { id: string; initials: string; name: string }[]; uncovered: number };
    workload: { average: number | null; cap: number; over_cap: number };
    vacancies: {
      positions: number;
      applicants: number;
      items: {
        id: string;
        title: string;
        note: string;
        applicants: number;
        positions: number;
        opened_on: string;
        closes_on: string | null;
      }[];
    };
  };
  facets: { subjects: string[] };
  page: number;
  pages: number;
  page_size: number;
  total: number;
  highlight: string | null;
  items: StaffRow[];
  leave_week: {
    from: string;
    to: string;
    days: { date: string; approved: number; pending: number }[];
    today: { id: string; name: string; initials: string }[];
  };
  leave_requests: LeaveRequest[];
  trend: { days: { date: string; percent: number }[]; term_average: number | null; today: number | null };
};

export type StaffParams = {
  tab: 'teaching' | 'support';
  q: string;
  subject: string;
  today: string;
  page: number;
  person?: string;
  sort?: string;
};

function staffQuery(p: Partial<StaffParams>): string {
  const qs = new URLSearchParams();
  for (const key of ['tab', 'q', 'subject', 'today', 'person', 'sort'] as const) {
    const v = p[key];
    if (v) qs.set(key, v);
  }
  qs.set('page', String(p.page ?? 1));
  return qs.toString();
}

/* ------------------------------------------------------------------------------------------------ calls */

export const peopleApi = {
  directory: (p: Partial<DirectoryParams>) => http.get<Directory>(`/console/students?${directoryQuery(p)}`),
  addStudent: (body: Record<string, unknown>) => http.post<{ id: string; admission_no: string }>('/console/students', body),
  messageParents: (studentIds: string[], body: string) =>
    http.post<{ sent: number; skipped: number }>('/console/students/message', { student_ids: studentIds, body }),
  profile: (id: string, month?: string) => http.get<Profile>(`/console/students/${id}${month ? `?month=${month}` : ''}`),
  messageParent: (id: string, body: string, guardianId?: string) =>
    http.post<{ conversation_id: string; message_id: string | null; to: string }>(`/console/students/${id}/message`, {
      body,
      guardian_id: guardianId,
    }),
  addRemark: (id: string, body: { body: string; tone: string; visibility: string }) =>
    http.post<{ id: string }>(`/console/students/${id}/remarks`, body),
  feeReminder: (id: string) => http.post<{ sent_to: number; invoice: string }>(`/console/students/${id}/fee-reminder`),

  admissions: (p: { q?: string; grade?: string; source?: string }) => {
    const qs = new URLSearchParams();
    if (p.q) qs.set('q', p.q);
    if (p.grade) qs.set('grade', p.grade);
    if (p.source) qs.set('source', p.source);
    return http.get<Admissions>(`/console/admissions?${qs.toString()}`);
  },
  newEnquiry: (body: Record<string, unknown>) => http.post<AppCard>('/console/admissions', body),
  application: (id: string) => http.get<AppDetail>(`/console/admissions/${id}`),
  updateApplication: (id: string, body: Record<string, unknown>) => http.patch<AppDetail>(`/console/admissions/${id}`, body),
  move: (id: string, toStage: Stage) => http.post<AppDetail>(`/console/admissions/${id}/move`, { to_stage: toStage }),
  verify: (id: string) => http.post<AppDetail>(`/console/admissions/${id}/verify`),
  decide: (id: string, decision: 'approve' | 'decline', note = '') =>
    http.post<AppDetail>(`/console/admissions/${id}/decide`, { decision, note }),
  admit: (id: string, body: { receipt_no: string; class_id?: string }) => http.post<AppDetail>(`/console/admissions/${id}/admit`, body),
  close: (id: string, body: { reason?: string; reopen?: boolean }) => http.post<AppDetail>(`/console/admissions/${id}/close`, body),

  staff: (p: Partial<StaffParams>) => http.get<StaffPage>(`/console/staff?${staffQuery(p)}`),
  addStaff: (body: Record<string, unknown>) => http.post<{ id: string; employee_id: string }>('/console/staff', body),
  decideLeave: (requestId: string, decision: 'approve' | 'decline', note = '') =>
    http.post<{ status: string }>(`/console/staff/leave/${requestId}/decide`, { decision, note }),
};

export const useDirectory = (p: DirectoryParams) => useConsoleQuery(['people', 'students', p], () => peopleApi.directory(p));
export const useProfile = (id: string, month?: string) =>
  useConsoleQuery(['people', 'student', id, month ?? ''], () => peopleApi.profile(id, month), { enabled: !!id });
export const useAdmissions = (p: { q?: string; grade?: string; source?: string }) =>
  useConsoleQuery(['people', 'admissions', p], () => peopleApi.admissions(p));
export const useApplication = (id: string | null) =>
  useConsoleQuery(['people', 'application', id], () => peopleApi.application(id!), { enabled: !!id });
export const useStaff = (p: Partial<StaffParams>) => useConsoleQuery(['people', 'staff', p], () => peopleApi.staff(p));
