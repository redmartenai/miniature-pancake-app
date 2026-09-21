import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '@/ui';

import type { BusMapProps } from './BusMap.types';
import { useSmoothPosition } from './useSmoothPosition';

/** Custom marker views are captured as bitmaps; keep tracking briefly so icon fonts render first. */
function useSettled(delayMs = 600) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setTracking(false), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);
  return tracking;
}

export function BusMap({ route, live, myStopId, follow, onUserPan }: BusMapProps) {
  const { colors, scheme } = useTheme();
  const map = useRef<MapView>(null);
  const tracking = useSettled();
  const target = live?.position ? { lat: live.position.lat, lng: live.position.lng } : null;
  const bus = useSmoothPosition(target);
  const coordinates = (route?.path ?? []).map(([latitude, longitude]) => ({ latitude, longitude }));
  const stopStatus = new Map(live?.stops.map((s) => [s.id, s.status]) ?? []);

  const routeKey = route ? `${route.id}-${route.direction}` : '';
  useEffect(() => {
    if (!routeKey || coordinates.length < 2) return;
    const timer = setTimeout(() => {
      map.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 70, right: 50, bottom: 70, left: 50 },
        animated: false,
      });
    }, 250);
    return () => clearTimeout(timer);
    // Fit once per route; following the bus takes over afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  const targetLat = target?.lat;
  const targetLng = target?.lng;
  useEffect(() => {
    if (!follow || targetLat === undefined || targetLng === undefined) return;
    map.current?.animateCamera({ center: { latitude: targetLat, longitude: targetLng } }, { duration: 900 });
  }, [follow, targetLat, targetLng]);

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
      userInterfaceStyle={scheme}
      showsCompass={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      onPanDrag={onUserPan}
      accessibilityLabel="Map of the bus route">
      {coordinates.length > 1 ? (
        <Polyline coordinates={coordinates} strokeColor={colors.mapRoute} strokeWidth={5} lineCap="round" lineJoin="round" />
      ) : null}
      {route?.stops.map((stop) => {
        const status = stopStatus.get(stop.id) ?? 'upcoming';
        const mine = stop.id === myStopId;
        const done = status === 'departed' || status === 'skipped';
        return (
          <Marker
            key={`${stop.id}-${status}-${mine}`}
            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            title={stop.name}
            tracksViewChanges={tracking}
            zIndex={mine ? 5 : 1}>
            <View
              style={[
                styles.stop,
                mine && styles.myStop,
                {
                  backgroundColor: mine ? colors.accent : done ? colors.textMuted : colors.surface,
                  borderColor: mine ? colors.surface : colors.mapRoute,
                },
              ]}
            />
          </Marker>
        );
      })}
      {bus ? (
        <Marker
          coordinate={{ latitude: bus.lat, longitude: bus.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={tracking}
          zIndex={10}
          title={live?.vehicle?.label ?? 'Bus'}>
          <View style={[styles.bus, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
            <Icon name="bus" size={18} rawColor={colors.onPrimary} />
          </View>
        </Marker>
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  stop: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  myStop: { width: 20, height: 20, borderRadius: 10, borderWidth: 3 },
  bus: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
});
