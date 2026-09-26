/** Types for the EduFlow API (backend/apps/*). Keep in sync with the Django payloads. */

export type Role =
  | 'parent'
  | 'student'
  | 'teacher'
  | 'principal'
  | 'admin'
  | 'accountant'
  | 'transport_manager'
  | 'driver'
  | 'attendant';

export type School = {
  id: string;
  code: string;
  name: string;
  short_name: string;
  initials: string;
  kind: 'school' | 'junior_college' | 'college';
  city: string;
  branding: { primary_color: string; accent_color: string; logo_url: string | null };
  campus?: string | null;
  address?: string | null;
  academic_year?: string | null;
  term?: string | null;
  contacts?: { office?: string; transport?: string };
  languages: string[];
};

export type User = {
  id: string;
  full_name: string;
  first_name: string;
  initials: string;
  phone: string;
  email?: string | null;
  language: string;
  preferences?: Preferences;
  /** EduFlow platform staff: they manage schools at /platform and may belong to none. */
  platform?: boolean;
  /** Signed in with a temporary password: they must choose their own before anything else. */
  must_change_password?: boolean;
};

export type Preferences = {
  channels: { push: boolean; sms: boolean; whatsapp: boolean; email: boolean };
  alerts: { not_in_by: boolean; late_arrival: boolean };
};

export type MembershipRole = { role: Role; title: string; department: string | null };
export type Membership = { school: School; roles: MembershipRole[] };

export type OtpChallenge = { challenge_id: string; expires_in: number; resend_in: number; dev_code?: string };
export type AuthSession = { access: string; refresh: string; user: User; memberships: Membership[] };

export type StudentCard = {
  id: string;
  name: string;
  first_name: string;
  initials: string;
  admission_no: string;
  roll_no: number;
  class: { id: string; label: string; short_label: string };
  photo_url: string | null;
  house?: string | null;
};

export type CheckIn = { status: AttendanceStatus; at: string | null; source: 'bus' | 'register'; note: string } | null;

export type ChildDetail = StudentCard & {
  class_teacher: string | null;
  today: CheckIn;
  month: { present: number; school_days: number; absent: number; late: number };
  latest_exam: { name: string; percent: number; grade: string } | null;
  transport: { mode: 'bus'; bus: string; stop: string } | { mode: 'walking' };
  next_invoice: { id: string; title: string; amount: string; due_date: string } | null;
};

export type RibbonPeriod = {
  kind: 'period';
  period: number;
  state: 'done' | 'now' | 'todo';
  subject: string;
  short: string;
  code: string;
  color: string;
  teacher: string | null;
  room: string;
  note: string;
  starts_at: string;
  ends_at: string;
};
export type DayRibbon = {
  date: string;
  cells: (RibbonPeriod | { kind: 'break'; starts_at: string; ends_at: string })[];
  current: RibbonPeriod | null;
  next: RibbonPeriod | null;
  starts_at: string | null;
  ends_at: string | null;
  periods: number;
};
export type HomeTime = {
  bus: string;
  route: string;
  stop: string;
  scheduled_at: string;
  eta_at: string;
  delay_minutes: number;
  trip_status: string | null;
} | null;

export type BusSummary =
  | { enrolled: false }
  | {
      enrolled: true;
      route_name: string;
      vehicle_label: string | null;
      pickup_stop: string;
      drop_stop: string;
      pickup_stop_id: string;
      drop_stop_id: string;
      status: 'active' | 'scheduled' | 'done';
      trip_id: string | null;
      direction?: 'pickup' | 'drop';
      stop_name?: string;
      my_stop_status?: StopStatus | null;
      eta_seconds?: number | null;
      signal?: Signal;
      next_stop?: string | null;
      scheduled_start?: string;
      absent?: boolean;
    };

