import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest, buildUrl, setSessionExpiredHandler } from './client'
import { session } from './session'
import { mockFetch } from '@/test/fetchMock'

beforeEach(() => session.clear())

describe('apiRequest', () => {
  it('builds URLs under the API base without trailing slashes and drops empty params', () => {
    expect(buildUrl('/students', { section_id: 'a', cursor: undefined, q: '' })).toBe('/api/v1/students?section_id=a')
  })

  it('turns the error envelope into an ApiError with code, fields and request id', async () => {
    mockFetch({ 'POST /auth/password/login': { status: 400, body: { error: { code: 'validation_error', message: 'Bad', fields: { identifier: ['Required.'] }, request_id: 'r1' } } } })
    const err = (await apiRequest('/auth/password/login', { method: 'POST', body: {}, auth: false }).catch(e => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe('validation_error')
    expect(err.fieldError('identifier')).toBe('Required.')
    expect(err.requestId).toBe('r1')
  })

  it('reports a network failure as network_error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    const err = (await apiRequest('/me').catch(e => e)) as ApiError
    expect(err.code).toBe('network_error')
  })

  it('sends the bearer token and the active school header', async () => {
    session.setTokens({ access: 'A', refresh: 'R' })
    session.setSchoolId('school-1')
    const { calls } = mockFetch({ 'GET /students': { body: { next: null, results: [] } } })
    await apiRequest('/students')
    expect(calls[0].headers.Authorization).toBe('Bearer A')
    expect(calls[0].headers['X-School-Id']).toBe('school-1')
    expect(calls[0].headers['X-Request-ID']).toMatch(/^[0-9a-f]{32}$/)
  })

  it('refreshes once on 401 not_authenticated, stores the rotated pair and retries', async () => {
    session.setTokens({ access: 'old', refresh: 'R1' })
    let first = true
    const { calls } = mockFetch({
      'GET /me': () => {
        if (first) { first = false; return { status: 401, body: { error: { code: 'not_authenticated', message: 'x' } } } }
        return { body: { user: { id: 'u' }, memberships: [] } }
      },
      'POST /auth/token/refresh': { body: { access: 'new', refresh: 'R2', token_type: 'Bearer', access_expires_in: 600, refresh_expires_at: '' } },
    })
    await apiRequest('/me', { schoolId: null })
    expect(session.getTokens()).toEqual({ access: 'new', refresh: 'R2' })
    expect(calls.map(c => `${c.method} ${c.path}`)).toEqual(['GET /me', 'POST /auth/token/refresh', 'GET /me'])
    expect(calls[2].headers.Authorization).toBe('Bearer new')
  })

  it('signs out when the refresh fails, and never retries a 403', async () => {
    session.setTokens({ access: 'old', refresh: 'R1' })
    const expired = vi.fn()
    setSessionExpiredHandler(expired)
    mockFetch({
      'GET /me': { status: 401, body: { error: { code: 'not_authenticated', message: 'x' } } },
      'POST /auth/token/refresh': { status: 401, body: { error: { code: 'not_authenticated', message: 'x' } } },
      'GET /roles': { status: 403, body: { error: { code: 'permission_denied', message: 'no' } } },
    })
    await expect(apiRequest('/me')).rejects.toMatchObject({ code: 'not_authenticated' })
    expect(expired).toHaveBeenCalledTimes(1)
    session.setTokens({ access: 'a', refresh: 'b' })
    const { calls } = mockFetch({ 'GET /roles': { status: 403, body: { error: { code: 'permission_denied', message: 'no' } } } })
    await expect(apiRequest('/roles')).rejects.toMatchObject({ status: 403, code: 'permission_denied' })
    expect(calls).toHaveLength(1)
    setSessionExpiredHandler(() => {})
  })
})
