import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useRef } from 'react';
import { Animated, type ColorValue } from 'react-native';
import { fonts, useColors } from '@/components/ui';
import { haptic } from '@/lib/feel';
import { useSession } from '@/lib/session';

type IconName = keyof typeof Ionicons.glyphMap;

// The selected tab's icon fills in and pops up with a little bounce.
function TabIcon({ on, off, color, focused }: { on: IconName; off: IconName; color: ColorValue; focused: boolean }) {
  const lift = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(lift, { toValue: focused ? 1 : 0, useNativeDriver: true, speed: 20, bounciness: 14 }).start();
  }, [focused, lift]);
  return (
    <Animated.View
      style={{
        transform: [
          { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
          { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
        ],
      }}
    >
      <Ionicons name={focused ? on : off} color={color as string} size={24} />
    </Animated.View>
  );
}

const icon =
  (on: IconName, off: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) => <TabIcon on={on} off={off} color={color} focused={focused} />;

export default function TabsLayout() {
  const colors = useColors();
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