export type StudentSummary = {
  student: StudentCard;
  attendance: { today: AttendanceStatus | 'not_marked'; term_percent: number | null };
  fees: { total_due: string; next_due_date: string | null; overdue: boolean };
  homework: { pending: number; next: { id: string; title: string; subject: string; due_date: string } | null };
  bus: BusSummary;
  latest_remark: {
    id: string;
    body: string;
    tone: 'positive' | 'concern' | 'info';
    author: string;
    author_id: string;
    author_initials: string;
    created_at: string;
  } | null;
  latest_result: { exam: string; percent: number; grade: string } | null;
  trend: { exam: string; percent: number }[];
  today: { check_in: CheckIn; ribbon: DayRibbon; home: HomeTime };
  next_invoice: { id: string; title: string; amount: string; due_date: string; heads: string[] } | null;
  next_event: {
    id: string;
    title: string;
    body: string;
    kind: string;
    starts_at: string;
    ends_at: string | null;
    location: string;
  } | null;
};

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'excused';
export type LeaveApplication = {
  id: string;
  from_date: string;
  to_date: string;
  kind: 'sick' | 'family' | 'other';
  reason: string;
  half_day: boolean;
  status: 'pending' | 'approved' | 'declined';
  decided_by: string | null;
  decided_at: string | null;
};
export type AttendanceDay = {
  date: string;
  status: AttendanceStatus | 'holiday' | 'not_marked' | 'upcoming';
  note?: string;
  leave?: {
    id: string;
    status: LeaveApplication['status'];
    reason: string;
    kind: string;
    half_day: boolean;
    applied_by: string | null;
    decided_by: string | null;
  } | null;
};
export type AttendanceMonth = {
  month: string;
  days: AttendanceDay[];
  summary: { school_days: number; present: number; absent: number; late: number; percent: number | null };
  year?: { school_days: number; present: number; percent: number | null };
};

export type Homework = {
  id: string;
  title: string;
  description: string;
  subject: { id: string; name: string; color: string; code?: string; short?: string };
  class: { id: string; label: string };
  assigned_on: string;
  due_date: string;
  overdue: boolean;
  accepts_photos: boolean;
  assigned_by: string | null;
  assigned_by_id?: string | null;
  attachments?: { id: string; name: string; size: number; url: string }[];
  signed?: { at: string; by: string } | null;
  flagged_by?: string | null;
  due_period?: { period: number; starts_at: string } | null;
  submission: {
    id: string;
    status: 'submitted' | 'reviewed' | 'redo';
    submitted_at: string;
    teacher_remark: string;
    grade?: string;
    in_notebook?: boolean;
    checked_copy?: string | null;
    photos: string[];
  } | null;
  counts?: { submitted: number; reviewed: number };
};

export type Invoice = {
  id: string;
  title: string;
  category: string;
  amount: string;
  paid_amount: string;
  balance: string;
  due_date: string;
  status: 'paid' | 'partial' | 'due' | 'overdue';
  gst_exempt: boolean;
  items?: { head: string; amount: string }[];
};
export type Receipt = {
  id: string;
  invoice_id: string;
  invoice_title: string;
  amount: string;
  status: 'created' | 'succeeded' | 'failed';
  receipt_no: string | null;
  paid_at: string | null;
  gateway: string;
  method?: string | null;
  download?: string | null;
};
export type StudentFees = {
  year?: { total: string; paid: string; due_soon: string; due_soon_by: string | null; later: string };
  total_due: string;
  overdue: boolean;
  next_due_date: string | null;
  invoices: Invoice[];
  receipts: Receipt[];
};
export type Checkout = {
  payment_id: string;
  gateway: 'mock' | 'razorpay' | string;
  amount: string;
  order: { order_id: string; amount_paise: number; currency: string; key_id?: string };
};

