import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, setSignedOutHandler, tokenStore } from './api';
import { registerBackgroundSync, unregisterBackgroundSync } from './background';
import { clearLocal, getJson, setJson } from './localDb';
import { cancelAll } from './notifications';
import { endSyncSession } from './sync';
import type { User } from './types';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface Session {
  status: Status;
  user: User | null;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: (opts?: { local?: boolean }) => Promise<void>;
  setUser: (user: User) => void;
}

const SessionContext = createContext<Session | null>(null);

const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<User | null>(null);
  const signingOut = useRef(false);

  const setUser = useCallback((u: User) => {
    setUserState(u);
    void setJson('user', u);
  }, []);

  // Everything that keeps working in the background stops here, in this order, so nothing
  // can count or remind on a signed-out phone: live counting, background sync, the server
  // session (its token dies for every request still in flight), reminders, and the local cache.
  const signOut = useCallback(async (opts: { local?: boolean } = {}) => {
    if (signingOut.current) return;
    signingOut.current = true;
    try {
      endSyncSession();
      await unregisterBackgroundSync().catch(() => {});
      if (!opts.local) await api('/auth/logout', { method: 'POST', timeoutMs: 5000 }).catch(() => {});
      await tokenStore.clear();
      await cancelAll();
      await clearLocal().catch(() => {});
      setUserState(null);
      setStatus('signedOut');
    } finally {
      signingOut.current = false;
    }
  }, []);

  // The server ended this session (signed out from a password reset, account deleted): follow it.
  useEffect(() => {
    setSignedOutHandler(() => void signOut({ local: true }));
    return () => setSignedOutHandler(null);
  }, [signOut]);

  // Keeps "today" right for a walker who travelled to another timezone.
  const followTimezone = useCallback(
    async (u: User) => {
      const tz = deviceTimezone();
      if (!tz || u.timezone === tz || u.role === 'admin') return;
      const res = await api<{ user: User }>('/auth/me', { method: 'PATCH', body: { timezone: tz } }).catch(() => null);
      if (res) setUser(res.user);
    },
    [setUser],
  );

  useEffect(() => {
    (async () => {
      const token = await tokenStore.get();
      if (!token) return setStatus('signedOut');
      // Show the cached user at once, then refresh from the server.
      const cached = await getJson<User>('user');
      if (cached) setUserState(cached);
      setStatus('signedIn');
      if (cached?.role !== 'admin') void registerBackgroundSync();
      try {
        const { user: fresh } = await api<{ user: User }>('/auth/me');
        setUser(fresh);
        void followTimezone(fresh);
      } catch {
        // Offline: keep the cached user. A 401 is handled by the signed-out handler.
      }
    })();
  }, [setUser, followTimezone]);

  const signIn = useCallback(
    async (token: string, u: User) => {
      await clearLocal().catch(() => {});
      await tokenStore.set(token);
      setUser(u);
      setStatus('signedIn');
      if (u.role !== 'admin') void registerBackgroundSync();
      void followTimezone(u);
    },
    [setUser, followTimezone],
  );

  return <SessionContext.Provider value={{ status, user, signIn, signOut, setUser }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession must be used inside SessionProvider');
  return s;
}
