import { http, request } from './client';
import type {
  SchoolSections,
  ApprovalItem,
  ApprovalTray,
  BroadcastEstimate,
  CoverBoard,
  PrincipalAttendance,
  PrincipalPulse,
  AssignmentCard,
  AssignmentReview,
  CoverInfo,
  MarkSheetCard,
  MarkSheetDetail,
  ReviewSubmission,
  StaffClassCard,
  StaffDocument,
  StaffDocuments,
  StaffHome,
  StaffLeave,
  StaffLeaveRequest,
  StaffMe,
  StaffStudent,
  StaffTimetable,
  TeacherHomework,
  Announcement,
  AppNotification,
  AttendanceMonth,
  AttendanceSummary,
  AuthSession,
  ChatContact,
  AssignmentItem,
  ChildDetail,
  IdCard,
  Materials,
  StudentAssignments,
  StudentClasses,
  StudentExams,
  DocumentItem,
  LeaveApplication,
  Meeting,
  Preferences,
  StudentDocuments,
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
  /** Phone-first when `schoolCode` is omitted: the code signs in to every school the number belongs to. */
  requestOtp: (phone: string, schoolCode?: string) =>
    request<OtpChallenge>('/auth/otp/request', {
      method: 'POST',
      auth: false,
      body: schoolCode ? { school_code: schoolCode, phone } : { phone },
    }),
  passwordLogin: (body: { identifier: string; password: string; remember: boolean; school_code?: string }) =>
    request<AuthSession>('/auth/password/login', { method: 'POST', auth: false, body }),
  verifyOtp: (challengeId: string, code: string) =>
    request<AuthSession>('/auth/otp/verify', { method: 'POST', auth: false, body: { challenge_id: challengeId, code } }),
  me: () => http.get<{ user: User; memberships: Membership[] }>('/me'),
  updateMe: (patch: { language?: string; preferences?: { [K in keyof Preferences]?: Partial<Preferences[K]> } }) =>
    http.patch<{ user: User }>('/me', patch),
  registerPushDevice: (token: string, platform: 'ios' | 'android' | 'web', appVariant: string) =>
    http.post<void>('/me/push-devices', { token, platform, app_variant: appVariant }),
  unregisterPushDevice: (token: string) => http.del<void>('/me/push-devices', { token }),

  // Family
  children: () => http.get<{ children: StudentCard[] }>('/parent/children'),
  childrenDetail: () => http.get<{ children: ChildDetail[] }>('/parent/children?detail=1'),
  studentMe: () => http.get<StudentCard & { id_card?: IdCard }>('/student/me'),
  materials: (studentId: string, subject?: string) =>
    http.get<Materials>(`/students/${studentId}/materials${subject ? `?subject=${subject}` : ''}`),
  studentClasses: (studentId: string) => http.get<StudentClasses>(`/students/${studentId}/classes`),
  assignments: (studentId: string) => http.get<StudentAssignments>(`/students/${studentId}/assignments`),
  toggleMilestone: (progressId: string, done: boolean) =>
    http.post<{ id: string; done_at: string | null }>(`/assignments/milestones/${progressId}/toggle`, { done }),
  uploadAssignment: (assignmentId: string, form: FormData) => http.upload<AssignmentItem>(`/assignments/${assignmentId}/files`, form),
  exams: (studentId: string) => http.get<StudentExams>(`/students/${studentId}/exams`),
  togglePrep: (itemId: string, done: boolean) => http.post<{ id: string; done_at: string | null }>(`/exams/prep/${itemId}/toggle`, { done }),
  homeworkDone: (homeworkId: string, studentId: string) => http.post<Homework>(`/homework/${homeworkId}/done`, { student_id: studentId }),
  summary: (studentId: string) => http.get<StudentSummary>(`/students/${studentId}/summary`),
  attendance: (studentId: string, month: string) =>
    http.get<AttendanceMonth>(`/students/${studentId}/attendance?month=${month}`),
  homework: (studentId: string, week?: string) =>
    http.get<{ pending: number; items: Homework[] }>(`/students/${studentId}/homework${week ? `?week=${week}` : ''}`),
  signHomework: (homeworkId: string, studentId: string) =>
    http.post<{ at: string; by: string }>(`/homework/${homeworkId}/signoff`, { student_id: studentId }),
  leave: (studentId: string) => http.get<{ items: LeaveApplication[] }>(`/students/${studentId}/leave`),
  applyLeave: (
    studentId: string,
    body: { from_date: string; to_date: string; kind: LeaveApplication['kind']; reason: string; half_day?: boolean },
  ) => http.post<LeaveApplication>(`/students/${studentId}/leave`, body),
  documents: (studentId: string) => http.get<StudentDocuments>(`/students/${studentId}/documents`),
  requestCertificate: (studentId: string, kind: 'bonafide' | 'character' | 'study', purpose?: string) =>
    http.post<{ id: string; kind: string; state: string }>(`/students/${studentId}/certificates`, { kind, purpose }),
  acknowledgeRemark: (remarkId: string) => http.post<{ id: string; acknowledged_at: string }>(`/remarks/${remarkId}/ack`),
  submitHomework: (homeworkId: string, form: FormData) => http.upload<Homework>(`/homework/${homeworkId}/submissions`, form),
  fees: (studentId: string) => http.get<StudentFees>(`/students/${studentId}/fees`),
  checkout: (invoiceId: string, idempotencyKey: string, method?: 'upi' | 'card' | 'netbanking') =>
    http.post<Checkout>(`/fees/invoices/${invoiceId}/checkout`, method ? { method } : {}, { idempotencyKey }),
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
      student_id: contact.student?.id,
    }),
  messages: (conversationId: string, before?: string) =>
    http.get<{ messages: ChatMessage[]; meetings: Meeting[]; others_read_at?: string | null; has_more: boolean }>(
      `/chat/conversations/${conversationId}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`,
    ),
  sendMessage: (conversationId: string, body: string, clientId: string) =>
    http.post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, { body, client_id: clientId }),
  sendAttachment: (conversationId: string, form: FormData) => http.upload<ChatMessage>(`/chat/conversations/${conversationId}/messages`, form),
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
  addRemark: (studentId: string, body: string, tone: 'positive' | 'concern' | 'info', visibility: 'family' | 'staff' = 'family') =>
    http.post<{ id: string }>(`/students/${studentId}/remarks`, { body, tone, visibility }),

  // Staff app
  staffHome: () => http.get<StaffHome>('/staff/home'),
  staffClasses: () => http.get<{ subject: StaffClassCard['subject']; classes: StaffClassCard[] }>('/staff/classes'),
  staffTimetable: (date?: string) => http.get<StaffTimetable>(`/staff/timetable${date ? `?date=${date}` : ''}`),
  coverNote: (coverId: string, note: string) => http.post<CoverInfo>(`/staff/covers/${coverId}/note`, { note }),
  staffMe: () => http.get<StaffMe>('/staff/me'),
  updateOfficeHours: (hours: { days: number[]; start: string; end: string }) => http.patch<StaffMe>('/staff/me', { office_hours: hours }),
  staffLeave: () => http.get<StaffLeave>('/staff/leave'),
  applyStaffLeave: (form: FormData) => http.upload<StaffLeaveRequest>('/staff/leave', form),
  cancelLeave: (leaveId: string) => http.post<StaffLeaveRequest>(`/staff/leave/${leaveId}/cancel`),
  staffDocuments: (scope: 'mine' | 'school') => http.get<StaffDocuments>(`/staff/documents?scope=${scope}`),
  uploadStaffDocument: (form: FormData) => http.upload<StaffDocument>('/staff/documents', form),
  staffStudent: (studentId: string) => http.get<StaffStudent>(`/staff/students/${studentId}`),
  teacherHomework: () => http.get<{ items: TeacherHomework[] }>('/teacher/homework'),
  createHomeworkWithFiles: (classId: string, form: FormData) => http.upload<Homework>(`/classes/${classId}/homework`, form),
  teacherMarks: () => http.get<{ sheets: MarkSheetCard[] }>('/teacher/marks'),
  markSheet: (sheetId: string) => http.get<MarkSheetDetail>(`/marksheets/${sheetId}`),
  saveMarks: (sheetId: string, entries: { student_id: string; marks?: number | null; absent?: boolean }[]) =>
    http.put<MarkSheetDetail>(`/marksheets/${sheetId}`, { entries }),
  submitMarks: (sheetId: string) => http.post<MarkSheetDetail>(`/marksheets/${sheetId}/submit`),
  teacherAssignments: () => http.get<{ assignments: AssignmentCard[] }>('/teacher/assignments'),
  assignmentReview: (assignmentId: string) => http.get<AssignmentReview>(`/assignments/${assignmentId}/review`),
  gradeSubmission: (submissionId: string, data: { action: 'grade' | 'redo'; scores?: Record<string, number>; total?: number; feedback: string }) =>
    http.post<ReviewSubmission>(`/assignments/submissions/${submissionId}/grade`, data),
  // Principal
  pulse: () => http.get<PrincipalPulse>('/principal/pulse'),
  principalAttendance: (date?: string) => http.get<PrincipalAttendance>(`/principal/attendance${date ? `?date=${date}` : ''}`),
  coverBoard: () => http.get<CoverBoard>('/principal/cover'),
  assignCover: (slotId: string, teacherId: string) => http.post<CoverBoard>('/principal/cover', { slot_id: slotId, teacher_id: teacherId }),
  messageAbsentees: (studentIds: string[], body: string) => http.post<{ sent_to: number }>('/principal/absentees/message', { student_ids: studentIds, body }),
  approvals: (kind?: string) => http.get<ApprovalTray>(`/approvals${kind ? `?kind=${kind}` : ''}`),
  approvalHistory: () => http.get<{ items: ApprovalItem[] }>('/approvals/history'),
  decideApproval: (id: string, decision: 'approve' | 'decline' | 'send_back', note = '') => http.post<ApprovalItem>(`/approvals/${id}/decide`, { decision, note }),
  undoApproval: (id: string) => http.post<ApprovalItem>(`/approvals/${id}/undo`),
  schoolSections: () => http.get<SchoolSections>('/principal/sections'),
  broadcastEstimate: (data: { audience: string; grades?: string[]; class_ids?: string[]; route_id?: string }) => http.post<BroadcastEstimate>('/announcements/estimate', data),
  broadcast: (form: FormData) => http.upload<Announcement & { delivered: Record<string, number> }>('/announcements', form),
  decideMeeting: (meetingId: string, action: 'accept' | 'propose', startsAt?: string) =>
    http.post<Meeting>(`/meetings/${meetingId}/${action}`, startsAt ? { starts_at: startsAt } : {}),

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
