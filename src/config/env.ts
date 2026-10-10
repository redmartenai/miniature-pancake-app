/**
 * Build-time configuration. Every value here ends up in the public bundle — never put secrets in VITE_*.
 * See .env.example.
 */

function trimSlash(s: string) {
  return s.replace(/\/+$/, '')
}

const rawBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api/v1'

export const env = {
  /** Base of the versioned API, e.g. "/api/v1" (same-origin, default) or "https://api.example.com/api/v1". */
  apiBaseUrl: trimSlash(rawBase),
  /** Optional host to resolve branding for instead of window.location.hostname (development). */
  brandingHostOverride: (import.meta.env.VITE_BRANDING_HOST_OVERRIDE as string | undefined)?.trim() || '',
} as const

/** Origin that API-relative paths (such as branding asset URLs "/api/v1/branding/assets/…") resolve against. */
export function apiOrigin(): string {
  if (/^https?:\/\//i.test(env.apiBaseUrl)) return new URL(env.apiBaseUrl).origin
  return typeof window !== 'undefined' ? window.location.origin : ''
}

/** Turn an API path returned by the backend (e.g. a logo_url) into a URL the browser can load. */
export function apiAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  return `${apiOrigin()}${path.startsWith('/') ? '' : '/'}${path}`
}
