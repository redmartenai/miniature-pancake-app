import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { AppBar, Button, Card, Text, TextField, TileIcon } from '@/ui';

/**
 * "Change school": sign in to one school by the code printed on its circulars.
 * Without a code, sign-in covers every school the number or email belongs to.
 */
export default function ChangeSchool() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const pending = useSession((s) => s.pendingSchool);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const back = () => router.replace(next === '/sign-in' ? '/sign-in' : '/login');

  const find = async () => {
    const value = code.trim().toUpperCase();
    if (!value) return;
    setLoading(true);
    setError(undefined);
    try {
      const school = await api.lookupSchool(value);
      useSession.getState().setPendingSchool(school);
      back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.somethingWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.canvas }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppBar back={back} />
      <ScrollView contentContainerStyle={styles.main} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <Text variant="eyebrow">{t('auth.changeSchool')}</Text>
          <Text variant="h2" accessibilityRole="header">
            {t('auth.findSchoolTitle')}
          </Text>
          <Text variant="sm" color="muted">
            {t('auth.schoolCodeHelp')}
          </Text>
        </View>
        {pending ? (
          <Card pad={16} style={styles.row}>
            <TileIcon icon="school" tone="neutral" size="sm" />
            <View style={{ flex: 1 }}>
              <Text variant="sm" weight={700}>
                {pending.name}
              </Text>
              <Text variant="xs" color="muted">
                {t('auth.currentChoice')}
              </Text>
            </View>
            <Button
              title={t('auth.anySchool')}
              variant="ghost"
              size="sm"
              textColor={colors.brandInk}
              onPress={() => {
                useSession.getState().setPendingSchool(undefined);
                back();
              }}
            />
          </Card>
        ) : null}
        <TextField
          label={t('auth.schoolCodeLabel')}
          placeholder={t('auth.schoolCodePlaceholder')}
          error={error}
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          returnKeyType="go"
          onSubmitEditing={find}
          icon="school"
          maxLength={16}
        />
        <Button title={t('auth.findSchool')} iconRight="arrowRight" onPress={find} loading={loading} disabled={!code.trim()} size="lg" fullWidth />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  main: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: 8, paddingHorizontal: 20, paddingBottom: 24, gap: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
