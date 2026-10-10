import { describe, expect, it } from 'vitest'
import { NEXT, exceptionsOf } from './Register'

describe('register submission', () => {
  it('sends exceptions only — a student left out is present', () => {
    expect(exceptionsOf({ a: 'present', b: 'absent', c: 'late', d: 'present' })).toEqual([
      { student_id: 'b', status: 'absent' },
      { student_id: 'c', status: 'late' },
    ])
  })

  it('keeps half-day and excused marks untouched on re-save (client issue C1)', () => {
    expect(exceptionsOf({ a: 'half_day', b: 'excused' })).toEqual([
      { student_id: 'a', status: 'half_day' },
      { student_id: 'b', status: 'excused' },
    ])
  })

  it('cycles Present → Absent → Late → Present on tap', () => {
    expect(NEXT.present).toBe('absent')
    expect(NEXT.absent).toBe('late')
    expect(NEXT.late).toBe('present')
  })
})
