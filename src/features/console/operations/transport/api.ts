import { useMutation, useQueryClient } from '@tanstack/react-query';

import { http } from '@/api/client';
import { useConsoleQuery } from '@/features/console/api';

/** Times are the school's local "HH:MM" (24h); format with `formatClock` / `clockShort`. */
export type FleetStatus = 'late' | 'on_time' | 'scheduled' | 'cancelled' | 'arrived' | 'depot';
export type StopState = 'departed' | 'arrived' | 'at_stop' | 'next' | 'upcoming' | 'skipped';
export type LatLng = [number, number];

export type VehicleInfo = {
  id: string;
  label: string;
  registration_no: string;
  capacity: number;
  gps: boolean;
  fitness_valid_until: string | null;
  insurance_valid_until: string | null;
  permit_valid_until: string | null;
};

export type BusPosition = { lat: number; lng: number; heading: number | null; speed_kmh: number | null; at: string | null };

export type FleetRow = {
  /** The route id, or the vehicle id for a bus without a route. */
  id: string;
  kind: 'route' | 'vehicle';
  route_id: string | null;
  code: string | null;
  label: string;
  vehicle: VehicleInfo | null;
  trip_id: string | null;
  status: FleetStatus;
  delay: number;
  on_board: number;
  riders: number;
  signal: 'live' | 'weak' | 'lost' | 'none';
  position: BusPosition | null;
  next_stop: { name: string; eta: string | null; planned: string } | null;
  held: { stop: string; minutes: number } | null;
  start: string | null;
  path: { line: LatLng[]; done: LatLng[] };
  stops: { id: string; name: string; lat: number; lng: number; is_school: boolean; state: StopState }[];
};

export type TransportException = {
  id: string;
  kind: 'held' | 'stop_change' | 'not_scanned' | 'off_manifest';
  status: 'open' | 'resolved';
  students: { id: string; name: string; class: string }[];
  route: string | null;
  from_stop: string | null;
  to_stop: string | null;
  note: string;
  at: string | null;
};

export type TransportLive = {
  generated_at: string;
  updated: string;
  live: boolean;
  last_fix: string | null;
  run: { direction: 'pickup' | 'drop'; started: string | null; ends: string | null; next_start: string | null };
  counts: { buses: number; on_road: number; late: number; arrived: number; depot: number; scheduled: number; cancelled: number };
  school: { name: string; lat: number; lng: number } | null;
  fleet: FleetRow[];
  selected: string | null;
  exceptions: { open: number; items: TransportException[] };
};

export type TimelineStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  is_school: boolean;
  state: StopState;
  planned: string;
  eta: string | null;
  arrived: string | null;
  departed: string | null;
  held_minutes: number | null;
  students: number;
};

export type RouteRun = {
  route: { id: string; code: string; name: string };
  vehicle: VehicleInfo | null;
  trip: { id: string; direction: 'pickup' | 'drop'; status: string; start: string; started: string | null; ended: string | null };
  status: FleetStatus;
  delay: number;
  reason: string | null;
  held: { stop: string; minutes: number } | null;
  position: BusPosition | null;
  crew: { role: 'driver' | 'attendant'; id: string; name: string; phone: string; phone_display: string | null }[];
  riders: number;
  on_board: number;
  dropped: number;
  absent: { id: string; name: string; class: string }[];
  stops: TimelineStop[];
  service_stops: number;
  next: { name: string; planned: string; eta: string | null } | null;
  final: { name: string; planned: string; eta: string | null } | null;
  notify: { families: number; last_sent: string | null };
};

export type ManagedRoute = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  vehicle: VehicleInfo | null;
  driver: string | null;
  attendant: string | null;
  riders: number;
  length_km: number;
  pickup_start: string;
  drop_start: string;
  stops: { id: string; name: string; is_school: boolean; pickup: number; drop: number; riders: number }[];
};

export type NotifyInput = { title: string; body: string; sms: boolean };

export const transportApi = {
  live: () => http.get<TransportLive>('/console/transport'),
  route: (id: string) => http.get<RouteRun>(`/console/transport/routes/${id}`),
  routes: () => http.get<{ routes: ManagedRoute[]; spare_vehicles: VehicleInfo[] }>('/console/transport/routes'),
  notify: (id: string, input: NotifyInput) =>
    http.post<{ id: string; recipients: number; delivered: Record<string, number> }>(`/console/transport/routes/${id}/notify`, input),
};

/** Buses report every few seconds; the page refreshes every 15. */
export const LIVE_POLL_MS = 15_000;

export function useTransportLive() {
  return useConsoleQuery(['transport', 'live'], transportApi.live, { refetchInterval: LIVE_POLL_MS });
}

export function useRouteRun(id: string | null) {
  return useConsoleQuery(['transport', 'route', id], () => transportApi.route(id!), { refetchInterval: LIVE_POLL_MS, enabled: !!id });
}

export function useManagedRoutes(enabled: boolean) {
  return useConsoleQuery(['transport', 'routes'], transportApi.routes, { enabled });
}

export function useNotifyRoute(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NotifyInput) => transportApi.notify(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['console'] }),
  });
}
