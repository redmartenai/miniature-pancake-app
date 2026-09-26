import type { FleetRow, TransportLive } from './api';

export type FleetMapProps = {
  data: TransportLive;
  /** The selected fleet row (a route or a bus in the depot). */
  selected: FleetRow | null;
  /** Other routes drawn in colour for comparison (up to three). */
  compare: FleetRow[];
  onSelect: (id: string) => void;
};
