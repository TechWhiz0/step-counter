import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Types } from 'mongoose';
import { config } from '../config.js';
import { Session, User, type UserDoc } from '../models/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserDoc;
      sessionId?: string;
    }
  }
}

const TOUCH_EVERY_MS = 5 * 60_000;

// Each sign-in on a device gets its own session, so several phones can be signed in at once
// and signing out on one ends only that one.
export async function startSession(userId: Types.ObjectId, device?: string | null) {
  const session = await Session.create({ userId, device: device?.slice(0, 80) ?? null });
  return jwt.sign({ sub: String(userId), sid: String(session._id) }, config.jwtSecret, { expiresIn: '180d' });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  let payload: { sub: string; sid?: string };
  try {
    payload = jwt.verify(token, config.jwtSecret) as { sub: string; sid?: string };
  } catch {
    return res.status(401).json({ error: 'Session expired' });
  }
  const [user, session] = await Promise.all([
    User.findById(payload.sub),
    // Tokens from before sessions existed carry no sid; they stay valid until they expire.
    payload.sid ? Session.findById(payload.sid).select('userId lastSeenAt').lean() : Promise.resolve(undefined),
  ]);
  if (!user) return res.status(401).json({ error: 'Account not found' });
  if (session === null || (session && String(session.userId) !== payload.sub)) {
    return res.status(401).json({ error: 'Signed out' });
  }
  if (session && Date.now() - session.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
    void Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } }).catch(() => {});
  }
  req.user = user;
  req.sessionId = payload.sid;
  next();
}

export function me(req: Request): UserDoc {
  return req.user!;
}

// Use after requireAuth.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}

