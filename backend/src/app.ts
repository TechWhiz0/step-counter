import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { petRouter } from './routes/pet.js';
import { leaguesRouter, monstersRouter, questsRouter } from './routes/play.js';
import { stepsRouter } from './routes/steps.js';

export function createApp() {
  const app = express();
  // Behind ngrok or a hosting proxy, so rate limits see the real client address.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/auth', authRouter);
  app.use('/steps', stepsRouter);
  app.use('/pet', petRouter);
  app.use('/quests', questsRouter);
  app.use('/leagues', leaguesRouter);
  app.use('/monsters', monstersRouter);
  app.use('/admin', adminRouter);
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message)).join('; ') });
    }
    const e = err as { code?: number; name?: string; type?: string };
    // Two requests racing to create the same thing (same username, same day row): the loser gets a clean 409.
    if (e.code === 11000) return res.status(409).json({ error: 'That already exists' });
    if (e.name === 'CastError') return res.status(404).json({ error: 'Not found' });
    if (e.type === 'entity.parse.failed') return res.status(400).json({ error: 'Bad JSON' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });
  return app;
}
