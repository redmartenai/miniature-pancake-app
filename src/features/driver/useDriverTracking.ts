import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { IngestResult } from '@/api/types';
import { appStorage } from '@/state/storage';

import { ACTIVE_TRIP_KEY, LOCATION_TASK } from './locationTask';
import { enqueue, flush, pendingCount, toFix } from './queue';

export type GpsState = 'off' | 'denied' | 'searching' | 'live';

/**
 * Shares the bus location while a trip is active.
 * Preferred: a foreground service (keeps going with the screen off).
 * Fallback: on-screen tracking with the screen kept awake (Expo Go, web, or if the service can't start).
 */
export function useDriverTracking(tripId: string | undefined, active: boolean) {
  const [gps, setGps] = useState<GpsState>('off');
  const [pending, setPending] = useState(0);
  const [lastFixAt, setLastFixAt] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<IngestResult | undefined>();
  const usingService = useRef(false);

  useEffect(() => {
    if (!tripId || !active) return;
    let watch: Location.LocationSubscription | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const upload = async () => {
      try {
        const result = await flush(tripId);
        if (result) setLastResult(result);
      } catch {
        // offline: keep the queue for the next attempt
      }
      setPending(await pendingCount(tripId));
    };

    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (!permission.granted) {
        setGps('denied');
        return;
      }
      setGps('searching');
      await appStorage.setJson(ACTIVE_TRIP_KEY, tripId);
      await activateKeepAwakeAsync('trip').catch(() => undefined);

      usingService.current = false;
      if (Platform.OS !== 'web') {
        try {
          if (!(await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK))) {
            await Location.startLocationUpdatesAsync(LOCATION_TASK, {
              accuracy: Location.Accuracy.High,
              timeInterval: 4000,
              distanceInterval: 10,
              pausesUpdatesAutomatically: false,
              activityType: Location.ActivityType.AutomotiveNavigation,
              showsBackgroundLocationIndicator: true,
              foregroundService: {
                notificationTitle: 'Trip in progress',
                notificationBody: 'Sharing the bus location with families',
                notificationColor: '#2E5D4E',
                killServiceOnDestroy: false,
              },
            });
          }
          usingService.current = true;
        } catch {
          usingService.current = false; // e.g. Expo Go: fall back to on-screen tracking
        }
      }

      watch = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        (location) => {
          setLastFixAt(location.timestamp);
          setAccuracy(location.coords.accuracy ?? null);
          setGps('live');
          if (!usingService.current) void enqueue(tripId, [toFix(location)]);
        },
      );
      timer = setInterval(upload, 5000);
      void upload();
    })();

    return () => {
      cancelled = true;
      watch?.remove();
      if (timer) clearInterval(timer);
      deactivateKeepAwake('trip');
    };
  }, [tripId, active]);

  /** Stop sharing and send whatever is still queued. */
  const stop = async () => {
    if (Platform.OS !== 'web' && (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false))) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => undefined);
    }
    if (tripId) {
      try {
        await flush(tripId);
      } catch {
        // leave queued; the next trip screen visit retries
      }
    }
    await appStorage.remove(ACTIVE_TRIP_KEY);
    setGps('off');
  };

  const stale = lastFixAt !== null && Date.now() - lastFixAt > 20_000;
  return { gps: stale && gps === 'live' ? 'searching' : gps, pending, accuracy, lastResult, stop, background: usingService.current };
}
