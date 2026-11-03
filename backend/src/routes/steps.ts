import { Router } from 'express';
import { z } from 'zod';
import { me, requireAuth } from '../lib/auth.js';
import { addDays, isDayKey } from '../lib/dates.js';
import { activePet, checkGolden, closeDays, refreshPet, serializePet, todayFor } from '../lib/game.js';
import { cappedTotal } from '../lib/petRules.js';
import { StepDay } from '../models/index.js';

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

// The phone sends the last few days of hourly steps read from Health Connect / HealthKit.
stepsRouter.post('/sync', async (req, res) => {
  const user = me(req);
  const today = todayFor(user);
  const oldest = addDays(today, -7);
  const { days } = syncBody.parse(req.body);

  for (const d of days) {
    if (d.day > today || d.day < oldest) continue;
    const total = d.hourly.reduce((a, b) => a + b, 0);
    await StepDay.updateOne(
      { userId: user._id, day: d.day },
      { $set: { hourly: d.hourly, total, cappedTotal: cappedTotal(d.hourly) } },
      { upsert: true },
    );
  }

  await closeDays(user, today);
  const todayDoc = await StepDay.findOne({ userId: user._id, day: today }).lean();
  const todayTotal = todayDoc?.total ?? 0;
  const surprises = await checkGolden(user, today, todayTotal);

  const pet = await activePet(user._id);
  if (pet) {
    if (todayTotal >= user.dailyGoal) pet.mood = 'happy';
    await refreshPet(pet, user, today);
  }

  res.json({
    today: { day: today, total: todayTotal, goal: user.dailyGoal, hourly: todayDoc?.hourly ?? Array(24).fill(0) },
    streak: { current: user.currentStreak, best: user.bestStreak },
    pet: pet ? serializePet(pet) : null,
    surprises,
  });
});

stepsRouter.get('/history', async (req, res) => {
  const user = me(req);
  const days = Math.min(Number(req.query.days ?? 30) || 30, 90);
  const from = addDays(todayFor(user), -(days - 1));
  const rows = await StepDay.find({ userId: user._id, day: { $gte: from } })
    .sort({ day: 1 })
    .select('day total goalMet -_id')
    .lean();
  res.json({ days: rows });
});
