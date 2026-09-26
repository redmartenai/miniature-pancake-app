import type { TFunction } from 'i18next';
import { View } from 'react-native';

import type { AttendanceStatus, DayCell, PeriodCell, TeacherDay } from '@/api/types';
import { clockShort } from '@/lib/format';
import { RegisterDot, type RibbonCell } from '@/ui';

export const isPeriod = (c: DayCell): c is PeriodCell => 'period' in c;

/** The teacher's day as ribbon cells: taught, free (dashed), cover (lavender), and the period on now. */
export function staffRibbon(day: TeacherDay, t: TFunction): RibbonCell[] {
  return day.cells.map((c) => {
    if (!isPeriod(c)) return { kind: 'break' };
    const label = c.kind === 'cover' ? t('staff.ribbon.cover') : c.kind === 'free' ? t('staff.ribbon.free') : (c.class?.short_label ?? '');
    if (c.state === 'now') return { kind: 'period', state: 'now', label: c.kind === 'free' ? t('staff.ribbon.free') : label };
    if (c.kind === 'free') return { kind: 'period', state: 'free', label };
    if (c.kind === 'cover') return { kind: 'period', state: 'cover', label };
    return { kind: 'period', state: c.state === 'done' ? 'done' : 'todo', label };
  });
}

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const minutesLeft = (cell: PeriodCell, now = new Date()) => Math.max(0, minutes(cell.ends_at) - (now.getHours() * 60 + now.getMinutes()));

/** "Free till 2:30", "In 6-B till 9:05", "Cover in 6-C till 1:45", "Next: 7-A at 9:05", "Done for today". */
export function statusTitle(day: TeacherDay, t: TFunction): string {
  const periods = day.cells.filter(isPeriod);
  if (!periods.length) return t('staff.status.noSchool');
  const current = day.current;
  if (current) {
    if (current.kind === 'free') {
      // Free until the next thing that isn't free (or the end of the day).
      const after = periods.filter((p) => p.period > current.period);
      const busy = after.find((p) => p.kind !== 'free');
      return t('staff.status.freeTill', { time: clockShort(busy ? busy.starts_at : (day.ends_at ?? current.ends_at)) });
    }
    const label = current.class?.short_label ?? '';
    return current.kind === 'cover'
      ? t('staff.status.coverTill', { class: label, time: clockShort(current.ends_at) })
      : t('staff.status.inTill', { class: label, time: clockShort(current.ends_at) });
  }
  const next = day.next;
  if (next) {
    const upcoming = periods.find((p) => p.state === 'todo' && p.kind !== 'free');
    return upcoming ? t('staff.status.next', { class: upcoming.class?.short_label ?? '', time: clockShort(upcoming.starts_at) }) : t('staff.status.freeRest');
  }
  return t('staff.status.done');
}

export function markOf(status: AttendanceStatus | null | undefined): 'p' | 'a' | 'l' | 'f' {
  if (!status) return 'f';
  if (status === 'absent' || status === 'excused') return 'a';
  if (status === 'late' || status === 'half_day') return 'l';
  return 'p';
}

/** A roll call as rows of small register dots, in roll order. */
export function RollDots({ rolls, perRow, gap = 3, rowGap = 4 }: { rolls: { status: AttendanceStatus | null }[]; perRow: number; gap?: number; rowGap?: number }) {
  const rows: (typeof rolls)[] = [];
  for (let i = 0; i < rolls.length; i += perRow) rows.push(rolls.slice(i, i + perRow));
  return (
    <View style={{ gap: rowGap }} accessible={false}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap }}>
          {row.map((roll, i) => (
            <RegisterDot key={i} mark={markOf(roll.status)} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** "Unit Test 2" → "UT2". */
export function shortExam(name: string): string {
  const unit = /^Unit Test (\d+)$/i.exec(name);
  return unit ? `UT${unit[1]}` : name;
}
