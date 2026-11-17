import { rules } from '../config.js';
import { QuestClaim, StepDay, User, type UserDoc } from '../models/index.js';

export type QuestId = 'morning' | 'goal';

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
  const [stepDay, claims] = await Promise.all([
    StepDay.findOne({ userId: user._id, day }).select('hourly total').lean(),
    QuestClaim.find({ userId: user._id, day }).select('quest').lean(),
  ]);
  const morning = (stepDay?.hourly ?? []).slice(0, 12).reduce((s, h) => s + h, 0);
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
  const fresh = await User.findByIdAndUpdate(user._id, { $inc: { treats: quest.reward } }, { returnDocument: 'after' }).select('treats').lean();
  user.set('treats', fresh?.treats ?? user.treats + quest.reward);
  user.unmarkModified('treats');
  return questsFor(user, day);
}
