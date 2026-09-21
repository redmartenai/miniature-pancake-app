import '@/global.css';
import '@/i18n';
import '@/features/driver/locationTask';

import { Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { focusManager, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import { registerForPush, routeForNotification } from '@/features/notifications/push';
import { usePersonalChannel } from '@/features/realtime/usePersonalChannel';
import { setLanguage } from '@/i18n';
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
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const status = useSession((s) => s.status);

  useEffect(() => {
    void useSession.getState().hydrate();
  }, []);

  const ready = fontsLoaded && status !== 'loading';
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
      primary: colors.primary,
      background: colors.bg,
      card: colors.surface,
      text: colors.ink,
      border: colors.border,
    },
  };
  const header = {
    headerShown: true,
    headerStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.primary,
    headerTitleStyle: { fontFamily: fonts.semibold, color: colors.ink, fontSize: 17 },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal' as const,
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="family" />
          <Stack.Screen name="staff" />
          <Stack.Screen name="driver" />
          <Stack.Screen name="chat/[id]" options={{ ...header, title: '' }} />
          <Stack.Screen name="chat/new" options={{ ...header, title: '', presentation: 'modal' }} />
          <Stack.Screen name="attendance" options={{ ...header, title: '' }} />
          <Stack.Screen name="homework/index" options={{ ...header, title: '' }} />
          <Stack.Screen name="homework/[id]" options={{ ...header, title: '' }} />
          <Stack.Screen name="fees" options={{ ...header, title: '' }} />
          <Stack.Screen name="results" options={{ ...header, title: '' }} />
          <Stack.Screen name="timetable" options={{ ...header, title: '' }} />
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
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const target = routeForNotification(response.notification.request.content.data as Record<string, unknown>);
      if (target) router.push(target as never);
    });
    return () => subscription.remove();
  }, [signedIn]);

  return null;
}
