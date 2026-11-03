import { randomInt } from 'node:crypto';
import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { rules } from '../config.js';
import { me, requireAuth } from '../lib/auth.js';
import { addDays, weekStart } from '../lib/dates.js';
import { serializePet, todayFor } from '../lib/game.js';
import { Group, Pet, StepDay, Treat, User } from '../models/index.js';

export const groupsRouter = Router();
groupsRouter.use(requireAuth);

// No 0/O or 1/I so codes are easy to read out loud.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');

function summary(g: { _id: unknown; name: string; code: string; members: unknown[] }) {
  return { id: String(g._id), name: g.name, code: g.code, memberCount: g.members.length };
}

groupsRouter.get('/', async (req, res) => {
  const groups = await Group.find({ members: me(req)._id }).sort({ createdAt: -1 });
  res.json({ groups: groups.map(summary) });
});

groupsRouter.post('/', async (req, res) => {
  const user = me(req);
  const { name } = z.object({ name: z.string().trim().min(2).max(40) }).parse(req.body);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const group = await Group.create({ name, code: newCode(), createdBy: user._id, members: [user._id] });
      return res.status(201).json({ group: summary(group) });
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
    }
  }
  res.status(500).json({ error: 'Could not create a group code, try again' });
});

groupsRouter.post('/join', async (req, res) => {
  const { code } = z.object({ code: z.string().trim().toUpperCase().length(6) }).parse(req.body);
  const group = await Group.findOneAndUpdate({ code }, { $addToSet: { members: me(req)._id } }, { new: true });
  if (!group) return res.status(404).json({ error: 'No group with this code' });
  res.json({ group: summary(group) });
});

groupsRouter.post('/:id/leave', async (req, res) => {
  await Group.updateOne({ _id: req.params.id, members: me(req)._id }, { $pull: { members: me(req)._id } });
  res.status(204).end();
});

// This week's steps (Monday to today) for every member, with the hourly anti-shake cap applied.
groupsRouter.get('/:id/leaderboard', async (req, res) => {
  const user = me(req);
  if (!Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'Group not found' });
  const group = await Group.findOne({ _id: req.params.id, members: user._id });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  const today = todayFor(user);
  const from = weekStart(today);
  const [totals, members, pets] = await Promise.all([
    StepDay.aggregate([
      { $match: { userId: { $in: group.members }, day: { $gte: from, $lte: today } } },
      { $group: { _id: '$userId', steps: { $sum: '$cappedTotal' } } },
    ]),
    User.find({ _id: { $in: group.members } }).select('nickname currentStreak'),
    Pet.find({ userId: { $in: group.members }, isActive: true }),
  ]);
  const stepsBy = new Map(totals.map((t) => [String(t._id), t.steps as number]));
  const petBy = new Map(pets.map((p) => [String(p.userId), p]));
  const rows = members
    .map((m) => {
      const pet = petBy.get(String(m._id));
      return {
        userId: String(m._id),
        nickname: m.nickname,
        streak: m.currentStreak,
        steps: stepsBy.get(String(m._id)) ?? 0,
        isMe: String(m._id) === String(user._id),
        pet: pet ? serializePet(pet) : null,
      };
    })
    .sort((a, b) => b.steps - a.steps)
    .map((r, i) => ({ rank: i + 1, ...r }));
  res.json({ group: summary(group), week: { from, to: addDays(from, 6) }, hourlyCap: rules.hourlyCap, rows });
});

export const friendsRouter = Router();
friendsRouter.use(requireAuth);

async function sharesGroup(a: Types.ObjectId, b: string) {
  return Types.ObjectId.isValid(b) && !!(await Group.exists({ members: { $all: [a, new Types.ObjectId(b)] } }));
}

friendsRouter.get('/:userId/pet', async (req, res) => {
  if (!(await sharesGroup(me(req)._id, req.params.userId))) return res.status(404).json({ error: 'Not in your groups' });
  const [friend, pet] = await Promise.all([
    User.findById(req.params.userId).select('nickname currentStreak'),
    Pet.findOne({ userId: req.params.userId, isActive: true }),
  ]);
  res.json({ nickname: friend?.nickname, streak: friend?.currentStreak ?? 0, pet: pet ? serializePet(pet) : null });
});

// One treat per friend's pet per day. A treat wakes a sleepy pet up a little.
friendsRouter.post('/:userId/treat', async (req, res) => {
  const user = me(req);
  if (req.params.userId === String(user._id)) return res.status(400).json({ error: 'You cannot treat your own pet' });
  if (!(await sharesGroup(user._id, req.params.userId))) return res.status(404).json({ error: 'Not in your groups' });
  const pet = await Pet.findOne({ userId: req.params.userId, isActive: true });
  if (!pet) return res.status(404).json({ error: 'This friend has no pet yet' });
  try {
    await Treat.create({ fromUser: user._id, toPet: pet._id, day: todayFor(user) });
  } catch {
    return res.status(409).json({ error: 'You already sent a treat today' });
  }
  pet.treatsReceived += 1;
  if (pet.mood === 'sleepy') pet.mood = 'neutral';
  await pet.save();
  res.json({ pet: serializePet(pet) });
});
