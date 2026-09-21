import type * as Location from 'expo-location';

import { api } from '@/api/endpoints';
import type { IngestResult, PositionFix } from '@/api/types';
import { newClientId } from '@/lib/ids';
import { appStorage } from '@/state/storage';

/**
 * Offline-safe GPS queue. Every fix gets a client id and is stored before upload, so a
 * dropped network never loses the bus's path and a retried upload never duplicates it.
 */

const MAX_QUEUE = 3000;
const BATCH = 50;
const key = (tripId: string) => `driver.queue.${tripId}`;

let lock: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.catch(() => undefined);
  return run;
}

export function toFix(location: Location.LocationObject): PositionFix {
  const { coords } = location;
  return {
    client_id: newClientId(),
    lat: coords.latitude,
    lng: coords.longitude,
    speed: coords.speed !== null && coords.speed >= 0 ? coords.speed : null,
    heading: coords.heading !== null && coords.heading >= 0 ? coords.heading : null,
    accuracy: coords.accuracy ?? null,
    recorded_at: new Date(location.timestamp).toISOString(),
  };
}

export function enqueue(tripId: string, fixes: PositionFix[]): Promise<void> {
  return withLock(async () => {
    const queue = (await appStorage.getJson<PositionFix[]>(key(tripId))) ?? [];
    queue.push(...fixes);
    await appStorage.setJson(key(tripId), queue.slice(-MAX_QUEUE));
  });
}

export async function pendingCount(tripId: string): Promise<number> {
  return ((await appStorage.getJson<PositionFix[]>(key(tripId))) ?? []).length;
}

let flushing = false;

/** Upload everything waiting, oldest first. Safe to call often; only one upload runs at a time. */
export async function flush(tripId: string): Promise<IngestResult | undefined> {
  if (flushing) return undefined;
  flushing = true;
  let last: IngestResult | undefined;
  try {
    for (;;) {
      const queue = (await appStorage.getJson<PositionFix[]>(key(tripId))) ?? [];
      if (!queue.length) break;
      const batch = queue.slice(0, BATCH);
      last = await api.sendPositions(tripId, batch);
      const sent = new Set(batch.map((f) => f.client_id));
      await withLock(async () => {
        const current = (await appStorage.getJson<PositionFix[]>(key(tripId))) ?? [];
        await appStorage.setJson(
          key(tripId),
          current.filter((f) => !sent.has(f.client_id)),
        );
      });
    }
  } finally {
    flushing = false;
  }
  return last;
}

export function clearQueue(tripId: string): Promise<void> {
  return withLock(() => appStorage.remove(key(tripId)));
}