export type SubjectResult = {
  subject: string;
  code?: string;
  teacher?: string | null;
  color: string;
  marks: number;
  max_marks: number;
  percent: number;
  grade: string;
  class_average: number | null;
};
export type ExamResult = {
  id: string;
  name: string;
  held_on: string;
  published_on?: string | null;
  total: number;
  max_total: number;
  percent: number;
  grade: string;
  class_average?: number | null;
  class_average_grade?: string | null;
  note?: { body: string; author: string | null; on?: string } | null;
  subjects: SubjectResult[];
};
export type Results = {
  student: { id: string; name: string; class?: string; roll_no?: number; admission_no?: string };
  school?: { name: string; principal: string | null };
  class_teacher?: string | null;
  exams: ExamResult[];
  upcoming?: { id: string; name: string; held_on: string; results_on: string | null }[];
  trend: { exam: string; percent: number }[];
  subjects: { subject: string; points: { exam: string; percent: number }[] }[];
};

export type Period = {
  period: number;
  starts_at: string;
  ends_at: string;
  subject: string;
  short?: string;
  code?: string;
  color: string;
  teacher?: string | null;
  room: string;
  note?: string;
  class?: { id: string; label: string };
};
export type Timetable = {
  class: string;
  today: number;
  days: { weekday: number; name: string; periods: Period[] }[];
};

export type Remark = {
  id: string;
  body: string;
  tone: 'positive' | 'concern' | 'info';
  visibility?: 'family' | 'staff';
  author: string;
  author_id?: string;
  author_initials?: string;
  author_subject?: string | null;
  author_is_class_teacher?: boolean;
  created_at: string;
  requires_ack?: boolean;
  acknowledged_at?: string | null;
  homework?: { id: string; title: string; due_date: string } | null;
};

export type DocumentItem = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  size: number | null;
  date: string | null;
  amount?: string;
  download: string;
};
export type StudentDocuments = {
  report_cards: DocumentItem[];
  receipts: DocumentItem[];
  circulars: DocumentItem[];
  certificates: {
    kind: 'bonafide' | 'character' | 'study' | 'transfer';
    title: string;
    state: 'available' | 'requested' | 'ready' | 'declined' | 'locked';
    requested_on: string | null;
    document: DocumentItem | null;
  }[];
  issued: DocumentItem[];
  total: number;
};

export type Meeting = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string;
  status: 'requested' | 'booked' | 'cancelled';
  created_at: string;
  calendar: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  kind: 'general' | 'event' | 'holiday' | 'exam' | 'transport' | 'safety';
  audience: string;
  requires_ack: boolean;
  acknowledged: boolean;
  published_at: string;
  author: string | null;
  event?: { starts_at: string; ends_at: string | null; location: string } | null;
  scheduled?: boolean;
  channels?: BroadcastChannel[];
  attachment?: { name: string; size: number; url: string } | null;
  audience_label?: string;
};

export type NotificationCategory =
  | 'bus'
  | 'safety'
  | 'attendance'
  | 'homework'
  | 'fees'
  | 'results'
  | 'chat'
  | 'announcement'
  | 'general';
export type AppNotification = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  data: Record<string, string | number | null | undefined>;
  priority: 'normal' | 'high' | 'critical';
  created_at: string;
  read: boolean;
};

// ---------------------------------------------------------------- transport

