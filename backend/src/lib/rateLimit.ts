import type { NextFunction, Request, Response } from 'express';

// Small in-memory limiter for the sign-in style routes: `max` tries per `windowMs` per client address.
export function rateLimit({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test') return next();
    const now = Date.now();
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const hit = hits.get(key);
    if (!hit || hit.reset <= now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    if (++hit.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((hit.reset - now) / 1000)));
      return res.status(429).json({ error: 'Too many tries. Wait a minute and try again.' });
    }
    next();
  };
}
