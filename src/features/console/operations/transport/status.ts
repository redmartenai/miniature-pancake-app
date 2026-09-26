import type { TFunction } from 'i18next';

import { formatClock } from '@/lib/format';
import type { PillTone, TileTone } from '@/ui';

import type { FleetStatus } from './api';

const T = 'console.operations.transport';

/** The fleet pill: "12 min late", "On time", "Arrived", "In depot"… */
export function statusPill(
  t: TFunction,
  row: { status: FleetStatus; delay: number; start?: string | null },
): { label: string; tone: PillTone } {
  switch (row.status) {
    case 'late':
      return { label: t(`${T}.fleet.status.late`, { count: row.delay }), tone: 'warn' };
    case 'on_time':
      return { label: t(`${T}.fleet.status.on_time`), tone: 'ok' };
    case 'scheduled':
      return { label: t(`${T}.fleet.status.scheduled`, { time: formatClock(row.start) }), tone: 'neutral' };
    case 'cancelled':
      return { label: t(`${T}.fleet.status.cancelled`), tone: 'bad' };
    case 'arrived':
      return { label: t(`${T}.fleet.status.arrived`), tone: 'info' };
    default:
      return { label: t(`${T}.fleet.status.depot`), tone: 'neutral' };
  }
}

export function statusTile(status: FleetStatus): TileTone {
  if (status === 'late') return 'warn';
  if (status === 'arrived') return 'info';
  if (status === 'depot' || status === 'cancelled') return 'neutral';
  return 'brand';
}
