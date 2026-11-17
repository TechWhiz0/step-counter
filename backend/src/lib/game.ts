import { createHash, randomInt } from 'node:crypto';
import type { AnyBulkWriteOperation } from 'mongodb';
import { Types } from 'mongoose';
import { config, rules } from '../config.js';
import { Item, Pet, StepDay, User, type PetDoc, type UserDoc } from '../models/index.js';
import { addDays, daysBetween, dayKey } from './dates.js';
import { catalog, pickSpecies } from './species.js';
import { energyFor, ENERGY_DAYS, formFor, stageFor, stageProgress, traitsFor, type Stage } from './petRules.js';

// Secret-salted so a species roll can't be predicted from the client.
function hashSeed(...parts: string[]): number {
  return createHash('sha256').update([config.jwtSecret, ...parts].join(':')).digest().readUInt32BE(0);
}

export function todayFor(user: UserDoc, now = new Date()): string {
  return dayKey(now, user.timezone);
}

// The first pet: an egg that hatches after the first few thousand steps.
export async function newEgg(userId: Types.ObjectId, name: string, startDay: string) {
  await Pet.updateMany({ userId, isActive: true }, { isActive: false });
  return Pet.create({ userId, name, seed: randomInt(0, 2 ** 31), startDay });
}

// Every pet after the first: a new monster, already hatched, picked from what the walker has unlocked.
export async function newMonster(user: UserDoc, name: string, startDay: string) {
  await Pet.updateMany({ userId: user._id, isActive: true }, { isActive: false });
  const species = pickSpecies(await catalog(), { lifetimeSteps: user.lifetimeSteps, bestStreak: user.bestStreak }, randomInt(0, 10_000) / 10_000);
  return Pet.create({
    userId: user._id,
    name,
    seed: randomInt(0, 2 ** 31),
    startDay,
    species,
    hatchFree: true,
    hatchedAt: new Date(),
    stage: 'baby',
    seenStage: 'baby',
    growth: rules.stageThresholds.baby,
  });
}

export async function activePet(userId: Types.ObjectId) {
  return Pet.findOne({ userId, isActive: true });
}

function sumHourly(days: { hourly: number[] }[]): number[] {
  const sums = Array(24).fill(0);
  for (const d of days) d.hourly.forEach((h, i) => (sums[i] += Math.min(h, rules.hourlyCap)));
  return sums;
}

// Sets fields on a loaded document that the database already holds, without marking them for a later save().
function syncFields<T extends object>(doc: { set: (p: string, v: unknown) => void; unmarkModified: (p: string) => void }, values: T) {
  for (const [k, v] of Object.entries(values)) {
    doc.set(k, v);
    doc.unmarkModified(k);
  }
}

// Duplicate-key errors from a racing request mean the row is already there, which is what we wanted.
async function insertIgnoringDuplicates(rows: object[]) {
  if (!rows.length) return;
  try {
    await Item.insertMany(rows, { ordered: false });
  } catch (e) {
    const err = e as { code?: number; writeErrors?: { code?: number; err?: { code?: number } }[] };
    const codes = err.writeErrors?.map((w) => w.code ?? w.err?.code) ?? [err.code];
    if (!codes.every((c) => c === 11000)) throw e;
  }
}

// Recomputes growth, stage, form and traits from stored steps. Safe to call any time.
export async function refreshPet(pet: PetDoc, user: UserDoc, today: string) {
  const days = await StepDay.find({ userId: pet.userId, day: { $gte: pet.startDay } })
    .select('day total cappedTotal hourly -_id')
    .lean();
  // A pet that arrived hatched starts with the egg part already behind it.
  const growth = days.reduce((s, d) => s + d.cappedTotal, 0) + (pet.hatchFree ? rules.stageThresholds.baby : 0);
  const prevStage = pet.stage as Stage;
  const stage = stageFor(growth);
  pet.growth = growth;
  pet.stage = stage;
  if (prevStage === 'egg' && stage !== 'egg' && !pet.hatchedAt) {
    pet.hatchedAt = new Date();
    // What hatches depends on which monsters the owner has unlocked by walking.
    const roll = (hashSeed(String(pet._id), 'species') % 10_000) / 10_000;
    pet.species = pickSpecies(await catalog(), { lifetimeSteps: user.lifetimeSteps, bestStreak: user.bestStreak }, roll);
  }

  if (stage === 'adult' && !pet.form) {
    const from = addDays(today, -rules.evolutionWindowDays);
    pet.form = formFor(sumHourly(days.filter((d) => d.day > from)));
    pet.adultAt = new Date();
  }

  if (stage !== 'egg') {
    const lifeDays = Math.max(1, daysBetween(pet.startDay, today) + 1);
    const fresh = traitsFor({ seed: pet.seed, hourlySums: sumHourly(days), avgDailySteps: growth / lifeDays, bestStreak: user.bestStreak });
    // Colour and size lock in once adult; markings keep growing with streaks.
    pet.traits =
      pet.stage === 'adult' && pet.traits && pet.form && prevStage === 'adult'
        ? { ...fresh, hue: pet.traits.hue, size: pet.traits.size, markings: Math.max(fresh.markings, pet.traits.markings ?? 1) }
        : fresh;
  }
  pet.energy = energyFor({
    recent: days
      .filter((d) => d.day < today && d.day >= addDays(today, -ENERGY_DAYS))
      .sort((x, y) => x.day.localeCompare(y.day))
      .map((d) => d.total),
    goal: user.dailyGoal,
    today: days.find((d) => d.day === today)?.total ?? 0,
  });
  if (pet.isModified()) await pet.save();
  return pet;
}

