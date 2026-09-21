import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Extra = { variant?: 'main' | 'driver' };

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const APP_VARIANT: 'main' | 'driver' = extra.variant ?? 'main';
export const IS_DRIVER_APP = APP_VARIANT === 'driver';
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

/** The machine running `expo start`, e.g. "192.168.1.5", so a phone can reach the dev backend. */
function devServerHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  return hostUri ? hostUri.split(':')[0] : null;
}

function resolveApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;
  }
  const host = devServerHost();
  if (host) return `http://${host}:8000/api/v1`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000/api/v1' : 'http://127.0.0.1:8000/api/v1';
}

export const API_URL = resolveApiUrl();

function hostOf(url: string): string | null {
  const match = /^[a-z]+:\/\/([^/:]+)/i.exec(url);
  return match ? match[1] : null;
}

/**
 * The backend may advertise localhost service URLs in development (e.g. the realtime server).
 * On a phone those must point at the same machine as the API instead.
 */
export function resolveServiceUrl(url: string): string {
  const apiHost = hostOf(API_URL);
  const target = hostOf(url);
  if (apiHost && target && LOCAL_HOSTS.has(target) && !LOCAL_HOSTS.has(apiHost)) {
    return url.replace(target, apiHost);
  }
  return url;
}

/** Web map tiles. In production use a provider that shows India's official boundaries. */
export const MAP_TILE_URL =
  process.env.EXPO_PUBLIC_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const MAP_ATTRIBUTION = process.env.EXPO_PUBLIC_MAP_ATTRIBUTION ?? '© OpenStreetMap contributors';
