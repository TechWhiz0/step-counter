import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { config, rules } from '../config.js';
import { applyAdminEmail, me, requireAuth, signToken } from '../lib/auth.js';
import type { UserDoc } from '../models/index.js';
import { todayFor } from '../lib/game.js';
import { GoldenDay, Group, Item, Pet, QuestClaim, StepDay, Treat, User } from '../models/index.js';

export const authRouter = Router();

const registerBody = z.object({
  email: z.email(),
  password: z.string().min(8),
  nickname: z.string().trim().min(2).max(24),
  timezone: z.string().optional(),
});

function publicUser(u: UserDoc) {
  return {
    id: String(u._id),
    email: u.email,
    nickname: u.nickname,
    dailyGoal: u.dailyGoal,
    timezone: u.timezone,
    currentStreak: u.currentStreak,
    bestStreak: u.bestStreak,
    role: u.role,
    lifetimeSteps: u.lifetimeSteps,
    treats: u.treats,
    league: rules.leagueTiers[Math.min(u.league, rules.leagueTiers.length - 1)],
  };
}

authRouter.post('/register', async (req, res) => {
  const body = registerBody.parse(req.body);
  if (await User.exists({ email: body.email.toLowerCase() })) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }
  const timezone = body.timezone && Intl.supportedValuesOf('timeZone').includes(body.timezone) ? body.timezone : undefined;
  const user = await User.create({
    email: body.email,
    nickname: body.nickname,
    passwordHash: await bcrypt.hash(body.password, 10),
    timezone,
    role: config.adminEmails.includes(body.email.toLowerCase()) ? 'admin' : 'user',
  });
  res.status(201).json({ token: signToken(String(user._id)), user: publicUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = z.object({ email: z.email(), password: z.string() }).parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  await applyAdminEmail(user);
  res.json({ token: signToken(String(user._id)), user: publicUser(user) });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(me(req)), today: todayFor(me(req)) });
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  // The nickname is chosen once at sign-up and can't be changed afterwards.
  if (req.body && 'nickname' in req.body) return res.status(400).json({ error: "Nicknames can't be changed after sign-up" });
  const body = z.object({ dailyGoal: z.number().int().min(1000).max(50000).optional() }).parse(req.body);
  const user = me(req);
  Object.assign(user, body);
  await user.save();
  res.json({ user: publicUser(user) });
});

// Deletes the account and everything stored for it.
authRouter.delete('/me', requireAuth, async (req, res) => {
  const userId = me(req)._id;
  const pets = await Pet.find({ userId }).select('_id');
  await Promise.all([
    StepDay.deleteMany({ userId }),
    Item.deleteMany({ userId }),
    GoldenDay.deleteMany({ userId }),
    QuestClaim.deleteMany({ userId }),
    Treat.deleteMany({ $or: [{ fromUser: userId }, { toPet: { $in: pets.map((p) => p._id) } }] }),
    Pet.deleteMany({ userId }),
    Group.updateMany({ members: userId }, { $pull: { members: userId } }),
  ]);
  await User.deleteOne({ _id: userId });
  res.status(204).end();
});
