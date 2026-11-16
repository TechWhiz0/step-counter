import { api, tokenStore } from './api';
import { hasStepAccess, readHourlySteps } from './health';
import { getJson, markSynced, saveStepDays, setJson } from './localDb';
import { refreshNotifications } from './notifications';
import type { SyncResult } from './types';

const SYNC_DAYS = 7;
export const LAST_SYNC_KEY = 'lastSync';

let running: Promise<SyncResult | null> | null = null;

// Health store -> local cache -> server. Shared by the app and the background task.
export function syncSteps(): Promise<SyncResult | null> {
  running ??= (async () => {
    try {
      if (!(await tokenStore.get())) return null;
      if (await hasStepAccess()) {
        const days = await readHourlySteps(SYNC_DAYS);
        await saveStepDays(days);
        // Days the phone reads as completely empty are left out, so a phone with missing history
        // (new phone, cleared health data) can't wipe steps the server already has.
        const withSteps = days.filter((d) => d.hourly.some((h) => h > 0));
        const result = await api<SyncResult>('/steps/sync', { body: { days: withSteps } });
        await markSynced(withSteps.map((d) => d.day));
        await afterSync(result);
        return result;
      }
      // No step access: still fetch pet state so the app shows something.
      const result = await api<SyncResult>('/steps/sync', { body: { days: [] } });
      await afterSync(result);
      return result;
    } finally {
      running = null;
    }
  })();
  return running;
}

async function afterSync(result: SyncResult) {
  await setJson(LAST_SYNC_KEY, { ...result, surprises: [], at: Date.now() });
  if (result.surprises.length) {
    // Kept until the home screen shows them.
    const pending = (await getJson<SyncResult['surprises']>('pendingSurprises')) ?? [];
    await setJson('pendingSurprises', [...pending, ...result.surprises]);
  }
  await refreshNotifications(result).catch((e) => {
    if (__DEV__) console.warn('notifications:', e);
  });
}

export async function cachedSync() {
  return getJson<SyncResult & { at: number }>(LAST_SYNC_KEY);
}

export async function takePendingSurprises() {
  const pending = (await getJson<SyncResult['surprises']>('pendingSurprises')) ?? [];
  if (pending.length) await setJson('pendingSurprises', []);
  return pending;
}
