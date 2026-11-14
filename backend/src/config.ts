import 'dotenv/config';

export const config = {
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
  goldenStepsPerDay: 3,
  // The radar says "hot" within this many steps of the next golden step, "warm" within the second.
  goldenHot: 300,
  goldenWarm: 1200,
  streakRewards: { 7: 'star-badge', 14: 'scarf-gold', 30: 'crown' } as Record<number, string>,
};
