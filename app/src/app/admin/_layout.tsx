import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useCallback, useEffect, useState } from 'react';
import { ReviewCount } from '@/components/AdminFrame';
import { TextTabs } from '@/components/paper';
import { api } from '@/lib/api';
import { useAppActive } from '@/lib/live';
import { useSession } from '@/lib/session';
import { palettes } from '@/lib/theme';
import type { AdminUsersResult } from '@/lib/types';

const TABS = [
  { key: 'index', label: 'overview' },
  { key: 'users', label: 'walkers' },
  { key: 'review', label: 'review' },
  { key: 'monsters', label: 'monsters' },
];

// Admin screens. The server checks the role on every call; this only keeps non-admins out.
export default function AdminLayout() {
  const { user, status } = useSession();
  const active = useAppActive();
  const [count, setCount] = useState(0);
  const reload = useCallback(() => {
    void api<AdminUsersResult>('/admin/users?filter=flagged')
      .then((r) => setCount(r.total))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!active || user?.role !== 'admin') return;
    reload();
    const t = setInterval(reload, 60_000);
    return () => clearInterval(t);
  }, [active, reload, user?.role]);

  if (status === 'signedOut') return <Redirect href="/welcome" />;
  if (user && user.role !== 'admin') return <Redirect href="/" />;
  return (
    <ReviewCount.Provider value={{ count, reload }}>
      <Tabs
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: palettes.day.desk }, animation: 'fade' }}
        tabBar={({ state, navigateToTab }) => (
          <TextTabs
            tabs={TABS}
            active={state.routes[state.index]?.name ?? 'index'}
            badge={{ review: count || undefined }}
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
    </ReviewCount.Provider>
  );
}
