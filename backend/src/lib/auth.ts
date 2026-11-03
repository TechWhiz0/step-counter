import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User, type UserDoc } from '../models/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserDoc;
    }
  }
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '180d' });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  try {
    const { sub } = jwt.verify(token, config.jwtSecret) as { sub: string };
    const user = await User.findById(sub);
    if (!user) return res.status(401).json({ error: 'Account not found' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
}

export function me(req: Request): UserDoc {
  return req.user!;
}
