import { Router } from 'express';
import { me, requireAuth } from '../lib/auth.js';
import { todayFor } from '../lib/game.js';
import { leagueBoard } from '../lib/leagues.js';
import { claimQuest, questsFor } from '../lib/quests.js';
import { catalog, isUnlocked, unlockProgress } from '../lib/species.js';
import { Pet } from '../models/index.js';

export const questsRouter = Router();
questsRouter.use(requireAuth);

questsRouter.get('/', async (req, res) => {
  const user = me(req);
  res.json({ quests: await questsFor(user, todayFor(user)), treats: user.treats });
});

questsRouter.post('/:id/claim', async (req, res) => {
  const user = me(req);
  const quests = await claimQuest(user, todayFor(user), req.params.id);
  if (!quests) return res.status(409).json({ error: 'This quest is not ready to claim' });
  res.json({ quests, treats: user.treats });
});

export const leaguesRouter = Router();
leaguesRouter.use(requireAuth);

leaguesRouter.get('/', async (req, res) => {
  const user = me(req);
  res.json(await leagueBoard(user, todayFor(user)));
});

export const monstersRouter = Router();
monstersRouter.use(requireAuth);

// Every monster with whether this walker has unlocked it, how close they are, and whether they have raised one.
monstersRouter.get('/', async (req, res) => {
  const user = me(req);
  const progress = { lifetimeSteps: user.lifetimeSteps, bestStreak: user.bestStreak };
  const raised = new Set(await Pet.distinct('species', { userId: user._id, hatchedAt: { $ne: null } }));
  const entries = await catalog();
  res.json({
    lifetimeSteps: user.lifetimeSteps,
    bestStreak: user.bestStreak,
    monsters: entries.map((e) => ({
      id: e.id,
      name: e.name,
      rarity: e.rarity,
      blurb: e.blurb,
      unlock: e.unlock,
      enabled: e.enabled,
      unlocked: isUnlocked(e, progress),
      progress: unlockProgress(e, progress),
      raised: raised.has(e.id),
    })),
  });
});
