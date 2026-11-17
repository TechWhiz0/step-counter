import { MonsterSetting } from '../models/index.js';

export type Rarity = 'starter' | 'rare' | 'epic';
export type Unlock =
  | { kind: 'starter' }
  | { kind: 'steps'; steps: number }
  | { kind: 'streak'; days: number }
  | { kind: 'event'; event: string };

export interface SpeciesDef {
  id: string;
  name: string;
  rarity: Rarity;
  unlock: Unlock;
  blurb: string;
}

// The monster family. Order is the order the collection shows them in.
// Only three can hatch from day one; the rest open up slowly with lifetime steps (about 8 000 a day:
// Nubs in ~4 days, Spike in ~a month, the rares over months, Twinkle after a year or so).
export const SPECIES: SpeciesDef[] = [
  { id: 'mochi', name: 'Mochi', rarity: 'starter', unlock: { kind: 'starter' }, blurb: 'Morning walker' },
  { id: 'pip', name: 'Pip', rarity: 'starter', unlock: { kind: 'starter' }, blurb: 'Night owl' },
  { id: 'bop', name: 'Bop', rarity: 'starter', unlock: { kind: 'starter' }, blurb: 'Steady pacer' },
  { id: 'nubs', name: 'Nubs', rarity: 'starter', unlock: { kind: 'steps', steps: 30_000 }, blurb: 'Sleepy cuddler' },
  { id: 'mossy', name: 'Mossy', rarity: 'starter', unlock: { kind: 'steps', steps: 60_000 }, blurb: 'Park explorer' },
  { id: 'drip', name: 'Drip', rarity: 'starter', unlock: { kind: 'steps', steps: 100_000 }, blurb: 'Loves long walks by water' },
  { id: 'pebble', name: 'Pebble', rarity: 'starter', unlock: { kind: 'steps', steps: 150_000 }, blurb: 'Slow but never stops' },
  { id: 'bloop', name: 'Bloop', rarity: 'starter', unlock: { kind: 'steps', steps: 200_000 }, blurb: 'Puddle-jumper' },
  { id: 'spike', name: 'Spike', rarity: 'starter', unlock: { kind: 'steps', steps: 260_000 }, blurb: 'Summer sprinter' },
  { id: 'fizz', name: 'Fizz', rarity: 'rare', unlock: { kind: 'steps', steps: 400_000 }, blurb: 'Streak keeper' },
  { id: 'puff', name: 'Puff', rarity: 'rare', unlock: { kind: 'steps', steps: 550_000 }, blurb: 'Rainy-day stroller' },
  { id: 'buzz', name: 'Buzz', rarity: 'rare', unlock: { kind: 'steps', steps: 750_000 }, blurb: 'Busy flower-hopper' },
  { id: 'shroom', name: 'Shroom', rarity: 'rare', unlock: { kind: 'steps', steps: 1_000_000 }, blurb: 'Forest trail fan' },
  { id: 'inky', name: 'Inky', rarity: 'rare', unlock: { kind: 'streak', days: 45 }, blurb: 'Shy beach-walker' },
  { id: 'jelly', name: 'Jelly', rarity: 'epic', unlock: { kind: 'steps', steps: 1_400_000 }, blurb: 'Glows on night walks' },
  { id: 'gem', name: 'Gem', rarity: 'epic', unlock: { kind: 'steps', steps: 1_800_000 }, blurb: 'Hill climber' },
  { id: 'ember', name: 'Ember', rarity: 'epic', unlock: { kind: 'steps', steps: 2_400_000 }, blurb: 'Speed walker' },
  { id: 'twinkle', name: 'Twinkle', rarity: 'epic', unlock: { kind: 'steps', steps: 3_200_000 }, blurb: 'The rarest light in the meadow' },
  { id: 'gourdy', name: 'Gourdy', rarity: 'rare', unlock: { kind: 'event', event: 'Harvest Walk' }, blurb: 'Autumn visitor' },
  { id: 'frost', name: 'Frost', rarity: 'epic', unlock: { kind: 'event', event: 'Winter Wander' }, blurb: 'Winter visitor' },
];

export interface CatalogEntry extends SpeciesDef {
  // Can hatch at all. Event monsters are off until an admin starts their event.
  enabled: boolean;
}

// Shipped catalog with admin overrides (step thresholds, on/off) applied.
export async function catalog(): Promise<CatalogEntry[]> {
  const settings = new Map((await MonsterSetting.find().lean()).map((s) => [s.species, s]));
  return SPECIES.map((def) => {
    const s = settings.get(def.id);
    const unlock: Unlock = def.unlock.kind === 'steps' && s?.unlockSteps ? { kind: 'steps', steps: s.unlockSteps } : def.unlock;
    const enabled = s?.enabled ?? def.unlock.kind !== 'event';
    return { ...def, unlock, enabled };
  });
}

export interface Progress {
  lifetimeSteps: number;
  bestStreak: number;
}

export function isUnlocked(entry: CatalogEntry, p: Progress): boolean {
  if (!entry.enabled) return false;
  switch (entry.unlock.kind) {
    case 'starter':
    case 'event':
      return true;
    case 'steps':
      return p.lifetimeSteps >= entry.unlock.steps;
    case 'streak':
      return p.bestStreak >= entry.unlock.days;
  }
}

// 0-1 progress toward unlocking, for the unlocks screen.
export function unlockProgress(entry: CatalogEntry, p: Progress): number {
  switch (entry.unlock.kind) {
    case 'steps':
      return Math.min(1, p.lifetimeSteps / entry.unlock.steps);
    case 'streak':
      return Math.min(1, p.bestStreak / entry.unlock.days);
    default:
      return entry.enabled ? 1 : 0;
  }
}

// Picks what an egg hatches into: any unlocked monster, rarer ones a little less often.
export function pickSpecies(entries: CatalogEntry[], p: Progress, roll: number): string {
  const pool = entries.filter((e) => isUnlocked(e, p));
  if (!pool.length) return 'mochi';
  const weight = (e: CatalogEntry) => (e.rarity === 'starter' ? 3 : e.rarity === 'rare' ? 2 : 1);
  const total = pool.reduce((s, e) => s + weight(e), 0);
  let t = roll * total;
  for (const e of pool) {
    t -= weight(e);
    if (t < 0) return e.id;
  }
  return pool[pool.length - 1].id;
}
