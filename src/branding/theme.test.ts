import { describe, expect, it } from 'vitest'
import { BRAND_PROPERTIES, DEFAULT_BRANDING, brandTokens, mix, parseHex } from './theme'

describe('branding tokens', () => {
  it('keeps the design palette for default branding', () => {
    expect(brandTokens(DEFAULT_BRANDING)).toEqual({})
  })

  it('maps primary to the forest family and secondary to copper, with on-colours', () => {
    const t = brandTokens({ ...DEFAULT_BRANDING, is_default: false, primary_color: '#1d4ed8', secondary_color: '#f59e0b', on_primary: '#FFFFFF', on_secondary: '#000000' })
    expect(t['--color-forest']).toBe('#1D4ED8')
    expect(t['--color-copper']).toBe('#F59E0B')
    expect(t['--color-on-forest']).toBe('#FFFFFF')
    expect(t['--color-on-copper']).toBe('#000000')
    expect(t['--color-forest-p']).toMatch(/^#[0-9A-F]{6}$/)
    for (const k of Object.keys(t)) expect(BRAND_PROPERTIES).toContain(k)
  })

  it('ignores invalid colours instead of applying them', () => {
    const t = brandTokens({ ...DEFAULT_BRANDING, is_default: false, primary_color: 'red; background:url(x)', secondary_color: '#abc' })
    expect(t['--color-forest']).toBeUndefined()
    expect(t['--color-copper']).toBe('#AABBCC')
  })

  it('parses and mixes hex colours', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255])
    expect(parseHex('nope')).toBeNull()
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080')
  })
})
