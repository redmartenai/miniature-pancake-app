import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import { AuthShell } from '@/features/auth/AuthShell';
import { setLanguage } from '@/i18n';
import { useSession } from '@/state/session';
import { spacing } from '@/theme/tokens';
import { Banner, Button, OtpInput, Text } from '@/ui';

/** Step 3: the 6-digit code. Submits automatically when complete (SMS autofill friendly). */
export default function Otp() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ challenge: string; phone: string; dev?: string }>();
  const school = useSession((s) => s.pendingSchool);
  const [challenge, setChallenge] = useState(params.challenge);
  const [devCode, setDevCode] = useState(params.dev || undefined);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(30);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const verify = async (value: string) => {
    if (value.length !== 6 || loading) return;
    setLoading(true);
    setError(undefined);
    try {
      const session = await api.verifyOtp(challenge, value);
      setLanguage(session.user.language);
      await useSession.getState().signIn(session);
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? (e.fieldMessage('code') ?? e.message) : t('common.somethingWrong'));
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code.length === 6) void verify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (!school || !challenge) return <Redirect href="/welcome" />;

  const resend = async () => {
    try {
      const next = await api.requestOtp(school.code, params.phone.replace(/\D/g, '').length === 10 ? `+91${params.phone.replace(/\D/g, '')}` : params.phone);
      setChallenge(next.challenge_id);
      setDevCode(next.dev_code);
      setResendIn(next.resend_in);
      setError(undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.somethingWrong'));
    }
  };

  return (
    <AuthShell
      step={3}
      canGoBack
      brandColor={school.branding.primary_color}
      title={t('auth.otpTitle')}
      subtitle={t('auth.otpSent', { phone: `+91 ${params.phone}` })}
      footer={<Button title={t('auth.verify')} onPress={() => verify(code)} loading={loading} disabled={code.length !== 6} size="lg" fullWidth />}>
      <OtpInput value={code} onChange={setCode} error={!!error} />
      {error ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="assertive">
          {error}
        </Text>
      ) : null}
      {devCode ? <Banner tone="info" icon="code-slash-outline" message={t('auth.devCode', { code: devCode })} /> : null}
      <View style={styles.links}>
        {resendIn > 0 ? (
          <Text variant="label" color="textMuted">
            {t('auth.resendIn', { seconds: resendIn })}
          </Text>
        ) : (
          <Pressable accessibilityRole="button" onPress={resend} hitSlop={10}>
            <Text variant="label" color="primary">
              {t('auth.resend')}
            </Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <Text variant="label" color="primary">
            {t('auth.wrongNumber')}
          </Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
});