export type Signal = 'none' | 'live' | 'weak' | 'lost';
export type StopStatus = 'departed' | 'at_stop' | 'next' | 'upcoming' | 'skipped';
export type TripStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
  status: StopStatus;
  eta_seconds: number | null;
  scheduled_time: string;
  arrived_at: string | null;
};
export type TripLive = {
  trip_id: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  direction: 'pickup' | 'drop';
  service_date: string;
  scheduled_start: string;
  route: { id: string; code: string; name: string };
  vehicle: { label: string; registration_no: string } | null;
  crew: { driver: string | null; attendant: string | null };
  started_at: string | null;
  ended_at: string | null;
  position: { lat: number; lng: number; heading: number | null; speed_kmh: number | null; recorded_at: string } | null;
  signal: Signal;
  last_update_seconds: number | null;
  progress: { distance_m: number; total_m: number };
  next_stop: TripStop | null;
  stops: TripStop[];
  delay_minutes: number | null;
  arrived_at_school: string | null;
  generated_at: string;
  staff?: { offset_m: number; off_route: boolean; empty_check_confirmed_at: string | null; auto_closed: boolean };
};
export type RouteShape = {
  id: string;
  code: string;
  name: string;
  direction: 'pickup' | 'drop';
  length_m: number;
  path: [number, number][];
  stops: { id: string; name: string; lat: number; lng: number; order: number }[];
  school_stop_id: string | null;
};
export type TransportTrip = {
  trip_id: string;
  direction: 'pickup' | 'drop';
  status: TripLive['status'];
  scheduled_start: string;
  absent: boolean;
  my_stop_eta_seconds: number | null;
  my_stop_status?: StopStatus | null;
  signal: Signal;
  next_stop: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  boarded_at?: string | null;
  dropped_at?: string | null;
};
export type StudentTransport =
  | { enrolled: false }
  | {
      enrolled: true;
      route: { id: string; code: string; name: string };
      vehicle: { label: string; registration_no: string } | null;
      crew: { driver: string | null; attendant: string | null; driver_name?: string | null; attendant_name?: string | null };
      call_number?: string | null;
      pickup_stop: { id: string; name: string; lat: number; lng: number; time: string };
      drop_stop: { id: string; name: string; lat: number; lng: number; time: string };
      today: TransportTrip[];
      alert_minutes: number;
      alert_choices: number[];
      absences: { date: string; direction: 'pickup' | 'drop' | 'both' }[];
    };

export type DriverTrip = {
  id: string;
  direction: 'pickup' | 'drop';
  status: TripLive['status'];
  scheduled_start: string;
  route: { id: string; code: string; name: string };
  vehicle: { label: string; registration_no: string } | null;
  riders: number;
  absent: number;
  next_stop: TripStop | null;
  signal: Signal;
  stops_total: number;
  stops_done: number;
};
export type RosterStudent = {
  id: string;
  name: string;
  initials: string;
  class_label: string;
  absent: boolean;
  boarded_at: string | null;
  dropped_at: string | null;
  no_show_at: string | null;
};
export type Roster = {
  trip_id: string;
  direction: 'pickup' | 'drop';
  stops: { id: string; name: string; order: number; students: RosterStudent[] }[];
};
export type PositionFix = {
  client_id: string;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  recorded_at: string;
};
export type IngestResult = {
  received: number;
  stored: number;
  accepted: number;
  rejected_future: number;
  events: string[];
  next_stop: TripStop | null;
  signal: Signal;
};

// ---------------------------------------------------------------- chat

export type ChatContact = {
  kind: 'user' | 'department' | 'colleague';
  user_id?: string;
  department?: string;
  name: string;
  initials: string;
  subtitle: string;
  student: { id: string; name: string; first_name: string } | null;
};
export type Conversation = {
  id: string;
  kind: 'direct' | 'department';
  department?: string | null;
  title: string;
  subtitle: string;
  initials: string;
  student: { id: string; name: string; first_name: string } | null;
  unread: number;
  last_message: { body: string; at: string; mine: boolean } | null;
  office_hours: { text: string; open_now: boolean } | null;
  can_send: boolean;
  counterpart?: 'parent' | 'student' | 'staff' | 'colleague' | 'office';
  pending_meeting?: Meeting | null;
};
export type ChatMessage = {
  id: string;
  client_id: string;
  conversation_id: string;
  body: string;
  deleted: boolean;
  created_at: string;
  sender: { id: string; name: string; initials: string };
  mine: boolean;
  attachment?: { name: string; size: number; download: string } | null;
  pending?: boolean;
  failed?: boolean;
};

// ---------------------------------------------------------------- teacher

export type TeacherClass = {
  id: string;
  label: string;
  short_label: string;
  is_class_teacher: boolean;
  subjects: { id: string; name: string }[];
  student_count: number;
  attendance_marked_today: boolean;
};
export type RosterEntry = {
  id: string;
  name: string;
  initials: string;
  roll_no: number;
  status: AttendanceStatus | null;
};
export type ClassRoster = {
  class: { id: string; label: string; short_label: string };
  date: string;
  marked: boolean;
  marked_at: string | null;
  cutoff: string;
  locked: boolean;
  students: RosterEntry[];
};
export type AttendanceSummary = {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  excused: number;
};
export type Submissions = {
  homework: Homework;
  students: {
    id: string;
    name: string;
    initials: string;
    submission: NonNullable<Homework['submission']> | null;
  }[];
};

