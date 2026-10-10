import { describe, expect, it } from 'vitest'

// Role apps are lazy chunks; transforming them on first load is slow in CI-like environments.
const SLOW = { timeout: 10_000 }
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AuthProvider } from '@/auth/AuthProvider'
import { HostBrandingProvider } from '@/branding/BrandingProvider'
import { session } from '@/api/session'
import { mockFetch, type Handler } from '@/test/fetchMock'

const SCHOOL = { id: 'sch-1', code: 'greenfield', name: 'Greenfield School' }
const brand = (over: object = {}) => ({
  school: { ...SCHOOL, short_name: 'Greenfield' }, display_name: 'Greenfield', primary_color: '#1D4ED8', secondary_color: '#F59E0B',
  on_primary: '#FFFFFF', on_secondary: '#000000', logo_url: null, favicon_url: null, version: 3, is_default: false, ...over,
})
const sessionFor = (roleKey: string, roleName: string) => ({
  access: 'acc', refresh: 'ref', token_type: 'Bearer', access_expires_in: 600, refresh_expires_at: '',
  user: { id: 'u1', full_name: 'Meera Iyer', email: 'm@example.com', phone: null, language: 'en', is_platform_admin: false, must_change_password: false },
  memberships: [{ id: 'm1', school: SCHOOL, roles: [{ id: 'r1', key: roleKey, name: roleName, title: '', department: '' }] }],
})
const empty = { body: { next: null, previous: null, results: [] } }
const baseRoutes = (perms: Record<string, string[]>, extra: Record<string, Handler | { status?: number; body?: unknown }> = {}) => ({
  'GET /branding/resolve': { status: 404, body: { error: { code: 'not_found', message: 'Unknown host' } } },
  'GET /me/permissions': { body: { school_id: SCHOOL.id, permissions: perms } },
  'GET /branding': { body: brand() },
  'GET /academic-years': { body: { next: null, previous: null, results: [{ id: 'y1', name: '2026–27', is_current: true }] } },
  'GET /sections': empty, 'GET /teacher-assignments': empty, 'GET /enrollments': empty, 'GET /attendance/sessions': empty,
  'GET /attendance/corrections': empty, 'GET /school': { body: { id: SCHOOL.id, name: SCHOOL.name, city: 'Pune' } },
  'GET /audit-events': empty, 'GET /staff': empty, 'GET /students': empty,
  ...extra,
})

function renderApp(path = '/') {
  session.clear()
  document.documentElement.removeAttribute('style')
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <HostBrandingProvider><AuthProvider><App /></AuthProvider></HostBrandingProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function signIn() {
  const u = userEvent.setup()
  await u.type(await screen.findByLabelText('Email or mobile number'), 'm@example.com')
  await u.type(screen.getByLabelText('Password'), 'correct horse')
  await u.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('white-label branding', () => {
  it("resolves the host's branding before sign-in and themes the page", async () => {
    mockFetch({ 'GET /branding/resolve': { body: { ...brand(), host_kind: 'subdomain' } } })
    renderApp()
    expect(await screen.findByText('to Greenfield School')).toBeInTheDocument()
    expect(document.documentElement.style.getPropertyValue('--color-forest')).toBe('#1D4ED8')
    expect(document.title).toBe('Greenfield')
  })

  it('falls back to the default EduFlow branding when the host is unknown', async () => {
    mockFetch({ 'GET /branding/resolve': { status: 404, body: { error: { code: 'not_found', message: 'x' } } } })
    renderApp()
    expect(await screen.findByText('to your school on EduFlow')).toBeInTheDocument()
    expect(document.documentElement.style.getPropertyValue('--color-forest')).toBe('')
    expect(document.title).toBe('EduFlow')
  })
})

describe('authentication', () => {
  it('shows the generic credentials error from the backend code', async () => {
    mockFetch(baseRoutes({}, { 'POST /auth/password/login': { status: 401, body: { error: { code: 'invalid_credentials', message: 'Invalid credentials.' } } } }))
    renderApp()
    await signIn()
    expect(await screen.findByRole('alert')).toHaveTextContent("That email or phone and password don't match.")
  })

  it('signs a teacher in, loads school permissions and branding, and opens the teacher app', async () => {
    const { calls } = mockFetch(baseRoutes({ 'attendance.create': ['section'] }, { 'POST /auth/password/login': { body: sessionFor('teacher', 'Teacher') } }))
    renderApp()
    await signIn()
    expect(await screen.findByRole('button', { name: /Classes/ }, SLOW)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Messages/ })).toBeInTheDocument()
    const perms = calls.find(c => c.path === '/me/permissions')!
    expect(perms.headers['X-School-Id']).toBe(SCHOOL.id)
    expect(document.documentElement.style.getPropertyValue('--color-forest')).toBe('#1D4ED8')
  })

  it('forces a password change before anything else', async () => {
    const s = sessionFor('teacher', 'Teacher')
    s.user.must_change_password = true
    mockFetch(baseRoutes({}, { 'POST /auth/password/login': { body: s } }))
    renderApp()
    await signIn()
    expect(await screen.findByText('Choose a new password', {}, SLOW)).toBeInTheDocument()
  })

  it('explains when a role has no screens in the supplied designs', async () => {
    mockFetch(baseRoutes({}, { 'POST /auth/password/login': { body: sessionFor('librarian', 'Librarian') } }))
    renderApp()
    await signIn()
    expect(await screen.findByText('No workspace for your role yet', {}, SLOW)).toBeInTheDocument()
  })
})

describe('role-aware navigation', () => {
  const nav = () => within(screen.getAllByRole('navigation', { name: 'Main' })[0])

  it('hides principal pages the member has no permission for', async () => {
    mockFetch(baseRoutes({ 'student.read': ['school'], 'section.read': ['school'] }, { 'POST /auth/password/login': { body: sessionFor('principal', 'Principal') } }))
    renderApp('/principal')
    await signIn()
    await screen.findAllByRole('navigation', { name: 'Main' }, SLOW)
    expect(nav().getByText('Students')).toBeInTheDocument()
    expect(nav().queryByText('Approvals')).not.toBeInTheDocument()
    expect(nav().queryByText('Staff')).not.toBeInTheDocument()
  })

  it('shows Approvals with the pending count when attendance.approve is granted', async () => {
    const correction = { id: 'c1', status: 'pending', old_status: 'absent', new_status: 'present', reason: 'Was at the nurse', created_at: new Date().toISOString(),
      record: { id: 'r', session_id: 's', date: '2026-10-09', section: { id: 'sec', name: 'B' }, student: { id: 'st', full_name: 'Ananya K' }, status: 'absent', note: '', updated_at: '' },
      requested_by: { id: 'p', full_name: 'Kavya Rao' }, decided_by: null, decided_at: null, decision_note: '' }
    mockFetch(baseRoutes({ 'attendance.approve': ['school'], 'attendance.read': ['school'] }, {
      'POST /auth/password/login': { body: sessionFor('principal', 'Principal') },
      'GET /attendance/corrections': { body: { next: null, previous: null, results: [correction] } },
    }))
    renderApp('/principal/approvals')
    await signIn()
    await waitFor(() => expect(nav().getByText('Approvals')).toBeInTheDocument(), SLOW)
    expect(await screen.findByText('Ananya K: Absent → Present', {}, SLOW)).toBeInTheDocument()
  })
})
