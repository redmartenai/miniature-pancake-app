/**
 * School branding → design tokens. Pure functions, so they can be tested without a DOM.
 *
 * The design's "forest" family carries the primary colour and "copper" the secondary. A school's colours
 * replace those two families; every other token (paper, ink, rust, amber…) keeps its meaning.
 */
import type { Schemas } from '@/api/client'

export type Branding = Pick<Schemas['BrandingOut'], 'display_name' | 'primary_color' | 'secondary_color' | 'on_primary' | 'on_secondary' | 'logo_url' | 'favicon_url' | 'version' | 'is_default'> & {
  school: Schemas['BrandSchoolOut'] | null
}

/** The platform's own identity, used before (or instead of) a school's branding. */
export const DEFAULT_BRANDING: Branding = {
  school: null,
  display_name: 'EduFlow',
  primary_color: '#2E5D4E',
  secondary_color: '#B4763A',
  on_primary: '#FFFFFF',
  on_secondary: '#FFFFFF',
  logo_url: null,
  favicon_url: null,
  version: 0,
  is_default: true,
}

type RGB = [number, number, number]

export function parseHex(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1]
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

const toHex = ([r, g, b]: RGB) => `#${[r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`.toUpperCase()

/** Linear mix: `amount` 0 → a, 1 → b. */
export function mix(a: string, b: string, amount: number): string {
  const x = parseHex(a), y = parseHex(b)
  if (!x || !y) return a
  return toHex([0, 1, 2].map(i => x[i] + (y[i] - x[i]) * amount) as RGB)
}

const IVORY = '#F8F5EF'
const INK = '#241F1B'

/** CSS custom properties for one colour family: base, dark, light and the pale tint used for backgrounds. */
function family(name: 'forest' | 'copper', base: string, on: string): Record<string, string> {
  return {
    [`--color-${name}`]: base,
    [`--color-${name}-d`]: mix(base, INK, 0.2),
    [`--color-${name}-l`]: mix(base, '#FFFFFF', 0.14),
    [`--color-${name}-p`]: mix(base, IVORY, 0.86),
    [`--color-on-${name}`]: on,
  }
}

/**
 * Tokens to apply for a branding. Default branding returns nothing, so the design palette in index.css stays.
 * Invalid colours are ignored rather than applied.
 */
export function brandTokens(b: Branding): Record<string, string> {
  if (b.is_default) return {}
  const out: Record<string, string> = {}
  if (parseHex(b.primary_color)) Object.assign(out, family('forest', toHex(parseHex(b.primary_color)!), b.on_primary || '#FFFFFF'))
  if (parseHex(b.secondary_color)) Object.assign(out, family('copper', toHex(parseHex(b.secondary_color)!), b.on_secondary || '#FFFFFF'))
  return out
}

/** Every property brandTokens can set, so switching schools can clear the previous school's theme. */
export const BRAND_PROPERTIES = [
  ...['forest', 'copper'].flatMap(n => [`--color-${n}`, `--color-${n}-d`, `--color-${n}-l`, `--color-${n}-p`, `--color-on-${n}`]),
]
