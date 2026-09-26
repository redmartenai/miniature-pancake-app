import type { AttendanceDay, DayRibbon } from '@/api/types';
import { parseDate } from '@/lib/format';
import type { Mark, RibbonCell } from '@/ui';

/** Register dot for an attendance day: present, absent, late, off (Sunday/holiday), future. */
export function markFor(day: AttendanceDay): Mark {
  switch (day.status) {
    case 'present':
      return 'p';
    case 'absent':
    case 'excused':
      return 'a';
    case 'late':
    case 'half_day':
      return 'l';
    case 'holiday':
      return 'off';
    default:
      return 'f';
  }
}

/** Mon–Sat weeks for a month grid (Sundays dropped), padded so the 1st lands on its weekday. */
export function schoolWeeks(days: AttendanceDay[]): (AttendanceDay | null)[][] {
  const weekdays = days.filter((d) => parseDate(d.date).getDay() !== 0);
  if (!weekdays.length) return [];
  const lead = (parseDate(weekdays[0].date).getDay() + 6) % 7; // Monday = 0
  const cells: (AttendanceDay | null)[] = [...Array(lead).fill(null), ...weekdays];
  const weeks: (AttendanceDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 6) weeks.push(cells.slice(i, i + 6));
  const last = weeks[weeks.length - 1];
  while (last.length < 6) last.push(null);
  return weeks;
}

/** Mon–Sun weeks for the full calendar (Attendance screen). */
export function calendarWeeks(days: AttendanceDay[]): (AttendanceDay | null)[][] {
  if (!days.length) return [];
  const lead = (parseDate(days[0].date).getDay() + 6) % 7;
  const cells: (AttendanceDay | null)[] = [...Array(lead).fill(null), ...days];
  const weeks: (AttendanceDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const last = weeks[weeks.length - 1];
  while (last.length < 7) last.push(null);
  return weeks;
}

/** API day ribbon → the Ribbon component's cells. */
export function ribbonCells(ribbon: DayRibbon): RibbonCell[] {
  return ribbon.cells.map((c) =>
    c.kind === 'break' ? { kind: 'break' } : { kind: 'period', state: c.state, label: c.short },
  );
}
