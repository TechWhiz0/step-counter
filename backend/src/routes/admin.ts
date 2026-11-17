import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { config, rules } from '../config.js';
import { requireAdmin, requireAuth } from '../lib/auth.js';
import { addDays, dayKey } from '../lib/dates.js';
import { catalog, SPECIES } from '../lib/species.js';
import { MonsterSetting, Pet, StepDay, User } from '../models/index.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Admin accounts run the app, they don't walk in it: keep them out of every walker number and list.
const WALKER = { role: { $ne: 'admin' as const } };
const adminIds = async () => (await User.find({ role: 'admin' }).select('_id').lean()).map((u) => u._id);

adminRouter.get('/overview', async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days ?? 7) || 7, 1), 30);
  const today = dayKey(new Date(), config.timezone);
  const from = addDays(today, -(days - 1));
  const since = new Date(Date.now() - days * 86_400_000);
  const rareIds = SPECIES.filter((s) => s.rarity !== 'starter').map((s) => s.id);
  const notAdmin = { $nin: await adminIds() };

  const [todayStats, perDay, eggsHatched, rareUnlocks, bySpecies, flagged, users] = await Promise.all([
    StepDay.aggregate<{ walkers: number; avg: number }>([
      { $match: { day: today, total: { $gt: 0 }, userId: notAdmin } },
      { $group: { _id: null, walkers: { $sum: 1 }, avg: { $avg: '$total' } } },
    ]),
    StepDay.aggregate<{ _id: string; steps: number; walkers: number }>([
      { $match: { day: { $gte: from, $lte: today }, userId: notAdmin } },
      { $group: { _id: '$day', steps: { $sum: '$cappedTotal' }, walkers: { $sum: { $cond: [{ $gt: ['$total', 0] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]),
    Pet.countDocuments({ hatchedAt: { $gte: since }, userId: notAdmin }),
    Pet.countDocuments({ hatchedAt: { $gte: since }, species: { $in: rareIds }, userId: notAdmin }),
    Pet.aggregate<{ _id: string; count: number }>([
      { $match: { hatchedAt: { $ne: null }, userId: notAdmin } },
      { $group: { _id: '$species', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    User.countDocuments({ flagged: true, ...WALKER }),
    User.countDocuments(WALKER),
  ]);

  // How many walkers sit in each league tier.
  const tiers = await User.aggregate<{ _id: number; walkers: number }>([
    { $match: { ...WALKER, hiddenFromLeagues: false } },
    { $group: { _id: '$league', walkers: { $sum: 1 } } },
  ]);
  const leagues = rules.leagueTiers.map((name, i) => ({ tier: name, walkers: tiers.find((t) => t._id === i)?.walkers ?? 0 }));

  const hatchedTotal = bySpecies.reduce((s, r) => s + r.count, 0);
  res.json({
    days,
    users,
    walkersToday: todayStats[0]?.walkers ?? 0,
    avgStepsToday: Math.round(todayStats[0]?.avg ?? 0),
    eggsHatched,
    rareUnlocks,
    needsReview: flagged,
    stepsPerDay: Array.from({ length: days }, (_, i) => {
      const day = addDays(from, i);
      const row = perDay.find((r) => r._id === day);
      return { day, steps: row?.steps ?? 0, walkers: row?.walkers ?? 0 };
    }),
    hatchesBySpecies: bySpecies.map((r) => ({ species: r._id, count: r.count, share: hatchedTotal ? r.count / hatchedTotal : 0 })),
    leagues,
  });
});

adminRouter.get('/users', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  const filter = String(req.query.filter ?? 'all');
  const page = Math.max(Number(req.query.page ?? 1) || 1, 1);
  const limit = 25;
  const match: Record<string, unknown> = { ...WALKER };
  if (q) {
    const re = new RegExp(escapeRegex(q.replace(/^@/, '')), 'i');
    match.$or = [{ username: re }, { nickname: re }, { email: re }];
  }
  if (filter === 'flagged') match.flagged = true;
  if (filter === 'hidden') match.hiddenFromLeagues = true;

  const [total, users] = await Promise.all([
    User.countDocuments(match),
    User.find(match)
      .sort(filter === 'flagged' ? { updatedAt: -1 } : { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('username nickname email role league lifetimeSteps currentStreak flagged flagReason hiddenFromLeagues')
      .lean(),
  ]);
  const ids = users.map((u) => u._id);
  const today = dayKey(new Date(), config.timezone);
  const [weekly, pets, raised] = await Promise.all([
    StepDay.aggregate<{ _id: Types.ObjectId; steps: number }>([
      { $match: { userId: { $in: ids }, day: { $gte: addDays(today, -6) } } },
      { $group: { _id: '$userId', steps: { $sum: '$cappedTotal' } } },
    ]),
    Pet.find({ userId: { $in: ids }, isActive: true }).select('userId name species stage').lean(),
    Pet.aggregate<{ _id: Types.ObjectId; species: string[] }>([
      { $match: { userId: { $in: ids }, hatchedAt: { $ne: null } } },
      { $group: { _id: '$userId', species: { $addToSet: '$species' } } },
    ]),
  ]);
  const weeklyBy = new Map(weekly.map((w) => [String(w._id), w.steps]));
  const petBy = new Map(pets.map((p) => [String(p.userId), p]));
  const raisedBy = new Map(raised.map((r) => [String(r._id), r.species.length]));

  res.json({
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    users: users.map((u) => {
      const pet = petBy.get(String(u._id));
      return {
        id: String(u._id),
        username: u.username ?? u.nickname,
        nickname: u.username ?? u.nickname,
        email: u.email,
        role: u.role,
        league: u.league,
        lifetimeSteps: u.lifetimeSteps,
        steps7d: weeklyBy.get(String(u._id)) ?? 0,
        currentStreak: u.currentStreak,
        flagged: u.flagged,
        flagReason: u.flagReason,
        hiddenFromLeagues: u.hiddenFromLeagues,
        monstersRaised: raisedBy.get(String(u._id)) ?? 0,
        pet: pet ? { name: pet.name, species: pet.species, stage: pet.stage } : null,
      };
    }),
  });
});

// Hourly steps for the last week, so a reviewer can see what tripped the flag.
adminRouter.get('/users/:id/hours', async (req, res) => {
  if (!Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'User not found' });
  const today = dayKey(new Date(), config.timezone);
  const days = await StepDay.find({ userId: req.params.id, day: { $gte: addDays(today, -6) } })
    .sort({ day: 1 })
    .select('day hourly total -_id')
    .lean();
  res.json({ days });
});

adminRouter.post('/users/:id/review', async (req, res) => {
  const { action } = z.object({ action: z.enum(['clear', 'hide', 'unhide']) }).parse(req.body);
  if (!Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'User not found' });
  const update =
    action === 'clear'
      ? { flagged: false, flagReason: null }
      : action === 'hide'
        ? { flagged: false, hiddenFromLeagues: true }
        : { hiddenFromLeagues: false };
  const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: String(user._id), flagged: user.flagged, hiddenFromLeagues: user.hiddenFromLeagues });
});

adminRouter.get('/monsters', async (_req, res) => {
  const [entries, owners] = await Promise.all([
    catalog(),
    Pet.aggregate<{ _id: string; owners: number }>([
      { $match: { hatchedAt: { $ne: null }, userId: { $nin: await adminIds() } } },
      { $group: { _id: '$species', users: { $addToSet: '$userId' } } },
      { $project: { owners: { $size: '$users' } } },
    ]),
  ]);
  const ownersBy = new Map(owners.map((o) => [o._id, o.owners]));
  res.json({ monsters: entries.map((e) => ({ ...e, owners: ownersBy.get(e.id) ?? 0 })) });
});

adminRouter.patch('/monsters/:id', async (req, res) => {
  const def = SPECIES.find((s) => s.id === req.params.id);
  if (!def) return res.status(404).json({ error: 'No such monster' });
  const body = z
    .object({ unlockSteps: z.number().int().min(1000).max(10_000_000).nullable().optional(), enabled: z.boolean().nullable().optional() })
    .parse(req.body);
  if (body.unlockSteps !== undefined && def.unlock.kind !== 'steps') {
    return res.status(400).json({ error: `${def.name} doesn't unlock by steps` });
  }
  await MonsterSetting.updateOne({ species: def.id }, { $set: body }, { upsert: true });
  const entry = (await catalog()).find((e) => e.id === def.id);
  res.json({ monster: entry });
});