// Closes every finished day since the last close: goal result, streak, streak rewards, mood.
// Two devices (or a device and the nightly job) can call this at once; only one of them gets to close a day.
export async function closeDays(user: UserDoc, today: string, opts: { refresh?: boolean } = {}) {
  const yesterday = addDays(today, -1);
  const start = user.lastClosedDay ?? null;
  const first = start ? addDays(start, 1) : dayKey(user.createdAt ?? new Date(), user.timezone);
  if (first > yesterday) return false;

  const rows = await StepDay.find({ userId: user._id, day: { $gte: first, $lte: yesterday } }).select('day total -_id').lean();
  const totals = new Map(rows.map((r) => [r.day, r.total]));
  let streak = user.currentStreak;
  let best = user.bestStreak;
  let lastMet: boolean | null = null;
  const ops: AnyBulkWriteOperation[] = [];
  const rewards: { userId: Types.ObjectId; item: string; source: 'streak'; day: string }[] = [];
  for (let day = first; day <= yesterday; day = addDays(day, 1)) {
    const met = (totals.get(day) ?? 0) >= user.dailyGoal;
    ops.push({
      updateOne: {
        filter: { userId: user._id, day },
        update: {
          $set: { goal: user.dailyGoal, goalMet: met },
          $setOnInsert: { hourly: Array(24).fill(0), total: 0, cappedTotal: 0, createdAt: new Date() },
          $currentDate: { updatedAt: true },
        },
        upsert: true,
      },
    });
    streak = met ? streak + 1 : 0;
    best = Math.max(best, streak);
    const reward = met ? rules.streakRewards[streak] : undefined;
    if (reward) rewards.push({ userId: user._id, item: reward, source: 'streak', day });
    lastMet = met;
  }

  // Claim the range: only succeeds if nobody closed these days since we loaded the user.
  const values = { currentStreak: streak, bestStreak: best, lastClosedDay: yesterday };
  const claimed = await User.updateOne({ _id: user._id, lastClosedDay: start }, { $set: values });
  if (!claimed.modifiedCount) {
    const fresh = await User.findById(user._id).select('currentStreak bestStreak lastClosedDay').lean();
    if (fresh) syncFields(user, { currentStreak: fresh.currentStreak, bestStreak: fresh.bestStreak, lastClosedDay: fresh.lastClosedDay });
    return false;
  }
  syncFields(user, values);
  await StepDay.collection.bulkWrite(ops, { ordered: false });
  await insertIgnoringDuplicates(rewards);

  const pet = await activePet(user._id);
  if (pet && lastMet !== null) {
    pet.mood = lastMet ? 'happy' : 'sleepy';
    if (opts.refresh !== false) await refreshPet(pet, user, today);
    else await pet.save();
  }
  return true;
}

// Recounts lifetime steps and grants any closet milestone items just passed. Returns the new items.
export async function refreshLifetime(user: UserDoc, today: string): Promise<string[]> {
  const [agg] = await StepDay.aggregate<{ total: number }>([
    { $match: { userId: user._id } },
    { $group: { _id: null, total: { $sum: '$cappedTotal' } } },
  ]);
  const lifetimeSteps = agg?.total ?? 0;
  if (lifetimeSteps !== user.lifetimeSteps) {
    await User.updateOne({ _id: user._id }, { $set: { lifetimeSteps } });
    syncFields(user, { lifetimeSteps });
  }
  const reached = rules.milestoneItems.filter((m) => m.steps <= lifetimeSteps).map((m) => m.item);
  if (!reached.length) return [];
  const owned = new Set(await Item.distinct('item', { userId: user._id, source: 'milestone', item: { $in: reached } }));
  const fresh = reached.filter((i) => !owned.has(i));
  await insertIgnoringDuplicates(fresh.map((item) => ({ userId: user._id, item, source: 'milestone', day: today })));
  return fresh;
}

// Flags the account when any synced hour looks like a shaken phone rather than walking.
export async function checkAnomalies(user: UserDoc, days: { day: string; hourly: number[] }[]) {
  if (user.flagged) return;
  for (const d of days) {
    const hour = d.hourly.findIndex((h) => h > rules.anomalyHourSteps);
    if (hour >= 0) {
      const flagReason = `${d.hourly[hour].toLocaleString('en')} steps in one hour on ${d.day} at ${hour}:00`;
      await User.updateOne({ _id: user._id, flagged: false }, { $set: { flagged: true, flagReason } });
      syncFields(user, { flagged: true, flagReason });
      return;
    }
  }
}

export function serializePet(pet: PetDoc) {
  const p = stageProgress(pet.growth);
  return {
    id: String(pet._id),
    name: pet.name,
    species: pet.species,
    stage: pet.stage,
    seenStage: pet.seenStage,
    form: pet.form,
    traits: pet.traits,
    mood: pet.mood,
    energy: pet.energy,
    equipped: pet.equipped,
    growth: pet.growth,
    nextStage: p.next,
    stageProgress: p.progress,
    stepsToNextStage: p.remaining,
    isActive: pet.isActive,
    startDay: pet.startDay,
    hatchedAt: pet.hatchedAt,
    adultAt: pet.adultAt,
  };
}
