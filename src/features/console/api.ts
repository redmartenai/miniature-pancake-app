import { useQuery } from '@tanstack/react-query';

import { http } from '@/api/client';
import { useSession } from '@/state/session';

/** What the sidebar and top bar show on every console page. */
export type ConsoleContext = {
  now: string;
  today: string;
  term: { name: string; starts_on: string; ends_on: string; week: number } | null;
  academic_year: string | null;
  campus: string | null;
  approvals: number;
  unread_notifications: number;
};

export type SearchHit = { kind: 'student' | 'staff' | 'receipt' | 'class'; id: string; title: string; detail: string };

export const consoleApi = {
  context: () => http.get<ConsoleContext>('/console/context'),
  search: (q: string) => http.get<{ items: SearchHit[] }>(`/console/search?q=${encodeURIComponent(q)}`),
};

/** Query key helper: every console query is keyed by school so switching schools never shows stale data. */
export function useConsoleQuery<T>(
  key: readonly unknown[],
  fn: () => Promise<T>,
  options: { refetchInterval?: number; enabled?: boolean } = {},
) {
  const schoolId = useSession((s) => s.schoolId);
  return useQuery({ queryKey: ['console', schoolId, ...key], queryFn: fn, ...options });
}

export function useConsoleContext() {
  return useConsoleQuery(['context'], consoleApi.context, { refetchInterval: 60_000 });
}
