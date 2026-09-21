import type * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { IS_DRIVER_APP } from '@/lib/config';
import { useSession } from '@/state/session';
import { appStorage } from '@/state/storage';

import { enqueue, flush, toFix } from './queue';

/**
 * Background location for the Driver app. Android runs it as a user-started foreground
 * service (a visible "Trip in progress" notification), which keeps tracking with the
 * screen off and needs no background-location permission. Must be defined at startup.
 */
export const LOCATION_TASK = 'eduflow-trip-location';
export const ACTIVE_TRIP_KEY = 'driver.activeTrip';

if (IS_DRIVER_APP && Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const tripId = await appStorage.getJson<string>(ACTIVE_TRIP_KEY);
    if (!tripId) return;
    await enqueue(tripId, data.locations.map(toFix));
    if (useSession.getState().status === 'loading') await useSession.getState().hydrate();
    try {
      await flush(tripId);
    } catch {
      // Offline: the fixes stay queued and go out with the next upload.
    }
  });
}
