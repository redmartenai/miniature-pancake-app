/* Shared helpers for the Principal web surface. */
import { useMemo } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { can } from '@/auth/experience'
import type { Scope } from '@/api/endpoints'

export const BASE = '/principal'

/** Pure colour values for animating background/border (Framer can't tween Tailwind classes). Brand families use CSS variables. */
export const HEX = {
  forest: 'var(--color-forest)', forestL: 'var(--color-forest-l)', forestP: 'var(--color-forest-p)',
  copper: 'var(--color-copper)', copperP: 'var(--color-copper-p)',
  amber: '#E0A53F', amberP: '#FBF0D9',
  rust: '#A4483A', rustP: '#F5E3DF',
  slate: '#4E5A66', slateP: '#E7EBEE',
  stone: '#8B8377', stoneL: '#B6AFA3', stoneP: '#DCD6CB',
  line: '#E2DCD1', line2: '#EDE8DF', ivory2: '#FDFCF8', paper: '#F0EBE2', ink: '#241F1B',
}

/** Permission check against the member's effective grants (presentation only). */
export function useCan() {
  const { grants } = useAuth()
  return useMemo(() => (codename: string, scopes?: Scope[]) => can(grants, codename, scopes), [grants])
}

export const pct0 = (n: number) => `${Math.round(n * 100)}%`
