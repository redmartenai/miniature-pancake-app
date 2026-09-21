import { Redirect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { IS_DRIVER_APP } from '@/lib/config';
import { useExperience, useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Button, EmptyState, Screen } from '@/ui';

export default function DriverLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const experience = useExperience();
  if (experience && experience !== 'driver') return <Redirect href="/" />;

  if (!IS_DRIVER_APP) {
    // The main app has no location permission at all; bus crew use the separate Driver app.
    return (
      <Screen>
        <EmptyState icon="bus-outline" title={t('driver.useDriverApp')} message={t('driver.useDriverAppHint')} />
        <Button title={t('settings.signOut')} variant="secondary" onPress={() => void useSession.getState().signOut()} fullWidth />
      </Screen>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: fonts.semibold, color: colors.ink },
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="trip/[id]" options={{ headerShown: true, title: '' }} />
    </Stack>
  );
}
