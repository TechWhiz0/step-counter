import { createHash, randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { rules } from '../config.js';
import { me, requireAuth, startSession } from '../lib/auth.js';
import { todayFor } from '../lib/game.js';
import { sendResetCode } from '../lib/mailer.js';
import { rateLimit } from '../lib/rateLimit.js';
import { isUsernameFree, normalizeUsername, suggestUsernames, usernameProblem } from '../lib/username.js';
import type { UserDoc } from '../models/index.js';
import { Item, Pet, QuestClaim, Session, StepDay, User } from '../models/index.js';

export const authRouter = Router();

const limited = rateLimit({ max: 10, windowMs: 60_000 });
const RESET_MINUTES = 30;
const RESET_TRIES = 5;

const password = z.string().min(8, 'Password needs at least 8 characters').max(200);
const validTimezone = (tz?: string) => (tz && Intl.supportedValuesOf('timeZone').includes(tz) ? tz : undefined);
const device = (v: unknown) => (typeof v === 'string' ? v : null);
const hashCode = (code: string) => createHash('sha256').update(code).digest('hex');

export function publicUser(u: UserDoc) {
  return {
    id: String(u._id),
    username: u.username,
    email: u.email,
    nickname: u.username ?? u.nickname,
    dailyGoal: u.dailyGoal,
    timezone: u.timezone,
    currentStreak: u.currentStreak,
    bestStreak: u.bestStreak,
    role: u.role,
    lifetimeSteps: u.lifetimeSteps,
    treats: u.treats,
    league: rules.leagueTiers[Math.min(u.league, rules.leagueTiers.length - 1)],
    createdAt: u.createdAt,
  };
}

// Live check while someone types a username on the sign-up screen.
authRouter.get('/username', async (req, res) => {
  const username = normalizeUsername(String(req.query.u ?? ''));
  const problem = usernameProblem(username);
  if (problem) return res.json({ username, available: false, reason: problem, suggestions: [] });
  if (await isUsernameFree(username)) return res.json({ username, available: true, reason: null, suggestions: [] });
  res.json({ username, available: false, reason: 'taken', suggestions: await suggestUsernames(username) });
});

authRouter.post('/register', limited, async (req, res) => {
  const body = z
    .object({
      username: z.string(),
      email: z.email().max(200),
      password,
      timezone: z.string().optional(),
      device: z.string().optional(),
    })
    .parse(req.body);
  const username = normalizeUsername(body.username);
  const problem = usernameProblem(username);
  if (problem) return res.status(400).json({ error: problem, field: 'username' });
  const email = body.email.toLowerCase();
  const [nameTaken, emailTaken] = await Promise.all([User.exists({ username }), User.exists({ email })]);
  if (nameTaken) return res.status(409).json({ error: `@${username} is taken`, field: 'username', suggestions: await suggestUsernames(username) });
  if (emailTaken) return res.status(409).json({ error: 'An account with this email already exists', field: 'email' });
  const user = await User.create({
    username,
    email,
    nickname: username,
    passwordHash: await bcrypt.hash(body.password, 10),
    timezone: validTimezone(body.timezone),
  });
  res.status(201).json({ token: await startSession(user._id, body.device), user: publicUser(user) });
});

// Sign in with a username or an email.
authRouter.post('/login', limited, async (req, res) => {
  const body = z.object({ login: z.string().optional(), email: z.string().optional(), password: z.string(), device: z.string().optional() }).parse(req.body);
  const login = (body.login ?? body.email ?? '').trim().toLowerCase();
  if (!login) return res.status(400).json({ error: 'Type your username or email' });
  const user = login.indexOf('@') > 0 ? await User.findOne({ email: login }) : await User.findOne({ username: normalizeUsername(login) });
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    return res.status(401).json({ error: 'Wrong username, email or password' });
  }
  res.json({ token: await startSession(user._id, device(body.device)), user: publicUser(user) });
});

// Ends this device's session. Its token stops working right away, also for background syncs.
authRouter.post('/logout', requireAuth, async (req, res) => {
  if (req.sessionId) await Session.deleteOne({ _id: req.sessionId });
  res.status(204).end();
});

// Sends a 6-digit code to the email. Always answers the same way so it can't be used to find accounts.
authRouter.post('/forgot', limited, async (req, res) => {
  const { email } = z.object({ email: z.email() }).parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    user.resetCodeHash = hashCode(code);
    user.resetExpires = new Date(Date.now() + RESET_MINUTES * 60_000);
    user.resetTries = 0;
    await user.save();
    await sendResetCode(user.email, code);
  }
  res.json({ ok: true, minutes: RESET_MINUTES });
});

// Sets a new password with the emailed code, signs out every device, and signs this one in.
authRouter.post('/reset', limited, async (req, res) => {
  const body = z.object({ email: z.email(), code: z.string().trim().regex(/^\d{6}$/, 'The code is 6 digits'), password, device: z.string().optional() }).parse(req.body);
  const user = await User.findOne({ email: body.email.toLowerCase() });
  const usable = user?.resetCodeHash && user.resetExpires && user.resetExpires > new Date() && user.resetTries < RESET_TRIES;
  if (!user || !usable) return res.status(400).json({ error: 'That code has expired. Ask for a new one.' });
  if (user.resetCodeHash !== hashCode(body.code)) {
    await User.updateOne({ _id: user._id }, { $inc: { resetTries: 1 } });
    return res.status(400).json({ error: 'That code is not right' });
  }
  user.passwordHash = await bcrypt.hash(body.password, 10);
  user.resetCodeHash = null;
  user.resetExpires = null;
  user.resetTries = 0;
  await user.save();
  await Session.deleteMany({ userId: user._id });
  res.json({ token: await startSession(user._id, body.device), user: publicUser(user) });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(me(req)), today: todayFor(me(req)) });
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  // The username is chosen once at sign-up and can't be changed afterwards.
  if (req.body && ('username' in req.body || 'nickname' in req.body)) {
    return res.status(400).json({ error: "Usernames can't be changed after sign-up" });
  }
  const body = z.object({ dailyGoal: z.number().int().min(1000).max(50000).optional(), timezone: z.string().optional() }).parse(req.body);
  const user = me(req);
  if (body.dailyGoal !== undefined) user.dailyGoal = body.dailyGoal;
  // A phone that moved timezone reports it, so "today" follows the walker.
  const tz = validTimezone(body.timezone);
  if (tz) user.timezone = tz;
  await user.save();
  res.json({ user: publicUser(user) });
});

// Deletes the account and everything stored for it, on every device.
authRouter.delete('/me', requireAuth, async (req, res) => {
  const userId = me(req)._id;
  const pets = await Pet.find({ userId }).select('_id').lean();
  const db = mongoose.connection.db!;
  await Promise.all([
    StepDay.deleteMany({ userId }),
    Item.deleteMany({ userId }),
    QuestClaim.deleteMany({ userId }),
    Session.deleteMany({ userId }),
    Pet.deleteMany({ userId }),
    // Collections from features that were removed; old rows may still mention this account.
    db.collection('goldendays').deleteMany({ userId }),
    db.collection('treats').deleteMany({ $or: [{ fromUser: userId }, { toPet: { $in: pets.map((p) => p._id) } }] }),
    db.collection('groups').updateMany({ members: userId }, { $pull: { members: userId } } as never),
  ]);
  await User.deleteOne({ _id: userId });
  res.status(204).end();
});
