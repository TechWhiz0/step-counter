import { Router } from 'express';
import { me, requireAuth } from '../lib/auth.js';
import { todayFor } from '../lib/game.js';
import { leagueBoard } from '../lib/leagues.js';
import { channels, LONG_POLL_MS, waitForChange, waitParam } from '../lib/live.js';
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

// The board for the walker's tier. With ?wait=<rev> the request waits until anyone in the tier syncs
// new steps (or ~25 s pass), so an open leaderboard updates by itself without hammering the server.
leaguesRouter.get('/', async (req, res) => {
  const user = me(req);
  const seen = waitParam(req.query.wait);
  if (seen !== null) {
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    await waitForChange(channels.league(user.league), seen, LONG_POLL_MS, abort.signal);
    if (abort.signal.aborted) return;
  }
  res.json(await leagueBoard(user, todayFor(user)));
});

export const monstersRouter = Router();
monstersRouter.use(requireAuth);

// Every monster with whether this walker has unlocked it, how close they are, and whether they have raised one.
monstersRouter.get('/', async (req, res) => {
  const user = me(req);
  const progress = { lifetimeSteps: user.lifetimeSteps, bestStreak: user.bestStreak };
  const [raised, entries] = await Promise.all([Pet.distinct('species', { userId: user._id, hatchedAt: { $ne: null } }), catalog()]);
  const raisedSet = new Set(raised);
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
      raised: raisedSet.has(e.id),
    })),
  });
});
