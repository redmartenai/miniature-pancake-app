import '@/global.css';
import '@/i18n';
import '@/features/driver/locationTask';

import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_400Regular_Italic,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { focusManager, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import { addNotificationTapListener, registerForPush, routeForNotification } from '@/features/notifications/push';
import { usePersonalChannel } from '@/features/realtime/usePersonalChannel';
import { setLanguage } from '@/i18n';
import { useLastAccount } from '@/state/lastAccount';
import { useOffline } from '@/state/offline';
import { usePreferences } from '@/state/preferences';
import { useSession } from '@/state/session';
import { AppThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { ToastProvider } from '@/ui';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return count < 2;
      },
    },
  },
});

if (Platform.OS !== 'web') {
  // Refresh data when the app comes back to the foreground.
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
    return () => subscription.remove();
  });
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_400Regular_Italic,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const status = useSession((s) => s.status);
  const prefsReady = usePreferences((s) => s.hydrated);
  const lastReady = useLastAccount((s) => s.hydrated);

  useEffect(() => {
    void useSession.getState().hydrate();
    void usePreferences.getState().hydrate();
    void useLastAccount.getState().hydrate();
    void useOffline.getState().hydrate();
  }, []);

  const ready = fontsLoaded && prefsReady && lastReady && status !== 'loading';
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <ToastProvider>
              <SignedInEffects />
              <RootStack />
            </ToastProvider>
          </AppThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { colors, scheme } = useTheme();
  const signedIn = useSession((s) => s.status === 'signedIn');
  const navigationTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      primary: colors.brand,
      background: colors.canvas,
      card: colors.surface,
      text: colors.ink,
      border: colors.line,
    },
  };
  const header = {
    headerShown: true,
    headerStyle: { backgroundColor: colors.canvas },
    headerTintColor: colors.brandInk,
    headerTitleStyle: { fontFamily: fonts.bold, color: colors.ink, fontSize: 16 },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal' as const,
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="dev/gallery" />
        <Stack.Screen name="invite/[token]" />
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="parent" />
          <Stack.Screen name="student" />
          <Stack.Screen name="staff" />
          <Stack.Screen name="principal" />
          <Stack.Screen name="console" />
          <Stack.Screen name="platform" />
          <Stack.Screen name="set-password" />
          <Stack.Screen name="driver" />
          <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="chat/new" options={{ ...header, title: '', presentation: 'modal' }} />
          <Stack.Screen name="announcements" options={{ ...header, title: '' }} />
          <Stack.Screen name="notifications" options={{ ...header, title: '' }} />
          <Stack.Screen name="settings" options={{ ...header, title: '' }} />
          <Stack.Screen name="class/[id]/attendance" options={{ ...header, title: '' }} />
          <Stack.Screen name="class/[id]/homework" options={{ ...header, title: '' }} />
          <Stack.Screen name="review/[id]" options={{ ...header, title: '' }} />
          <Stack.Screen name="trip/[id]" options={{ ...header, title: '' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

/** Runs once signed in: refresh the profile, language, live chat and push notifications. */
function SignedInEffects() {
  const signedIn = useSession((s) => s.status === 'signedIn');
  const userLanguage = useSession((s) => s.user?.language);
  const client = useQueryClient();
  usePersonalChannel();

  useEffect(() => {
    if (userLanguage) setLanguage(userLanguage);
  }, [userLanguage]);

  useEffect(() => {
    if (!signedIn) {
      client.clear();
      return;
    }
    api
      .me()
      .then(({ user, memberships }) => useSession.getState().setProfile(user, memberships))
      .catch(() => undefined);
    void registerForPush();
  }, [signedIn, client]);

  useEffect(() => {
    if (Platform.OS === 'web' || !signedIn) return;
    return addNotificationTapListener((data) => {
      const role = useSession.getState().role;
      const target = routeForNotification(data, role === 'parent' || role === 'student', role === 'student' ? '/student' : '/parent');
      if (target) router.push(target as never);
    });
  }, [signedIn]);

  return null;
}
