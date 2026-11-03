import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { authRouter } from './routes/auth.js';
import { friendsRouter, groupsRouter } from './routes/groups.js';
import { petRouter } from './routes/pet.js';
import { stepsRouter } from './routes/steps.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/auth', authRouter);
  app.use('/steps', stepsRouter);
  app.use('/pet', petRouter);
  app.use('/groups', groupsRouter);
  app.use('/friends', friendsRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });
  return app;
}
