import { describe, expect, it } from 'vitest'
import { can, experiencesFor, homePath } from './experience'

describe('role-aware experiences', () => {
  it('maps backend role keys to the supplied designs, highest priority first', () => {
    expect(experiencesFor(['teacher', 'principal'])).toEqual(['principal', 'staff'])
    expect(experiencesFor(['accountant'])).toEqual(['admin'])
    expect(experiencesFor(['parent', 'parent'])).toEqual(['parent'])
  })

  it('gives roles without a supplied design no experience', () => {
    expect(experiencesFor(['librarian', 'driver', 'custom_ab12'])).toEqual([])
  })

  it('routes principal and admin to web on wide screens, everyone else to mobile', () => {
    expect(homePath('principal', true)).toBe('/principal')
    expect(homePath('principal', false)).toBe('/m/principal')
    expect(homePath('admin', true)).toBe('/admin')
    expect(homePath('staff', true)).toBe('/m/staff')
  })

  it('checks grants and optional scopes', () => {
    const g = { 'attendance.approve': ['school' as const], 'student.read': ['section' as const] }
    expect(can(g, 'attendance.approve')).toBe(true)
    expect(can(g, 'student.read', ['school'])).toBe(false)
    expect(can(g, 'audit.read')).toBe(false)
    expect(can(null, 'audit.read')).toBe(false)
  })
})
