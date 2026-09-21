import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { ChatMessage } from '@/api/types';
import { useSession } from '@/state/session';

import { stopRealtime, subscribe } from './realtime';

type PersonalEvent = { type: 'chat.message'; message: ChatMessage } | { type: string };

/** Live chat delivery: new messages land in the open thread and the inbox without polling. */
export function usePersonalChannel() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.user?.id);
  const schoolId = useSession((s) => s.schoolId);

  useEffect(() => {
    if (!userId) {
      stopRealtime();
      return;
    }
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void subscribe(`personal:#${userId}`, (data) => {
      const event = data as PersonalEvent;
      if (event.type === 'chat.message' && 'message' in event) {
        const message = event.message;
        queryClient.setQueryData<{ messages: ChatMessage[]; has_more: boolean }>(
          ['messages', message.conversation_id],
          (current) => {
            if (!current) return current;
            const exists = current.messages.some((m) => m.id === message.id || m.client_id === message.client_id);
            const messages = exists
              ? current.messages.map((m) => (m.client_id === message.client_id ? message : m))
              : [...current.messages, message];
            return { ...current, messages };
          },
        );
        void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }).then((fn) => {
      if (cancelled) fn();
      else unsubscribe = fn;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [userId, schoolId, queryClient]);
}
