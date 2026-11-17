import { Router } from 'express';
import type { AnyBulkWriteOperation } from 'mongodb';
import { z } from 'zod';
import { rules } from '../config.js';
import { me, requireAuth } from '../lib/auth.js';
import { addDays, isDayKey } from '../lib/dates.js';
import { activePet, checkAnomalies, closeDays, refreshLifetime, refreshPet, serializePet, todayFor } from '../lib/game.js';
import { bump, channels, LONG_POLL_MS, revision, waitForChange, waitParam } from '../lib/live.js';
import { StepDay, User, type UserDoc } from '../models/index.js';

export const stepsRouter = Router();
stepsRouter.use(requireAuth);

const syncBody = z.object({
  days: z
    .array(
      z.object({
        day: z.string().refine(isDayKey, 'Expected YYYY-MM-DD'),
        hourly: z.array(z.number().int().min(0).max(100000)).length(24),
      }),
    )
    .max(8),
});

// Merges one day into the stored one hour by hour, keeping the higher count, all inside the database.
// Two phones (or a phone and its watch app) syncing at the same moment can't overwrite each other, and a
// phone that briefly reads 0 (permissions, a reset health store, a new phone) never erases steps.
function mergeDay(userId: unknown, day: string, hourly: number[]): AnyBulkWriteOperation {
  return {
    updateOne: {
      filter: { userId, day },
      update: [
        {
          $set: {
            hourly: {
              $map: {
                input: { $range: [0, 24] },
                as: 'i',
                in: { $max: [{ $ifNull: [{ $arrayElemAt: ['$hourly', '$$i'] }, 0] }, { $arrayElemAt: [{ $literal: hourly }, '$$i'] }] },
              },
            },
            createdAt: { $ifNull: ['$createdAt', '$$NOW'] },
            updatedAt: '$$NOW',
          },
        },
        {
          $set: {
            total: { $sum: '$hourly' },
            cappedTotal: { $sum: { $map: { input: '$hourly', as: 'h', in: { $min: ['$$h', rules.hourlyCap] } } } },
          },
        },
      ],
      upsert: true,
    },
  };
}

// What the home screen shows. Built from stored data only, so any device can ask for it.
async function todayState(user: UserDoc, today: string, extra: { unlockedItems?: string[] } = {}) {
  const [todayDoc, pet] = await Promise.all([StepDay.findOne({ userId: user._id, day: today }).select('total hourly').lean(), activePet(user._id)]);
  return {
    today: { day: today, total: todayDoc?.total ?? 0, goal: user.dailyGoal, hourly: todayDoc?.hourly ?? Array(24).fill(0) },
    streak: { current: user.currentStreak, best: user.bestStreak },
    pet: pet ? serializePet(pet) : null,
    lifetimeSteps: user.lifetimeSteps,
    treats: user.treats,
    unlockedItems: extra.unlockedItems ?? [],
    rev: revision(channels.user(user._id)),
  };
}

// The phone sends the last few days of hourly steps read from Health Connect / HealthKit (plus live
// pedometer counts for the current hour while the app is open).
stepsRouter.post('/sync', async (req, res) => {
  const user = me(req);
  const today = todayFor(user);
  const oldest = addDays(today, -7);
  const days = syncBody.parse(req.body).days.filter((d) => d.day <= today && d.day >= oldest);

  if (days.length) await StepDay.collection.bulkWrite(days.map((d) => mergeDay(user._id, d.day, d.hourly)), { ordered: false });
  await checkAnomalies(user, days);
  // Before closing days: hatching picks a species from what lifetime steps have unlocked.
  const unlockedItems = await refreshLifetime(user, today);
  await closeDays(user, today, { refresh: false });

  const pet = await activePet(user._id);
  if (pet) {
    const todayDoc = await StepDay.findOne({ userId: user._id, day: today }).select('total').lean();
    if ((todayDoc?.total ?? 0) >= user.dailyGoal) pet.mood = 'happy';
    await refreshPet(pet, user, today);
  }
  if (days.length) bump(channels.user(user._id), channels.league(user.league));
  res.json(await todayState(user, today, { unlockedItems }));
});

// Today's state without syncing. With ?wait=<rev> it waits until another device changes something.
stepsRouter.get('/state', async (req, res) => {
  let user = me(req);
  const seen = waitParam(req.query.wait);
  if (seen !== null) {
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    await waitForChange(channels.user(user._id), seen, LONG_POLL_MS, abort.signal);
    if (abort.signal.aborted) return;
    user = (await User.findById(user._id)) ?? user;
  }
  res.json(await todayState(user, todayFor(user)));
});

stepsRouter.get('/history', async (req, res) => {
  const user = me(req);
  const days = Math.min(Number(req.query.days ?? 30) || 30, 90);
  const from = addDays(todayFor(user), -(days - 1));
  const rows = await StepDay.find({ userId: user._id, day: { $gte: from } })
    .sort({ day: 1 })
    .select('day total goalMet hourly -_id')
    .lean();
  res.json({ days: rows });
});
