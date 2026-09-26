import { useMutation, useQueryClient } from '@tanstack/react-query';

import { http } from '@/api/client';
import { useConsoleQuery } from '@/features/console/api';

export type Person = { id: string; name: string; initials: string };

// ------------------------------------------------------------------ academics

export type SectionInfo = {
  id: string;
  section: string;
  label: string;
  class_teacher: Person | null;
  students: number;
  capacity: number;
  over: boolean;
};

export type GradeInfo = {
  grade: string;
  students: number;
  capacity: number;
  sections: SectionInfo[];
  gaps: string[];
  no_class_teacher: string[];
  over_capacity: string[];
};

export type AllocationGap = {
  key: string;
  grade: string;
  subject: { id: string; name: string; code: string };
  sections: { id: string; section: string; label: string }[];
  periods: number;
  periods_each: boolean;
  reason: 'vacant' | 'long_leave' | 'new_subject' | string;
  since: string | null;
  suggestion: (Person & { subjects: string[]; load: number; max: number }) | null;
};

export type Allocation = { required: number; staffed: number; unassigned: number; percent: number | null; gaps: AllocationGap[] };

export type SyllabusCell = { code: string; percent: number | null; planned: number | null; taught: boolean; behind?: boolean };

export type Syllabus = {
  subjects: { code: string; name: string }[];
  rows: { grade: string; cells: SyllabusCell[] }[];
  plan_to_date: number | null;
  alert: {
    grade: string;
    subject: { code: string; name: string };
    percent: number;
    planned: number;
    gap: number;
    exam_drop: { from_exam: string; exam: string; from: number; to: number; delta: number } | null;
    trailing: { code: string; name: string; grades: string }[];
  } | null;
};

export type HomeworkWeek = {
  week_start: string;
  week_end: string;
  limit: number;
  rows: { grade: string; per_section: number; average: number; total: number; over: boolean }[];
  over: string[];
  worst: { grade: string; per_section: number; busiest_day: string | null; busiest_count: number } | null;
  exam_soon: boolean;
};

export type AcademicsData = {
  today: string;
  term: { name: string; week: number } | null;
  teachers: number;
  next_exam: { name: string; date: string } | null;
  policy: { homework_limit: number; max_periods: number; section_capacity: number };
  structure: { students: number; sections: number; capacity: number; grades: GradeInfo[] };
  allocation: Allocation;
  syllabus: Syllabus;
  homework: HomeworkWeek;
};

export type SyllabusDetail = {
  grade: string;
  items: {
    section: string;
    subject: string;
    code: string;
    percent: number;
    planned: number | null;
    topic: string;
    teacher: string | null;
    updated_at: string;
  }[];
};

// ------------------------------------------------------------------ timetable

export type TimetableView = 'class' | 'teacher' | 'room';

export type TimetableCell = {
  weekday: number;
  period: number;
  subject: { id: string; code: string; name: string } | null;
  teacher: Person | null;
  room: string;
  class: { id: string; label: string };
  slot_id: string | null;
  draft: { batch: string; kind: 'swap' | 'change'; cleared: boolean } | null;
  clash: { kind: 'teacher' | 'room'; class: string; subject: string | null } | null;
  sub: { date: string; teacher: Person | null; for: Person | null; reason: string } | null;
  live?: { subject: string | null; teacher: Person | null; room: string };
};

export type BellRow =
  { kind: 'period'; period: number; starts_at: string; ends_at: string } | { kind: 'break' | 'lunch'; starts_at: string; ends_at: string };

export type DraftClash = {
  batch: string;
  kind: 'swap' | 'change';
  class: { id: string; label: string };
  weekday: number;
  period: number;
  date: string;
  starts_at: string;
  subject: string | null;
  code: string | null;
  teacher: Person | null;
  room: string;
  with: { kind: 'teacher' | 'room'; class: string; subject: string | null };
  from: { weekday: number; period: number } | null;
};

export type DraftSummary = {
  periods: number;
  batches: number;
  clashes: DraftClash[];
  held_batches: string[];
  publishable: number;
  live_since: string | null;
};

export type Option = { id: string; label: string };

