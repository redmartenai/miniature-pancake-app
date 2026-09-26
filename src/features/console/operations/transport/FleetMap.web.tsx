import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';

import { useSmoothPosition } from '@/features/tracking/useSmoothPosition';
import { formatClock } from '@/lib/format';
import { MAP_ATTRIBUTION, MAP_TILE_URL } from '@/lib/config';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, type Palette } from '@/theme/tokens';
import { cardShadow, cardShadowLg, Icon, IconButton, Text } from '@/ui';
import { ICONS } from '@/ui/icons/paths';

import type { FleetRow, LatLng } from './api';
import type { FleetMapProps } from './FleetMap.types';

/** Compare routes use the chart series colours, as in the design (`.ch-line.s2/.s4/.s3`). */
export const COMPARE_COLORS = ['c2', 'c4', 'c3'] as const;
const MAP_HEIGHT = 680;
const STYLE_ID = 'ef-fleet-map-style';

/** The design's map is a quiet, tinted street plan: grey the tiles and pull them towards the palette. */
function useMapCss(colors: Palette, scheme: 'light' | 'dark') {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    const tiles =
      scheme === 'dark'
        ? 'invert(1) grayscale(1) sepia(0.35) hue-rotate(190deg) saturate(1.6) brightness(0.62) contrast(1.15)'
        : 'grayscale(1) sepia(0.3) hue-rotate(190deg) saturate(1.7) brightness(1.1) contrast(0.78)';
    el.textContent = `
.ef-fleet.leaflet-container{background:${colors.sunken};font-family:${fonts.medium},system-ui,sans-serif;}
.ef-fleet .ef-tiles{filter:${tiles};}
.ef-fleet .leaflet-control-attribution{background:${colors.surface}cc;color:${colors.muted};font-size:10px;border-radius:8px 0 0 0;}
.ef-fleet .leaflet-control-attribution a{color:${colors.muted};}
.ef-fleet .leaflet-tooltip.ef-tip{background:${colors.ink};color:${colors.canvas};border:0;border-radius:12px;padding:10px 12px;font:12px/1.45 ${fonts.medium},system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 6px rgba(40,32,20,.05),0 28px 60px -24px rgba(40,32,20,.24);}
.ef-fleet .leaflet-tooltip.ef-tip::before{display:none;}
.ef-fleet .leaflet-tooltip.ef-tip b{font-family:${fonts.bold};font-weight:700;display:block;margin-bottom:3px;}
.ef-fleet .leaflet-tooltip.ef-stop{background:${colors.surface};color:${colors.ink};border:1px solid ${colors.line};border-radius:8px;padding:4px 8px;font:600 11.5px/1.3 ${fonts.semibold},system-ui,sans-serif;box-shadow:none;}
.ef-fleet .leaflet-tooltip.ef-stop::before{display:none;}
`;
  }, [colors, scheme]);
}

function busIcon(code: string, colors: Palette, opts: { selected: boolean; late: boolean }) {
  const size = opts.selected ? 42 : 24;
  const dot = opts.selected ? 30 : 24;
  const ring = opts.selected ? `box-shadow:0 0 0 3px ${colors.surface};` : '';
  const halo = opts.selected
    ? `<div style="position:absolute;inset:0;border-radius:50%;border:3px solid ${opts.late ? colors.warn : colors.brandLine};"></div>`
    : '';
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;cursor:pointer">${halo}<div style="width:${dot}px;height:${dot}px;border-radius:50%;background:${colors.brand};border:2px solid ${colors.surface};box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:${colors.onBrand};font:800 ${opts.selected ? 11.5 : 10}px ${fonts.extrabold},system-ui,sans-serif;${ring}">${code}</div></div>`,
  });
}

function schoolIcon(name: string, colors: Palette) {
  const parts = ICONS.school.map((p) => (p.t === 'path' ? `<path d="${p.d}"/>` : '')).join('');
  return L.divIcon({
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div style="position:relative;width:30px;height:30px"><div style="width:30px;height:30px;border-radius:9px;background:${colors.ink};display:flex;align-items:center;justify-content:center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${colors.canvas}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${parts}</svg></div><div style="position:absolute;top:36px;left:50%;transform:translateX(-50%);white-space:nowrap;font:700 12px ${fonts.bold},system-ui,sans-serif;color:${colors.ink};text-shadow:0 0 3px ${colors.surface},0 0 3px ${colors.surface},0 0 2px ${colors.surface}">${name}</div></div>`,
  });
}

function remaining(row: FleetRow): LatLng[] {
  const { line, done } = row.path;
  if (done.length < 2) return line;
  return [done[done.length - 1], ...line.slice(done.length - 1)];
}

