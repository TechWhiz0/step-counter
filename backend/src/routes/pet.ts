import { Router } from 'express';
import { z } from 'zod';
import { me, requireAuth } from '../lib/auth.js';
import { rules } from '../config.js';
import { activePet, newEgg, refreshPet, serializePet, todayFor } from '../lib/game.js';
import { GOLDEN_ITEMS } from '../lib/petRules.js';
import { Item, Pet } from '../models/index.js';

export const petRouter = Router();
petRouter.use(requireAuth);

const nameBody = z.object({ name: z.string().trim().min(1).max(20) });

petRouter.get('/', async (req, res) => {
  const pet = await activePet(me(req)._id);
  res.json({ pet: pet ? serializePet(pet) : null });
});

// First egg, given during onboarding.
petRouter.post('/', async (req, res) => {
  const user = me(req);
  const { name } = nameBody.parse(req.body);
  if (await activePet(user._id)) return res.status(409).json({ error: 'You already have a pet' });
  const pet = await newEgg(user._id, name, todayFor(user));
  await refreshPet(pet, user, todayFor(user));
  res.status(201).json({ pet: serializePet(pet) });
});

// Called after the app has played the hatch / grow / evolve animation.
petRouter.post('/seen', async (req, res) => {
  const pet = await activePet(me(req)._id);
  if (!pet) return res.status(404).json({ error: 'No pet' });
  pet.seenStage = pet.stage;
  await pet.save();
  res.json({ pet: serializePet(pet) });
});

// Once a pet is grown up, the owner can start another egg. The adult moves to the collection.
petRouter.post('/new-egg', async (req, res) => {
  const user = me(req);
  const { name } = nameBody.parse(req.body);
  const current = await activePet(user._id);
  if (current && current.stage !== 'adult') {
    return res.status(409).json({ error: 'Your pet needs to grow up first' });
  }
  const pet = await newEgg(user._id, name, todayFor(user));
  res.status(201).json({ pet: serializePet(pet) });
});

petRouter.get('/collection', async (req, res) => {
  const pets = await Pet.find({ userId: me(req)._id }).sort({ createdAt: -1 });
  res.json({ pets: pets.map(serializePet) });
});

// Items the user owns, with how many of each.
petRouter.get('/items', async (req, res) => {
  const items = await Item.aggregate([
    { $match: { userId: me(req)._id } },
    { $group: { _id: '$item', count: { $sum: 1 }, source: { $first: '$source' } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({ items: items.map((i) => ({ item: i._id, count: i.count, source: i.source })) });
});

// Every closet item, how it is earned, and how many the user owns. Nothing is bought.
petRouter.get('/closet', async (req, res) => {
  const user = me(req);
  const counts = await Item.aggregate<{ _id: string; count: number }>([
    { $match: { userId: user._id } },
    { $group: { _id: '$item', count: { $sum: 1 } } },
  ]);
  const owned = new Map(counts.map((c) => [c._id, c.count]));
  const entry = (item: string, rule: { kind: 'golden' } | { kind: 'streak'; days: number } | { kind: 'steps'; steps: number }) => ({
    item,
    rule,
    count: owned.get(item) ?? 0,
  });
  const items = [
    ...rules.milestoneItems.map((m) => entry(m.item, { kind: 'steps', steps: m.steps })),
    ...Object.entries(rules.streakRewards).map(([days, item]) => entry(item, { kind: 'streak', days: Number(days) })),
    ...GOLDEN_ITEMS.filter((i) => !rules.milestoneItems.some((m) => m.item === i)).map((i) => entry(i, { kind: 'golden' })),
  ];
  res.json({ lifetimeSteps: user.lifetimeSteps, bestStreak: user.bestStreak, items });
});

petRouter.post('/equip', async (req, res) => {
  const user = me(req);
  const { items } = z.object({ items: z.array(z.string()).max(3) }).parse(req.body);
  const owned = await Item.distinct('item', { userId: user._id, item: { $in: items } });
  if (owned.length !== new Set(items).size) return res.status(400).json({ error: 'You do not own all of these items' });
  const pet = await activePet(user._id);
  if (!pet) return res.status(404).json({ error: 'No pet' });
  pet.equipped = [...new Set(items)];
  await pet.save();
  res.json({ pet: serializePet(pet) });
});