export type RealtimeConnection =
  | { enabled: false; poll_interval_seconds: number }
  | {
      enabled: true;
      url: string;
      token: string;
      expires_in: number;
      personal_channel: string;
      poll_interval_seconds: number;
    };
export type TripSubscription =
  | { enabled: false; poll_interval_seconds: number }
  | { enabled: true; channel: string; token: string; expires_in: number };

export type TransportDashboard = {
  date: string;
  trips: DriverTrip[];
  vehicles: {
    id: string;
    label: string;
    registration_no: string;
    last_seen_at: string | null;
    compliance: { gps_tracker: boolean; panic_button: boolean; cctv: boolean; speed_governor: boolean; documents_expiring: string[] };
  }[];
  open_incidents: { id: string; kind: string; at: string; trip_id: string; details: Record<string, unknown> }[];
};

// ---------------------------------------------------------------- student app

export type SubjectRef = { id: string; name: string; code: string; short: string; color: string };

export type IdCard = {
  house: string | null;
  date_of_birth: string | null;
  bus: { route: string; stop: string } | null;
  valid_till: string | null;
  academic_year: string | null;
  principal: string | null;
  guardian: string | null;
  qr: string;
};

export type StudyMaterial = {
  id: string;
  kind: 'notes' | 'video' | 'slides' | 'worksheet' | 'map';
  title: string;
  description: string;
  subject: SubjectRef;
  author: string | null;
  published_at: string;
  size: number;
  pages: number | null;
  duration_minutes: number | null;
  url: string | null;
  download: string | null;
  new: boolean;
};
export type Materials = { items: StudyMaterial[]; new_total: number; subjects: (SubjectRef & { new: number })[] };

export type ClassSubject = {
  subject: SubjectRef;
  teacher: string;
  teacher_id: string;
  is_class_teacher: boolean;
  now: { ends_at: string; room: string } | null;
  next: { date: string; weekday: string; starts_at: string; room: string } | null;
  syllabus: number | null;
  current_topic: string;
  new_materials: number;
  periods_per_week: number;
};
export type StudentClasses = { class: string; subjects: ClassSubject[]; new_total: number; syllabus_average: number | null; today: string };

export type AssignmentItem = {
  id: string;
  kind: 'project' | 'assignment';
  title: string;
  description: string;
  teaser: string;
  subject: SubjectRef;
  teacher: string | null;
  teacher_id: string | null;
  group_size: number;
  max_marks: number;
  rubric: { key: string; label: string; max: number }[];
  opens_on: string | null;
  locked: boolean;
  due_date: string;
  group: { id: string; members: { id: string; name: string; first_name: string; initials: string; me: boolean }[] } | null;
  milestones: {
    id: string;
    progress_id: string | null;
    title: string;
    due_date: string;
    done_at: string | null;
    owners: { id: string; first_name: string; me: boolean }[];
  }[];
  submission: {
    id: string;
    status: 'submitted' | 'graded' | 'redo';
    submitted_at: string;
    total: number | null;
    grade: string;
    feedback: string;
    graded_by: string | null;
    graded_at: string | null;
    files: { id: string; name: string; size: number }[];
  } | null;
};
export type StudentAssignments = { in_progress: AssignmentItem[]; graded: AssignmentItem[]; upcoming: AssignmentItem[] };

export type StudentExams = {
  exam: {
    id: string;
    name: string;
    starts_on: string;
    ends_on: string;
    report_by: string | null;
    results_on: string | null;
    admit_cards_from: string | null;
    admit_card_available: boolean;
    datesheet: string;
    admit_card: string;
    released_by: string | null;
  } | null;
  papers?: { id: string; subject: { name: string; code: string; color: string }; date: string; starts_at: string; ends_at: string; room: string; syllabus: string[] }[];
  prep?: { id: string; title: string; due_date: string; done_at: string | null }[];
  student?: { name: string; class: string; roll_no: number };
};

