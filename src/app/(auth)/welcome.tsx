import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import { AuthShell } from '@/features/auth/AuthShell';
import { IS_DRIVER_APP } from '@/lib/config';
import { useSession } from '@/state/session';
import { Button, TextField } from '@/ui';

/** Step 1: find the school by the code on its circulars (loads its name and brand colour). */
export default function Welcome() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const find = async () => {
    const value = code.trim().toUpperCase();
    if (!value) return;
    setLoading(true);
    setError(undefined);
    try {
      const school = await api.lookupSchool(value);
      useSession.getState().setPendingSchool(school);
      router.push('/phone');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.somethingWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      step={1}
      title={t('auth.welcome')}
      subtitle={IS_DRIVER_APP ? t('auth.driverTagline') : t('auth.tagline')}
      footer={<Button title={t('auth.findSchool')} onPress={find} loading={loading} disabled={!code.trim()} size="lg" fullWidth />}>
      <TextField
        label={t('auth.schoolCodeLabel')}
        placeholder={t('auth.schoolCodePlaceholder')}
        hint={t('auth.schoolCodeHelp')}
        error={error}
        value={code}
        onChangeText={(v) => setCode(v.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        returnKeyType="go"
        onSubmitEditing={find}
        icon="school-outline"
        maxLength={16}
      />
    </AuthShell>
  );
}
