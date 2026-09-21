import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { api } from '@/api/endpoints';
import type { ChatContact } from '@/api/types';
import { Avatar, Card, EmptyState, ErrorState, ListRow, LoadingCards, Screen, SectionHeader, useToast } from '@/ui';

/** Pick who to message: each child's teachers and the school office teams. */
export default function NewConversation() {
  const { t } = useTranslation();
  const toast = useToast();
  const contacts = useQuery({ queryKey: ['chat-contacts'], queryFn: api.chatContacts });
  const start = useMutation({
    mutationFn: (contact: ChatContact) => api.startConversation(contact),
    onSuccess: (conversation) => router.replace(`/chat/${conversation.id}`),
    onError: () => toast(t('common.somethingWrong'), 'danger'),
  });

  const byChild = new Map<string, { name: string; items: ChatContact[] }>();
  for (const contact of contacts.data?.contacts ?? []) {
    const entry = byChild.get(contact.student.id) ?? { name: contact.student.name, items: [] };
    entry.items.push(contact);
    byChild.set(contact.student.id, entry);
  }

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: t('chat.contactsTitle') }} />
      {contacts.isLoading ? (
        <LoadingCards />
      ) : contacts.error ? (
        <ErrorState error={contacts.error} onRetry={() => void contacts.refetch()} />
      ) : byChild.size === 0 ? (
        <EmptyState icon="people-outline" title={t('chat.empty')} />
      ) : (
        [...byChild.entries()].map(([childId, group]) => (
          <Card key={childId} padded={false}>
            <SectionHeader title={t('chat.about', { name: group.name })} />
            {group.items.map((contact, index) => (
              <ListRow
                key={`${contact.kind}-${contact.user_id ?? contact.department}`}
                left={<Avatar initials={contact.initials} seed={contact.name} size={42} tone={contact.kind === 'department' ? 'info' : undefined} />}
                title={contact.name}
                subtitle={contact.kind === 'department' ? t('chat.office') : contact.subtitle}
                onPress={() => start.mutate(contact)}
                last={index === group.items.length - 1}
              />
            ))}
          </Card>
        ))
      )}
    </Screen>
  );
}
