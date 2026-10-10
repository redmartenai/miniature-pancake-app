/* A tiny fetch router for tests: match "METHOD /path" (without the /api/v1 base) to a JSON response. */
import { vi } from 'vitest'

type Reply = { status?: number; body?: unknown }
export type Handler = (req: { url: URL; init: RequestInit; body: unknown }) => Reply | undefined

export function json(status: number, body: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

export function mockFetch(routes: Record<string, Handler | Reply>) {
  const calls: { method: string; path: string; headers: Record<string, string>; body: unknown }[] = []
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost')
    const method = (init.method ?? 'GET').toUpperCase()
    const path = url.pathname.replace(/^\/api\/v1/, '')
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ method, path, headers: (init.headers ?? {}) as Record<string, string>, body })
    const route = routes[`${method} ${path}`]
    if (!route) return json(404, { error: { code: 'not_found', message: `No mock for ${method} ${path}` } })
    const r = typeof route === 'function' ? route({ url, init, body }) ?? { status: 404 } : route
    return json(r.status ?? 200, r.body)
  })
  vi.stubGlobal('fetch', fn)
  return { fn, calls }
}