function BusMarker({
  row,
  selected,
  onSelect,
  children,
}: {
  row: FleetRow;
  selected: boolean;
  onSelect: (id: string) => void;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const target = row.position ? { lat: row.position.lat, lng: row.position.lng } : null;
  const at = useSmoothPosition(target);
  const icon = useMemo(
    () => busIcon(row.code ?? '', colors, { selected, late: row.status === 'late' }),
    [row.code, colors, selected, row.status],
  );
  if (!at) return null;
  return (
    <Marker
      position={[at.lat, at.lng]}
      icon={icon}
      zIndexOffset={selected ? 1000 : 0}
      title={row.label}
      eventHandlers={{ click: () => onSelect(row.id) }}>
      {children}
    </Marker>
  );
}

export function FleetMap({ data, selected, compare, onSelect }: FleetMapProps) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const [map, setMap] = useState<L.Map | null>(null);
  useMapCss(colors, scheme);
  const tr = (key: string, opts?: Record<string, unknown>) => t(`console.operations.transport.${key}`, opts);

  const onRoad = data.fleet.filter((r) => r.position && (r.status === 'late' || r.status === 'on_time'));
  const school = data.school;
  const fitted = useRef(false);
  const shownFor = useRef<string | null>(null);

  const allBounds = useMemo(() => {
    const pts: LatLng[] = onRoad.map((r) => [r.position!.lat, r.position!.lng]);
    if (school) pts.push([school.lat, school.lng]);
    if (pts.length < 2) data.fleet.forEach((r) => pts.push(...r.path.line));
    return pts.length ? L.latLngBounds(pts) : null;
  }, [onRoad, school, data.fleet]);

  const routeBounds = (row: FleetRow | null) => {
    const pts: LatLng[] = [...(row?.path.line ?? [])];
    if (row?.position) pts.push([row.position.lat, row.position.lng]);
    if (school) pts.push([school.lat, school.lng]);
    return pts.length > 1 ? L.latLngBounds(pts) : allBounds;
  };

  // First load: the whole fleet. Afterwards, a newly picked route.
  useEffect(() => {
    if (!map || !allBounds) return;
    if (!fitted.current) {
      map.fitBounds(allBounds, { padding: [48, 48] });
      fitted.current = true;
      shownFor.current = selected?.id ?? null;
      return;
    }
    if (selected && shownFor.current !== selected.id) {
      shownFor.current = selected.id;
      const b = routeBounds(selected);
      if (b) map.flyToBounds(b, { padding: [90, 90], duration: 0.6 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, allBounds, selected?.id]);

  const recenter = () => {
    const b = routeBounds(selected);
    if (map && b) map.flyToBounds(b, { padding: [90, 90], duration: 0.6 });
  };

  const schoolMarker = useMemo(() => (school ? schoolIcon(school.name, colors) : null), [school, colors]);
  const sel = selected && selected.kind === 'route' ? selected : null;
  const upcoming = sel?.stops.filter((s) => !s.is_school && (s.state === 'next' || s.state === 'upcoming')) ?? [];
  const run = t(`console.operations.transport.run.${data.run.direction}`);
  const runTitle = t(`console.operations.transport.runTitle.${data.run.direction}`);

  let chip: string;
  if (data.counts.on_road > 0 && data.run.started) {
    const key = data.run.ends ? (data.run.direction === 'drop' ? 'map.chipEnds' : 'map.chipEndsPickup') : 'map.chip';
    chip = tr(key, { run: runTitle, start: formatClock(data.run.started), end: formatClock(data.run.ends), count: data.counts.on_road });
  } else if (data.run.next_start) {
    chip = tr('map.chipNext', { time: formatClock(data.run.next_start) });
  } else {
    chip = tr('map.chipDone', { run: runTitle });
  }

  return (
    <View
      style={[styles.card, { backgroundColor: colors.sunken, borderColor: colors.line }, cardShadow(scheme)]}
      accessibilityRole="image"
      accessibilityLabel={tr('map.summary', { count: data.counts.on_road, run, school: school?.name ?? '', route: selected?.label ?? '' })}>
      <MapContainer
        ref={setMap}
        className="ef-fleet"
        center={school ? [school.lat, school.lng] : [12.97, 77.59]}
        zoom={13}
        zoomControl={false}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}>
        <TileLayer url={MAP_TILE_URL} attribution={MAP_ATTRIBUTION} className="ef-tiles" />
        {compare.map((row, i) => (
          <Polyline
            key={`c-${row.id}`}
            positions={row.path.line}
            pathOptions={{
              color: colors[COMPARE_COLORS[i % COMPARE_COLORS.length]],
              weight: 4,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }}
            eventHandlers={{ click: () => onSelect(row.id) }}
          />
        ))}
        {sel && sel.path.done.length > 1 ? (
          <Polyline
            positions={sel.path.done}
            pathOptions={{ color: colors.brand, weight: 5, opacity: 0.35, lineCap: 'round', lineJoin: 'round' }}
          />
        ) : null}
        {sel && sel.status !== 'arrived' ? (
          <Polyline
            positions={remaining(sel)}
            pathOptions={{ color: colors.brand, weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
          />
        ) : null}
        {upcoming.map((stop) => (
          <CircleMarker
            key={stop.id}
            center={[stop.lat, stop.lng]}
            radius={5}
            pathOptions={{ color: colors.brand, weight: 2.5, fillColor: colors.surface, fillOpacity: 1 }}>
            <Tooltip className="ef-stop" direction="top" offset={[0, -6]}>
              {stop.name}
            </Tooltip>
          </CircleMarker>
        ))}
        {school && schoolMarker ? (
          <Marker position={[school.lat, school.lng]} icon={schoolMarker} title={school.name} interactive={false} />
        ) : null}
        {onRoad.map((row) => {
          const isSel = row.id === selected?.id;
          return (
            <BusMarker key={row.id} row={row} selected={isSel} onSelect={onSelect}>
              {isSel ? (
                <Tooltip className="ef-tip" direction="right" offset={[26, 0]} permanent>
                  <b>
                    {row.label}
                    {row.vehicle ? ` · ${row.vehicle.registration_no}` : ''}
                  </b>
                  <div>
                    {row.status === 'late' ? tr('map.late', { count: row.delay }) : tr('map.onTime')}
                    {row.held ? ` · ${tr('map.heldAt', { stop: row.held.stop })}` : ''}
                  </div>
                  {row.next_stop ? (
                    <div>{tr('map.next', { stop: row.next_stop.name, time: formatClock(row.next_stop.eta ?? row.next_stop.planned) })}</div>
                  ) : null}
                  {row.signal === 'lost' && row.position?.at ? (
                    <div>{tr('map.lastGps', { time: formatClock(row.position.at) })}</div>
                  ) : null}
                </Tooltip>
              ) : null}
            </BusMarker>
          );
        })}
      </MapContainer>

      <View
        style={[styles.legend, { backgroundColor: colors.surface, borderColor: colors.line }, cardShadowLg(scheme)]}
        pointerEvents="box-none">
        <Text variant="eyebrow">{tr('map.legend')}</Text>
        {selected ? <LegendLine color={colors.brand} label={tr('map.selected', { route: selected.label })} /> : null}
        {compare.map((row, i) => (
          <LegendLine key={row.id} color={colors[COMPARE_COLORS[i % COMPARE_COLORS.length]]} label={row.label} />
        ))}
        <View style={[styles.hr, { backgroundColor: colors.line }]} />
        <View style={styles.legendRow}>
          <View style={styles.legendMark}>
            <View style={[styles.busDot, { backgroundColor: colors.brand }]} />
          </View>
          <Text variant="xs" weight={600}>
            {tr('map.busNo')}
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendMark}>
            <View style={[styles.stopDot, { borderColor: colors.brand, backgroundColor: colors.surface }]} />
          </View>
          <Text variant="xs" weight={600}>
            {tr('map.upcoming')}
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendMark}>
            <View style={[styles.schoolDot, { backgroundColor: colors.ink }]} />
          </View>
          <Text variant="xs" weight={600}>
            {tr('map.school')}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <IconButton icon="plus" label={tr('map.zoomIn')} onPress={() => map?.zoomIn()} />
        <IconButton icon="minus" label={tr('map.zoomOut')} onPress={() => map?.zoomOut()} />
        <IconButton icon="navigate" label={tr('map.recenter')} onPress={recenter} />
      </View>

      <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.line }, cardShadow(scheme)]}>
        <Icon name="clock" size={16} rawColor={colors.muted} />
        <Text variant="xs" weight={600} color="ink2">
          {chip}
        </Text>
      </View>
    </View>
  );
}

function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={styles.legendMark}>
        <View style={[styles.line, { backgroundColor: color }]} />
      </View>
      <Text variant="xs" weight={600} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { height: MAP_HEIGHT, borderRadius: radius.card, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  legend: { position: 'absolute', left: 16, top: 16, width: 188, padding: 14, borderRadius: 16, borderWidth: 1, gap: 8, zIndex: 500 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendMark: { width: 22, alignItems: 'center', justifyContent: 'center' },
  line: { width: 16, height: 4, borderRadius: 2 },
  hr: { height: 1, marginVertical: 2 },
  busDot: { width: 16, height: 16, borderRadius: 8 },
  stopDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2.5 },
  schoolDot: { width: 16, height: 16, borderRadius: 5 },
  controls: { position: 'absolute', right: 16, top: 16, gap: 8, zIndex: 500 },
  chip: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    zIndex: 500,
  },
});
