import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import { RoleCycle, StudentOrbit } from '@/features/auth/StudentOrbit';
import { setLanguage } from '@/i18n';
import { useLastAccount } from '@/state/lastAccount';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Button, Checkbox, Hero, Hr, Icon, ICON_SIZE, IconButton, Link, pointer, Sheet, Text, TileIcon, Well } from '@/ui';
import { noWebFocusRing } from '@/ui/webStyles';

type Info = 'office' | 'forgot' | 'sso';

/**
 * PLogin: email-or-mobile + password (the Principal web app, and "Use email & password" on phones).
 * The brand panel with the animated student-profile diagram shows on wide screens only.
 */
export default function SignIn() {
  const { t } = useTranslation();
  const { colors, scheme, toggleScheme } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const wide = width >= 1100;
  const pendingSchool = useSession((s) => s.pendingSchool);
  const last = useLastAccount((s) => s.account);
  // A school's own sign-in link (…/sign-in?school=SUNRISE) names the school up front.
  const { school: schoolParam } = useLocalSearchParams<{ school?: string }>();
  useEffect(() => {
    const code = schoolParam?.trim().toUpperCase();
    if (!code || code === useSession.getState().pendingSchool?.code) return;
    api
      .lookupSchool(code)
      .then((school) => useSession.getState().setPendingSchool(school))
      .catch(() => undefined);
  }, [schoolParam]);
  const schoolName = pendingSchool?.name ?? last?.schoolName;
  const schoolDetail = pendingSchool
    ? [pendingSchool.campus, pendingSchool.academic_year && t('auth.academicYear', { year: pendingSchool.academic_year })]
        .filter(Boolean)
        .join(' · ')
    : last?.schoolDetail;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<Info>();

  const submit = async () => {
    if (!identifier.trim() || !password || loading) return;
    setLoading(true);
    setError(undefined);
    try {
      const session = await api.passwordLogin({
        identifier: identifier.trim(),
        password,
        remember,
        school_code: pendingSchool?.code,
      });
      setLanguage(session.user.language);
      await useSession.getState().signIn(session);
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? (e.fieldMessage('password') ?? e.message) : t('common.somethingWrong'));
    } finally {
      setLoading(false);
    }
  };

  const enter = (delay: number) =>
    still
      ? undefined
      : FadeInDown.duration(700)
          .delay(delay)
          .withInitialValues({ transform: [{ translateY: 14 }] });

  const form = (
    <View style={[styles.form, !wide && { width: '100%', maxWidth: 440 }]}>
      <View style={{ gap: 10 }}>
        {schoolDetail ? (
          <View style={styles.row8}>
            <TileIcon icon="school" size="sm" />
            <Text variant="xs" weight={700} color="muted">
              {schoolDetail}
            </Text>
          </View>
        ) : null}
        <Text variant="h1" accessibilityRole="header" nativeID="signin-title">
          {schoolName ? t('auth.signInTo', { school: schoolName }) : t('auth.signInEduFlow')}
        </Text>
        <Text variant="sm" color="muted">
          {t('auth.registeredWith')} {t('auth.notYourSchool')}{' '}
          <Text
            variant="sm"
            weight={700}
            rawColor={colors.brandInk}
            onPress={() =>
              router.push({
                pathname: '/welcome',
                params: { next: '/sign-in' },
              })
            }
            accessibilityRole="link">
            {t('auth.changeSchool')}
          </Text>
        </Text>
      </View>

      <Field label={t('auth.emailOrMobile')}>
        <InputBox icon="mail" error={!!error}>
          <TextInput
            value={identifier}
            onChangeText={(v) => {
              setIdentifier(v);
              if (error) setError(undefined);
            }}
            placeholder="name@school.edu.in"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            keyboardType="email-address"
            accessibilityLabel={t('auth.emailOrMobile')}
            style={[styles.input, { color: colors.ink }]}
          />
        </InputBox>
      </Field>

      <Field label={t('auth.password')} right={<Link label={t('auth.forgot')} icon={null} onPress={() => setInfo('forgot')} />}>
        <InputBox icon="lock" error={!!error} padRight={6}>
          <TextInput
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (error) setError(undefined);
            }}
            secureTextEntry={!show}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            accessibilityLabel={t('auth.password')}
            style={[styles.input, { color: colors.ink, letterSpacing: show ? 0 : 1.5 }]}
          />
          <Button
            title={show ? t('auth.hide') : t('auth.show')}
            icon="eye"
            variant="ghost"
            size="sm"
            onPress={() => setShow((v) => !v)}
            accessibilityLabel={show ? t('auth.hidePassword') : t('auth.showPassword')}
          />
        </InputBox>
        {error ? (
          <Text variant="xs" color="bad" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </Field>

      <Pressable
        style={[styles.row10, pointer]}
        onPress={() => setRemember((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: remember }}>
        <Checkbox checked={remember} onChange={setRemember} label={t('auth.keepSignedIn')} />
        <Text variant="sm" weight={600} color="ink2">
          {t('auth.keepSignedIn')}
        </Text>
        <Text variant="xs" color="muted">
          {t('auth.for30Days')}
        </Text>
      </Pressable>

      <Button
        title={t('auth.signIn')}
        iconRight="arrowRight"
        size="lg"
        fullWidth
        loading={loading}
        disabled={!identifier.trim() || !password}
        onPress={submit}
      />

      <View style={styles.row12}>
        <Hr style={{ flex: 1, alignSelf: 'center' }} />
        <Text variant="xs" weight={600} color="muted">
          {t('auth.or')}
        </Text>
        <Hr style={{ flex: 1, alignSelf: 'center' }} />
      </View>

      <View style={{ gap: 10 }}>
        <Button title={t('auth.signInOtp')} icon="phone" variant="secondary" size="lg" fullWidth onPress={() => router.push('/login')} />
        <Button title={t('auth.signInSso')} icon="key" variant="secondary" size="lg" fullWidth onPress={() => setInfo('sso')} />
      </View>

      <Well style={styles.row12Top} pad={14}>
        <Icon name="shield" size={ICON_SIZE.sm} rawColor={colors.muted} />
        <Text variant="xs" color="muted" style={{ flex: 1, lineHeight: 18.6 }}>
          {t('auth.roleBasedNote')}
        </Text>
      </Well>
    </View>
  );

  return (
    <View style={[styles.page, { backgroundColor: colors.canvas }]}>
      {wide ? (
        <View style={styles.brandCol}>
          <Hero pad={0} radiusOverride={28} rings={{ width: 620, height: 620, right: -330, top: -330 }} style={{ flex: 1 }}>
            <View style={styles.brand}>
              <Animated.View entering={enter(0)} style={styles.row10}>
                <Svg width={34} height={34} viewBox="0 0 32 32">
                  <Rect width={32} height={32} rx={9} fill={colors.onHero} />
                  {[
                    'M8.5 11.5c3.2-2.8 6.3-2.8 9.5 0s5.6 2.4 7.5.6',
                    'M8.5 17c3.2-2.8 6.3-2.8 9.5 0s5.6 2.4 7.5.6',
                    'M8.5 22.5c3.2-2.8 6.3-2.8 9.5 0',
                  ].map((d) => (
                    <Path key={d} d={d} stroke={colors.hero} strokeWidth={2.2} strokeLinecap="round" fill="none" />
                  ))}
                </Svg>
                <Text
                  rawColor={colors.onHero}
                  style={{
                    fontFamily: fonts.displayBold,
                    fontSize: 23,
                    lineHeight: 26,
                    letterSpacing: -0.7,
                  }}>
                  EduFlow
                </Text>
              </Animated.View>
              <Animated.View entering={enter(120)} style={{ gap: 16 }}>
                <Text variant="eyebrow" rawColor={colors.gold}>
                  {t('auth.brandEyebrow')}
                </Text>
                <Text
                  variant="hero"
                  rawColor={colors.onHero}
                  style={{
                    fontSize: 50,
                    lineHeight: 52,
                    letterSpacing: -1.75,
                    maxWidth: 540,
                  }}>
                  {t('auth.brandTitle')}
                </Text>
                <Text variant="lg" rawColor={colors.heroMuted} style={{ maxWidth: 480 }}>
                  {t('auth.brandBody')}
                </Text>
              </Animated.View>
              <Animated.View entering={enter(300)}>
                <StudentOrbit />
              </Animated.View>
              <Animated.View entering={enter(500)} style={{ gap: 14 }}>
                <Hr />
                <View style={[styles.row16, { justifyContent: 'space-between' }]}>
                  <Text variant="sm" rawColor={colors.heroMuted}>
                    {t('auth.fourViews')}
                  </Text>
                  <RoleCycle />
                </View>
              </Animated.View>
            </View>
          </Hero>
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.main, !wide && { paddingHorizontal: 20, paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.row14, { justifyContent: 'flex-end' }]}>
          {wide ? (
            <Text variant="sm" color="muted">
              {t('auth.trouble')}
            </Text>
          ) : null}
          <Link label={t('auth.contactOffice')} icon={null} onPress={() => setInfo('office')} />
          <IconButton
            icon={scheme === 'dark' ? 'sun' : 'moon'}
            label={scheme === 'dark' ? t('auth.lightMode') : t('auth.darkMode')}
            onPress={toggleScheme}
          />
        </View>
        <View style={styles.center}>{form}</View>
        <View style={[styles.row16, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
          <Text variant="xs" color="muted">
            © 2026 EduFlow{schoolName ? ` · ${schoolName}` : ''}
          </Text>
          <View style={styles.row16}>
            <Text variant="xs" color="muted" onPress={() => setInfo('office')}>
              {t('auth.privacy')}
            </Text>
            <Text variant="xs" color="muted" onPress={() => setInfo('office')}>
              {t('auth.terms')}
            </Text>
            <Text variant="xs" color="muted" onPress={() => setInfo('office')}>
              {t('auth.helpCentre')}
            </Text>
          </View>
        </View>
      </ScrollView>

      <Sheet
        visible={!!info}
        onClose={() => setInfo(undefined)}
        title={info === 'forgot' ? t('auth.forgotTitle') : info === 'sso' ? t('auth.ssoTitle') : t('auth.help')}
        message={
          info === 'forgot'
            ? t('auth.forgotText')
            : info === 'sso'
              ? t('auth.ssoText', {
                  school: schoolName ?? t('auth.yourSchool'),
                })
              : t('auth.helpText')
        }>
        {info === 'forgot' || info === 'sso' ? (
          <Button
            title={t('auth.signInOtp')}
            icon="phone"
            fullWidth
            onPress={() => {
              setInfo(undefined);
              router.push('/login');
            }}
          />
        ) : null}
      </Sheet>
    </View>
  );
}

function Field({ label, right, children }: { label: string; right?: ReactNode; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <Text rawColor={colors.ink2} style={{ fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16 }}>
          {label}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function InputBox({
  icon,
  error,
  padRight = 14,
  children,
}: {
  icon: 'mail' | 'lock';
  error?: boolean;
  padRight?: number;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.inputWrap,
        {
          paddingRight: padRight,
          backgroundColor: colors.surface,
          borderColor: error ? colors.bad : focused ? colors.brand : colors.lineStrong,
        },
        focused && !error && { boxShadow: `0 0 0 3px ${colors.brandSoft}` },
      ]}>
      <Icon name={icon} size={ICON_SIZE.md} rawColor={colors.muted} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, flexDirection: 'row' },
  brandCol: { width: 664, padding: 16, paddingRight: 0 },
  brand: {
    flex: 1,
    paddingTop: 44,
    paddingHorizontal: 48,
    paddingBottom: 40,
    justifyContent: 'space-between',
    gap: 24,
  },
  main: {
    flexGrow: 1,
    paddingTop: 28,
    paddingRight: 40,
    paddingBottom: 32,
    paddingLeft: 56,
    gap: 24,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: { width: 408, gap: 22 },
  row8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row10: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row12: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row12Top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  row14: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  row16: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    paddingLeft: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    fontFamily: fonts.medium,
    fontSize: 14,
    ...noWebFocusRing,
  },
});
