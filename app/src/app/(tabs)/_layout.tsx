import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { colors, fonts } from '@/components/ui';
import { haptic } from '@/lib/feel';
import { useSession } from '@/lib/session';

type IconName = keyof typeof Ionicons.glyphMap;
const icon =
  (on: IconName, off: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) => <Ionicons name={focused ? on : off} color={color as string} size={24} />;

export default function TabsLayout() {
  const { status } = useSession();
  if (status === 'signedOut') return <Redirect href="/welcome" />;
  return (
    <Tabs
      screenListeners={{ tabPress: () => haptic.select() }}
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 12 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopWidth: 0, paddingTop: 6, elevation: 12, shadowOpacity: 0.06, shadowRadius: 12 },
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 24 },
        headerTitleAlign: 'left',
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'My pet', headerShown: false, tabBarIcon: icon('paw', 'paw-outline') }} />
      <Tabs.Screen name="groups" options={{ title: 'Groups', tabBarIcon: icon('people', 'people-outline') }} />
      <Tabs.Screen name="collection" options={{ title: 'Collection', tabBarIcon: icon('sparkles', 'sparkles-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings', 'settings-outline') }} />
    </Tabs>
  );
}
