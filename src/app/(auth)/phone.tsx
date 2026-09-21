import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import { AuthShell } from '@/features/auth/AuthShell';
import { useSession } from '@/state/session';
import { spacing } from '@/theme/tokens';
import { Button, Card, Text, TextField } from '@/ui';
import { Avatar } from '@/ui/Avatar';

/** Step 2: mobile number. The code is only sent if the school knows the number. */
export default function Phone() {
  const { t } = useTranslation();
  const school = useSession((s) => s.pendingSchool);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  if (!school) return <Redirect href="/welcome" />;

  const digits = phone.replace(/\D/g, '');
  const send = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const challenge = await api.requestOtp(school.code, digits.length === 10 ? `+91${digits}` : phone);
      router.push({
        pathname: '/otp',
        params: { challenge: challenge.challenge_id, phone: phone, dev: challenge.dev_code ?? '' },
      });
    } catch (e) {
      setError(e instanceof ApiError ? (e.fieldMessage('phone') ?? e.message) : t('common.somethingWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      step={2}
      canGoBack
      brandColor={school.branding.primary_color}
      title={t('auth.phoneTitle')}
      subtitle={t('auth.phoneHelp')}
      footer={<Button title={t('auth.sendCode')} onPress={send} loading={loading} disabled={digits.length < 10} size="lg" fullWidth />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Avatar initials={school.initials} seed={school.code} size={44} />
          <View style={{ flex: 1 }}>
            <Text variant="subheading">{school.name}</Text>
            <Text variant="caption">
              {school.city} · {school.code}
            </Text>
          </View>
        </View>
      </Card>
      <TextField
        label={t('auth.phoneLabel')}
        prefix="+91"
        placeholder="98765 43210"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        value={phone}
        onChangeText={setPhone}
        error={error}
        autoFocus
        maxLength={14}
        returnKeyType="send"
        onSubmitEditing={() => digits.length >= 10 && send()}
      />
    </AuthShell>
  );
}
