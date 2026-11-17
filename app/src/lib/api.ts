import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// The server comes from EXPO_PUBLIC_API_URL in app/.env (built into the app; restart Metro after changing it).
// Without it: the Android emulator reaches your computer at 10.0.2.2, the iOS simulator at localhost.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

const TOKEN_KEY = 'steppet.token';

// SecureStore has no web version; web is only used for dev previews.
const store =
  Platform.OS === 'web'
    ? {
        get: async (key: string) => globalThis.localStorage?.getItem(key) ?? null,
        set: async (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
        clear: async (key: string) => globalThis.localStorage?.removeItem(key),
      }
    : {
        get: (key: string) => SecureStore.getItemAsync(key),
        set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        clear: (key: string) => SecureStore.deleteItemAsync(key),
      };

// The token is read from secure storage once and kept in memory; background tasks start cold and load it.
let cached: string | null | undefined;
export const tokenStore = {
  get: async () => (cached !== undefined ? cached : (cached = await store.get(TOKEN_KEY))),
  set: async (token: string) => {
    cached = token;
    await store.set(TOKEN_KEY, token);
  },
  clear: async () => {
    cached = null;
    await store.clear(TOKEN_KEY);
  },
};

// A short name for this phone, shown nowhere yet but kept with the session on the server.
export const deviceName = [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || Platform.OS;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

// Called when the server says this device's session is over (signed out elsewhere, password reset,
// account deleted). The session provider signs the app out.
let onSignedOut: (() => void) | null = null;
export function setSignedOutHandler(fn: (() => void) | null) {
  onSignedOut = fn;
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const token = await tokenStore.get();
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), options.timeoutMs ?? 20_000);
  const relay = () => timeout.abort();
  options.signal?.addEventListener('abort', relay);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        // Lets the app pass ngrok's free-plan browser warning page if the server is behind ngrok.
        'ngrok-skip-browser-warning': '1',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: timeout.signal,
    });
  } catch {
    if (options.signal?.aborted) throw new ApiError(-1, 'Cancelled');
    throw new ApiError(0, "Can't reach Step Pet right now. Check your internet connection and try again in a moment.");
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', relay);
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401 && token && (await tokenStore.get()) === token) onSignedOut?.();
  if (!res.ok) throw new ApiError(res.status, (data.error as string) ?? `Request failed (${res.status})`, data);
  return data as T;
}
