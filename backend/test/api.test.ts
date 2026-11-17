import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { addDays, dayKey } from '../src/lib/dates.js';
import { runDayClose } from '../src/jobs/dayClose.js';
import { Pet, Session, StepDay, User } from '../src/models/index.js';

const app = createApp();
const today = dayKey(new Date(), 'Asia/Kolkata');
const hours = (map: Record<number, number>) => Array.from({ length: 24 }, (_, h) => map[h] ?? 0);

async function signUp(email: string, nickname: string) {
  const res = await request(app).post('/auth/register').send({ email, password: 'walking123', username: nickname.toLowerCase(), timezone: 'Asia/Kolkata' });
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

test('register with a unique username, log in with username or email', async () => {
  await signUp('asha@example.com', 'Asha');
  const dupEmail = await request(app).post('/auth/register').send({ email: 'ASHA@example.com', password: 'walking123', username: 'asha2' });
  assert.equal(dupEmail.status, 409);
  assert.equal(dupEmail.body.field, 'email');
  const dupName = await request(app).post('/auth/register').send({ email: 'other@example.com', password: 'walking123', username: '@ASHA' });
  assert.equal(dupName.status, 409);
  assert.equal(dupName.body.field, 'username');
  assert.ok(dupName.body.suggestions.length > 0);
  assert.equal((await request(app).post('/auth/register').send({ email: 'x@example.com', password: 'walking123', username: 'no spaces' })).status, 400);
  assert.equal((await request(app).post('/auth/register').send({ email: 'y@example.com', password: 'walking123', username: 'admin' })).status, 400);

  const check = await request(app).get('/auth/username?u=Asha');
  assert.deepEqual([check.body.available, check.body.reason], [false, 'taken']);
  assert.equal((await request(app).get('/auth/username?u=asha_walks')).body.available, true);

  assert.equal((await request(app).post('/auth/login').send({ login: 'asha', password: 'nope' })).status, 401);
  const byName = await request(app).post('/auth/login').send({ login: '@Asha', password: 'walking123' });
  assert.equal(byName.status, 200);
  assert.equal(byName.body.user.username, 'asha');
  const byEmail = await request(app).post('/auth/login').send({ email: 'asha@example.com', password: 'walking123' });
  assert.equal(byEmail.status, 200);
  assert.equal((await request(app).get('/pet')).status, 401);
});

test('each device has its own session; signing out ends only that one', async () => {
  await signUp('twophones@example.com', 'TwoPhones');
  const login = (device: string) => request(app).post('/auth/login').send({ login: 'twophones', password: 'walking123', device });
  const phone = (await login('Pixel')).body.token as string;
  const tablet = (await login('Tab')).body.token as string;
  assert.equal((await request(app).get('/auth/me').set(auth(phone))).status, 200);
  assert.equal((await request(app).get('/auth/me').set(auth(tablet))).status, 200);

  assert.equal((await request(app).post('/auth/logout').set(auth(phone))).status, 204);
  // The signed-out phone's token is dead, even for a background sync; the tablet carries on.
  assert.equal((await request(app).post('/steps/sync').set(auth(phone)).send({ days: [] })).status, 401);
  assert.equal((await request(app).get('/auth/me').set(auth(tablet))).status, 200);
});

test('forgot password: emailed code sets a new password and signs out every device', async () => {
  const { token } = await signUp('forgetful@example.com', 'Forgetful');
  const logs: string[] = [];
  const orig = console.log;
  console.log = (...a: unknown[]) => void logs.push(a.join(' '));
  try {
    assert.equal((await request(app).post('/auth/forgot').send({ email: 'forgetful@example.com' })).status, 200);
    // Unknown emails get the same answer, so the form can't be used to find accounts.
    assert.equal((await request(app).post('/auth/forgot').send({ email: 'nobody@example.com' })).status, 200);
  } finally {
    console.log = orig;
  }
  const code = logs.join('\n').match(/forgetful@example.com: (\d{6})/)![1];
  const wrong = code === '000000' ? '111111' : '000000';
  assert.equal((await request(app).post('/auth/reset').send({ email: 'forgetful@example.com', code: wrong, password: 'newpass123' })).status, 400);
  const reset = await request(app).post('/auth/reset').send({ email: 'forgetful@example.com', code, password: 'newpass123' });
  assert.equal(reset.status, 200);
  assert.equal((await request(app).get('/auth/me').set(auth(token))).status, 401);
  assert.equal((await request(app).post('/auth/reset').send({ email: 'forgetful@example.com', code, password: 'again1234' })).status, 400);
  assert.equal((await request(app).post('/auth/login').send({ login: 'forgetful', password: 'newpass123' })).status, 200);
});

test('egg hatches, streak closes, form evolves', async () => {
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

  // Walk past the goal: hatches, mood happy.
  sync = await request(app).post('/steps/sync').set(auth(token)).send({
    days: [{ day: today, hourly: hours({ 8: 2000, 9: 2000, 12: 2000, 18: 2000 }) }],
  });
  assert.equal(sync.body.pet.stage, 'baby');
  assert.equal(sync.body.pet.seenStage, 'egg');
  assert.equal(sync.body.pet.mood, 'happy');
  assert.ok(sync.body.pet.traits.hue >= 0);

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
  // The second pet is no egg: a new monster arrives already hatched, with nothing to reveal.
  const second = await request(app).post('/pet/new').set(auth(token)).send({ name: 'Pip' });
  assert.equal(second.status, 201);
  assert.equal(second.body.pet.stage, 'baby');
  assert.equal(second.body.pet.seenStage, 'baby');
  assert.ok(second.body.pet.hatchedAt);
  assert.equal(second.body.pet.nextStage, 'teen');
  const col = await request(app).get('/pet/collection').set(auth(token));
  assert.equal(col.body.pets.length, 2);
  assert.equal(col.body.pets.filter((p: { isActive: boolean }) => p.isActive).length, 1);
});

test('two phones syncing at once keep the higher count for every hour', async () => {
  const { token, id } = await signUp('parallel@example.com', 'Parallel');
  await request(app).post('/pet').set(auth(token)).send({ name: 'Duo' });
  // Phone A saw the morning, phone B the evening, and both overlap at 12:00 with different counts.
  const a = { days: [{ day: today, hourly: hours({ 8: 1200, 12: 300 }) }] };
  const b = { days: [{ day: today, hourly: hours({ 12: 700, 19: 900 }) }] };
  const runs = await Promise.all(Array.from({ length: 6 }, (_, i) => request(app).post('/steps/sync').set(auth(token)).send(i % 2 ? a : b)));
  assert.ok(runs.every((r) => r.status === 200), runs.map((r) => r.status).join(','));
  const row = await StepDay.findOne({ userId: id, day: today }).lean();
  assert.equal(row!.hourly[8], 1200);
  assert.equal(row!.hourly[12], 700);
  assert.equal(row!.hourly[19], 900);
  assert.equal(row!.total, 2800);
  assert.equal(await StepDay.countDocuments({ userId: id, day: today }), 1);
});

test('another device sees new steps without asking twice (long-poll)', async () => {
  const { token } = await signUp('livewatch@example.com', 'LiveWatch');
  const first = await request(app).get('/steps/state').set(auth(token));
  assert.equal(first.body.today.total, 0);
  const waiting = request(app).get(`/steps/state?wait=${first.body.rev}`).set(auth(token));
  const started = Date.now();
  setTimeout(() => void request(app).post('/steps/sync').set(auth(token)).send({ days: [{ day: today, hourly: hours({ 10: 640 }) }] }).then(() => {}), 150);
  const updated = await waiting;
  assert.equal(updated.body.today.total, 640);
  assert.ok(Date.now() - started < 5000, 'answered as soon as the other device synced');
  assert.notEqual(updated.body.rev, first.body.rev);
});

test('account delete removes data', async () => {
  const c = await signUp('del@example.com', 'Del');
  await request(app).post('/pet').set(auth(c.token)).send({ name: 'Bye' });
  await request(app).post('/steps/sync').set(auth(c.token)).send({ days: [{ day: today, hourly: hours({ 9: 100 }) }] });
  assert.equal((await request(app).delete('/auth/me').set(auth(c.token))).status, 204);
  assert.equal(await Pet.countDocuments({ userId: c.id }), 0);
  assert.equal(await StepDay.countDocuments({ userId: c.id }), 0);
  assert.equal(await Session.countDocuments({ userId: c.id }), 0);
  assert.equal((await request(app).get('/pet').set(auth(c.token))).status, 401);
});

test('daily goal can change but the username is fixed after sign-up', async () => {
  const { token } = await signUp('fixedname@example.com', 'Fixed');
  const goal = await request(app).patch('/auth/me').set(auth(token)).send({ dailyGoal: 9000 });
  assert.equal(goal.status, 200);
  assert.equal(goal.body.user.dailyGoal, 9000);
  assert.equal((await request(app).patch('/auth/me').set(auth(token)).send({ username: 'renamed' })).status, 400);
  assert.equal((await request(app).patch('/auth/me').set(auth(token)).send({ nickname: 'Renamed' })).status, 400);
  const me = await request(app).get('/auth/me').set(auth(token));
  assert.equal(me.body.user.username, 'fixed');
});

test('a sync that reads fewer steps never lowers what the server already has', async () => {
  const { token } = await signUp('nolower@example.com', 'NoLower');
  await request(app).post('/pet').set(auth(token)).send({ name: 'Keep' });
  const day = dayKey(new Date(), 'Asia/Kolkata');
  await request(app).post('/steps/sync').set(auth(token)).send({ days: [{ day, hourly: hours({ 8: 3000, 9: 1000 }) }] });
  // A later read that lost the morning (e.g. permissions glitch) but has new evening steps.
  const res = await request(app).post('/steps/sync').set(auth(token)).send({ days: [{ day, hourly: hours({ 18: 500 }) }] });
  assert.equal(res.status, 200);
  assert.equal(res.body.today.total, 4500);
});
