import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { rules } from '../config.js';

const userSchema = new Schema(
  {
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
  },
  { timestamps: true },
);

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
    treatsReceived: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    hatchedAt: Date,
    adultAt: Date,
  },
  { timestamps: true },
);

const itemSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    item: { type: String, required: true },
    source: { type: String, enum: ['golden', 'streak', 'treat', 'milestone'], required: true },
    day: { type: String, required: true },
  },
  { timestamps: true },
);

const goldenDaySchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true },
  day: { type: String, required: true },
  targets: [Number],
  found: { type: [Number], default: [] },
});
goldenDaySchema.index({ userId: 1, day: 1 }, { unique: true });

const groupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    code: { type: String, required: true, unique: true },
    createdBy: { type: Types.ObjectId, ref: 'User', required: true },
    members: { type: [{ type: Types.ObjectId, ref: 'User' }], index: true },
  },
  { timestamps: true },
);

const treatSchema = new Schema(
  {
    fromUser: { type: Types.ObjectId, ref: 'User', required: true },
    toPet: { type: Types.ObjectId, ref: 'Pet', required: true },
    day: { type: String, required: true },
  },
  { timestamps: true },
);
treatSchema.index({ fromUser: 1, toPet: 1, day: 1 }, { unique: true });

// Admin overrides for the shipped monster catalog (lib/species.ts).
const monsterSettingSchema = new Schema(
  {
    species: { type: String, required: true, unique: true },
    unlockSteps: { type: Number, default: null },
    enabled: { type: Boolean, default: null },
  },
  { timestamps: true },
);

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
export const GoldenDay = model('GoldenDay', goldenDaySchema);
export const Group = model('Group', groupSchema);
export const Treat = model('Treat', treatSchema);
export const MonsterSetting = model('MonsterSetting', monsterSettingSchema);
export const QuestClaim = model('QuestClaim', questClaimSchema);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export type PetDoc = HydratedDocument<InferSchemaType<typeof petSchema>>;
