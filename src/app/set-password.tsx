import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client';
import { platformApi } from '@/features/platform/api';
import { AuthCard } from '@/features/platform/AuthCard';
import { useSession } from '@/state/session';
import { Button, TextField } from '@/ui';

/** After signing in with a temporary password: choose your own before anything else opens. */
export default function SetPassword() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState<{ field?: string; message: string }>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (next !== again) return setError({ field: 'again', message: t('platform.setPassword.mismatch') });
    setBusy(true);
    setError(undefined);
    try {
      const { user } = await platformApi.changePassword(current, next);
      await useSession.getState().updateUser(user);
      router.replace('/');
    } catch (e) {
      if (e instanceof ApiError) setError({ field: e.fields?.current ? 'current' : 'new', message: e.fieldMessage() ?? e.message });
      else setError({ message: t('common.somethingWrong') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title={t('platform.setPassword.title')} body={t('platform.setPassword.body')}>
      <TextField
        label={t('platform.setPassword.current')}
        secureTextEntry
        autoComplete="current-password"
        value={current}
        onChangeText={setCurrent}
        error={error?.field === 'current' ? error.message : undefined}
      />
      <TextField
        label={t('platform.setPassword.new')}
        secureTextEntry
        autoComplete="new-password"
        value={next}
        onChangeText={setNext}
        hint={t('platform.setPassword.hint')}
        error={error?.field === 'new' || (!error?.field && error) ? error?.message : undefined}
      />
      <TextField
        label={t('platform.setPassword.confirm')}
        secureTextEntry
        autoComplete="new-password"
        value={again}
        onChangeText={setAgain}
        onSubmitEditing={() => void submit()}
        error={error?.field === 'again' ? error.message : undefined}
      />
      <Button
        title={t('platform.setPassword.save')}
        fullWidth
        loading={busy}
        disabled={!current || next.length < 10 || !again}
        onPress={() => void submit()}
      />
      <Button title={t('platform.setPassword.signOut')} variant="ghost" fullWidth onPress={() => void useSession.getState().signOut()} />
    </AuthCard>
  );
}
