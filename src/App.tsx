import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { LogoMark } from '@/components/shell/Logo'
import { MobileStage } from '@/components/shell/MobileStage'
import { useAuth } from '@/auth/AuthProvider'
import { homePath, isWide, type Experience } from '@/auth/experience'
import { useHostBranding } from '@/branding/BrandingProvider'
import { SignInPage } from '@/pages/auth/SignIn'
import { ChangePasswordPage, ChooseSchoolPage, NoAccessPage } from '@/pages/auth/AccountGates'

// Each experience ships as its own chunk — a parent's phone never downloads the admin screens.
const named = <K extends string>(load: () => Promise<Record<K, ComponentType>>, key: K) =>
  lazy(() => load().then(m => ({ default: m[key] })))

const PrincipalWebApp = named(() => import('@/roles/principal/web'), 'PrincipalWebApp')
const AdminWebApp = named(() => import('@/roles/admin/web'), 'AdminWebApp')
const PrincipalMobileApp = named(() => import('@/roles/principal/mobile'), 'PrincipalMobileApp')
const AdminMobileApp = named(() => import('@/roles/admin/mobile'), 'AdminMobileApp')
const StaffMobileApp = named(() => import('@/roles/staff/mobile'), 'StaffMobileApp')
const ParentMobileApp = named(() => import('@/roles/parent/mobile'), 'ParentMobileApp')
const StudentMobileApp = named(() => import('@/roles/student/mobile'), 'StudentMobileApp')

export function Splash() {
  return (
    <div role="status" aria-label="Loading" className="grid min-h-dvh w-full place-items-center bg-ivory">
      <LogoMark size={36} className="animate-pulse" />
    </div>
  )
}

/** Role-aware route guard. Hiding is a courtesy; the backend authorizes every call. */
function RequireExperience({ exp, children }: { exp: Experience; children: ReactNode }) {
  const { experiences } = useAuth()
  if (!experiences.includes(exp)) return <Navigate to="/" replace />
  return <>{children}</>
}

const mobile = (exp: Experience, App: ComponentType) => (
  <RequireExperience exp={exp}>
    <MobileStage role={exp}><Suspense fallback={<Splash />}><App /></Suspense></MobileStage>
  </RequireExperience>
)

/** Remember where a signed-out visitor was going, so a deep link survives sign-in. */
function ToSignIn() {
  const loc = useLocation()
  return <Navigate to="/sign-in" replace state={{ from: `${loc.pathname}${loc.search}` }} />
}

function AfterSignIn() {
  const from = (useLocation().state as { from?: string } | null)?.from
  return <Navigate to={from && from.startsWith('/') && !from.startsWith('//') ? from : '/'} replace />
}

export default function App() {
  const host = useHostBranding()
  const a = useAuth()

  // Neutral defaults until the host's branding answers — never a previous school's identity.
  if (!host.ready) return <Splash />

  if (!a.signedIn) {
    return (
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="*" element={<ToSignIn />} />
      </Routes>
    )
  }
  if (a.user?.must_change_password) return <ChangePasswordPage />
  if (!a.schoolId) {
    if (a.activating) return <Splash />
    if (a.selectable.length > 0) return <ChooseSchoolPage />
    if (a.memberships.length > 0) return <NoAccessPage reason="host" />
    return <NoAccessPage reason={a.user?.is_platform_admin ? 'platform' : 'no-school'} />
  }
  if (a.activating) return <Splash />
  if (a.experiences.length === 0) return <NoAccessPage reason="no-experience" />

  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route path="/" element={<Navigate to={homePath(a.experiences[0], !!isWide())} replace />} />
        <Route path="/sign-in" element={<AfterSignIn />} />
        <Route path="/principal/*" element={<RequireExperience exp="principal"><PrincipalWebApp /></RequireExperience>} />
        <Route path="/admin/*" element={<RequireExperience exp="admin"><AdminWebApp /></RequireExperience>} />
        <Route path="/m/principal" element={mobile('principal', PrincipalMobileApp)} />
        <Route path="/m/admin" element={mobile('admin', AdminMobileApp)} />
        <Route path="/m/staff" element={mobile('staff', StaffMobileApp)} />
        <Route path="/m/parent" element={mobile('parent', ParentMobileApp)} />
        <Route path="/m/student" element={mobile('student', StudentMobileApp)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
