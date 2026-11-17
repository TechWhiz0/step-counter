import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';
// A guessable secret lets anyone forge a login for any account, so production refuses to start without one.
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('Set JWT_SECRET (32+ random characters) before running in production');
}

export const config = {
  isProd,
  mongoUrl: process.env.MONGO_URL ?? 'mongodb://127.0.0.1:27017/steppet',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  port: Number(process.env.PORT ?? 4000),
  timezone: process.env.APP_TIMEZONE ?? 'Asia/Kolkata',
};

// Game rules live here so they can be tuned without touching logic.
export const rules = {
  defaultGoal: 6000,
  // Steps above this in a single hour are ignored for growth and leaderboards (anti-shake cap).
  hourlyCap: 2500,
  // Total capped steps since the egg was laid needed to reach each stage.
  stageThresholds: { baby: 5000, teen: 55000, adult: 205000 },
  // Window used to pick the adult form.
  evolutionWindowDays: 14,
  // A time band must hold at least this share of steps to decide the form.
  dominantShare: 0.45,
  streakRewards: { 7: 'star-badge', 14: 'scarf-gold', 30: 'crown' } as Record<number, string>,
  // Closet items granted once lifetime steps pass each total.
  milestoneItems: [
    { steps: 50_000, item: 'glasses' },
    { steps: 150_000, item: 'cap' },
    { steps: 300_000, item: 'balloon' },
    { steps: 450_000, item: 'night-glow' },
    { steps: 500_000, item: 'flower' },
  ],
  // Weekly leagues, lowest first. The top `leaguePromote` move up, the bottom `leaguePromote` move down.
  leagueTiers: ['sprout', 'bloom', 'sunflower', 'starfruit'],
  leaguePromote: 5,
  // A league needs at least this many walkers before anyone drops a tier.
  leagueMinForDrop: 10,
  // Any single hour above this gets the account flagged for an admin to review.
  anomalyHourSteps: 6000,
  questReward: 1,
};