// ---------------------------------------------------------------- staff app (Phase 4)

export type ClassRef = { id: string; short_label: string };

export type DayCell =
  | { kind: 'break' | 'lunch'; starts_at: string; ends_at: string }
  | {
      kind: 'class' | 'cover' | 'covered' | 'free';
      period: number;
      starts_at: string;
      ends_at: string;
      state: 'done' | 'now' | 'todo';
      class?: ClassRef;
      subject?: string;
      room?: string;
      is_my_class?: boolean;
      note?: string;
      covered_by?: string;
      cover?: CoverInfo;
    };
export type PeriodCell = Extract<DayCell, { period: number }>;
export type CoverInfo = {
  id: string;
  for: string | null;
  for_first_name: string | null;
  reason: string;
  assigned_by: string | null;
  assigned_at: string;
  note: string;
  note_at: string | null;
};
export type TeacherDay = {
  date: string;
  weekday: number;
  cells: DayCell[];
  counts: { classes: number; covers: number; free: number };
  current: PeriodCell | null;
  next: PeriodCell | null;
  starts_at: string | null;
  ends_at: string | null;
};

export type RegisterToday = {
  class: ClassRef;
  marked: boolean;
  marked_at: string | null;
  total: number;
  present: number;
  on_time: number;
  absent: { id: string; roll_no: number; name: string; first_name: string; status: string }[];
  late: { id: string; roll_no: number; name: string; first_name: string; status: string }[];
  rolls: { id: string; roll_no: number; status: AttendanceStatus | null }[];
};

export type MarkSheetCard = {
  id: string;
  exam: { id: string; name: string; held_on: string };
  subject: { id: string; name: string; code: string };
  class: ClassRef;
  max_marks: number;
  due_on: string | null;
  status: 'open' | 'submitted' | 'published';
  saved_at: string | null;
  submitted_at: string | null;
  entered: number;
  total: number;
  average: number | null;
  percent: number | null;
  grade: string | null;
};
export type MarkSheetDetail = MarkSheetCard & {
  editable: boolean;
  students: { id: string; roll_no: number; name: string; absent: boolean; marks: number | null; percent: number | null; grade: string | null }[];
  errors?: Record<string, string>;
};

export type StaffHome = {
  now: string;
  day: TeacherDay;
  tomorrow: (PeriodCell & { date: string; due: string | null }) | null;
  pile: { id: string; title: string; description: string; class: ClassRef; due_date: string; to_review: number; total_to_review: number } | null;
  register: RegisterToday | null;
  marks: MarkSheetCard | null;
  notice: {
    id: string;
    title: string;
    body: string;
    kind: string;
    author: string | null;
    author_initials: string;
    published_at: string;
    requires_ack: boolean;
    acknowledged: boolean;
  } | null;
  parents: { count: number; names: string[]; initials: string[] };
  ptm: { count: number; date: string | null; title: string | null };
  covers_done: { class: string; subject: string }[];
  casual_left: number;
};

export type StaffClassCard = {
  id: string;
  label: string;
  short_label: string;
  is_class_teacher: boolean;
  student_count: number;
  subject: { id: string; name: string; code: string; short: string } | null;
  room: string;
  periods_per_week: number;
  syllabus: number | null;
  current_topic: string;
  today: RegisterToday;
  exams: { id: string; name: string; average: number }[];
  open_sheet: MarkSheetCard | null;
};

export type StaffTimetable = {
  today: string;
  week: string[];
  periods_this_week: number;
  covers_this_week: number;
  classes: string[];
  day: TeacherDay;
};

