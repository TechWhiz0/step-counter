import {
  SdkAvailabilityStatus,
  aggregateGroupByDuration,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
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
    out.push({ day, hourly });
  }
  return out;
}

export function openHealthSettings() {
  openHealthConnectSettings();
}
