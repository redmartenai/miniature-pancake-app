/* Attendance vocabulary and the "register wall" model shared by the Principal, Admin and Teacher screens. */
import { useMemo } from 'react'
import type { AttendanceStatus, DayStatus, S } from '@/api/endpoints'
import { useClasses, useRegisters, type ClassInfo } from '@/api/queries'
import type { Tone } from '@/components/ui'

export const STATUS: Record<AttendanceStatus, { label: string; short: string; tone: Tone }> = {
  present: { label: 'Present', short: 'P', tone: 'forest' },
  absent: { label: 'Absent', short: 'A', tone: 'rust' },
  late: { label: 'Late', short: 'L', tone: 'amber' },
  half_day: { label: 'Half day', short: 'H', tone: 'slate' },
  excused: { label: 'Excused', short: 'E', tone: 'stone' },
}

export const DAY_STATUS: Record<DayStatus, { label: string; cell: string }> = {
  present: { label: 'Present', cell: 'bg-forest-p text-forest' },
  late: { label: 'Late', cell: 'bg-copper-p text-copper-d ring-1 ring-copper/30' },
  half_day: { label: 'Half day', cell: 'bg-slate-p text-slate ring-1 ring-slate/20' },
  excused: { label: 'Excused', cell: 'bg-paper text-stone ring-1 ring-stone-p' },
  absent: { label: 'Absent', cell: 'bg-rust text-ivory' },
  not_marked: { label: 'Not marked', cell: 'text-stone-l' },
  upcoming: { label: 'Upcoming', cell: 'text-stone-l' },
}

/** Children physically in school: present, late or half day. Absent and excused are away. */
export const inSchool = (c: S['StatusCounts']) => c.present + c.late + c.half_day
export const totalOf = (c: S['StatusCounts']) => c.present + c.absent + c.late + c.half_day + c.excused

export type TileState = 'awaiting' | 'marked'
export interface WallTile { cls: ClassInfo; register: S['RegisterOut'] | null; state: TileState }

/** Every class with today's register (or none yet), not-yet-taken first. */
export function useWall(date: string) {
  const classes = useClasses({ withCounts: true })
  const registers = useRegisters(date)
  const tiles = useMemo<WallTile[] | undefined>(() => {
    if (!classes.data || !registers.data) return undefined
    return classes.data
      .map(cls => {
        const register = registers.data.find(r => r.section.id === cls.id) ?? null
        return { cls, register, state: (register ? 'marked' : 'awaiting') as TileState }
      })
      .sort((a, b) => (a.state === b.state ? 0 : a.state === 'awaiting' ? -1 : 1))
  }, [classes.data, registers.data])
  const marked = tiles?.filter(t => t.state === 'marked') ?? []
  const totals = marked.reduce((acc, t) => {
    const c = t.register!.counts
    acc.in += inSchool(c); acc.absent += c.absent + c.excused; acc.total += totalOf(c)
    return acc
  }, { in: 0, absent: 0, total: 0 })
  return {
    tiles,
    marked: marked.length,
    totals,
    isPending: classes.isPending || registers.isPending,
    error: classes.error ?? registers.error,
    refetch: () => { classes.refetch(); registers.refetch() },
  }
}
