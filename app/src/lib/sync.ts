import { api, tokenStore } from './api';
import { hasStepAccess, readHourlySteps } from './health';
import { getJson, markSynced, saveStepDays, setJson } from './localDb';
import { notifySurprises, updateEveningNudge } from './notifications';
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
        const result = await api<SyncResult>('/steps/sync', { body: { days } });
        await markSynced(days.map((d) => d.day));
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
  const name = result.pet?.name ?? 'Your pet';
  if (result.surprises.length) {
    // Kept until the home screen shows them.
    const pending = (await getJson<SyncResult['surprises']>('pendingSurprises')) ?? [];
    await setJson('pendingSurprises', [...pending, ...result.surprises]);
    await notifySurprises(name, result.surprises);
  }
  await updateEveningNudge(name, result.today.total, result.today.goal, result.today.day).catch(() => {});
}

export async function cachedSync() {
  return getJson<SyncResult & { at: number }>(LAST_SYNC_KEY);
}

export async function takePendingSurprises() {
  const pending = (await getJson<SyncResult['surprises']>('pendingSurprises')) ?? [];
  if (pending.length) await setJson('pendingSurprises', []);
  return pending;
}
