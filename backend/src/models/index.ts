import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { rules } from '../config.js';

const userSchema = new Schema(
  {
    // Unique handle shown everywhere other walkers can see you. 3-20 of a-z, 0-9, _.
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    nickname: { type: String, required: true, trim: true, maxlength: 24 },
    dailyGoal: { type: Number, default: rules.defaultGoal, min: 1000, max: 50000 },
    timezone: { type: String, default: 'Asia/Kolkata' },
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    // Last day the nightly job closed for this user ('YYYY-MM-DD').
    lastClosedDay: { type: String, default: null },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    // Capped steps ever walked; drives monster and closet unlocks.
    lifetimeSteps: { type: Number, default: 0 },
    // Earned from daily quests.
    treats: { type: Number, default: 0 },
    // Index into rules.leagueTiers; moves up or down each Monday.
    league: { type: Number, default: 0 },
    // Set by the step-anomaly check; an admin clears it or hides the user from leagues.
    flagged: { type: Boolean, default: false },
    flagReason: { type: String, default: null },
    hiddenFromLeagues: { type: Boolean, default: false },
    // Forgot-password: a hashed one-time code, when it stops working, and wrong tries so far.
    resetCodeHash: { type: String, default: null },
    resetExpires: { type: Date, default: null },
    resetTries: { type: Number, default: 0 },
  },
  { timestamps: true },
);
userSchema.index({ league: 1, hiddenFromLeagues: 1, role: 1 });

const stepDaySchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    day: { type: String, required: true },
    hourly: { type: [Number], default: () => Array(24).fill(0) },
    total: { type: Number, default: 0 },
    cappedTotal: { type: Number, default: 0 },
    // Filled in when the day is closed.
    goal: { type: Number, default: null },
    goalMet: { type: Boolean, default: null },
  },
  { timestamps: true },
);
stepDaySchema.index({ userId: 1, day: 1 }, { unique: true });
stepDaySchema.index({ day: 1 });

const traitsSchema = new Schema(
  {
    hue: Number,
    pattern: String,
    markings: Number,
    size: String,
    eyes: String,
    ears: String,
    cheeks: Boolean,
  },
  { _id: false },
);

const petSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 20 },
    species: { type: String, default: 'mochi' },
    seed: { type: Number, required: true },
    // Day the egg was given; growth counts steps from this day on.
    startDay: { type: String, required: true },
    growth: { type: Number, default: 0 },
    stage: { type: String, enum: ['egg', 'baby', 'teen', 'adult'], default: 'egg' },
    // Last stage the owner has seen; differs from stage when an animation is due.
    seenStage: { type: String, default: 'egg' },
    form: { type: String, enum: ['sunrise', 'daytime', 'moonlight', 'balanced', null], default: null },
    traits: { type: traitsSchema, default: null },
    mood: { type: String, enum: ['happy', 'sleepy', 'neutral'], default: 'neutral' },
    // 5-100, from the last week of walks (see energyFor). Low energy means the pet needs walks to recover.
    energy: { type: Number, default: 70 },
    equipped: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    // Only the very first pet starts as an egg. Later pets arrive already hatched (a baby).
    hatchFree: { type: Boolean, default: false },
    hatchedAt: Date,
    adultAt: Date,
  },
  { timestamps: true },
);
petSchema.index({ userId: 1, isActive: 1 });

const itemSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    item: { type: String, required: true },
    source: { type: String, enum: ['golden', 'streak', 'treat', 'milestone'], required: true },
    day: { type: String, required: true },
  },
  { timestamps: true },
);
// A streak or milestone reward can only be granted once per day, even when two syncs race.
itemSchema.index({ userId: 1, item: 1, source: 1, day: 1 }, { unique: true, partialFilterExpression: { source: { $in: ['streak', 'milestone'] } } });

// Admin overrides for the shipped monster catalog (lib/species.ts).
const monsterSettingSchema = new Schema(
  {
    species: { type: String, required: true, unique: true },
    unlockSteps: { type: Number, default: null },
    enabled: { type: Boolean, default: null },
  },
  { timestamps: true },
);

// One signed-in device. A token is only good while its session exists, so signing out really ends it.
const sessionSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  device: { type: String, default: null },
  createdAt: { type: Date, default: () => new Date() },
  lastSeenAt: { type: Date, default: () => new Date() },
});

// Small server-wide bookkeeping, e.g. which week the leagues last rolled over.
const metaSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, default: null },
});

// One row per claimed daily quest, so a reward can't be claimed twice.
const questClaimSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    day: { type: String, required: true },
    quest: { type: String, required: true },
  },
  { timestamps: true },
);
questClaimSchema.index({ userId: 1, day: 1, quest: 1 }, { unique: true });

export const User = model('User', userSchema);
export const StepDay = model('StepDay', stepDaySchema);
export const Pet = model('Pet', petSchema);
export const Item = model('Item', itemSchema);
export const MonsterSetting = model('MonsterSetting', monsterSettingSchema);
export const QuestClaim = model('QuestClaim', questClaimSchema);
export const Session = model('Session', sessionSchema);
export const Meta = model('Meta', metaSchema);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export type PetDoc = HydratedDocument<InferSchemaType<typeof petSchema>>;
