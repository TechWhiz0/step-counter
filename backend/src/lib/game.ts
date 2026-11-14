import { createHash, randomInt } from 'node:crypto';
import { Types } from 'mongoose';
import { config, rules } from '../config.js';
import { GoldenDay, Item, Pet, StepDay, type PetDoc, type UserDoc } from '../models/index.js';
import { addDays, daysBetween, dayKey } from './dates.js';
import { catalog, pickSpecies } from './species.js';
import {
  energyFor,
  ENERGY_DAYS,
  formFor,
  goldenTargets,
  randomItem,
  stageFor,
  stageProgress,
  traitsFor,
  type Stage,
} from './petRules.js';

// Secret-salted so golden step numbers can't be guessed from the client.
function hashSeed(...parts: string[]): number {
  return createHash('sha256').update([config.jwtSecret, ...parts].join(':')).digest().readUInt32BE(0);
}

export function todayFor(user: UserDoc, now = new Date()): string {
  return dayKey(now, user.timezone);
}

export async function newEgg(userId: Types.ObjectId, name: string, startDay: string) {
  await Pet.updateMany({ userId, isActive: true }, { isActive: false });
  return Pet.create({ userId, name, seed: randomInt(0, 2 ** 31), startDay });
}

export async function activePet(userId: Types.ObjectId) {
  return Pet.findOne({ userId, isActive: true });
}

function sumHourly(days: { hourly: number[] }[]): number[] {
  const sums = Array(24).fill(0);
  for (const d of days) d.hourly.forEach((h, i) => (sums[i] += Math.min(h, rules.hourlyCap)));
  return sums;
}

// Recomputes growth, stage, form and traits from stored steps. Safe to call any time.
export async function refreshPet(pet: PetDoc, user: UserDoc, today: string) {
  const days = await StepDay.find({ userId: pet.userId, day: { $gte: pet.startDay } }).lean();
  const growth = days.reduce((s, d) => s + d.cappedTotal, 0);
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
    const fresh = traitsFor({
      seed: pet.seed,
      hourlySums: sumHourly(days),
      avgDailySteps: growth / lifeDays,
      bestStreak: user.bestStreak,
    });
    // Colour and size lock in once adult; markings keep growing with streaks.
    pet.traits = pet.stage === 'adult' && pet.traits && pet.form && prevStage === 'adult'
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
  await pet.save();
  return pet;
}

export async function goldenDay(user: UserDoc, day: string) {
  const existing = await GoldenDay.findOne({ userId: user._id, day });
  if (existing) return existing;
  const targets = goldenTargets(hashSeed(String(user._id), day), user.dailyGoal);
  try {
    return await GoldenDay.create({ userId: user._id, day, targets });
  } catch {
    return (await GoldenDay.findOne({ userId: user._id, day }))!;
  }
}

// Marks newly reached golden steps and grants their items. Returns the new surprises.
export async function checkGolden(user: UserDoc, day: string, total: number) {
  const gd = await goldenDay(user, day);
  const reached = gd.targets.filter((t) => t <= total && !gd.found.includes(t));
  if (!reached.length) return [];
  // Claim atomically so two syncs can't grant the same surprise twice.
  const claimed = await GoldenDay.findOneAndUpdate(
    { _id: gd._id, found: { $nin: reached } },
    { $addToSet: { found: { $each: reached } } },
  );
  if (!claimed) return [];
  const surprises = reached.map((step) => ({ step, item: randomItem(hashSeed(String(user._id), day, String(step))) }));
  await Item.insertMany(surprises.map((s) => ({ userId: user._id, item: s.item, source: 'golden', day })));
  return surprises;
}

// A warmer/colder hint for the home screen radar. Never reveals the number itself.
export async function goldenHint(user: UserDoc, day: string, total: number) {
  const gd = await goldenDay(user, day);
  const ahead = gd.targets.filter((t) => t > total && !gd.found.includes(t));
  const gap = ahead.length ? Math.min(...ahead) - total : null;
  const hint = gap === null ? null : gap <= rules.goldenHot ? 'hot' : gap <= rules.goldenWarm ? 'warm' : 'cold';
  return { found: gd.found.length, total: gd.targets.length, hint };
}

// Closes every finished day since the last close: goal result, streak, mood, streak rewards.
export async function closeDays(user: UserDoc, today: string) {
  const yesterday = addDays(today, -1);
  let day = user.lastClosedDay ? addDays(user.lastClosedDay, 1) : dayKey(user.createdAt ?? new Date(), user.timezone);
  let lastMet: boolean | null = null;
  while (day <= yesterday) {
    const sd = await StepDay.findOneAndUpdate(
      { userId: user._id, day },
      { $setOnInsert: { hourly: Array(24).fill(0), total: 0, cappedTotal: 0 } },
      { upsert: true, new: true },
    );
    const met = sd.total >= user.dailyGoal;
    sd.goal = user.dailyGoal;
    sd.goalMet = met;
    await sd.save();
    user.currentStreak = met ? user.currentStreak + 1 : 0;
    if (user.currentStreak > user.bestStreak) user.bestStreak = user.currentStreak;
    const reward = met ? rules.streakRewards[user.currentStreak] : undefined;
    if (reward) await Item.create({ userId: user._id, item: reward, source: 'streak', day });
    lastMet = met;
    user.lastClosedDay = day;
    day = addDays(day, 1);
  }
  await user.save();
  const pet = await activePet(user._id);
  if (pet) {
    if (lastMet !== null) pet.mood = lastMet ? 'happy' : 'sleepy';
    await refreshPet(pet, user, today);
  }
}

// Recounts lifetime steps and grants any closet milestone items just passed. Returns the new items.
export async function refreshLifetime(user: UserDoc, today: string): Promise<string[]> {
  const [agg] = await StepDay.aggregate<{ total: number }>([
    { $match: { userId: user._id } },
    { $group: { _id: null, total: { $sum: '$cappedTotal' } } },
  ]);
  user.lifetimeSteps = agg?.total ?? 0;
  await user.save();
  const reached = rules.milestoneItems.filter((m) => m.steps <= user.lifetimeSteps).map((m) => m.item);
  if (!reached.length) return [];
  const owned = new Set(await Item.distinct('item', { userId: user._id, source: 'milestone', item: { $in: reached } }));
  const fresh = reached.filter((i) => !owned.has(i));
  if (fresh.length) await Item.insertMany(fresh.map((item) => ({ userId: user._id, item, source: 'milestone', day: today })));
  return fresh;
}

// Flags the account when any synced hour looks like a shaken phone rather than walking.
export async function checkAnomalies(user: UserDoc, days: { day: string; hourly: number[] }[]) {
  if (user.flagged) return;
  for (const d of days) {
    const hour = d.hourly.findIndex((h) => h > rules.anomalyHourSteps);
    if (hour >= 0) {
      user.flagged = true;
      user.flagReason = `${d.hourly[hour].toLocaleString('en')} steps in one hour on ${d.day} at ${hour}:00`;
      await user.save();
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
    treatsReceived: pet.treatsReceived,
    isActive: pet.isActive,
    startDay: pet.startDay,
    hatchedAt: pet.hatchedAt,
    adultAt: pet.adultAt,
  };
}
