import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { DEMO_TOKEN, demoApi } from './demo';

// The server comes from EXPO_PUBLIC_API_URL in app/.env (built into the app; restart Metro after changing it).
// Without it: the Android emulator reaches your computer at 10.0.2.2, the iOS simulator at localhost.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

const TOKEN_KEY = 'steppet.token';
// Older builds let users save their own server address here; it's cleared so .env always wins.
const OLD_SERVER_KEY = 'steppet.server';

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

export const tokenStore = {
  get: () => store.get(TOKEN_KEY),
  set: (token: string) => store.set(TOKEN_KEY, token),
  clear: () => store.clear(TOKEN_KEY),
};

void store.clear(OLD_SERVER_KEY).catch(() => {});

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await tokenStore.get();
  const server = API_URL;
  if (__DEV__ && token === DEMO_TOKEN) {
    return demoApi(path, options.method ?? (options.body ? 'POST' : 'GET'), options.body) as Promise<T>;
  }
  let res: Response;
  try {
    res = await fetch(`${server}${path}`, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        // Lets the app pass ngrok's free-plan browser warning page if the server is behind ngrok.
        'ngrok-skip-browser-warning': '1',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach Step Pet right now. Check your internet connection and try again in a moment.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}
