import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import { LegalFooter } from '@/features/auth/LegalFooter';
import { SchoolPassHero } from '@/features/auth/SchoolPassHero';
import { formatMobile } from '@/lib/phone';
import { useLastAccount } from '@/state/lastAccount';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Button, Icon, ICON_SIZE, Text } from '@/ui';
import { noWebFocusRing } from '@/ui/webStyles';

/** AppLogin: one sign-in for parents, students and staff. Phone first; the code is sent by SMS. */
export default function Login() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const pendingSchool = useSession((s) => s.pendingSchool);
  const last = useLastAccount((s) => s.account);
  const [phone, setPhone] = useState(() => (last ? formatMobile(last.phone.slice(-10)) : ''));
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const digits = phone.replace(/\D/g, '');

  const send = async () => {
    if (digits.length !== 10 || loading) return;
    setLoading(true);
    setError(undefined);
    try {
      const challenge = await api.requestOtp(`+91${digits}`, pendingSchool?.code);
      router.push({
        pathname: '/otp',
        params: { challenge: challenge.challenge_id, phone: digits, dev: challenge.dev_code ?? '', resend: String(challenge.resend_in) },
      });
    } catch (e) {
      setError(e instanceof ApiError ? (e.fieldMessage('phone') ?? e.message) : t('common.somethingWrong'));
    } finally {
      setLoading(false);
    }
  };

  const borderColor = error ? colors.bad : focused ? colors.brand : colors.lineStrong;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.canvas }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={styles.column}>
          <SchoolPassHero />
          <View style={styles.main}>
            <Text accessibilityRole="header" style={[styles.headline, { color: colors.ink }]}>
              {t('auth.appHeadline')}
            </Text>
            {pendingSchool ? (
              <Text variant="sm" color="muted">
                {t('auth.signingInTo', { school: pendingSchool.name })}
              </Text>
            ) : null}
            <View style={styles.field}>
              <Text rawColor={colors.ink2} style={styles.label} nativeID="login-mobile-label">
                {t('auth.phoneLabel')}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  { borderColor, backgroundColor: colors.surface },
                  focused && !error && { boxShadow: `0 0 0 3px ${colors.brandSoft}` },
                ]}>
                <View style={[styles.cc, { borderRightColor: colors.line }]} accessibilityLabel={t('auth.countryIndia')}>
                  <Text rawColor={colors.ink} style={styles.ccText}>
                    +91
                  </Text>
                  <Icon name="chevronDown" size={ICON_SIZE.xs} rawColor={colors.muted} />
                </View>
                <TextInput
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(formatMobile(v));
                    if (error) setError(undefined);
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="98450 34521"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel-national"
                  maxLength={11}
                  returnKeyType="send"
                  onSubmitEditing={send}
                  accessibilityLabel={t('auth.phoneLabel')}
                  accessibilityHint={t('auth.phoneHint')}
                  style={[styles.input, { color: colors.ink }]}
                />
              </View>
              {error ? (
                <Text variant="xs" color="bad" accessibilityLiveRegion="polite">
                  {error}
                </Text>
              ) : (
                <Text variant="xs" color="muted">
                  {t('auth.phoneHint')}
                </Text>
              )}
            </View>
            <View style={{ gap: 6 }}>
              <Button title={t('auth.sendOtp')} iconRight="arrowRight" size="lg" fullWidth onPress={send} loading={loading} disabled={digits.length !== 10} />
              <Button
                title={t('auth.usePassword')}
                variant="ghost"
                textColor={colors.brandInk}
                height={44}
                fullWidth
                onPress={() => router.push('/sign-in')}
              />
            </View>
          </View>
          <View style={{ flex: 1, minHeight: 16 }} />
          <LegalFooter />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  column: { flexGrow: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 480 : undefined, alignSelf: 'center' },
  main: { paddingTop: 24, paddingHorizontal: 20, gap: 18 },
  headline: { fontFamily: fonts.display, fontSize: 25, lineHeight: 30.5, letterSpacing: -0.62 },
  field: { gap: 7 },
  label: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 12, borderWidth: 1, gap: 12, paddingRight: 14 },
  cc: { flexDirection: 'row', alignItems: 'center', gap: 4, height: '100%', paddingLeft: 14, paddingRight: 12, borderRightWidth: 1 },
  ccText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 18 },
  input: { flex: 1, minWidth: 0, height: '100%', fontFamily: fonts.semibold, fontSize: 16, letterSpacing: 0.32, ...noWebFocusRing },
});
