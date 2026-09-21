import { Centrifuge } from 'centrifuge';
import { create } from 'zustand';

import { api } from '@/api/endpoints';
import { resolveServiceUrl } from '@/lib/config';

/**
 * One WebSocket per app to the realtime server (Centrifugo). The backend decides who may
 * subscribe to what by issuing short-lived tokens; this module only manages the connection.
 * Everything that uses realtime also polls as a fallback, so nothing breaks without it.
 */

export type RealtimeStatus = 'off' | 'connecting' | 'connected' | 'disconnected';

export const useRealtimeStatus = create<{ status: RealtimeStatus }>(() => ({ status: 'off' }));
const setStatus = (status: RealtimeStatus) => useRealtimeStatus.setState({ status });

let client: Centrifuge | null = null;
let pending: Promise<Centrifuge | null> | null = null;

export function getRealtime(): Promise<Centrifuge | null> {
  if (client) return Promise.resolve(client);
  if (!pending) {
    pending = (async () => {
      try {
        const info = await api.realtimeConnection();
        if (!info.enabled) {
          setStatus('off');
          return null;
        }
        const next = new Centrifuge(resolveServiceUrl(info.url), {
          token: info.token,
          getToken: async () => {
            const fresh = await api.realtimeConnection();
            return fresh.enabled ? fresh.token : '';
          },
        });
        next.on('connecting', () => setStatus('connecting'));
        next.on('connected', () => setStatus('connected'));
        next.on('disconnected', () => setStatus('disconnected'));
        next.connect();
        client = next;
        return next;
      } catch {
        setStatus('off');
        return null;
      }
    })().finally(() => {
      pending = null;
    });
  }
  return pending;
}

export function stopRealtime() {
  client?.disconnect();
  client = null;
  listeners.clear();
  setStatus('off');
}

const listeners = new Map<string, number>();

/**
 * Subscribe to a channel. Returns an unsubscribe function. `getToken` is needed for
 * protected channels (e.g. a bus trip); personal channels need none.
 */
export async function subscribe(
  channel: string,
  onData: (data: unknown) => void,
  getToken?: () => Promise<string>,
): Promise<() => void> {
  const connection = await getRealtime();
  if (!connection) return () => undefined;
  const subscription =
    connection.getSubscription(channel) ??
    connection.newSubscription(channel, getToken ? { getToken: () => getToken() } : {});
  const handler = (ctx: { data: unknown }) => onData(ctx.data);
  subscription.on('publication', handler);
  listeners.set(channel, (listeners.get(channel) ?? 0) + 1);
  if (subscription.state === 'unsubscribed') subscription.subscribe();
  return () => {
    subscription.removeListener('publication', handler);
    const remaining = (listeners.get(channel) ?? 1) - 1;
    if (remaining <= 0) {
      listeners.delete(channel);
      subscription.unsubscribe();
      connection.removeSubscription(subscription);
    } else {
      listeners.set(channel, remaining);
    }
  };
}
