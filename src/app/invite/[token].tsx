import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client';
import { platformApi } from '@/features/platform/api';
import { AuthCard } from '@/features/platform/AuthCard';
import { useSession } from '@/state/session';
import { Button, Pill, TextField } from '@/ui';

/** The link from a new school's invite: see who it's for, choose a password, and land signed in. */
export default function AcceptInvite() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
  const invite = useQuery({ queryKey: ['invite', token], queryFn: () => platformApi.invite(token!), enabled: !!token, retry: false });
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (invite.isError) {
    return (
      <AuthCard title={t('platform.invite.invalid')} body={t('platform.invite.invalidBody')}>
        <Button title={t('platform.invite.toSignIn')} fullWidth onPress={() => router.replace('/')} />
      </AuthCard>
    );
  }
  const data = invite.data;
  const submit = async () => {
    if (password !== again) return setError(t('platform.invite.mismatch'));
    setBusy(true);
    setError(undefined);
    try {
      const session = await platformApi.acceptInvite(token!, password);
      // Whoever was signed in on this browser before, the invitee is now.
      await useSession.getState().signOut();
      await useSession.getState().signIn(session);
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t('platform.invite.title')}
      body={
        data
          ? t('platform.invite.body', {
              name: data.person.name,
              school: data.school.name,
              role: t(`platform.slip.role.${data.person.role}`, { defaultValue: data.person.role }),
            })
          : t('common.loading')
      }>
      {data ? (
        <>
          <Pill
            tone="brand"
            dot={false}
            icon="school"
            label={t('platform.invite.school', { code: data.school.code })}
            style={{ alignSelf: 'flex-start' }}
          />
          <TextField
            label={t('platform.invite.password')}
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
            hint={t('platform.invite.hint', { phone: data.person.phone })}
          />
          <TextField
            label={t('platform.invite.confirm')}
            secureTextEntry
            autoComplete="new-password"
            value={again}
            onChangeText={setAgain}
            onSubmitEditing={() => void submit()}
            error={error}
          />
          <Button
            title={t('platform.invite.submit')}
            fullWidth
            loading={busy}
            disabled={password.length < 10 || !again}
            onPress={() => void submit()}
          />
        </>
      ) : null}
    </AuthCard>
  );
}
