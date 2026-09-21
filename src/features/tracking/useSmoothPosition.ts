import { useEffect, useRef, useState } from 'react';

type LatLng = { lat: number; lng: number };

/**
 * Glides the bus marker from its last position to the new one instead of jumping,
 * so a 5-second update rate still looks like a moving bus.
 */
export function useSmoothPosition(target: LatLng | null, durationMs = 1200): LatLng | null {
  const [position, setPosition] = useState<LatLng | null>(target);
  const current = useRef<LatLng | null>(target);

  const lat = target?.lat;
  const lng = target?.lng;

  useEffect(() => {
    if (lat === undefined || lng === undefined) {
      current.current = null;
      setPosition(null);
      return;
    }
    const from = current.current;
    const to = { lat, lng };
    if (!from) {
      current.current = to;
      setPosition(to);
      return;
    }
    const start = Date.now();
    let frame: ReturnType<typeof setTimeout>;
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = { lat: from.lat + (to.lat - from.lat) * eased, lng: from.lng + (to.lng - from.lng) * eased };
      current.current = next;
      setPosition(next);
      if (t < 1) frame = setTimeout(step, 50);
    };
    step();
    return () => clearTimeout(frame);
  }, [lat, lng, durationMs]);

  return position;
}
