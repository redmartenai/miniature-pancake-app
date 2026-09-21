import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '@/api/endpoints';
import { AccountCard } from '@/features/common/AccountCard';
import { stopRealtime } from '@/features/realtime/realtime';
import { LANGUAGES, setLanguage } from '@/i18n';
import { APP_VERSION } from '@/lib/config';
import { useActiveMembership, useSession } from '@/state/session';
import { Button, Card, Icon, ListRow, Screen, SectionHeader, SegmentedControl, Text } from '@/ui';
import { Sheet } from '@/ui/Sheet';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const memberships = useSession((s) => s.memberships);
  const schoolId = useSession((s) => s.schoolId);
  const role = useSession((s) => s.role);
  const membership = useActiveMembership();
  const [confirmOut, setConfirmOut] = useState(false);

  const changeLanguage = (code: string) => {
    setLanguage(code);
    api.updateMe({ language: code }).catch(() => undefined);
  };

  const switchTo = async (fn: () => Promise<void>) => {
    await fn();
    queryClient.clear();
    router.replace('/');
  };

  const signOut = async () => {
    setConfirmOut(false);
    stopRealtime();
    queryClient.clear();
    await useSession.getState().signOut();
    router.replace('/welcome');
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <AccountCard />

      <SectionHeader title={t('settings.language')} />
      <SegmentedControl value={i18n.language} onChange={changeLanguage} options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))} />

      {memberships.length > 1 ? (
        <>
          <SectionHeader title={t('settings.switchSchool')} />
          <Card padded={false}>
            {memberships.map((m, index) => (
              <ListRow
                key={m.school.id}
                icon="school-outline"
                title={m.school.name}
                subtitle={m.school.city}
                right={m.school.id === schoolId ? <Icon name="checkmark-circle" size={22} color="primary" /> : undefined}
                chevron={false}
                onPress={() => switchTo(() => useSession.getState().selectSchool(m.school.id))}
                last={index === memberships.length - 1}
              />
            ))}
          </Card>
        </>
      ) : null}

      {membership && membership.roles.length > 1 ? (
        <>
          <SectionHeader title={t('settings.switchRole')} />
          <Card padded={false}>
            {membership.roles.map((r, index) => (
              <ListRow
                key={r.role}
                icon="person-circle-outline"
                title={t(`roles.${r.role}`)}
                subtitle={r.title}
                right={r.role === role ? <Icon name="checkmark-circle" size={22} color="primary" /> : undefined}
                chevron={false}
                onPress={() => switchTo(() => useSession.getState().selectRole(r.role))}
                last={index === membership.roles.length - 1}
              />
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title={t('settings.privacy')} />
      <Card>
        <Text variant="body">{t('settings.privacyText')}</Text>
      </Card>

      <Button title={t('settings.signOut')} icon="log-out-outline" variant="secondary" onPress={() => setConfirmOut(true)} fullWidth />
      <Text variant="caption" align="center">
        EduFlow · {t('settings.version', { version: APP_VERSION })}
      </Text>

      <Sheet visible={confirmOut} onClose={() => setConfirmOut(false)} title={t('settings.signOut')} message={t('settings.signOutConfirm')}>
        <Button title={t('settings.signOut')} variant="danger" onPress={signOut} fullWidth />
        <Button title={t('common.cancel')} variant="secondary" onPress={() => setConfirmOut(false)} fullWidth />
      </Sheet>
    </Screen>
  );
}
