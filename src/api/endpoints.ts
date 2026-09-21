import { http, request } from './client';
import type {
  Announcement,
  AppNotification,
  AttendanceMonth,
  AttendanceSummary,
  AuthSession,
  ChatContact,
  ChatMessage,
  Checkout,
  ClassRoster,
  Conversation,
  DriverTrip,
  Homework,
  IngestResult,
  Membership,
  OtpChallenge,
  PositionFix,
  RealtimeConnection,
  Receipt,
  Remark,
  Results,
  Roster,
  RouteShape,
  School,
  StudentCard,
  StudentFees,
  StudentSummary,
  StudentTransport,
  Submissions,
  TeacherClass,
  Timetable,
  TransportDashboard,
  TripLive,
  TripSubscription,
  User,
} from './types';

export const api = {
  // Sign-in
  lookupSchool: (code: string) =>
    request<School>(`/schools/lookup?code=${encodeURIComponent(code)}`, { auth: false }),
  requestOtp: (schoolCode: string, phone: string) =>
    request<OtpChallenge>('/auth/otp/request', { method: 'POST', auth: false, body: { school_code: schoolCode, phone } }),
  verifyOtp: (challengeId: string, code: string) =>
    request<AuthSession>('/auth/otp/verify', { method: 'POST', auth: false, body: { challenge_id: challengeId, code } }),
  me: () => http.get<{ user: User; memberships: Membership[] }>('/me'),
  updateMe: (patch: { language?: string }) => http.patch<{ user: User }>('/me', patch),
  registerPushDevice: (token: string, platform: 'ios' | 'android' | 'web', appVariant: string) =>
    http.post<void>('/me/push-devices', { token, platform, app_variant: appVariant }),
  unregisterPushDevice: (token: string) => http.del<void>('/me/push-devices', { token }),

  // Family
  children: () => http.get<{ children: StudentCard[] }>('/parent/children'),
  studentMe: () => http.get<StudentCard>('/student/me'),
  summary: (studentId: string) => http.get<StudentSummary>(`/students/${studentId}/summary`),
  attendance: (studentId: string, month: string) =>
    http.get<AttendanceMonth>(`/students/${studentId}/attendance?month=${month}`),
  homework: (studentId: string) => http.get<{ pending: number; items: Homework[] }>(`/students/${studentId}/homework`),
  submitHomework: (homeworkId: string, form: FormData) => http.upload<Homework>(`/homework/${homeworkId}/submissions`, form),
  fees: (studentId: string) => http.get<StudentFees>(`/students/${studentId}/fees`),
  checkout: (invoiceId: string, idempotencyKey: string) =>
    http.post<Checkout>(`/fees/invoices/${invoiceId}/checkout`, {}, { idempotencyKey }),
  confirmPayment: (paymentId: string, payload: Record<string, string>) =>
    http.post<Receipt>(`/fees/payments/${paymentId}/confirm`, payload),
  results: (studentId: string) => http.get<Results>(`/students/${studentId}/results`),
  timetable: (studentId: string) => http.get<Timetable>(`/students/${studentId}/timetable`),
  remarks: (studentId: string) => http.get<{ items: Remark[] }>(`/students/${studentId}/remarks`),

  // Bus
  transport: (studentId: string) => http.get<StudentTransport>(`/students/${studentId}/transport`),
  setAlertMinutes: (studentId: string, minutes: number) =>
    http.put<{ alert_minutes: number }>(`/students/${studentId}/transport/preferences`, { alert_minutes: minutes }),
  markNotTravelling: (studentId: string, direction: 'pickup' | 'drop' | 'both', date?: string) =>
    http.post<void>(`/students/${studentId}/transport/absences`, { direction, date }),
  undoNotTravelling: (studentId: string, direction: 'pickup' | 'drop' | 'both', date?: string) =>
    http.del<void>(`/students/${studentId}/transport/absences`, { direction, date }),
  route: (routeId: string, direction: 'pickup' | 'drop') =>
    http.get<RouteShape>(`/transport/routes/${routeId}?direction=${direction}`),
  tripLive: (tripId: string) => http.get<TripLive>(`/transport/trips/${tripId}/live`),
  tripSubscription: (tripId: string) => http.get<TripSubscription>(`/transport/trips/${tripId}/subscription`),

  // School-wide
  announcements: () => http.get<{ items: Announcement[] }>('/announcements'),
  acknowledge: (id: string) => http.post<{ acknowledged: boolean }>(`/announcements/${id}/ack`),
  notifications: () => http.get<{ unread: number; items: AppNotification[] }>('/notifications'),
  markNotificationsRead: (ids?: string[]) =>
    http.post<{ marked: number }>('/notifications/read', ids ? { ids } : { all: true }),
  realtimeConnection: () => http.get<RealtimeConnection>('/realtime/connection'),

  // Chat
  chatContacts: () => http.get<{ contacts: ChatContact[] }>('/chat/contacts'),
  conversations: () => http.get<{ conversations: Conversation[]; unread_total: number }>('/chat/conversations'),
  startConversation: (contact: ChatContact) =>
    http.post<Conversation>('/chat/conversations', {
      kind: contact.kind,
      user_id: contact.user_id,
      department: contact.department,
      student_id: contact.student.id,
    }),
  messages: (conversationId: string, before?: string) =>
    http.get<{ messages: ChatMessage[]; has_more: boolean }>(
      `/chat/conversations/${conversationId}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`,
    ),
  sendMessage: (conversationId: string, body: string, clientId: string) =>
    http.post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, { body, client_id: clientId }),
  markConversationRead: (conversationId: string) => http.post<void>(`/chat/conversations/${conversationId}/read`),

  // Teacher
  teacherClasses: () => http.get<{ classes: TeacherClass[] }>('/teacher/classes'),
  teacherToday: () =>
    http.get<{ date: string; weekday: string; periods: (Timetable['days'][number]['periods'][number] & { class: { id: string; label: string } })[] }>(
      '/teacher/today',
    ),
  classRoster: (classId: string, date?: string) =>
    http.get<ClassRoster>(`/classes/${classId}/roster${date ? `?date=${date}` : ''}`),
  markAttendance: (classId: string, entries: { student_id: string; status: string }[], clientId: string, date?: string) =>
    http.post<AttendanceSummary>(`/classes/${classId}/attendance`, { entries, client_id: clientId, date }),
  classHomework: (classId: string) =>
    http.get<{ class_size: number; items: Homework[] }>(`/classes/${classId}/homework`),
  createHomework: (
    classId: string,
    data: { subject_id: string; title: string; description: string; due_date: string; accepts_photos: boolean },
  ) => http.post<Homework>(`/classes/${classId}/homework`, data),
  homeworkSubmissions: (homeworkId: string) => http.get<Submissions>(`/homework/${homeworkId}/submissions/all`),
  reviewSubmission: (submissionId: string, status: 'reviewed' | 'redo', remark: string) =>
    http.post<{ id: string; status: string }>(`/homework/submissions/${submissionId}/review`, { status, remark }),
  addRemark: (studentId: string, body: string, tone: 'positive' | 'concern' | 'info') =>
    http.post<{ id: string }>(`/students/${studentId}/remarks`, { body, tone }),

  transportDashboard: () => http.get<TransportDashboard>('/transport/dashboard'),

  // Driver app
  driverTrips: () => http.get<{ date: string; trips: DriverTrip[] }>('/driver/trips'),
  driverTrip: (tripId: string) => http.get<{ trip: DriverTrip; live: TripLive }>(`/driver/trips/${tripId}`),
  startTrip: (tripId: string) => http.post<TripLive>(`/driver/trips/${tripId}/start`),
  endTrip: (tripId: string, emptyCheckConfirmed: boolean) =>
    http.post<TripLive>(`/driver/trips/${tripId}/end`, { empty_check_confirmed: emptyCheckConfirmed }),
  sendPositions: (tripId: string, positions: PositionFix[]) =>
    http.post<IngestResult>(`/driver/trips/${tripId}/positions`, { positions }),
  tripRoster: (tripId: string) => http.get<Roster>(`/driver/trips/${tripId}/roster`),
  recordBoarding: (tripId: string, studentId: string, kind: 'boarded' | 'dropped' | 'no_show', clientId: string) =>
    http.post<{ student_id: string; kind: string; at: string }>(`/driver/trips/${tripId}/boarding`, {
      student_id: studentId,
      kind,
      client_id: clientId,
    }),
  sos: (tripId: string, lat: number | null, lng: number | null, note: string) =>
    http.post<{ incident_id: string }>(`/driver/trips/${tripId}/sos`, { lat, lng, note }),
};

export type Api = typeof api;
