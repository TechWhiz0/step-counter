import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useRef } from 'react';
import { Animated, type ColorValue } from 'react-native';
import { fonts, useColors } from '@/components/ui';
import { tapFeedback } from '@/lib/haptics';
import { useSession } from '@/lib/session';

type IconName = 'paw' | 'people' | 'albums' | 'settings';

// The selected tab's icon fills in and pops up with a little bounce.
function TabIcon({ name, color, size, focused }: { name: IconName; color: ColorValue; size: number; focused: boolean }) {
  const on = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(on, { toValue: focused ? 1 : 0, useNativeDriver: true, speed: 20, bounciness: 14 }).start();
  }, [focused, on]);
  return (
    <Animated.View
      style={{
        transform: [
          { scale: on.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
          { translateY: on.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
        ],
      }}
    >
      <Ionicons name={focused ? name : `${name}-outline`} color={color as string} size={size} />
    </Animated.View>
  );
}

const icon =
  (name: IconName) =>
  ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => <TabIcon name={name} color={color} size={size} focused={focused} />;

export default function TabsLayout() {
  const colors = useColors();
  const { status } = useSession();
  if (status === 'signedOut') return <Redirect href="/welcome" />;
  return (
    <Tabs
      screenListeners={{ tabPress: () => tapFeedback() }}
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 12 },
        tabBarStyle: { backgroundColor: colors.tabBg, borderTopWidth: 1, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 22 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'My pet', tabBarIcon: icon('paw') }} />
      <Tabs.Screen name="groups" options={{ title: 'Groups', tabBarIcon: icon('people') }} />
      <Tabs.Screen name="collection" options={{ title: 'Collection', tabBarIcon: icon('albums') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
