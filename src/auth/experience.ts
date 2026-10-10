/**
 * Which experience (set of screens) a signed-in member sees, derived from their backend role keys.
 * This is presentation only: the backend authorizes every request (Role + Permission + Data Scope).
 */
import type { Scope } from '@/api/endpoints'

export type Experience = 'principal' | 'admin' | 'staff' | 'parent' | 'student'

/** Backend system role keys (authz SYSTEM_ROLES) → the supplied design that serves them. */
export const ROLE_EXPERIENCE: Record<string, Experience> = {
  principal: 'principal',
  school_admin: 'admin',
  accountant: 'admin',
  hr_manager: 'admin',
  teacher: 'staff',
  parent: 'parent',
  student: 'student',
}

/** When a member holds several roles, the first match here is the default. */
const PRIORITY: Experience[] = ['principal', 'admin', 'staff', 'parent', 'student']

export const EXPERIENCE_LABEL: Record<Experience, { label: string; sub: string; web: boolean }> = {
  principal: { label: 'Principal', sub: 'Monitoring Center', web: true },
  admin: { label: 'Administrator', sub: 'Admin office', web: true },
  staff: { label: 'Teacher', sub: 'Teacher app', web: false },
  parent: { label: 'Parent', sub: 'Parent app', web: false },
  student: { label: 'Student', sub: 'Student app', web: false },
}

export function experiencesFor(roleKeys: readonly string[]): Experience[] {
  const set = new Set(roleKeys.map(k => ROLE_EXPERIENCE[k]).filter((x): x is Experience => !!x))
  return PRIORITY.filter(e => set.has(e))
}

/** Where an experience lives. Principal and admin have a web console and a mobile app; the rest are mobile. */
export function homePath(exp: Experience, wide: boolean): string {
  if (exp === 'principal') return wide ? '/principal' : '/m/principal'
  if (exp === 'admin') return wide ? '/admin' : '/m/admin'
  return `/m/${exp}`
}

export type Grants = Record<string, Scope[]>

/** True when any of the member's roles grants `codename`, optionally with one of `scopes`. */
export function can(grants: Grants | null | undefined, codename: string, scopes?: Scope[]): boolean {
  const have = grants?.[codename]
  if (!have?.length) return false
  return !scopes || have.some(s => scopes.includes(s))
}

export const isWide = () => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches
