import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { DEMO_TOKEN, demoApi } from './demo';

// Set EXPO_PUBLIC_API_URL in app/.env to your computer's address (e.g. http://192.168.1.20:4000 for a real phone).
// Defaults: the Android emulator reaches your computer at 10.0.2.2, the iOS simulator at localhost.
// Users can override it from the welcome screen, so a changed IP doesn't need a new build.
export const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

const TOKEN_KEY = 'steppet.token';
const SERVER_KEY = 'steppet.server';

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

export const serverStore = {
  get: async () => (await store.get(SERVER_KEY)) ?? DEFAULT_API_URL,
  set: (url: string) => store.set(SERVER_KEY, url.trim().replace(/\/+$/, '')),
  reset: () => store.clear(SERVER_KEY),
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const [token, server] = await Promise.all([tokenStore.get(), serverStore.get()]);
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
    throw new ApiError(0, `Can't reach the server at ${server}. Check the server address and that your phone is on the same network.`);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}