export type TimetableData = {
  view: TimetableView;
  target: Option;
  meta: { class_teacher?: Person | null; room?: string | null; students?: number; periods: number; subjects?: string[] };
  options: { classes: Option[]; teachers: Option[]; rooms: Option[] };
  today: string;
  term: { name: string } | null;
  week: { start: string; end: string; days: { date: string; weekday: number; today: boolean; periods: number[] }[] };
  bells: { assembly: { starts_at: string; ends_at: string } | null; rows: BellRow[]; ends_by_day: Record<string, string | null> };
  now: { weekday: number; period: number } | null;
  cells: TimetableCell[];
  draft: DraftSummary;
  subjects: { id: string; code: string; name: string }[];
};

export type CoverItem = {
  slot_id: string;
  class: string;
  subject: string;
  code: string;
  period: number;
  starts_at: string;
  state: 'done' | 'now' | 'todo';
  minutes: number | null;
  for: { name: string; initials: string };
  suggestion: { id: string; name: string; initials: string } | null;
};

export type CoverData = {
  date: string;
  on_leave: { name: string; initials: string }[];
  items: CoverItem[];
  open: number;
  suggestions: number;
  day_over: boolean;
};

export type FreeSlots = {
  subject: string;
  from: { weekday: number; period: number };
  items: { weekday: number; period: number; starts_at: string; subject: string; teacher: Person | null }[];
};

// ------------------------------------------------------------------ exams

export type CellState = 'not_started' | 'progress' | 'review' | 'submitted' | 'published';

export type MatrixCell = {
  code: string;
  state: CellState | null;
  sections?: string[];
  date?: string | null;
  note?: { kind: 'reopened'; count: number } | { kind: 'text'; text: string };
  sheet_ids?: string[];
  entered?: number;
  total?: number;
  teacher_on_leave?: boolean;
  due?: string | null;
};

export type Matrix = {
  subjects: { code: string; name: string }[];
  rows: { grade: string; cells: MatrixCell[]; published: number; total: number }[];
  counts: Record<CellState, number>;
  papers: number;
  grades: string;
  complete: string[];
  max_marks: number | null;
};

export type CheckItem =
  | { key: 'grading'; state: 'ok' | 'fail'; weightage: number | null; term: string | null }
  | { key: 'template'; state: 'ok' | 'fail'; by?: string | null; by_id?: string | null; on?: string }
  | { key: 'submitted'; state: 'ok' | 'warn'; done: number; total: number; progress: number; not_started: number }
  | { key: 'moderation'; state: 'ok' | 'warn'; corrections: number; first: string | null; sheets: number }
  | { key: 'remarks'; state: 'ok' | 'todo'; done: number; total: number; grades: string }
  | { key: 'notify'; state: 'ok' | 'todo'; at: string | null };

export type Checklist = {
  items: CheckItem[];
  ok: number;
  total: number;
  failures: string[];
  release: { papers: number; sheets: number; held: number };
  can_publish: boolean;
};

export type Correction = {
  id: string;
  approval_id: string;
  teacher: Person | null;
  class: string;
  subject: string;
  sent_at: string;
  published_on: string | null;
  reason: string;
  entries: {
    index: number;
    student: string;
    roll_no: number | null;
    from: number;
    to: number;
    note: string;
    decision: 'accept' | 'reject' | null;
  }[];
};

export type Moderation = {
  count: number;
  corrections: Correction[];
  sheets: { id: string; class: string; subject: string; note: string }[];
};

export type Trend = {
  grade: string;
  subject: { code: string; name: string };
  delta: number;
  exams: string[];
  grade_points: (number | null)[];
  school_points: (number | null)[];
  sections: { label: string; id: string; from: number; to: number; delta: number }[];
  syllabus: { percent: number | null; planned: number | null };
};

export type Upcoming = {
  name: string;
  first: string;
  last: string;
  days: number;
  grades: string;
  in_class: string[];
  per_room: number;
  strip: { date: string; subjects: string[]; senior_only: boolean }[];
  rows: {
    key: string;
    date: string;
    grades: string;
    subject: { code: string; name: string };
    starts_at: string;
    ends_at: string;
    rooms: number;
    needed: number;
    assigned: number;
    status: 'complete' | 'short' | 'none';
  }[];
  papers: number;
};

