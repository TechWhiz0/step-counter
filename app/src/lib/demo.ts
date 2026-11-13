// Dev-only demo mode: when signed in with DEMO_TOKEN, api() answers from this file instead of the server.
// Lets you click through every screen without a backend.
import type { Group, LeaderboardRow, OwnedItem, Pet, SyncResult, User } from './types';

export const DEMO_TOKEN = 'demo-token';

const today = new Date().toISOString().slice(0, 10);

export const demoUser: User = {
  id: 'demo',
  email: 'demo@steppet.app',
  nickname: 'Demo Walker',
  dailyGoal: 8000,
  timezone: 'Asia/Kolkata',
  currentStreak: 5,
  bestStreak: 12,
};

const mochi: Pet = {
  id: 'p1',
  name: 'Mochi',
  species: 'blob',
  stage: 'teen',
  seenStage: 'teen',
  form: null,
  traits: { hue: 28, pattern: 'spots', markings: 3, size: 'medium', eyes: 'sparkle', ears: 'cat', cheeks: true },
  mood: 'happy',
  equipped: ['scarf'],
  growth: 64000,
  nextStage: 'adult',
  stageProgress: 0.62,
  stepsToNextStage: 21000,
  treatsReceived: 4,
  isActive: true,
  startDay: '2026-10-20',
};

const pip: Pet = {
  ...mochi,
  id: 'p0',
  name: 'Pip',
  stage: 'adult',
  seenStage: 'adult',
  form: 'moonlight',
  traits: { hue: 220, pattern: 'stars', markings: 4, size: 'small', eyes: 'round', ears: 'bunny', cheeks: false },
  equipped: ['crown'],
  nextStage: null,
  stageProgress: 1,
  stepsToNextStage: 0,
  isActive: false,
  startDay: '2026-08-01',
};

const friendPet = (hue: number, stage: Pet['stage'], form: Pet['form'], name: string): Pet => ({
  ...mochi,
  id: `f-${name}`,
  name,
  stage,
  seenStage: stage,
  form,
  traits: { hue, pattern: 'stripes', markings: 2, size: 'large', eyes: 'oval', ears: 'antenna', cheeks: true },
  equipped: [],
});

const hourly = Array.from({ length: 24 }, (_, h) => (h >= 7 && h <= 20 ? [400, 900, 300, 200, 650, 800, 150, 500, 700, 300, 900, 600, 200, 0][h - 7] : 0));

const sync: SyncResult = {
  today: { day: today, total: hourly.reduce((a, b) => a + b, 0), goal: demoUser.dailyGoal, hourly },
  streak: { current: demoUser.currentStreak, best: demoUser.bestStreak },
  pet: mochi,
  surprises: [],
};

const groups: Group[] = [
  { id: 'g1', name: 'Hostel B Walkers', code: 'HB2026', memberCount: 6 },
  { id: 'g2', name: 'CS Batch', code: 'CS4Y', memberCount: 14 },
];

const rows: LeaderboardRow[] = [
  { rank: 1, userId: 'u1', nickname: 'Riya', streak: 9, steps: 61230, isMe: false, pet: friendPet(320, 'adult', 'sunrise', 'Biscuit') },
  { rank: 2, userId: 'demo', nickname: demoUser.nickname, streak: 5, steps: 48410, isMe: true, pet: mochi },
  { rank: 3, userId: 'u2', nickname: 'Arjun', streak: 3, steps: 40102, isMe: false, pet: friendPet(140, 'teen', null, 'Sprout') },
  { rank: 4, userId: 'u3', nickname: 'Kabir', streak: 0, steps: 22870, isMe: false, pet: friendPet(50, 'baby', null, 'Nugget') },
  { rank: 5, userId: 'u4', nickname: 'Sana', streak: 1, steps: 9050, isMe: false, pet: friendPet(260, 'egg', null, 'Egg') },
];

const items: OwnedItem[] = [
  { item: 'scarf', count: 1, source: 'streak' },
  { item: 'crown', count: 1, source: 'golden' },
  { item: 'glasses', count: 2, source: 'golden' },
  { item: 'flower', count: 1, source: 'treat' },
  { item: 'balloon', count: 1, source: 'golden' },
];

export async function demoApi(path: string, method: string, body: any): Promise<any> {
  await new Promise((r) => setTimeout(r, 150));
  const p = path.split('?')[0];
  if (p === '/auth/me') return method === 'DELETE' ? undefined : { user: { ...demoUser, ...(body ?? {}) } };
  if (p === '/auth/login' || p === '/auth/register') return { token: DEMO_TOKEN, user: demoUser };
  if (p === '/steps/sync') return sync;
  if (p === '/steps/history') return { days: [6200, 9100, 8400, 3000, 10200, 8800, sync.today.total].map((total) => ({ total })) };
  if (p === '/pet' || p === '/pet/seen' || p === '/pet/new-egg') return { pet: mochi };
  if (p === '/pet/collection') return { pets: [mochi, pip] };
  if (p === '/pet/items') return { items };
  if (p === '/pet/equip') return { pet: { ...mochi, equipped: body?.items ?? [] } };
  if (p === '/groups') return { groups };
  if (p === '/groups/join') return { group: groups[0] };
  const g = p.match(/^\/groups\/([^/]+)\/(leaderboard|leave)$/);
  if (g) {
    if (g[2] === 'leave') return undefined;
    return { group: groups.find((x) => x.id === g[1]) ?? groups[0], week: { from: '2026-11-09', to: '2026-11-15' }, hourlyCap: 2500, rows };
  }
  const f = p.match(/^\/friends\/([^/]+)\/(pet|treat)$/);
  if (f) {
    const row = rows.find((r) => r.userId === f[1]) ?? rows[0];
    if (f[2] === 'treat') return { pet: { ...row.pet!, treatsReceived: row.pet!.treatsReceived + 1 } };
    return { nickname: row.nickname, streak: row.streak, pet: row.pet };
  }
  return {};
}
