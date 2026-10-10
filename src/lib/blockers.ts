/**
 * Screens whose data the backend (legendary-waffle-skl, phase-6/attendance-white-label) does not serve yet.
 * Each entry names the missing capability as the backend's own plan does (docs/IMPLEMENTATION_PLAN.md,
 * docs/CURRENT_STATE.md Appendix A), so the UI never fills the gap with invented data.
 */
export type Blocker =
  | 'fees' | 'payroll' | 'admissions' | 'messages' | 'notifications' | 'announcements' | 'homework'
  | 'lms' | 'assessment' | 'transport' | 'leave' | 'ask' | 'monitoring' | 'staffAttendance' | 'remarks' | 'campus3d'

export const BLOCKERS: Record<Blocker, { title: string; needs: string; phase: string }> = {
  fees: { title: 'Fees', needs: 'Fee structures, invoices, payments and receipts (/students/{id}/fees, /fees/*, /console/fees/*)', phase: 'Phase 10 · Operations' },
  payroll: { title: 'Payroll & salary', needs: 'Salary structures, payroll runs and payslips', phase: 'Not in the backend plan yet' },
  admissions: { title: 'Admissions', needs: 'The admissions pipeline (/console/admissions/*)', phase: 'Phase 4+ · People' },
  messages: { title: 'Messages', needs: 'Parent–teacher conversations (/chat/*)', phase: 'Phase 9 · Communication' },
  notifications: { title: 'Notifications', needs: 'The notification feed (/notifications)', phase: 'Phase 9 · Communication' },
  announcements: { title: 'Announcements', needs: 'Announcements, circulars and acknowledgements (/announcements)', phase: 'Phase 9 · Communication' },
  homework: { title: 'Homework', needs: 'Homework, submissions and reviews (/classes/{id}/homework, /homework/*)', phase: 'Phase 7 · Learning' },
  lms: { title: 'Learning', needs: 'Lessons, study material and quizzes (/students/{id}/materials, /assignments/*)', phase: 'Phase 7 · Learning' },
  assessment: { title: 'Exams & results', needs: 'Exams, mark sheets and published results (/marksheets/*, /students/{id}/results)', phase: 'Phase 8 · Assessment' },
  transport: { title: 'Transport', needs: 'Routes, trips and live bus positions (/transport/*)', phase: 'Phase 10 · Operations' },
  leave: { title: 'Leave', needs: 'Staff and student leave requests (/students/{id}/leave, staff leave)', phase: 'Phase 6 (deferred) · Attendance' },
  ask: { title: 'Ask EduFlow', needs: 'Natural-language search over school data (/console/search)', phase: 'Phase 11 · Intelligence' },
  monitoring: { title: 'Monitoring alerts', needs: 'Monitoring rules, alerts, risk scores and teacher scorecards (/principal/pulse, /console/dashboard)', phase: 'Phase 11 · Intelligence' },
  staffAttendance: { title: 'Staff attendance', needs: 'Staff check-in and daily status', phase: 'Not in the backend plan yet' },
  remarks: { title: 'Teacher remarks', needs: 'Remarks about students visible to families', phase: 'Phase 10 · Operations' },
  campus3d: { title: 'Campus 3D', needs: 'Live room occupancy, substitutions and bus positions that drive the 3D campus', phase: 'Phases 5–11' },
}
