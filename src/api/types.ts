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
  languages: string[];
};

export type User = {
  id: string;
  full_name: string;
  first_name: string;
  initials: string;
  phone: string;
  language: string;
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
};

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
  latest_remark: { body: string; tone: 'positive' | 'concern' | 'info'; author: string; created_at: string } | null;
  latest_result: { exam: string; percent: number; grade: string } | null;
  trend: { exam: string; percent: number }[];
};

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'excused';
export type AttendanceDay = { date: string; status: AttendanceStatus | 'holiday' | 'not_marked' | 'upcoming' };
export type AttendanceMonth = {
  month: string;
  days: AttendanceDay[];
  summary: { school_days: number; present: number; absent: number; late: number; percent: number | null };
};

export type Homework = {
  id: string;
  title: string;
  description: string;
  subject: { id: string; name: string; color: string };
  class: { id: string; label: string };
  assigned_on: string;
  due_date: string;
  overdue: boolean;
  accepts_photos: boolean;
  assigned_by: string | null;
  submission: {
    id: string;
    status: 'submitted' | 'reviewed' | 'redo';
    submitted_at: string;
    teacher_remark: string;
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
};
export type StudentFees = {
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
  total: number;
  max_total: number;
  percent: number;
  grade: string;
  subjects: SubjectResult[];
};
export type Results = {
  student: { id: string; name: string };
  exams: ExamResult[];
  trend: { exam: string; percent: number }[];
  subjects: { subject: string; points: { exam: string; percent: number }[] }[];
};

export type Period = {
  period: number;
  starts_at: string;
  ends_at: string;
  subject: string;
  color: string;
  teacher?: string | null;
  room: string;
  class?: { id: string; label: string };
};
export type Timetable = {
  class: string;
  today: number;
  days: { weekday: number; name: string; periods: Period[] }[];
};

export type Remark = { id: string; body: string; tone: string; author: string; created_at: string };

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
};
export type StudentTransport =
  | { enrolled: false }
  | {
      enrolled: true;
      route: { id: string; code: string; name: string };
      vehicle: { label: string; registration_no: string } | null;
      crew: { driver: string | null; attendant: string | null };
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
  kind: 'user' | 'department';
  user_id?: string;
  department?: string;
  name: string;
  initials: string;
  subtitle: string;
  student: { id: string; name: string; first_name: string };
};
export type Conversation = {
  id: string;
  kind: 'direct' | 'department';
  title: string;
  subtitle: string;
  initials: string;
  student: { id: string; name: string; first_name: string } | null;
  unread: number;
  last_message: { body: string; at: string; mine: boolean } | null;
  office_hours: { text: string; open_now: boolean } | null;
  can_send: boolean;
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
