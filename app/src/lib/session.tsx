import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore } from './api';
import { registerBackgroundSync, unregisterBackgroundSync } from './background';
import { clearLocal, getJson, setJson } from './localDb';
import { cancelAll } from './notifications';
import type { User } from './types';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface Session {
  status: Status;
  user: User | null;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<User | null>(null);

  const setUser = useCallback((u: User) => {
    setUserState(u);
    void setJson('user', u);
  }, []);

  useEffect(() => {
    (async () => {
      const token = await tokenStore.get();
      if (!token) return setStatus('signedOut');
      // Show the cached user at once, then refresh from the server.
      const cached = await getJson<User>('user');
      if (cached) setUserState(cached);
      setStatus('signedIn');
      void registerBackgroundSync();
      try {
        const { user: fresh } = await api<{ user: User }>('/auth/me');
        setUser(fresh);
      } catch (e) {
        if ((e as { status?: number }).status === 401) {
          await tokenStore.clear();
          setStatus('signedOut');
        }
      }
    })();
  }, [setUser]);

  const signIn = useCallback(
    async (token: string, u: User) => {
      await tokenStore.set(token);
      setUser(u);
      setStatus('signedIn');
      void registerBackgroundSync();
    },
    [setUser],
  );

  const signOut = useCallback(async () => {
    await unregisterBackgroundSync().catch(() => {});
    await cancelAll();
    await tokenStore.clear();
    await clearLocal();
    setUserState(null);
    setStatus('signedOut');
  }, []);

  return <SessionContext.Provider value={{ status, user, signIn, signOut, setUser }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession must be used inside SessionProvider');
  return s;
}
