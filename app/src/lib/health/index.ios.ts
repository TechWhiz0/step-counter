import {
  isHealthDataAvailable,
  queryStatisticsCollectionForQuantity,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { Linking } from 'react-native';
import { dayKey, emptyHours, lastDays } from '../dates';
import type { DayHours, HealthStatus } from './index';

export type { DayHours, HealthStatus } from './index';

const STEPS = 'HKQuantityTypeIdentifierStepCount';

export async function healthStatus(): Promise<HealthStatus> {
  return (await isHealthDataAvailable()) ? 'ok' : 'missing';
}

// iOS never tells apps whether read access was granted, so a finished request counts as access.
export async function requestStepAccess(): Promise<boolean> {
  if (!(await isHealthDataAvailable())) return false;
  return requestAuthorization({ toRead: [STEPS] });
}

export async function hasStepAccess(): Promise<boolean> {
  return isHealthDataAvailable();
}

export async function readHourlySteps(days: number): Promise<DayHours[]> {
  const range = lastDays(days);
  const byDay = new Map(range.map((r) => [r.day, emptyHours()]));
  const stats = await queryStatisticsCollectionForQuantity(STEPS, ['cumulativeSum'], range[0].start, { hour: 1 }, {
    filter: { date: { startDate: range[0].start, endDate: range[range.length - 1].end } },
    unit: 'count',
  });
  for (const s of stats) {
    if (!s.startDate) continue;
    const hours = byDay.get(dayKey(s.startDate));
    if (hours) hours[s.startDate.getHours()] += Math.round(s.sumQuantity?.quantity ?? 0);
  }
  return range.map((r) => ({ day: r.day, hourly: byDay.get(r.day)! }));
}

export function openHealthSettings() {
  void Linking.openURL('x-apple-health://');
}
