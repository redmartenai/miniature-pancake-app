/**
 * The signed-in session: who the user is, which school they act in, and what their roles grant there.
 *
 * - Tokens stay in memory (src/api/session.ts). The backend forbids web tokens in localStorage and its
 *   cookie flow is not built yet, so reloading the page signs the user out.
 * - Activating a school fetches its permissions and branding *before* the UI switches, and clears every
 *   cached query, so one school's data never renders under another school's theme.
 * - On a school's own host (subdomain or custom domain) only that school can be chosen: the backend binds
 *   such requests to the host's school and refuses any other X-School-Id.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setSessionExpiredHandler, type Schemas } from '@/api/client'
import { auth as authApi, branding as brandingApi, me as meApi } from '@/api/endpoints'
import { session } from '@/api/session'
import { ActiveBranding, useHostBranding } from '@/branding/BrandingProvider'
import { DEFAULT_BRANDING, type Branding } from '@/branding/theme'
import { experiencesFor, type Experience, type Grants } from './experience'

type User = Schemas['UserOut']
type Membership = Schemas['MyMembershipOut']

export interface AuthState {
  user: User | null
  memberships: Membership[]
  schoolId: string | null
  grants: Grants | null
  schoolBranding: Branding | null
}

export interface AuthContextValue extends AuthState {
  signedIn: boolean
  membership: Membership | null
  roleKeys: string[]
  experiences: Experience[]
  /** Memberships this host allows (all of them on a platform host). */
  selectable: Membership[]
  /** A school switch is in flight. */
  activating: boolean
  /** Why the user was signed out, shown on the sign-in screen. */
  notice: string | null
  completeSignIn: (s: Schemas['AuthSessionOut']) => Promise<void>
  activateSchool: (schoolId: string) => Promise<void>
  refreshMe: () => Promise<void>
  signOut: (notice?: string) => Promise<void>
}

const EMPTY: AuthState = { user: null, memberships: [], schoolId: null, grants: null, schoolBranding: null }
const Ctx = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>')
  return c
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const host = useHostBranding()
  const [state, setState] = useState<AuthState>(EMPTY)
  const [activating, setActivating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const selectableFor = useCallback((ms: Membership[]) =>
    host.hostSchoolId ? ms.filter(m => m.school.id === host.hostSchoolId) : ms, [host.hostSchoolId])

  const clearLocal = useCallback((why: string | null) => {
    session.clear()
    qc.clear()
    setState(EMPTY)
    setNotice(why)
  }, [qc])

  const signOut = useCallback(async (why?: string) => {
    const refresh = session.getTokens()?.refresh
    // Revoke the session on the server; sign out locally even if that fails.
    if (refresh) await authApi.logout(refresh).catch(() => undefined)
    clearLocal(why ?? null)
  }, [clearLocal])

  useEffect(() => {
    setSessionExpiredHandler(() => clearLocal('Your session ended. Please sign in again.'))
    return () => setSessionExpiredHandler(() => {})
  }, [clearLocal])

  const activateSchool = useCallback(async (schoolId: string) => {
    setActivating(true)
    try {
      const [perms, brand] = await Promise.all([
        meApi.permissions(schoolId),
        brandingApi.current(schoolId).catch(() => null), // a failed branding call keeps the defaults
      ])
      qc.clear()
      session.setSchoolId(schoolId)
      setState(s => ({ ...s, schoolId, grants: perms.permissions, schoolBranding: brand ?? DEFAULT_BRANDING }))
    } finally {
      setActivating(false)
    }
  }, [qc])

  const completeSignIn = useCallback(async (s: Schemas['AuthSessionOut']) => {
    session.setTokens({ access: s.access, refresh: s.refresh })
    session.setSchoolId(null)
    setNotice(null)
    setState({ ...EMPTY, user: s.user, memberships: s.memberships })
    const allowed = selectableFor(s.memberships)
    // A forced password change comes first; the school is chosen after it.
    if (!s.user.must_change_password && allowed.length === 1) await activateSchool(allowed[0].school.id)
  }, [activateSchool, selectableFor])

  const refreshMe = useCallback(async () => {
    const m = await meApi.get()
    setState(s => ({ ...s, user: m.user, memberships: m.memberships }))
    const allowed = selectableFor(m.memberships)
    if (!m.user.must_change_password && !session.getSchoolId() && allowed.length === 1) await activateSchool(allowed[0].school.id)
  }, [activateSchool, selectableFor])

  const value = useMemo<AuthContextValue>(() => {
    const membership = state.memberships.find(m => m.school.id === state.schoolId) ?? null
    const roleKeys = membership?.roles.map(r => r.key) ?? []
    return {
      ...state,
      signedIn: !!state.user,
      membership,
      roleKeys,
      experiences: experiencesFor(roleKeys),
      selectable: selectableFor(state.memberships),
      activating,
      notice,
      completeSignIn,
      activateSchool,
      refreshMe,
      signOut,
    }
  }, [state, activating, notice, completeSignIn, activateSchool, refreshMe, signOut, selectableFor])

  const active = state.schoolId ? state.schoolBranding ?? DEFAULT_BRANDING : host.branding

  return (
    <Ctx.Provider value={value}>
      <ActiveBranding branding={active}>{children}</ActiveBranding>
    </Ctx.Provider>
  )
}
