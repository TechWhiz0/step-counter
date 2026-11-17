import { api, tokenStore } from './api';
import { dayKey } from './dates';
import { hasStepAccess, readHourlySteps } from './health';
import { getJson, markSynced, saveStepDays, setJson } from './localDb';
import { refreshNotifications } from './notifications';
import { liveHours, setLiveCounting } from './pedometer';
import type { TodayState } from './types';

const SYNC_DAYS = 7;
export const LAST_SYNC_KEY = 'lastSync';

let running: Promise<TodayState | null> | null = null;
// Goes up on every sign-out. A sync that started before it must not write anything afterwards
// (cache, notifications), so a late answer can't bring a signed-out account back to life.
let epoch = 0;
// Today's health-store counts read just before live counting began (see pedometer.ts).
let baseline: { day: string; hourly: number[] } | null = null;

export function endSyncSession() {
  epoch++;
  baseline = null;
  setLiveCounting(false);
  running = null;
}

// Starts live counting: first note what the health store already has for today, then count on top.
export async function beginLiveCounting() {
  const today = dayKey(new Date());
  if (baseline?.day !== today) {
    let hourly = Array(24).fill(0) as number[];
    try {
      if (await hasStepAccess()) hourly = (await readHourlySteps(1))[0]?.hourly ?? hourly;
    } catch {
      // keep zeros
    }
    baseline = { day: today, hourly };
  }
  setLiveCounting(true);
}

// Health store (+ live sensor for today) -> local cache -> server. Shared by the app and the background task.
export function syncSteps(): Promise<TodayState | null> {
  if (running) return running;
  const mine = epoch;
  let job: Promise<TodayState | null> | null = null;
  job = (async () => {
    try {
      if (!(await tokenStore.get())) return null;
      let days = (await hasStepAccess().catch(() => false)) ? await readHourlySteps(SYNC_DAYS).catch(() => []) : [];
      const today = dayKey(new Date());
      const live = liveHours(today);
      if (live) {
        const base = baseline?.day === today ? baseline.hourly : Array(24).fill(0);
        const merged = (hc: number[]) => hc.map((h, i) => Math.max(h, base[i] + live[i]));
        const todayRow = days.find((d) => d.day === today);
        days = todayRow ? days.map((d) => (d.day === today ? { day: d.day, hourly: merged(d.hourly) } : d)) : [...days, { day: today, hourly: merged(Array(24).fill(0)) }];
      }
      if (days.length) await saveStepDays(days);
      // Days the phone reads as completely empty are left out, so a phone with missing history
      // (new phone, cleared health data) can't wipe steps the server already has.
      const withSteps = days.filter((d) => d.hourly.some((h) => h > 0));
      const result = await api<TodayState>('/steps/sync', { body: { days: withSteps } });
      if (mine !== epoch) return null;
      await markSynced(withSteps.map((d) => d.day));
      await afterSync(result);
      return result;
    } finally {
      if (running === job) running = null;
    }
  })();
  running = job;
  return job;
}

export async function afterSync(result: TodayState) {
  const mine = epoch;
  await setJson(LAST_SYNC_KEY, { ...result, at: Date.now() });
  if (mine !== epoch) return;
  await refreshNotifications(result).catch((e) => {
    if (__DEV__) console.warn('notifications:', e);
  });
}

export async function cachedSync() {
  return getJson<TodayState & { at: number }>(LAST_SYNC_KEY);
}

export const currentEpoch = () => epoch;
