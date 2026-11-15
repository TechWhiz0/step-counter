import {
  SdkAvailabilityStatus,
  aggregateGroupByDuration,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
} from 'react-native-health-connect';
import { emptyHours, lastDays } from '../dates';
import type { DayHours, HealthStatus } from './index';

export type { DayHours, HealthStatus } from './index';

let ready: Promise<boolean> | null = null;
const init = () => (ready ??= initialize());

export async function healthStatus(): Promise<HealthStatus> {
  const status = await getSdkStatus();
  if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return 'ok';
  if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'update-required';
  return 'missing';
}

const isStepsRead = (p: { recordType: string; accessType: string }) => p.recordType === 'Steps' && p.accessType === 'read';

export async function requestStepAccess(): Promise<boolean> {
  if ((await healthStatus()) !== 'ok') return false;
  await init();
  // Background access lets the periodic sync read steps while the app is closed.
  const granted = await requestPermission([
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'BackgroundAccessPermission' },
  ]);
  return granted.some(isStepsRead);
}

export async function hasStepAccess(): Promise<boolean> {
  if ((await healthStatus()) !== 'ok') return false;
  await init();
  return (await getGrantedPermissions()).some(isStepsRead);
}

export async function readHourlySteps(days: number): Promise<DayHours[]> {
  await init();
  const out: DayHours[] = [];
  for (const { day, start, end } of lastDays(days)) {
    const hourly = emptyHours();
    const groups = await aggregateGroupByDuration({
      recordType: 'Steps',
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
      timeRangeSlicer: { duration: 'HOURS', length: 1 },
    });
    for (const g of groups) hourly[new Date(g.startTime).getHours()] += g.result.COUNT_TOTAL ?? 0;
    // Health Connect only totals apps in its step priority list, so a day can add up to 0 while raw step
    // records are there. Then count the raw records ourselves, from one source so phone + watch aren't doubled.
    out.push({ day, hourly: hourly.some((h) => h > 0) ? hourly : await rawHourly(start, end) });
  }
  return out;
}

async function rawHourly(start: Date, end: Date): Promise<number[]> {
  const byOrigin = new Map<string, number[]>();
  let pageToken: string | undefined;
  do {
    const page = await readRecords('Steps', {
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
      pageSize: 1000,
      pageToken,
    });
    for (const r of page.records) {
      const origin = r.metadata?.dataOrigin ?? 'unknown';
      const hours = byOrigin.get(origin) ?? emptyHours();
      spreadOverHours(hours, new Date(r.startTime), new Date(r.endTime), r.count, start);
      byOrigin.set(origin, hours);
    }
    pageToken = page.pageToken || undefined;
  } while (pageToken);
  let best = emptyHours();
  for (const hours of byOrigin.values()) if (sum(hours) > sum(best)) best = hours;
  return best.map(Math.round);
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// Splits a record's steps across the clock hours it covers, in proportion to the time in each (within this day).
function spreadOverHours(hours: number[], from: Date, to: Date, count: number, dayStart: Date) {
  if (to.getTime() <= from.getTime()) {
    if (from.getDate() === dayStart.getDate()) hours[from.getHours()] += count;
    return;
  }
  const total = Math.max(1, to.getTime() - from.getTime());
  for (let h = 0; h < 24; h++) {
    const hs = new Date(dayStart);
    hs.setHours(h, 0, 0, 0);
    const he = new Date(hs);
    he.setHours(h + 1);
    const overlap = Math.min(to.getTime(), he.getTime()) - Math.max(from.getTime(), hs.getTime());
    if (overlap > 0) hours[h] += (count * overlap) / total;
  }
}

export function openHealthSettings() {
  openHealthConnectSettings();
}
