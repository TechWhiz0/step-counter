import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, ApiError } from './api';

function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}

// Keeps `data` fresh by itself while the screen is on screen and the app is open.
// The server holds each request until something changes (another device synced, someone in your
// league walked) or ~25 s pass, so updates arrive within a second without polling every few seconds.
export function useLive<T extends { rev?: number }>(path: string, opts: { enabled?: boolean; initial?: T | null } = {}) {
  const [data, setData] = useState<T | null>(opts.initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const focused = useIsFocused();
  const active = useAppActive();
  const run = (opts.enabled ?? true) && focused && active;
  const rev = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const next = await api<T>(path);
      rev.current = next.rev;
      setData(next);
      setError(null);
      return next;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, [path]);

  useEffect(() => {
    if (!run) return;
    const stop = new AbortController();
    (async () => {
      if (rev.current === undefined) await refresh();
      else void refresh();
      let backoff = 2000;
      while (!stop.signal.aborted) {
        if (rev.current === undefined) {
          await new Promise((r) => setTimeout(r, backoff));
          if (stop.signal.aborted) return;
          await refresh();
          continue;
        }
        try {
          const sep = path.includes('?') ? '&' : '?';
          const next = await api<T>(`${path}${sep}wait=${rev.current}`, { signal: stop.signal, timeoutMs: 40_000 });
          if (stop.signal.aborted) return;
          rev.current = next.rev;
          setData(next);
          setError(null);
          backoff = 2000;
        } catch (e) {
          if (stop.signal.aborted || (e instanceof ApiError && e.status === -1)) return;
          if (e instanceof ApiError && e.status === 401) return;
          await new Promise((r) => setTimeout(r, backoff));
          backoff = Math.min(backoff * 2, 30_000);
        }
      }
    })();
    return () => stop.abort();
  }, [run, path, refresh]);

  return { data, setData, error, refresh };
}

export { useAppActive };
