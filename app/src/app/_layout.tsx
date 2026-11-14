import '@/lib/background';
import '@/lib/notifications';
import { Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fonts, useTheme } from '@/components/ui';
import { SessionProvider } from '@/lib/session';
import { palettes, ThemeProvider } from '@/lib/theme';

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

function RootStack() {
  const { colors } = useTheme();
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
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="register" options={{ title: '' }} />
        <Stack.Screen name="login" options={{ title: '' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="group/[id]" options={{ title: 'Leaderboard' }} />
        <Stack.Screen name="friend/[userId]" options={{ headerTransparent: true, title: '' }} />
        <Stack.Screen name="new-egg" options={{ title: 'New egg', presentation: 'modal' }} />
        <Stack.Screen name="groups" options={{ title: 'Groups' }} />
        <Stack.Screen name="unlocks" options={{ headerShown: false }} />
        <Stack.Screen name="stats" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
