/* Plain-language labels for the backend's audit action codes (backend audit.services.record callers). */

const LABELS: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',
  'auth.logout_all': 'Signed out everywhere',
  'auth.otp.requested': 'Requested a sign-in code',
  'auth.otp.verified': 'Signed in with a code',
  'auth.refresh.reuse_detected': 'Reused sign-in token blocked',
  'auth.session.revoked': 'Ended a session',
  'identity.password.change': 'Changed password',
  'identity.user.created': 'Created an account',
  'identity.user.activated': 'Activated an account',
  'identity.user.deactivated': 'Deactivated an account',
  'tenancy.access_denied': 'Access denied',
  'tenancy.membership.created': 'Added a member',
  'tenancy.membership.activated': 'Re-activated a member',
  'tenancy.membership.deactivated': 'Deactivated a member',
  'tenancy.school.updated': 'Updated the school profile',
  'authz.role.created': 'Created a role',
  'authz.role.updated': 'Changed role permissions',
  'authz.role.deleted': 'Deleted a role',
  'authz.role.assigned': 'Gave someone a role',
  'authz.role.unassigned': 'Removed a role from someone',
  'attendance.register.submitted': 'Took a register',
  'attendance.correction.requested': 'Requested an attendance correction',
  'attendance.correction.approved': 'Approved an attendance correction',
  'attendance.correction.declined': 'Declined an attendance correction',
  'attendance.record.corrected': 'Corrected an attendance record',
  'people.student.created': 'Added a student',
  'people.student.updated': 'Updated a student',
  'people.staff.created': 'Added a staff member',
  'people.staff.updated': 'Updated a staff member',
  'people.guardian.created': 'Added a guardian',
  'people.guardian.linked': 'Linked a guardian to a student',
  'people.guardian.unlinked': 'Unlinked a guardian',
  'people.enrollment.created': 'Enrolled a student',
  'people.enrollment.transferred': 'Transferred a student',
  'people.enrollment.completed': 'Completed an enrollment',
  'people.teacher_assignment.created': 'Assigned a teacher',
  'people.teacher_assignment.ended': 'Ended a teacher assignment',
  'invitations.invitation.created': 'Sent an invitation',
  'invitations.invitation.accepted': 'Accepted an invitation',
  'invitations.invitation.revoked': 'Revoked an invitation',
  'timetable.timetable.published': 'Published a timetable',
  'timetable.lesson.recorded': 'Recorded a lesson',
  'branding.updated': 'Changed school colours',
  'branding.logo.replaced': 'Replaced the school logo',
  'branding.domain.added': 'Added a custom domain',
  'branding.domain.verified': 'Verified a custom domain',
}

/** "people.teacher_assignment.ended" → "Ended a teacher assignment"; unknown codes become readable text. */
export function auditActionLabel(action: string): string {
  if (LABELS[action]) return LABELS[action]
  const parts = action.split('.')
  const words = parts.slice(1).join(' ').replace(/_/g, ' ')
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : action
}

/** Actions the design calls "sensitive": access, accounts and corrections. */
export const isSensitive = (action: string) =>
  /^(authz\.|identity\.|tenancy\.membership|attendance\.(correction|record)|auth\.refresh\.reuse|tenancy\.access_denied|branding\.)/.test(action)
