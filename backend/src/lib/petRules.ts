import { rules } from '../config.js';

export type Stage = 'egg' | 'baby' | 'teen' | 'adult';
export type Form = 'sunrise' | 'daytime' | 'moonlight' | 'balanced';

export interface Traits {
  hue: number; // 0-359, from when the owner walks
  pattern: 'spots' | 'stripes' | 'stars' | 'hearts';
  markings: number; // 1-6, grows with best streak
  size: 'small' | 'medium' | 'large'; // from average daily steps
  eyes: 'round' | 'oval' | 'sparkle' | 'dot';
  ears: 'none' | 'bunny' | 'cat' | 'antenna';
  cheeks: boolean;
}

export function cappedTotal(hourly: number[]): number {
  return hourly.reduce((sum, h) => sum + Math.min(Math.max(h, 0), rules.hourlyCap), 0);
}

export function stageFor(growth: number): Stage {
  const t = rules.stageThresholds;
  if (growth >= t.adult) return 'adult';
  if (growth >= t.teen) return 'teen';
  if (growth >= t.baby) return 'baby';
  return 'egg';
}

// Progress (0-1) towards the next stage, for the home screen ring.
export function stageProgress(growth: number): { next: Stage | null; progress: number; remaining: number } {
  const t = rules.stageThresholds;
  const steps: [Stage, number, number][] = [
    ['baby', 0, t.baby],
    ['teen', t.baby, t.teen],
    ['adult', t.teen, t.adult],
  ];
  for (const [next, from, to] of steps) {
    if (growth < to) return { next, progress: (growth - from) / (to - from), remaining: to - growth };
  }
  return { next: null, progress: 1, remaining: 0 };
}

const BANDS: { form: Exclude<Form, 'balanced'>; hours: number[] }[] = [
  { form: 'sunrise', hours: [5, 6, 7, 8, 9] },
  { form: 'daytime', hours: [10, 11, 12, 13, 14, 15, 16] },
  { form: 'moonlight', hours: [17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4] },
];

// hourlySums = steps per hour of day summed over the evolution window.
export function formFor(hourlySums: number[]): Form {
  const total = hourlySums.reduce((a, b) => a + b, 0);
  if (total === 0) return 'balanced';
  let best: Form = 'balanced';
  let bestShare = 0;
  for (const band of BANDS) {
    const share = band.hours.reduce((s, h) => s + (hourlySums[h] ?? 0), 0) / total;
    if (share > bestShare) [best, bestShare] = [band.form, share];
  }
  return bestShare >= rules.dominantShare ? best : 'balanced';
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, list: readonly T[]): T {
  return list[Math.floor(r() * list.length)];
}

// Average walking hour on a 24h circle, weighted by steps. Null when there are no steps.
function meanHour(hourlySums: number[]): number | null {
  let x = 0;
  let y = 0;
  hourlySums.forEach((steps, h) => {
    const a = (h / 24) * 2 * Math.PI;
    x += Math.cos(a) * steps;
    y += Math.sin(a) * steps;
  });
  if (x === 0 && y === 0) return null;
  return (((Math.atan2(y, x) / (2 * Math.PI)) * 24) + 24) % 24;
}

export interface TraitInput {
  seed: number;
  hourlySums: number[]; // steps per hour of day over the pet's life so far
  avgDailySteps: number;
  bestStreak: number;
}

// Every pet is unique: the seed fixes its random features, the owner's walking fixes the rest.
export function traitsFor({ seed, hourlySums, avgDailySteps, bestStreak }: TraitInput): Traits {
  const r = rng(seed);
  const jitter = Math.floor(r() * 40) - 20;
  const hour = meanHour(hourlySums);
  const baseHue = hour === null ? Math.floor(r() * 360) : Math.round((hour / 24) * 360);
  return {
    hue: (((baseHue + jitter) % 360) + 360) % 360,
    pattern: pick(r, ['spots', 'stripes', 'stars', 'hearts'] as const),
    eyes: pick(r, ['round', 'oval', 'sparkle', 'dot'] as const),
    ears: pick(r, ['none', 'bunny', 'cat', 'antenna'] as const),
    cheeks: r() < 0.6,
    markings: Math.min(6, 1 + Math.floor(bestStreak / 3)),
    size: avgDailySteps >= 9000 ? 'large' : avgDailySteps >= 5000 ? 'medium' : 'small',
  };
}

// Energy, 5-100: how well-walked the pet has been lately.
// `recent` is the last closed days (oldest first, up to 7, only days since the pet arrived); `today` is today's steps.
// Recent days count most, a run of missed days drains extra, and walking today tops it back up.
export const ENERGY_DAYS = 7;
export function energyFor({ recent, goal, today }: { recent: number[]; goal: number; today: number }): number {
  const days = recent.slice(-ENERGY_DAYS);
  const ratio = (t: number) => Math.min(1, t / goal);
  let base = 0.7; // a brand-new pet starts out fine
  if (days.length) {
    let sum = 0;
    let weights = 0;
    days.forEach((t, i) => {
      sum += ratio(t) * (i + 1);
      weights += i + 1;
    });
    base = sum / weights;
  }
  let missedRun = 0;
  for (let i = days.length - 1; i >= 0 && ratio(days[i]) < 0.5; i--) missedRun++;
  const energy = 25 + 60 * base - 10 * Math.max(0, missedRun - 1) + 30 * ratio(today);
  return Math.round(Math.min(100, Math.max(5, energy)));
}
