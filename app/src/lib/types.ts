export type Stage = 'egg' | 'baby' | 'teen' | 'adult';
export type Form = 'sunrise' | 'daytime' | 'moonlight' | 'balanced';
export type Mood = 'happy' | 'sleepy' | 'neutral';

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
  source: 'golden' | 'streak' | 'treat';
}
