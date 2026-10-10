/**
 * White-label branding (backend docs/architecture/white-label.md, "Frontend integration requirements").
 *
 * 1. Before sign-in: GET /branding/resolve?host=<this host>. Until it answers, platform defaults are shown —
 *    never a previous school's branding. A failure (unknown host, network) keeps the defaults.
 * 2. After a school is chosen, the auth layer fetches GET /branding for that school *before* switching the UI
 *    (see AuthProvider) and passes it here through `ActiveBranding`.
 * 3. Branding is presentation only; it never changes navigation or authorization.
 */
import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { branding as brandingApi } from '@/api/endpoints'
import { apiAssetUrl, env } from '@/config/env'
import { BRAND_PROPERTIES, DEFAULT_BRANDING, brandTokens, type Branding } from './theme'

export interface HostBranding {
  branding: Branding
  /** `platform` for EduFlow's own hosts, `subdomain`/`custom` for a school's address. */
  hostKind: 'platform' | 'subdomain' | 'custom'
  /** The school this host belongs to, if any. Requests on a school's host act in that school. */
  hostSchoolId: string | null
  /** False while the resolve call is in flight. */
  ready: boolean
}

const HostCtx = createContext<HostBranding>({ branding: DEFAULT_BRANDING, hostKind: 'platform', hostSchoolId: null, ready: true })
const ActiveCtx = createContext<Branding>(DEFAULT_BRANDING)

export const useHostBranding = () => useContext(HostCtx)
/** The branding the UI should show right now (school's after sign-in, otherwise the host's). */
export const useBranding = () => useContext(ActiveCtx)

export function brandingHost(): string {
  return env.brandingHostOverride || (typeof window !== 'undefined' ? window.location.hostname : '')
}

export function HostBrandingProvider({ children }: { children: ReactNode }) {
  const host = brandingHost()
  const q = useQuery({
    queryKey: ['branding', 'host', host],
    queryFn: () => brandingApi.resolve(host),
    retry: false,
    staleTime: 60_000, // the backend caches resolve for 60 s
    gcTime: Infinity,
  })
  const value: HostBranding = q.data
    ? { branding: q.data, hostKind: q.data.host_kind, hostSchoolId: q.data.school?.id ?? null, ready: true }
    : { branding: DEFAULT_BRANDING, hostKind: 'platform', hostSchoolId: null, ready: !q.isPending }
  return <HostCtx.Provider value={value}>{children}</HostCtx.Provider>
}

/** Applies a branding to the document and makes it available to the tree. */
export function ActiveBranding({ branding, children }: { branding: Branding; children: ReactNode }) {
  useApplyBranding(branding)
  return <ActiveCtx.Provider value={branding}>{children}</ActiveCtx.Provider>
}

export function useApplyBranding(b: Branding) {
  useLayoutEffect(() => {
    const root = document.documentElement
    for (const p of BRAND_PROPERTIES) root.style.removeProperty(p)
    for (const [k, v] of Object.entries(brandTokens(b))) root.style.setProperty(k, v)
    root.dataset.brand = b.school?.code ?? 'default'

    document.title = b.display_name || DEFAULT_BRANDING.display_name
    const fav = document.querySelector<HTMLLinkElement>('link[data-brand-favicon]')
    if (fav) {
      const url = apiAssetUrl(b.favicon_url)
      fav.href = url ?? '/favicon.svg'
      fav.type = url ? '' : 'image/svg+xml'
    }
  }, [b])
}
