import type { RouteShape, TripLive } from '@/api/types';

export type BusMapProps = {
  route?: RouteShape;
  live?: TripLive;
  myStopId?: string;
  /** Keep the camera on the bus. Turned off when the user pans the map. */
  follow: boolean;
  onUserPan?: () => void;
};