export type LeaveKind = 'casual' | 'sick' | 'earned';
export type LeaveBalance = { kind: LeaveKind; allowed: number; used: number; pending: number; left: number };
export type StaffLeaveRequest = {
  id: string;
  kind: LeaveKind;
  from_date: string;
  to_date: string;
  half_day: boolean;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  created_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string;
  certificate_name: string;
};
export type StaffLeave = {
  year: { name: string; starts_on: string; ends_on: string } | null;
  approver: string | null;
  balances: LeaveBalance[];
  periods_by_weekday: number[];
  requests: StaffLeaveRequest[];
};

export type StaffMe = {
  profile: { employee_id: string; designation: string; joined_on: string | null };
  classes: { id: string; short_label: string; is_class_teacher: boolean }[];
  leave: LeaveBalance[];
  pending_leave: number;
  periods_per_week: number;
  office_hours: { days: number[]; start: string; end: string } | null;
};

export type StaffDocument = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  size: number;
  ext: string;
  date: string;
  status: 'submitted' | 'accepted' | 'in_review' | 'verified' | null;
  locked: boolean;
  locked_until: string | null;
  subject: string | null;
  owner: string | null;
  mine: boolean;
  new: boolean;
  download: string | null;
};
export type StaffDocuments = { sections: { key: string; items: StaffDocument[] }[] };

export type StaffStudent = {
  student: { id: string; name: string; first_name: string; initials: string; class: string; roll_no: number; admission_no: string; house: string | null; bus: string | null };
  position: { index: number; total: number; previous: string | null; next: string | null };
  is_class_teacher: boolean;
  guardian: { user_id: string; name: string; initials: string; relationship: string; phone: string } | null;
  subject: { name: string; exams: { name: string; percent: number; class_average: number | null }[] } | null;
  attendance: AttendanceMonth;
  homework: { handed_in: number; total: number; cells: boolean[] };
  remarks: (Remark & { mine: boolean })[];
};

export type TeacherHomework = Homework & { class: ClassRef & { label: string }; class_size: number; open: boolean; counts: { submitted: number; to_review: number } };

export type RubricItem = { key: string; label: string; hint?: string; max: number };
export type AssignmentCard = {
  id: string;
  title: string;
  description: string;
  kind: 'project' | 'assignment';
  subject: SubjectRef;
  class: ClassRef;
  group_size: number;
  max_marks: number;
  rubric: RubricItem[];
  due_date: string;
  days_left: number;
  counts: { to_review: number; graded: number; redo: number; missing: number; expected: number };
};
export type ReviewSubmission = {
  id: string;
  status: 'submitted' | 'graded' | 'redo';
  submitted_at: string;
  student: { id: string; name: string; first_name: string; initials: string } | null;
  members: string[];
  files: { id: string; name: string; size: number; url: string }[];
  scores: Record<string, number>;
  total: number | null;
  grade: string;
  feedback: string;
  graded_at: string | null;
};
export type AssignmentReview = {
  assignment: AssignmentCard;
  to_review: ReviewSubmission[];
  graded: ReviewSubmission[];
  missing: { id: string; name: string; initials: string; roll_no: number }[];
};

// ---------------------------------------------------------------- principal (Phase 5)

export type BroadcastChannel = 'push' | 'in_app' | 'sms' | 'whatsapp' | 'email';

export type GradeRegister = { grade: string; label?: string; total: number; present: number; late: number; absent: number; percent: number | null };
export type SchoolRegister = {
  total: number;
  marked_total: number;
  present: number;
  late: number;
  absent: number;
  percent: number | null;
  sections: number;
  sections_marked: number;
  last_marked_at: string | null;
  by_grade: GradeRegister[];
};

export type CoverBoard = {
  date: string;
  on_leave: { id: string; name: string; initials: string; subject: string | null; leave_kind: string; uncovered: number }[];
  periods: {
    period: number;
    starts_at: string;
    ends_at: string;
    state: 'done' | 'now' | 'todo';
    slots: { id: string; class: string; subject: string; room: string; teacher: string; covered_by: string | null }[];
    open: number;
    free: { id: string; name: string; subject: string | null }[];
  }[];
  open: number;
  free_teachers: number;
};

