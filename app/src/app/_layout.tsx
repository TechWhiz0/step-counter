import '@/lib/background';
import '@/lib/notifications';
import { CourierPrime_400Regular, CourierPrime_700Bold } from '@expo-google-fonts/courier-prime';
import { Newsreader_500Medium, Newsreader_500Medium_Italic } from '@expo-google-fonts/newsreader';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, LogBox, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DialogHost } from '@/components/Dialog';
import { ensureNotificationPermission, notificationUrl } from '@/lib/notifications';
import { SessionProvider, useSession } from '@/lib/session';
import { palettes, ThemeProvider } from '@/lib/theme';

// Known-harmless dev notice: the background step task registers after the first JS run.
LogBox.ignoreLogs(['No task registered for key']);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CourierPrime_400Regular,
    CourierPrime_700Bold,
    Newsreader_500Medium,
    Newsreader_500Medium_Italic,
  });
  // Fonts are bundled, so this is a few frames; on error fall back to system fonts rather than a blank app.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: palettes.day.desk }} />;

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

// Admin accounts only use the admin screens: any walker route sends them back, and the other way round.
function useRoleRoutes() {
  const { status, user } = useSession();
  const segments = useSegments();
  const top = segments[0] as string | undefined;
  const isAdmin = status === 'signedIn' && user?.role === 'admin';
  useEffect(() => {
    if (isAdmin && top !== 'admin') router.replace('/admin');
    if (status === 'signedIn' && !isAdmin && top === 'admin') router.replace('/');
  }, [isAdmin, status, top]);
}

// Tapping a notification opens the screen it is about (also when it launched the app).
function useNotificationTaps() {
  const { status, user } = useSession();
  const last = Notifications.useLastNotificationResponse();
  const ready = status === 'signedIn' && user?.role !== 'admin';
  useEffect(() => {
    if (!last) return;
    void Notifications.dismissNotificationAsync(last.notification.request.identifier).catch(() => {});
    const url = notificationUrl(last);
    if (ready && url) router.push(url as never);
  }, [last, ready]);
  // Opening the app shows everything the notifications were about, so clear the rest from the shade.
  useEffect(() => {
    const clear = () => void Notifications.dismissAllNotificationsAsync().catch(() => {});
    clear();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && clear());
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (ready) void ensureNotificationPermission().catch(() => false);
  }, [ready]);
}

function RootStack() {
  useRoleRoutes();
  useNotificationTaps();
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palettes.day.desk },
          animation: 'ios_from_right',
          animationDuration: 300,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="register" />
        <Stack.Screen name="login" />
        <Stack.Screen name="forgot" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="me" />
        <Stack.Screen name="new-egg" options={{ presentation: 'modal' }} />
        <Stack.Screen name="admin" options={{ animation: 'fade' }} />
      </Stack>
      <DialogHost />
    </>
  );
}
