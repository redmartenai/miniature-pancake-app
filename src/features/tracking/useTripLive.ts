import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { api } from '@/api/endpoints';
import type { RouteShape, TripLive } from '@/api/types';
import { subscribe, useRealtimeStatus } from '@/features/realtime/realtime';

/**
 * Live bus state for one trip.
 *   - Realtime push (Centrifugo) updates the cache the moment a new GPS fix is processed.
 *   - Polling is the safety net: every 5 s without realtime (weak networks), every 20 s with it.
 * Either path alone keeps the map correct, so tracking survives network drops and server restarts.
 */
export function useTripLive(tripId?: string | null) {
  const queryClient = useQueryClient();
  const realtime = useRealtimeStatus((s) => s.status);

  const query = useQuery({
    queryKey: ['trip-live', tripId],
    queryFn: () => api.tripLive(tripId as string),
    enabled: !!tripId,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (!status || status === 'completed' || status === 'cancelled') return false;
      // Starting a trip is pushed over realtime, so a waiting home screen can poll gently.
      if (status === 'scheduled') return realtime === 'connected' ? 60_000 : 30_000;
      return realtime === 'connected' ? 20_000 : 5_000;
    },
  });

  const status = query.data?.status;
  const watchable = status === 'active' || status === 'scheduled';

  useEffect(() => {
    if (!tripId || !watchable) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void subscribe(
      `trip:${tripId}`,
      (data) => {
        const message = data as { type?: string; trip?: TripLive };
        if (message.type === 'trip.live' && message.trip) {
          queryClient.setQueryData(['trip-live', tripId], message.trip);
        }
      },
      async () => {
        const token = await api.tripSubscription(tripId);
        if (!token.enabled) throw new Error('Realtime is off');
        return token.token;
      },
    ).then((fn) => {
      if (cancelled) fn();
      else unsubscribe = fn;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [tripId, watchable, queryClient]);

  return { ...query, isRealtime: realtime === 'connected' && watchable };
}

export function useRouteShape(routeId?: string, direction?: 'pickup' | 'drop') {
  return useQuery<RouteShape>({
    queryKey: ['route', routeId, direction],
    queryFn: () => api.route(routeId as string, direction as 'pickup' | 'drop'),
    enabled: !!routeId && !!direction,
    staleTime: 60 * 60 * 1000, // the route line rarely changes
  });
}
