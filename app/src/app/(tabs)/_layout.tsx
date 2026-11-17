import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { TextTabs } from '@/components/paper';
import { useSession } from '@/lib/session';
import { beginLiveCounting } from '@/lib/sync';
import { palettes } from '@/lib/theme';

const TABS = [
  { key: 'index', label: 'today' },
  { key: 'path', label: 'path' },
  { key: 'leagues', label: 'league' },
  { key: 'closet', label: 'closet' },
  { key: 'guide', label: 'guide' },
];

export default function TabsLayout() {
  const { status, user } = useSession();
  const walker = status === 'signedIn' && user?.role !== 'admin';
  // Count steps live with the phone's sensor while a walker has the app open.
  useEffect(() => {
    if (walker) void beginLiveCounting();
  }, [walker]);
  if (status === 'signedOut') return <Redirect href="/welcome" />;
  if (user?.role === 'admin') return <Redirect href="/admin" />;
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: palettes.day.paper }, animation: 'fade' }}
      tabBar={({ state, navigateToTab }) => (
        <TextTabs
          tabs={TABS}
          active={state.routes[state.index]?.name ?? 'index'}
          onPress={(key) => {
            const route = state.routes.find((r) => r.name === key);
            if (route) navigateToTab(route.key);
          }}
        />
      )}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.key} name={t.key} />
      ))}
    </Tabs>
  );
}
