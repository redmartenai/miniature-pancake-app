import clsx from 'clsx'
import { useState } from 'react'
import { useBranding } from '@/branding/BrandingProvider'
import { apiAssetUrl } from '@/config/env'

export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" style={{ fill: 'var(--color-forest)' }} />
      <path d="M9 21c3-7 7-10 14-11-4 3-6 7-7 12" stroke="#F8F5EF" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="23" cy="10" r="2.2" style={{ fill: 'var(--color-copper-l)' }} />
    </svg>
  )
}

/** The school's logo when it has one, otherwise the mark with its display name (EduFlow by default). */
export function Logo({ className, light }: { className?: string; light?: boolean }) {
  const b = useBranding()
  const src = apiAssetUrl(b.logo_url)
  const [broken, setBroken] = useState<string | null>(null)
  if (src && broken !== src) {
    return <img src={src} alt={b.display_name} onError={() => setBroken(src)} className={clsx('h-8 max-w-[168px] object-contain', className)} />
  }
  return (
    <span className={clsx('inline-flex min-w-0 items-center gap-2.5', className)}>
      <LogoMark />
      <span className={clsx('truncate font-display text-[21px] tracking-[-0.02em]', light ? 'text-ivory' : 'text-ink')}>{b.display_name}</span>
    </span>
  )
}
