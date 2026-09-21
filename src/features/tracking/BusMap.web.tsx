import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect } from 'react';
import { View } from 'react-native';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';

import { MAP_ATTRIBUTION, MAP_TILE_URL } from '@/lib/config';
import { useTheme } from '@/theme/ThemeProvider';

import type { BusMapProps } from './BusMap.types';
import { useSmoothPosition } from './useSmoothPosition';

const BUS_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM18 11H6V6h12v5z"/></svg>';

function busIcon(background: string, foreground: string, border: string) {
  return L.divIcon({
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `<div style="width:38px;height:38px;border-radius:19px;background:${background};color:${foreground};border:3px solid ${border};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3)">${BUS_SVG}</div>`,
  });
}

function FitRoute({ path }: { path: [number, number][] }) {
  const map = useMap();
  const key = path.length ? `${path[0].join()}-${path[path.length - 1].join()}` : '';
  useEffect(() => {
    if (path.length > 1) map.fitBounds(L.latLngBounds(path), { padding: [40, 40] });
    // Fit once per route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

function Follow({ lat, lng, enabled }: { lat?: number; lng?: number; enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (enabled && lat !== undefined && lng !== undefined) map.panTo([lat, lng], { animate: true, duration: 0.8 });
  }, [map, lat, lng, enabled]);
  return null;
}

function PanWatcher({ onUserPan }: { onUserPan?: () => void }) {
  useMapEvents({ dragstart: () => onUserPan?.() });
  return null;
}

export function BusMap({ route, live, myStopId, follow, onUserPan }: BusMapProps) {
  const { colors } = useTheme();
  const target = live?.position ? { lat: live.position.lat, lng: live.position.lng } : null;
  const bus = useSmoothPosition(target);
  const path = route?.path ?? [];
  const status = new Map(live?.stops.map((s) => [s.id, s.status]) ?? []);
  const center: [number, number] = path.length ? path[Math.floor(path.length / 2)] : [17.47, 78.39];

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <MapContainer center={center} zoom={14} zoomControl={false} style={{ width: '100%', height: '100%' }} attributionControl>
        <TileLayer url={MAP_TILE_URL} attribution={MAP_ATTRIBUTION} />
        <FitRoute path={path} />
        <PanWatcher onUserPan={onUserPan} />
        <Follow lat={target?.lat} lng={target?.lng} enabled={follow} />
        {path.length > 1 ? <Polyline positions={path} pathOptions={{ color: colors.mapRoute, weight: 6, opacity: 0.9 }} /> : null}
        {route?.stops.map((stop) => {
          const mine = stop.id === myStopId;
          const done = status.get(stop.id) === 'departed' || status.get(stop.id) === 'skipped';
          return (
            <CircleMarker
              key={stop.id}
              center={[stop.lat, stop.lng]}
              radius={mine ? 9 : 6}
              pathOptions={{
                color: mine ? colors.surface : colors.mapRoute,
                weight: 3,
                fillColor: mine ? colors.accent : done ? colors.textMuted : colors.surface,
                fillOpacity: 1,
              }}>
              <Tooltip direction="top" offset={[0, -8]}>
                {stop.name}
              </Tooltip>
            </CircleMarker>
          );
        })}
        {bus ? (
          <Marker
            position={[bus.lat, bus.lng]}
            icon={busIcon(colors.primary, colors.onPrimary, colors.surface)}
            zIndexOffset={1000}
            title={live?.vehicle?.label ?? 'Bus'}
          />
        ) : null}
      </MapContainer>
    </View>
  );
}