export type ApprovalKind = 'leave' | 'marks' | 'refund' | 'admission' | 'attendance';
export type LeaveDetails = {
  person: { id: string; name: string; initials: string; subject: string | null };
  from_date: string;
  to_date: string;
  days: number;
  half_day: boolean;
  leave_kind: 'casual' | 'sick' | 'earned';
  reason: string;
  cover_periods: number;
  allowed: number;
  left_after: number;
  certificate: { name: string; url: string } | null;
};
export type MarksDetails = {
  exam: string;
  subject: string;
  class: string;
  out_of: number;
  entries: { student: string; roll_no: number | null; from: number; to: number; note: string }[];
  reason: string;
  checked_by: string | null;
  average_before: number;
  average_after: number;
};
export type RefundDetails = {
  student: { name: string; initials: string; class: string };
  asked_by: string | null;
  relationship: string | null;
  amount: string;
  fee_head: string;
  paid_on: string | null;
  method: string;
  receipt_no: string | null;
  reason: string;
};
export type AdmissionDetails = {
  child: string;
  grade: string;
  academic_year: string;
  application_no: string;
  documents_verified: boolean;
  interaction_on: string | null;
  sibling: { name: string; class: string } | null;
  seats_left: number | null;
};
export type AttendanceFixDetails = { class: string; date: string; reason: string; entries: { student: string; from: string; to: string }[] };
export type ApprovalItem = {
  id: string;
  kind: ApprovalKind;
  status: 'pending' | 'approved' | 'declined' | 'sent_back' | 'withdrawn';
  summary: string;
  due_on: string | null;
  created_at: string;
  requested_by: { id: string; name: string; initials: string } | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string;
  undo_until: string | null;
  details: LeaveDetails | MarksDetails | RefundDetails | AdmissionDetails | AttendanceFixDetails;
};
export type ApprovalTray = { total: number; counts: Record<ApprovalKind, number>; items: ApprovalItem[] };

export type PrincipalPulse = {
  now: string;
  register: SchoolRegister;
  lowest: { grade: string; percent: number; section: string | null; section_percent: number | null; best_percent: number | null; best_date: string | null } | null;
  chronic: number;
  cover: CoverBoard;
  intray: { total: number; top: ApprovalItem | null; next: { id: string; kind: ApprovalKind; name: string; summary: string }[] };
  transport: {
    route_id: string;
    route: string;
    direction: string;
    status: string;
    delay_minutes: number;
    leaves_at: string;
    stops: { name: string; status: string }[];
    buses_out: number;
    buses_total: number;
    idle_vehicle: string | null;
  } | null;
  fees: { term: string | null; billed: string; collected: string; overdue: string; percent: number | null; target: { percent: number; by: string | null } };
  exams: { exam: string; average: number | null; previous_exam: string | null; previous: number | null; lowest_grade: string | null; lowest: number | null } | null;
  next_exam: { name: string; date: string; school_days: number } | null;
};

export type ChronicAbsentee = {
  id: string;
  name: string;
  initials: string;
  class: string;
  days: number;
  reason_given: boolean;
  guardian: { user_id: string; name: string; phone: string; phone_masked: string } | null;
};
export type PrincipalAttendance = {
  date: string;
  updated_at: string;
  students: SchoolRegister & { average_20: number | null };
  chronic: ChronicAbsentee[];
  staff: {
    teachers: number;
    present: number;
    on_leave: number;
    percent: number | null;
    support: number;
    support_present: number;
    by_wing: { wing: string; total: number; on_leave: number; percent: number | null }[];
  };
  cover: CoverBoard | null;
};

export type BroadcastEstimate = {
  families: number;
  staff: number;
  teachers: number;
  support: number;
  push: number;
  families_on_app: number;
  families_without_app: number;
  sms: number;
  whatsapp: number;
  email: number;
};
export type SchoolSections = { grades: string[]; sections: { id: string; short_label: string; grade: string; students: number }[] };
