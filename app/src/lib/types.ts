export type Stage = 'egg' | 'baby' | 'teen' | 'adult';
export type Form = 'sunrise' | 'daytime' | 'moonlight' | 'balanced';
export type Mood = 'happy' | 'sleepy' | 'neutral';
// What the pet's face shows: its mood, or asleep (night-time) or weak (low energy). Worked out in the app.
export type FaceMood = Mood | 'asleep' | 'weak';

export interface Traits {
  hue: number;
  pattern: 'spots' | 'stripes' | 'stars' | 'hearts';
  markings: number;
  size: 'small' | 'medium' | 'large';
  eyes: 'round' | 'oval' | 'sparkle' | 'dot';
  ears: 'none' | 'bunny' | 'cat' | 'antenna';
  cheeks: boolean;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  stage: Stage;
  seenStage: Stage;
  form: Form | null;
  traits: Traits | null;
  mood: Mood;
  // 5-100 from the last week of walks; missing from older servers.
  energy?: number;
  equipped: string[];
  growth: number;
  nextStage: Stage | null;
  stageProgress: number;
  stepsToNextStage: number;
  treatsReceived: number;
  isActive: boolean;
  startDay: string;
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  dailyGoal: number;
  timezone: string;
  currentStreak: number;
  bestStreak: number;
  // Added with quests and leagues; missing from users cached by older app versions.
  role?: 'user' | 'admin';
  lifetimeSteps?: number;
  treats?: number;
  league?: LeagueTier;
}

export interface Surprise {
  step: number;
  item: string;
}

export interface SyncResult {
  today: { day: string; total: number; goal: number; hourly: number[] };
  streak: { current: number; best: number };
  pet: Pet | null;
  surprises: Surprise[];
  // Missing from results cached by older app versions.
  golden?: GoldenHint;
  lifetimeSteps?: number;
  treats?: number;
  unlockedItems?: string[];
}

export interface GoldenHint {
  found: number;
  total: number;
  hint: 'cold' | 'warm' | 'hot' | null;
}

export interface Group {
  id: string;
  name: string;
  code: string;
  memberCount: number;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  nickname: string;
  streak: number;
  steps: number;
  isMe: boolean;
  pet: Pet | null;
}

export interface OwnedItem {
  item: string;
  count: number;
  source: 'golden' | 'streak' | 'treat' | 'milestone';
}

export type LeagueTier = 'sprout' | 'bloom' | 'sunflower' | 'starfruit';

export interface Quest {
  id: 'morning' | 'goal' | 'golden' | 'treat';
  title: string;
  progress: number;
  target: number;
  done: boolean;
  claimed: boolean;
  reward: number;
}

export interface QuestsResult {
  quests: Quest[];
  treats: number;
}

export interface LeagueRow {
  rank: number;
  userId: string;
  nickname: string;
  streak: number;
  steps: number;
  isMe: boolean;
  species: string | null;
  stage: Stage | null;
}

export interface LeagueBoard {
  tier: number;
  tierName: LeagueTier;
  tiers: LeagueTier[];
  promoteTop: number;
  dropFrom: number | null;
  daysLeft: number;
  total: number;
  myRank: number | null;
  rows: LeagueRow[];
}

export type Rarity = 'starter' | 'rare' | 'epic';
export type Unlock =
  | { kind: 'starter' }
  | { kind: 'steps'; steps: number }
  | { kind: 'streak'; days: number }
  | { kind: 'event'; event: string };

export interface MonsterEntry {
  id: string;
  name: string;
  rarity: Rarity;
  blurb: string;
  unlock: Unlock;
  enabled: boolean;
  unlocked: boolean;
  progress: number;
  raised: boolean;
}

export interface MonstersResult {
  lifetimeSteps: number;
  bestStreak: number;
  monsters: MonsterEntry[];
}

export type ClosetRule = { kind: 'golden' } | { kind: 'streak'; days: number } | { kind: 'steps'; steps: number };

export interface ClosetItem {
  item: string;
  rule: ClosetRule;
  count: number;
}

export interface ClosetResult {
  lifetimeSteps: number;
  bestStreak: number;
  items: ClosetItem[];
}

// Admin
export interface AdminOverview {
  days: number;
  users: number;
  walkersToday: number;
  avgStepsToday: number;
  eggsHatched: number;
  rareUnlocks: number;
  needsReview: number;
  stepsPerDay: { day: string; steps: number; walkers: number }[];
  hatchesBySpecies: { species: string; count: number; share: number }[];
  topGroups: { name: string; members: number; steps: number }[];
}

export interface AdminUser {
  id: string;
  nickname: string;
  email: string;
  role: 'user' | 'admin';
  league: number;
  lifetimeSteps: number;
  steps7d: number;
  currentStreak: number;
  flagged: boolean;
  flagReason: string | null;
  hiddenFromLeagues: boolean;
  monstersRaised: number;
  pet: { name: string; species: string; stage: Stage } | null;
}

export interface AdminUsersResult {
  total: number;
  page: number;
  pages: number;
  users: AdminUser[];
}

export interface AdminMonster {
  id: string;
  name: string;
  rarity: Rarity;
  blurb: string;
  unlock: Unlock;
  enabled: boolean;
  owners: number;
}
