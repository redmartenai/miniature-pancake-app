import type { TFunction } from 'i18next';

import type { TripLive, TripStop } from '@/api/types';
import { formatClock, formatEta, formatTime } from '@/lib/format';
import type { Tone } from '@/theme/tokens';

export function agoText(seconds: number | null | undefined, t: TFunction): string {
  if (seconds === null || seconds === undefined) return '';
  if (seconds < 45) return t('time.justNow');
  return t('time.minutesAgo', { count: Math.round(seconds / 60) });
}

/** Headline for a trip: what a parent most needs to know at a glance. */
export function tripHeadline(live: TripLive, myStop: TripStop | undefined, t: TFunction): { title: string; tone: Tone } {
  if (live.status === 'scheduled') return { title: t('bus.startsAt', { time: formatClock(live.scheduled_start) }), tone: 'neutral' };
  if (live.status === 'completed' || live.status === 'cancelled') {
    return live.arrived_at_school
      ? { title: t('bus.reachedSchool', { time: formatTime(live.arrived_at_school) }), tone: 'success' }
      : { title: t('bus.completed'), tone: 'neutral' };
  }
  if (live.signal === 'lost') return { title: t('bus.signalLost', { ago: agoText(live.last_update_seconds, t) }), tone: 'warning' };
  if (myStop?.status === 'at_stop') return { title: t('bus.atStop', { stop: myStop.name }), tone: 'success' };
  if (live.next_stop?.status === 'at_stop') return { title: t('bus.atStop', { stop: live.next_stop.name }), tone: 'primary' };
  return { title: t('bus.onTheWay'), tone: 'primary' };
}

/** What a parent wants to know once the bus has left their stop. */
export function afterMyStopLine(live: TripLive, myStopId: string, t: TFunction): string | null {
  const school = live.stops[live.stops.length - 1];
  if (live.direction === 'pickup' && school && school.id !== myStopId && school.eta_seconds !== null) {
    return school.eta_seconds < 45 ? t('bus.arrivingAtSchool') : t('bus.reachesSchoolIn', { eta: formatEta(school.eta_seconds) });
  }
  if (live.next_stop) return `${t('bus.nextStop')}: ${live.next_stop.name} · ${formatEta(live.next_stop.eta_seconds)}`;
  return null;
}

export function stopLine(stop: TripStop, live: TripLive, t: TFunction): string {
  switch (stop.status) {
    case 'departed':
      return `${t('bus.departed')}${stop.arrived_at ? ` · ${formatTime(stop.arrived_at)}` : ''}`;
    case 'skipped':
      return t('bus.skipped');
    case 'at_stop':
      return t('bus.hereNow');
    default:
      if (live.status === 'active' && stop.eta_seconds !== null) return formatEta(stop.eta_seconds);
      return formatClock(stop.scheduled_time);
  }
}