export type ExamsData = {
  today: string;
  terms: { name: string; starts_on: string; ends_on: string }[];
  term: string | null;
  academic_year: string | null;
  series: string | null;
  matrix: Matrix | null;
  checklist: Checklist | null;
  moderation: Moderation | null;
  trend: Trend | null;
  upcoming: Upcoming | null;
};

export const academicsApi = {
  academics: () => http.get<AcademicsData>('/console/academics'),
  syllabus: (grade: string) => http.get<SyllabusDetail>(`/console/academics/syllabus?grade=${encodeURIComponent(grade)}`),
  allocate: (body: { subject_id: string; class_group_ids: string[]; teacher_id: string }) =>
    http.post<Allocation>('/console/academics/allocate', body),
  notifyHomework: (grades?: string[]) => http.post<{ sent_to: number }>('/console/academics/homework/notify', { grades }),

  timetable: (view: TimetableView, id: string | undefined, week: string | undefined) => {
    const q = new URLSearchParams({ view });
    if (id) q.set('id', id);
    if (week) q.set('week', week);
    return http.get<TimetableData>(`/console/timetable?${q.toString()}`);
  },
  draftChange: (body: {
    class_id: string;
    weekday: number;
    period: number;
    subject_id: string | null;
    teacher_id?: string | null;
    room?: string;
  }) => http.post<DraftSummary>('/console/timetable/draft', body),
  draftSwap: (body: { class_id: string; weekday: number; period: number; to_weekday: number; to_period: number }) =>
    http.post<DraftSummary>('/console/timetable/draft/swap', body),
  undoDraft: (batch: string) => http.del<DraftSummary>(`/console/timetable/draft/${batch}`),
  freeSlots: (batch: string) => http.get<FreeSlots>(`/console/timetable/draft/${batch}/free-slots`),
  moveDraft: (batch: string, weekday: number, period: number) =>
    http.post<DraftSummary>(`/console/timetable/draft/${batch}/free-slots`, { weekday, period }),
  publishTimetable: () => http.post<{ applied: number; held: number; notified: number }>('/console/timetable/publish'),
  cover: () => http.get<CoverData>('/console/timetable/cover'),
  assignCover: (body: { slot_id: string; teacher_id: string } | { all: true }) => http.post<CoverData>('/console/timetable/cover', body),

  exams: (term?: string) => http.get<ExamsData>(`/console/exams${term ? `?term=${encodeURIComponent(term)}` : ''}`),
  publishResults: (series: string) =>
    http.post<{ published: number; sections: number; notified: number }>('/console/exams/publish', { series }),
  seriesAction: (series: string, action: 'lock_grading' | 'approve_template') =>
    http.post<{ ok: boolean }>('/console/exams/series', { series, [action]: true }),
  decideEntry: (correction: string, index: number, decision: 'accept' | 'reject') =>
    http.post<Moderation>(`/console/exams/corrections/${correction}/entries/${index}`, { decision }),
  approveAll: (series: string) => http.post<Moderation>('/console/exams/corrections/approve-all', { series }),
  moderateSheet: (id: string) => http.post<Moderation>(`/console/exams/sheets/${id}/moderate`),
  assignInvigilators: () => http.post<{ added: number; teachers: number }>('/console/exams/invigilators'),
  messageTeachers: (body: { grade: string; subject_code: string; body: string }) =>
    http.post<{ sent_to: number }>('/console/exams/message', body),
};

export function useAcademics() {
  return useConsoleQuery(['academics'], academicsApi.academics);
}

export function useTimetable(view: TimetableView, id: string | undefined, week: string | undefined) {
  return useConsoleQuery(['timetable', view, id ?? '', week ?? ''], () => academicsApi.timetable(view, id, week));
}

export function useCover() {
  return useConsoleQuery(['timetable-cover'], academicsApi.cover, { refetchInterval: 60_000 });
}

export function useExams(term?: string) {
  return useConsoleQuery(['exams', term ?? ''], () => academicsApi.exams(term));
}

/** A mutation that refreshes every console query when it succeeds. */
export function useConsoleMutation<A, R>(fn: (args: A) => Promise<R>, onSuccess?: (result: R, args: A) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result, args) => {
      void qc.invalidateQueries({ queryKey: ['console'] });
      onSuccess?.(result, args);
    },
  });
}
