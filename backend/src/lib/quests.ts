import { rules } from '../config.js';
import { GoldenDay, QuestClaim, StepDay, Treat, type UserDoc } from '../models/index.js';

export type QuestId = 'morning' | 'goal' | 'golden' | 'treat';

export interface QuestState {
  id: QuestId;
  title: string;
  progress: number;
  target: number;
  done: boolean;
  claimed: boolean;
  reward: number;
}

const MORNING_TARGET = 2000;

// Today's quests and how far along each one is. Everything is derived from stored data.
export async function questsFor(user: UserDoc, day: string): Promise<QuestState[]> {
  const [stepDay, golden, treatsSent, claims] = await Promise.all([
    StepDay.findOne({ userId: user._id, day }).lean(),
    GoldenDay.findOne({ userId: user._id, day }).lean(),
    Treat.countDocuments({ fromUser: user._id, day }),
    QuestClaim.find({ userId: user._id, day }).lean(),
  ]);
  const hourly = stepDay?.hourly ?? [];
  const morning = hourly.slice(0, 12).reduce((s, h) => s + h, 0);
  const claimed = new Set(claims.map((c) => c.quest));
  const make = (id: QuestId, title: string, progress: number, target: number): QuestState => ({
    id,
    title,
    progress: Math.min(progress, target),
    target,
    done: progress >= target,
    claimed: claimed.has(id),
    reward: rules.questReward,
  });
  return [
    make('morning', `Walk ${MORNING_TARGET.toLocaleString('en')} before noon`, morning, MORNING_TARGET),
    make('goal', 'Reach your daily goal', stepDay?.total ?? 0, user.dailyGoal),
    make('golden', 'Find a golden step', golden?.found.length ?? 0, 1),
    make('treat', 'Send a treat to a friend', treatsSent, 1),
  ];
}

// Claims a finished quest once. Returns the updated quest list, or null if it isn't claimable.
export async function claimQuest(user: UserDoc, day: string, id: string) {
  const quest = (await questsFor(user, day)).find((q) => q.id === id);
  if (!quest || !quest.done || quest.claimed) return null;
  try {
    await QuestClaim.create({ userId: user._id, day, quest: id });
  } catch {
    return null; // claimed by a parallel request
  }
  user.treats += quest.reward;
  await user.save();
  return questsFor(user, day);
}
