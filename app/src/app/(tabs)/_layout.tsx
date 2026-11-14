import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useRef, type ComponentType } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons';
import { fonts, useColors } from '@/components/ui';
import { haptic } from '@/lib/feel';
import { useSession } from '@/lib/session';

type IconCmp = ComponentType<{ size?: number; color?: string }>;

const TABS: Record<string, { label: string; icon: IconCmp }> = {
  index: { label: 'Home', icon: Icon.paw },
  path: { label: 'Path', icon: Icon.path },
  leagues: { label: 'Leagues', icon: Icon.shield },
  closet: { label: 'Closet', icon: Icon.bag },
  me: { label: 'Me', icon: Icon.person },
};

// The selected tab sits in a soft green pill outlined in grass, and pops in with a little bounce.
function TabButton({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const c = useColors();
  const tab = TABS[name];
  const pop = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: focused ? 1 : 0, useNativeDriver: true, speed: 20, bounciness: 12 }).start();
  }, [focused, pop]);
  if (!tab) return null;
  const color = focused ? c.accent : c.muted;
  const Glyph = tab.icon;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
      onPress={onPress}
      style={styles.tab}
    >
      <Animated.View
        style={[
          styles.tabIcon,
          focused && { backgroundColor: c.accentSoft, borderColor: c.accent },
          { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] },
        ]}
      >
        <Glyph size={22} color={color} />
      </Animated.View>
      <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { status } = useSession();
  if (status === 'signedOut') return <Redirect href="/welcome" />;
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}
      tabBar={({ state, navigateToTab }) => (
        <View style={[styles.bar, { backgroundColor: c.tabBg, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
          {state.routes.map((route, i) => {
            const focused = state.index === i;
            return (
              <TabButton
                key={route.key}
                name={route.name}
                focused={focused}
                onPress={() => {
                  if (focused) return;
                  haptic.select();
                  navigateToTab(route.key);
                }}
              />
            );
          })}
        </View>
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="path" />
      <Tabs.Screen name="leagues" />
      <Tabs.Screen name="closet" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 2, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { width: 52, height: 36, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
});
