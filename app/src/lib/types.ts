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
  energy?: number;
  equipped: string[];
  growth: number;
  nextStage: Stage | null;
  stageProgress: number;
  stepsToNextStage: number;
  isActive: boolean;
  startDay: string;
  hatchedAt?: string | null;
  adultAt?: string | null;
}

export type LeagueTier = 'sprout' | 'bloom' | 'sunflower' | 'starfruit';

export interface User {
  id: string;
  username: string;
  email: string;
  nickname: string;
  dailyGoal: number;
  timezone: string;
  currentStreak: number;
  bestStreak: number;
  role?: 'user' | 'admin';
  lifetimeSteps?: number;
  treats?: number;
  league?: LeagueTier;
  createdAt?: string;
}

export interface TodayState {
  today: { day: string; total: number; goal: number; hourly: number[] };
  streak: { current: number; best: number };
  pet: Pet | null;
  lifetimeSteps?: number;
  treats?: number;
  unlockedItems?: string[];
  rev?: number;
}
export type SyncResult = TodayState;

export interface Quest {
  id: 'morning' | 'goal';
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
  username: string;
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
  hourlyCap?: number;
  rev?: number;
  rows: LeagueRow[];
}

export type Rarity = 'starter' | 'rare' | 'epic';
export type Unlock = { kind: 'starter' } | { kind: 'steps'; steps: number } | { kind: 'streak'; days: number } | { kind: 'event'; event: string };

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

export type ClosetRule = { kind: 'streak'; days: number } | { kind: 'steps'; steps: number };

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

export interface UsernameCheck {
  username: string;
  available: boolean;
  reason: string | null;
  suggestions: string[];
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
  leagues: { tier: LeagueTier; walkers: number }[];
}

export interface AdminUser {
  id: string;
  username: string;
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
