import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import { setLanguage } from '@/i18n';
import { maskPhone, samePhone, useLastAccount } from '@/state/lastAccount';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { AppBar, Avatar, Button, Card, Hr, Icon, ICON_SIZE, Link, OtpInput, Pill, Text, TileIcon, Well } from '@/ui';

/** AppOtp: the 6-digit code. Submits automatically when complete (SMS autofill friendly). */
export default function Otp() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ challenge: string; phone: string; dev?: string; resend?: string }>();
  const pendingSchool = useSession((s) => s.pendingSchool);
  const last = useLastAccount((s) => s.account);
  const [challenge, setChallenge] = useState(params.challenge);
  const [devCode, setDevCode] = useState(params.dev || undefined);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(Number(params.resend) || 30);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const verify = async (value: string) => {
    if (value.length !== 6 || loading || !challenge) return;
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

  if (!challenge || !params.phone) return <Redirect href="/login" />;

  const resend = async () => {
    try {
      const next = await api.requestOtp(`+91${params.phone}`, pendingSchool?.code);
      setChallenge(next.challenge_id);
      setDevCode(next.dev_code);
      setResendIn(next.resend_in);
      setError(undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.somethingWrong'));
    }
  };

  // Only a device that has signed this number in before knows who it belongs to.
  const known = last && samePhone(last.phone, params.phone) ? last : undefined;
  const mm = Math.floor(resendIn / 60);
  const ss = String(resendIn % 60).padStart(2, '0');

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.canvas }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppBar back={() => (router.canGoBack() ? router.back() : router.replace('/login'))} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.main}>
          <View style={{ gap: 8 }}>
            <Text variant="eyebrow">{t('auth.verifyEyebrow')}</Text>
            <Text variant="h2" style={{ fontSize: 24, lineHeight: 29 }} accessibilityRole="header">
              {`${t('auth.otpHeading')} ${maskPhone(params.phone)}`}
            </Text>
            <View style={{ alignSelf: 'flex-start', height: 44, justifyContent: 'center', marginTop: -6, marginBottom: -12 }}>
              <Link label={t('auth.wrongNumber')} icon={null} onPress={() => router.replace('/login')} />
            </View>
          </View>

          <View style={{ gap: 14 }}>
            <Text rawColor={colors.ink2} variant="xs" weight={650} style={{ fontSize: 12.5, marginBottom: -4 }}>
              {t('auth.oneTimeCode')}
            </Text>
            <OtpInput value={code} onChange={setCode} error={!!error} />
            {error ? (
              <Text variant="sm" color="bad" accessibilityLiveRegion="assertive">
                {error}
              </Text>
            ) : null}
            <View style={styles.resendRow}>
              <View style={styles.resendLeft}>
                <Icon name="clock" size={ICON_SIZE.sm} rawColor={colors.muted} />
                {resendIn > 0 ? (
                  <Text variant="sm" color="muted">
                    {t('auth.resendCodeIn')}{' '}
                    <Text variant="sm" weight={700} color="ink2" num>
                      {mm}:{ss}
                    </Text>
                  </Text>
                ) : (
                  <Text variant="sm" color="muted">
                    {t('auth.didntGetIt')}
                  </Text>
                )}
              </View>
              <Button
                title={t('auth.resendShort')}
                variant="ghost"
                size="sm"
                height={44}
                disabled={resendIn > 0}
                textColor={resendIn > 0 ? colors.muted : colors.brandInk}
                onPress={resend}
              />
            </View>
            {devCode && __DEV__ ? (
              <Well pad={10}>
                <Text variant="xs" color="muted">
                  {t('auth.devCode', { code: devCode })}
                </Text>
              </Well>
            ) : null}
          </View>

          {known ? (
            <Card pad={16} style={{ gap: 12 }} accessibilityLabel={`${t('auth.signingInAs')} ${known.name}`}>
              <Text variant="eyebrow">{t('auth.signingInAs')}</Text>
              <View style={styles.who}>
                <Avatar initials={known.initials} size="lg" tone={1} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <View style={styles.whoName}>
                    <Text variant="h4">{known.name}</Text>
                    <Pill label={t(`roles.${known.role}`)} tone="brand" dot={false} />
                  </View>
                  {known.detail ? (
                    <Text variant="xs" color="muted">
                      {known.detail}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Hr />
              <View style={styles.who}>
                <TileIcon icon="school" tone="neutral" size="sm" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="sm" weight={700}>
                    {known.schoolName}
                  </Text>
                  {known.schoolDetail ? (
                    <Text variant="xs" color="muted">
                      {known.schoolDetail}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Card>
          ) : null}

          <View style={{ flex: 1, minHeight: 12 }} />
          <View style={{ gap: 12 }}>
            <Button title={t('auth.verifyContinue')} iconRight="arrowRight" size="lg" fullWidth loading={loading} disabled={code.length !== 6} onPress={() => verify(code)} />
            <View style={styles.never}>
              <Icon name="lock" size={ICON_SIZE.sm} rawColor={colors.muted} />
              <Text variant="xs" color="muted" align="center" style={{ flexShrink: 1 }}>
                {t('auth.neverShare')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  main: { flexGrow: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 480 : undefined, alignSelf: 'center', paddingTop: 8, paddingHorizontal: 20, paddingBottom: 24, gap: 24 },
  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resendLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  whoName: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  never: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 8 },
});
