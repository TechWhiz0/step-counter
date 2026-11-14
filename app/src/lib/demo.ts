// Dev-only demo mode: when signed in with DEMO_TOKEN, api() answers from this file instead of the server.
// Lets you click through every screen without a backend.
import type {
  AdminMonster,
  AdminOverview,
  AdminUser,
  ClosetItem,
  Group,
  LeaderboardRow,
  LeagueBoard,
  MonsterEntry,
  OwnedItem,
  Pet,
  Quest,
  SyncResult,
  User,
} from './types';

export const DEMO_TOKEN = 'demo-token';

const today = new Date().toISOString().slice(0, 10);

export const demoUser: User = {
  id: 'demo',
  email: 'demo@steppet.app',
  nickname: 'Demo Walker',
  dailyGoal: 8000,
  timezone: 'Asia/Kolkata',
  currentStreak: 12,
  bestStreak: 21,
  role: 'admin',
  lifetimeSteps: 412_600,
  treats: 8,
  league: 'sunflower',
};

const mochi: Pet = {
  id: 'p1',
  name: 'Mochi',
  species: 'mochi',
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
  golden: { found: 1, total: 3, hint: 'warm' },
  lifetimeSteps: demoUser.lifetimeSteps,
  treats: demoUser.treats,
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

const quests: Quest[] = [
  { id: 'morning', title: 'Walk 2,000 before noon', progress: 1400, target: 2000, done: false, claimed: false, reward: 1 },
  { id: 'treat', title: 'Send a treat to a friend', progress: 0, target: 1, done: false, claimed: false, reward: 1 },
  { id: 'golden', title: 'Find a golden step', progress: 1, target: 1, done: true, claimed: false, reward: 1 },
  { id: 'goal', title: 'Reach your daily goal', progress: 6600, target: 8000, done: false, claimed: false, reward: 1 },
];

const league: LeagueBoard = {
  tier: 2,
  tierName: 'sunflower',
  tiers: ['sprout', 'bloom', 'sunflower', 'starfruit'],
  promoteTop: 5,
  dropFrom: 7,
  daysLeft: 2,
  total: 7,
  myRank: 2,
  rows: [
    { rank: 1, userId: 'u1', nickname: 'Riya', streak: 9, steps: 61230, isMe: false, species: 'mossy', stage: 'adult' },
    { rank: 2, userId: 'demo', nickname: demoUser.nickname, streak: 12, steps: 48410, isMe: true, species: 'mochi', stage: 'teen' },
    { rank: 3, userId: 'u2', nickname: 'Arjun', streak: 3, steps: 40102, isMe: false, species: 'pip', stage: 'teen' },
    { rank: 4, userId: 'u3', nickname: 'Kabir', streak: 0, steps: 22870, isMe: false, species: 'bop', stage: 'baby' },
    { rank: 5, userId: 'u4', nickname: 'Meera', streak: 4, steps: 19400, isMe: false, species: 'drip', stage: 'baby' },
    { rank: 6, userId: 'u5', nickname: 'Sana', streak: 1, steps: 9050, isMe: false, species: 'nubs', stage: 'baby' },
    { rank: 7, userId: 'u6', nickname: 'Dev', streak: 0, steps: 3120, isMe: false, species: null, stage: 'egg' },
  ],
};

const SPECIES: Omit<MonsterEntry, 'unlocked' | 'progress' | 'raised' | 'enabled'>[] = [
  { id: 'mochi', name: 'Mochi', rarity: 'starter', unlock: { kind: 'starter' }, blurb: 'Morning walker' },
  { id: 'pip', name: 'Pip', rarity: 'starter', unlock: { kind: 'starter' }, blurb: 'Night owl' },
  { id: 'bop', name: 'Bop', rarity: 'starter', unlock: { kind: 'starter' }, blurb: 'Steady pacer' },
  { id: 'nubs', name: 'Nubs', rarity: 'starter', unlock: { kind: 'starter' }, blurb: 'Sleepy cuddler' },
  { id: 'mossy', name: 'Mossy', rarity: 'starter', unlock: { kind: 'starter' }, blurb: 'Park explorer' },
  { id: 'drip', name: 'Drip', rarity: 'starter', unlock: { kind: 'starter' }, blurb: 'Loves long walks by water' },
  { id: 'pebble', name: 'Pebble', rarity: 'starter', unlock: { kind: 'starter' }, blurb: 'Slow but never stops' },
  { id: 'bloop', name: 'Bloop', rarity: 'starter', unlock: { kind: 'starter' }, blurb: 'Puddle-jumper' },
  { id: 'spike', name: 'Spike', rarity: 'starter', unlock: { kind: 'starter' }, blurb: 'Summer sprinter' },
  { id: 'fizz', name: 'Fizz', rarity: 'rare', unlock: { kind: 'steps', steps: 250_000 }, blurb: 'Streak keeper' },
  { id: 'puff', name: 'Puff', rarity: 'rare', unlock: { kind: 'steps', steps: 300_000 }, blurb: 'Rainy-day stroller' },
  { id: 'buzz', name: 'Buzz', rarity: 'rare', unlock: { kind: 'steps', steps: 350_000 }, blurb: 'Busy flower-hopper' },
  { id: 'shroom', name: 'Shroom', rarity: 'rare', unlock: { kind: 'steps', steps: 400_000 }, blurb: 'Forest trail fan' },
  { id: 'inky', name: 'Inky', rarity: 'rare', unlock: { kind: 'streak', days: 30 }, blurb: 'Shy beach-walker' },
  { id: 'jelly', name: 'Jelly', rarity: 'epic', unlock: { kind: 'steps', steps: 500_000 }, blurb: 'Glows on night walks' },
  { id: 'gem', name: 'Gem', rarity: 'epic', unlock: { kind: 'steps', steps: 600_000 }, blurb: 'Hill climber' },
  { id: 'ember', name: 'Ember', rarity: 'epic', unlock: { kind: 'steps', steps: 750_000 }, blurb: 'Speed walker' },
  { id: 'twinkle', name: 'Twinkle', rarity: 'epic', unlock: { kind: 'steps', steps: 1_000_000 }, blurb: 'The rarest light in the meadow' },
  { id: 'gourdy', name: 'Gourdy', rarity: 'rare', unlock: { kind: 'event', event: 'Harvest Walk' }, blurb: 'Autumn visitor' },
  { id: 'frost', name: 'Frost', rarity: 'epic', unlock: { kind: 'event', event: 'Winter Wander' }, blurb: 'Winter visitor' },
];

const lifetime = demoUser.lifetimeSteps!;
const monsters: MonsterEntry[] = SPECIES.map((m) => {
  const enabled = m.unlock.kind !== 'event';
  const u = m.unlock;
  const progress = u.kind === 'steps' ? Math.min(1, lifetime / u.steps) : u.kind === 'streak' ? Math.min(1, demoUser.bestStreak / u.days) : 1;
  return { ...m, enabled, unlocked: enabled && progress >= 1, progress, raised: ['mochi', 'pip', 'mossy'].includes(m.id) };
});

const closet: ClosetItem[] = [
  { item: 'glasses', rule: { kind: 'steps', steps: 50_000 }, count: 1 },
  { item: 'cap', rule: { kind: 'steps', steps: 150_000 }, count: 1 },
  { item: 'balloon', rule: { kind: 'steps', steps: 300_000 }, count: 1 },
  { item: 'night-glow', rule: { kind: 'steps', steps: 450_000 }, count: 0 },
  { item: 'flower', rule: { kind: 'steps', steps: 500_000 }, count: 0 },
  { item: 'star-badge', rule: { kind: 'streak', days: 7 }, count: 1 },
  { item: 'scarf-gold', rule: { kind: 'streak', days: 14 }, count: 1 },
  { item: 'crown', rule: { kind: 'streak', days: 30 }, count: 0 },
  { item: 'scarf', rule: { kind: 'golden' }, count: 1 },
  { item: 'bow', rule: { kind: 'golden' }, count: 0 },
  { item: 'headphones', rule: { kind: 'golden' }, count: 0 },
  { item: 'leaf', rule: { kind: 'golden' }, count: 1 },
];

const adminUsers: AdminUser[] = league.rows.map((r, i) => ({
  id: r.userId,
  nickname: r.nickname,
  email: `${r.nickname.toLowerCase().replace(/\s/g, '')}@example.com`,
  role: r.isMe ? 'admin' : 'user',
  league: 2,
  lifetimeSteps: 120_000 + i * 41_000,
  steps7d: r.steps,
  currentStreak: r.streak,
  flagged: r.nickname === 'Riya',
  flagReason: r.nickname === 'Riya' ? '9,800 steps in one hour at 3 am' : null,
  hiddenFromLeagues: false,
  monstersRaised: 1 + (i % 4),
  pet: r.species && r.stage ? { name: r.isMe ? 'Mochi' : `${r.nickname}'s pet`, species: r.species, stage: r.stage } : null,
}));

const overview: AdminOverview = {
  days: 7,
  users: 1284,
  walkersToday: 642,
  avgStepsToday: 6830,
  eggsHatched: 213,
  rareUnlocks: 37,
  needsReview: 3,
  stepsPerDay: [3.9, 4.4, 4.1, 5.0, 4.7, 5.6, 4.4].map((m, i) => ({
    day: new Date(Date.now() - (6 - i) * 86_400_000).toISOString().slice(0, 10),
    steps: Math.round(m * 1_000_000),
    walkers: 560 + i * 12,
  })),
  hatchesBySpecies: [
    { species: 'mochi', count: 320, share: 0.25 },
    { species: 'pip', count: 256, share: 0.2 },
    { species: 'mossy', count: 205, share: 0.16 },
    { species: 'bop', count: 166, share: 0.13 },
    { species: 'drip', count: 128, share: 0.1 },
    { species: 'fizz', count: 64, share: 0.05 },
  ],
  topGroups: [
    { name: 'Hostel B Walkers', members: 6, steps: 312_400 },
    { name: 'CS Batch', members: 14, steps: 288_100 },
    { name: 'Morning Crew', members: 9, steps: 190_250 },
  ],
};

const adminMonsters: AdminMonster[] = SPECIES.map((m, i) => ({ ...m, enabled: m.unlock.kind !== 'event', owners: Math.max(0, 300 - i * 17) }));

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
  if (p === '/pet/closet') return { lifetimeSteps: lifetime, bestStreak: demoUser.bestStreak, items: closet };
  if (p === '/quests') return { quests, treats: demoUser.treats };
  const q = p.match(/^\/quests\/([^/]+)\/claim$/);
  if (q) {
    const quest = quests.find((x) => x.id === q[1]);
    if (quest) quest.claimed = true;
    demoUser.treats = (demoUser.treats ?? 0) + 1;
    return { quests, treats: demoUser.treats };
  }
  if (p === '/leagues') return league;
  if (p === '/monsters') return { lifetimeSteps: lifetime, bestStreak: demoUser.bestStreak, monsters };
  if (p === '/admin/overview') return overview;
  if (p === '/admin/users') {
    const filter = new URLSearchParams(path.split('?')[1] ?? '').get('filter');
    const users = filter === 'flagged' ? adminUsers.filter((u) => u.flagged) : adminUsers;
    return { total: users.length, page: 1, pages: 1, users };
  }
  const au = p.match(/^\/admin\/users\/([^/]+)\/(hours|review)$/);
  if (au) {
    const u = adminUsers.find((x) => x.id === au[1]) ?? adminUsers[0];
    if (au[2] === 'hours') return { days: [{ day: today, total: sync.today.total, hourly }] };
    if (body?.action === 'clear') Object.assign(u, { flagged: false, flagReason: null });
    if (body?.action === 'hide') Object.assign(u, { flagged: false, hiddenFromLeagues: true });
    if (body?.action === 'unhide') u.hiddenFromLeagues = false;
    return { id: u.id, flagged: u.flagged, hiddenFromLeagues: u.hiddenFromLeagues };
  }
  if (p === '/admin/monsters') return { monsters: adminMonsters };
  const am = p.match(/^\/admin\/monsters\/([^/]+)$/);
  if (am) {
    const m = adminMonsters.find((x) => x.id === am[1]) ?? adminMonsters[0];
    if (typeof body?.enabled === 'boolean') m.enabled = body.enabled;
    if (typeof body?.unlockSteps === 'number' && m.unlock.kind === 'steps') m.unlock = { kind: 'steps', steps: body.unlockSteps };
    return { monster: m };
  }
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
