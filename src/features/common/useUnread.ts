import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/endpoints';
import { useSession } from '@/state/session';

/** Unread message and notification counts for tab badges (refreshed by realtime or every minute). */
export function useUnread() {
  const schoolId = useSession((s) => s.schoolId);
  const conversations = useQuery({
    queryKey: ['conversations', schoolId],
    queryFn: api.conversations,
    refetchInterval: 60_000,
  });
  const notifications = useQuery({
    queryKey: ['notifications', schoolId],
    queryFn: api.notifications,
    refetchInterval: 60_000,
  });
  return {
    messages: conversations.data?.unread_total ?? 0,
    notifications: notifications.data?.unread ?? 0,
  };
}
