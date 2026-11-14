import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { addDays, dayKey } from '../src/lib/dates.js';
import { runDayClose } from '../src/jobs/dayClose.js';
import { GoldenDay, Pet, StepDay, User } from '../src/models/index.js';

const app = createApp();
const today = dayKey(new Date(), 'Asia/Kolkata');
const hours = (map: Record<number, number>) => Array.from({ length: 24 }, (_, h) => map[h] ?? 0);

async function signUp(email: string, nickname: string) {
  const res = await request(app).post('/auth/register').send({ email, password: 'walking123', nickname, timezone: 'Asia/Kolkata' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { token: res.body.token as string, id: res.body.user.id as string };
}
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

before(async () => {
  await mongoose.connect(process.env.TEST_MONGO_URL ?? 'mongodb://127.0.0.1:27018/steppet_test');
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
});
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('register, login and duplicate email', async () => {
  await signUp('asha@example.com', 'Asha');
  const dup = await request(app).post('/auth/register').send({ email: 'ASHA@example.com', password: 'walking123', nickname: 'A2' });
  assert.equal(dup.status, 409);
  const bad = await request(app).post('/auth/login').send({ email: 'asha@example.com', password: 'nope' });
  assert.equal(bad.status, 401);
  const ok = await request(app).post('/auth/login').send({ email: 'asha@example.com', password: 'walking123' });
  assert.equal(ok.status, 200);
  assert.equal((await request(app).get('/pet')).status, 401);
});

test('egg hatches, golden steps surprise, streak closes, form evolves', async () => {
  const { token, id } = await signUp('ravi@example.com', 'Ravi');
  const egg = await request(app).post('/pet').set(auth(token)).send({ name: 'Momo' });
  assert.equal(egg.status, 201);
  assert.equal(egg.body.pet.stage, 'egg');
  assert.equal(egg.body.pet.traits, null);
  assert.equal((await request(app).post('/pet').set(auth(token)).send({ name: 'Two' })).status, 409);

  // Walk 3,000 steps: still an egg, halfway there.
  let sync = await request(app).post('/steps/sync').set(auth(token)).send({ days: [{ day: today, hourly: hours({ 8: 1500, 9: 1500 }) }] });
  assert.equal(sync.status, 200, JSON.stringify(sync.body));
  assert.equal(sync.body.pet.stage, 'egg');
  assert.equal(sync.body.today.total, 3000);
  const earlySurprises = sync.body.surprises.length;

  // Walk past the goal: hatches, mood happy, every golden step found.
  sync = await request(app).post('/steps/sync').set(auth(token)).send({
    days: [{ day: today, hourly: hours({ 8: 2000, 9: 2000, 12: 2000, 18: 2000 }) }],
  });
  assert.equal(sync.body.pet.stage, 'baby');
  assert.equal(sync.body.pet.seenStage, 'egg');
  assert.equal(sync.body.pet.mood, 'happy');
  assert.ok(sync.body.pet.traits.hue >= 0);
  const gd = await GoldenDay.findOne({ userId: id, day: today });
  const expected = gd!.targets.filter((t) => t <= 8000).length;
  assert.equal(earlySurprises + sync.body.surprises.length, expected);
  // The same steps synced again give nothing new.
  sync = await request(app).post('/steps/sync').set(auth(token)).send({ days: [{ day: today, hourly: hours({ 8: 2000, 9: 2000, 12: 2000, 18: 2000 }) }] });
  assert.equal(sync.body.surprises.length, 0);

  const seen = await request(app).post('/pet/seen').set(auth(token));
  assert.equal(seen.body.pet.seenStage, 'baby');

  // Future and too-old days are ignored.
  await request(app).post('/steps/sync').set(auth(token)).send({ days: [{ day: addDays(today, 1), hourly: hours({ 1: 999 }) }, { day: addDays(today, -30), hourly: hours({ 1: 999 }) }] });
  assert.equal(await StepDay.countDocuments({ userId: id }), 1);

  // Seven past evening-heavy days that beat the goal: streak 7, star badge, adult moonlight pet.
  const user = await User.findById(id);
  user!.lastClosedDay = addDays(today, -8);
  await user!.save();
  const pet = await Pet.findOne({ userId: id, isActive: true });
  pet!.startDay = addDays(today, -7);
  await pet!.save();
  for (let i = 1; i <= 7; i++) {
    const hourly = hours({ 17: 2500, 18: 2500, 19: 2500, 20: 2500, 21: 2500, 22: 2500, 23: 2500, 0: 2500, 1: 2500, 2: 2500, 3: 2500, 7: 2000 });
    await StepDay.create({ userId: id, day: addDays(today, -i), hourly, total: 32000, cappedTotal: 29500 });
  }
  await runDayClose();
  const after = await User.findById(id);
  assert.equal(after!.currentStreak, 7);
  assert.equal(after!.lastClosedDay, addDays(today, -1));
  const items = await request(app).get('/pet/items').set(auth(token));
  assert.ok(items.body.items.some((i: { item: string }) => i.item === 'star-badge'));
  const adult = await request(app).get('/pet').set(auth(token));
  assert.equal(adult.body.pet.stage, 'adult');
  assert.equal(adult.body.pet.form, 'moonlight');
  assert.equal(adult.body.pet.traits.markings, 3);

  // Equip only owned items; then start a second egg and keep the adult in the collection.
  assert.equal((await request(app).post('/pet/equip').set(auth(token)).send({ items: ['crown'] })).status, 400);
  const eq = await request(app).post('/pet/equip').set(auth(token)).send({ items: ['star-badge'] });
  assert.deepEqual(eq.body.pet.equipped, ['star-badge']);
  assert.equal((await request(app).post('/pet/new-egg').set(auth(token)).send({ name: 'Pip' })).status, 201);
  const col = await request(app).get('/pet/collection').set(auth(token));
  assert.equal(col.body.pets.length, 2);
  assert.equal(col.body.pets.filter((p: { isActive: boolean }) => p.isActive).length, 1);
});

test('groups, leaderboard with hourly cap, visits and treats', async () => {
  const a = await signUp('meera@example.com', 'Meera');
  const b = await signUp('kiran@example.com', 'Kiran');
  await request(app).post('/pet').set(auth(b.token)).send({ name: 'Bun' });
  const g = await request(app).post('/groups').set(auth(a.token)).send({ name: 'Batch 42' });
  assert.equal(g.status, 201);
  assert.match(g.body.group.code, /^[A-Z2-9]{6}$/);

  // Not in the group yet: can't see the pet.
  assert.equal((await request(app).get(`/friends/${b.id}/pet`).set(auth(a.token))).status, 404);
  const join = await request(app).post('/groups/join').set(auth(b.token)).send({ code: g.body.group.code.toLowerCase() });
  assert.equal(join.body.group.memberCount, 2);

  await request(app).post('/steps/sync').set(auth(a.token)).send({ days: [{ day: today, hourly: hours({ 9: 2000 }) }] });
  await request(app).post('/steps/sync').set(auth(b.token)).send({ days: [{ day: today, hourly: hours({ 9: 20000 }) }] });
  const lb = await request(app).get(`/groups/${g.body.group.id}/leaderboard`).set(auth(a.token));
  assert.equal(lb.status, 200);
  assert.deepEqual(lb.body.rows.map((r: { nickname: string; steps: number }) => [r.nickname, r.steps]), [['Kiran', 2500], ['Meera', 2000]]);
  assert.equal(lb.body.rows[1].isMe, true);

  const visit = await request(app).get(`/friends/${b.id}/pet`).set(auth(a.token));
  assert.equal(visit.body.pet.name, 'Bun');
  const treat = await request(app).post(`/friends/${b.id}/treat`).set(auth(a.token));
  assert.equal(treat.body.pet.treatsReceived, 1);
  assert.equal((await request(app).post(`/friends/${b.id}/treat`).set(auth(a.token))).status, 409);
  assert.equal((await request(app).post(`/friends/${a.id}/treat`).set(auth(a.token))).status, 400);
});

test('account delete removes data', async () => {
  const c = await signUp('del@example.com', 'Del');
  await request(app).post('/pet').set(auth(c.token)).send({ name: 'Bye' });
  await request(app).post('/steps/sync').set(auth(c.token)).send({ days: [{ day: today, hourly: hours({ 9: 100 }) }] });
  assert.equal((await request(app).delete('/auth/me').set(auth(c.token))).status, 204);
  assert.equal(await Pet.countDocuments({ userId: c.id }), 0);
  assert.equal(await StepDay.countDocuments({ userId: c.id }), 0);
  assert.equal((await request(app).get('/pet').set(auth(c.token))).status, 401);
});

test('daily goal can change but the nickname is fixed after sign-up', async () => {
  const { token } = await signUp('fixedname@example.com', 'Fixed');
  const goal = await request(app).patch('/auth/me').set(auth(token)).send({ dailyGoal: 9000 });
  assert.equal(goal.status, 200);
  assert.equal(goal.body.user.dailyGoal, 9000);
  const rename = await request(app).patch('/auth/me').set(auth(token)).send({ nickname: 'Renamed' });
  assert.equal(rename.status, 400);
  const me = await request(app).get('/auth/me').set(auth(token));
  assert.equal(me.body.user.nickname, 'Fixed');
});
