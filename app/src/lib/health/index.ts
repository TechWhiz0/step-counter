// Fallback for platforms without a health store (web). Android and iOS use the
// .android.ts / .ios.ts files next to this one, which Metro picks automatically.
export type HealthStatus = 'ok' | 'missing' | 'update-required';
export interface DayHours {
  day: string;
  hourly: number[];
}

export async function healthStatus(): Promise<HealthStatus> {
  return 'missing';
}

export async function requestStepAccess(): Promise<boolean> {
  return false;
}

export async function hasStepAccess(): Promise<boolean> {
  return false;
}

export async function readHourlySteps(_days: number): Promise<DayHours[]> {
  return [];
}

export function openHealthSettings() {}
