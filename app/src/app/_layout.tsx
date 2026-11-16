import '@/lib/background';
import '@/lib/notifications';
import { Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, LogBox, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DialogHost } from '@/components/Dialog';
import { fonts, useTheme } from '@/components/ui';
import { ensureNotificationPermission, notificationUrl } from '@/lib/notifications';
import { SessionProvider, useSession } from '@/lib/session';
import { palettes, ThemeProvider } from '@/lib/theme';

// Known-harmless dev notice: the background step task registers after the first JS run.
LogBox.ignoreLogs(['No task registered for key']);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  // Fonts are bundled, so this is a few frames; on error fall back to system fonts rather than a blank app.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: palettes.light.bg }} />;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <RootStack />
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Admin accounts only use the admin screens: any walker route (tabs, stats, groups, a deep link) sends them back.
function useAdminOnly() {
  const { status, user } = useSession();
  const segments = useSegments();
  const top = segments[0] as string | undefined;
  const isAdmin = status === 'signedIn' && user?.role === 'admin';
  useEffect(() => {
    if (isAdmin && top !== 'admin') router.replace('/admin');
  }, [isAdmin, top]);
}

// Tapping a notification opens the screen it is about (also when it launched the app).
function useNotificationTaps() {
  const { status, user } = useSession();
  const last = Notifications.useLastNotificationResponse();
  const ready = status === 'signedIn' && user?.role !== 'admin';
  useEffect(() => {
    if (!last) return;
    // The tapped notification has done its job: take it out of the shade.
    void Notifications.dismissNotificationAsync(last.notification.request.identifier).catch(() => {});
    const url = notificationUrl(last);
    if (ready && url) router.push(url as never);
  }, [last, ready]);
  // Opening the app shows everything the notifications were about, so clear the rest of Step Pet's from the shade.
  useEffect(() => {
    const clear = () => void Notifications.dismissAllNotificationsAsync().catch(() => {});
    clear();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && clear());
    return () => sub.remove();
  }, []);
  // Walkers who skipped the prompt in onboarding get asked once.
  useEffect(() => {
    if (ready) void ensureNotificationPermission().catch(() => false);
  }, [ready]);
}

function RootStack() {
  const { colors } = useTheme();
  useAdminOnly();
  useNotificationTaps();
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.display, fontSize: 22 },
          contentStyle: { backgroundColor: colors.bg },
          // A smooth parallax slide (Android); the previous screen eases back as the new one comes in.
          animation: 'ios_from_right',
          animationDuration: 320,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="register" options={{ title: '' }} />
        <Stack.Screen name="login" options={{ title: '' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="group/[id]" options={{ title: 'Leaderboard' }} />
        <Stack.Screen name="friend/[userId]" options={{ headerShown: false }} />
        <Stack.Screen name="new-egg" options={{ title: 'New egg', presentation: 'modal' }} />
        <Stack.Screen name="groups" options={{ title: 'Groups' }} />
        <Stack.Screen name="unlocks" options={{ headerShown: false }} />
        <Stack.Screen name="stats" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
      <DialogHost />
    </>
  );
}
