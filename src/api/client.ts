/**
 * The one HTTP client for the EduFlow API (backend docs/api/conventions.md).
 *
 * - JSON, `snake_case`, no trailing slashes, every route under the configured base (`/api/v1`).
 * - Sends `Authorization: Bearer`, `X-School-Id` for school-scoped calls and an `X-Request-ID`.
 * - Every failure becomes an `ApiError` built from the single error envelope; branch on `code`, never `message`.
 * - On `401 not_authenticated` it refreshes once (single-flight), retries once, and signs out if that fails.
 * - Never retries a `403`.
 */
import { env } from '@/config/env'
import { session } from './session'
import type { components } from './schema'

export type Schemas = components['schemas']

export interface ErrorEnvelope {
  error: {
    code: string
    message: string
    fields?: Record<string, string[]>
    retry_after_seconds?: number
    request_id?: string
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string[]>
  readonly requestId?: string
  readonly retryAfterSeconds?: number

  constructor(status: number, code: string, message: string, extra: { fields?: Record<string, string[]>; requestId?: string; retryAfterSeconds?: number } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = extra.fields ?? {}
    this.requestId = extra.requestId
    this.retryAfterSeconds = extra.retryAfterSeconds
  }

  /** First message for a field (or the non-field errors), for inline form validation. */
  fieldError(name: string): string | undefined {
    return this.fields[name]?.[0]
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError

/** Messages for failures that never reach the server's envelope. */
const NETWORK_MESSAGE = "We couldn't reach EduFlow. Check your connection and try again."
const UNKNOWN_MESSAGE = 'Something went wrong on our side. Please try again.'

export type Query = Record<string, string | number | boolean | null | undefined>

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Query
  body?: unknown
  /** `false` for public endpoints (no bearer token, no refresh on 401). */
  auth?: boolean
  /**
   * The school header. Defaults to the session's active school for authenticated calls.
   * Pass `null` to send none (user-level endpoints such as `/me`), or an id to target a specific school.
   */
  schoolId?: string | null
  idempotencyKey?: string
  signal?: AbortSignal
}

type SessionExpiredHandler = () => void
let onSessionExpired: SessionExpiredHandler = () => {}
/** The auth layer registers what happens when the session can no longer be refreshed. */
export function setSessionExpiredHandler(fn: SessionExpiredHandler) {
  onSessionExpired = fn
}

export function newRequestId(): string {
  const c = globalThis.crypto
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, '')
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

export function buildUrl(path: string, query?: Query): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === '') continue
    qs.set(k, String(v))
  }
  const s = qs.toString()
  return `${env.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}${s ? `?${s}` : ''}`
}

async function toApiError(res: Response): Promise<ApiError> {
  let payload: unknown = null
  try {
    payload = await res.json()
  } catch {
    /* not JSON — e.g. a proxy error page */
  }
  const env = (payload as ErrorEnvelope | null)?.error
  if (env && typeof env.code === 'string') {
    return new ApiError(res.status, env.code, env.message || UNKNOWN_MESSAGE, {
      fields: env.fields,
      requestId: env.request_id ?? res.headers.get('X-Request-ID') ?? undefined,
      retryAfterSeconds: env.retry_after_seconds,
    })
  }
  const code = res.status === 404 ? 'not_found' : res.status >= 500 ? 'server_error' : 'bad_request'
  return new ApiError(res.status, code, UNKNOWN_MESSAGE, { requestId: res.headers.get('X-Request-ID') ?? undefined })
}

let refreshing: Promise<boolean> | null = null

/** Exchange the refresh token for a new pair. Refresh tokens are single-use: always store the new one. */
function refreshTokens(): Promise<boolean> {
  if (refreshing) return refreshing
  const current = session.getTokens()
  if (!current) return Promise.resolve(false)
  refreshing = (async () => {
    try {
      const res = await fetch(buildUrl('/auth/token/refresh'), {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Request-ID': newRequestId() },
        body: JSON.stringify({ refresh: current.refresh }),
      })
      if (!res.ok) return false
      const pair = (await res.json()) as Schemas['TokenPairOut']
      session.setTokens({ access: pair.access, refresh: pair.refresh })
      return true
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

async function send(path: string, opts: RequestOptions): Promise<Response> {
  const auth = opts.auth !== false
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Request-ID': newRequestId() }
  const tokens = session.getTokens()
  if (auth && tokens) headers.Authorization = `Bearer ${tokens.access}`
  const school = opts.schoolId === undefined ? (auth ? session.getSchoolId() : null) : opts.schoolId
  if (school) headers['X-School-Id'] = school
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey

  let body: BodyInit | undefined
  if (opts.body instanceof FormData) {
    body = opts.body // the browser sets the multipart boundary
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }

  try {
    return await fetch(buildUrl(path, opts.query), { method: opts.method ?? 'GET', headers, body, signal: opts.signal })
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e
    throw new ApiError(0, 'network_error', NETWORK_MESSAGE)
  }
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await send(path, opts)

  if (res.status === 401 && opts.auth !== false && session.getTokens()) {
    const err = await toApiError(res)
    if (err.code !== 'not_authenticated') throw err
    if (await refreshTokens()) {
      res = await send(path, opts)
    } else {
      onSessionExpired()
      throw err
    }
    if (res.status === 401) {
      onSessionExpired()
      throw await toApiError(res)
    }
  }

  if (!res.ok) throw await toApiError(res)
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** Follow cursor pagination (`{next, previous, results}`) to collect every page, up to a safety cap. */
export async function apiListAll<T>(path: string, query: Query = {}, opts: Omit<RequestOptions, 'query'> = {}, maxPages = 20): Promise<T[]> {
  const out: T[] = []
  let cursor: string | undefined
  for (let i = 0; i < maxPages; i++) {
    const page = await apiRequest<{ next: string | null; results: T[] }>(path, { ...opts, query: { page_size: 200, ...query, cursor } })
    out.push(...page.results)
    if (!page.next) break
    cursor = new URL(page.next, 'http://x').searchParams.get('cursor') ?? undefined
    if (!cursor) break
  }
  return out
}
