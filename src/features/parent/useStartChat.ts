import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import { useToast } from '@/ui';

/**
 * Open (or start) the chat with a teacher about a child — used by "Reply" and "Ask" buttons.
 * Falls back to the new-message picker when the teacher isn't a chat contact for this child.
 */
export function useStartChat() {
  const { t } = useTranslation();
  const toast = useToast();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, userId }: { studentId: string; userId?: string | null }) => {
      const { contacts } = await api.chatContacts();
      const contact = contacts.find((c) => c.student?.id === studentId && c.user_id && c.user_id === userId);
      if (!contact) return null;
      return api.startConversation(contact);
    },
    onSuccess: (conversation) => {
      if (!conversation) {
        router.push('/chat/new');
        return;
      }
      void client.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/chat/${conversation.id}`);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('common.somethingWrong'), 'danger'),
  });
}
