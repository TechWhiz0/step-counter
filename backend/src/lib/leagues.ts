import type { Types } from 'mongoose';
import { config, rules } from '../config.js';
import { Meta, Pet, StepDay, User, type UserDoc } from '../models/index.js';
import { addDays, dayKey, daysBetween, weekStart } from './dates.js';
import { channels, revision } from './live.js';

const BOARD_SIZE = 30;
// Admin accounts never compete, and hidden walkers are kept off the board.
const competing = (tier: number) => ({ league: tier, hiddenFromLeagues: false, role: { $ne: 'admin' as const } });

// Capped steps per user between two days, highest first. Ties keep a stable order by id.
async function weeklySteps(userIds: Types.ObjectId[], from: string, to: string) {
  const totals = await StepDay.aggregate<{ _id: Types.ObjectId; steps: number }>([
    { $match: { userId: { $in: userIds }, day: { $gte: from, $lte: to } } },
    { $group: { _id: '$userId', steps: { $sum: '$cappedTotal' } } },
  ]);
  const by = new Map(totals.map((t) => [String(t._id), t.steps]));
  return userIds
    .map((id) => ({ id, steps: by.get(String(id)) ?? 0 }))
    .sort((a, b) => b.steps - a.steps || String(a.id).localeCompare(String(b.id)));
}

// This week's league table for the user's tier, with where promotion and dropping start.
export async function leagueBoard(user: UserDoc, today: string) {
  const tier = Math.min(user.league, rules.leagueTiers.length - 1);
  const from = weekStart(today);
  const members = await User.find(competing(tier)).select('username nickname currentStreak').lean();
  const ranked = await weeklySteps(
    members.map((m) => m._id),
    from,
    today,
  );
  const memberBy = new Map(members.map((m) => [String(m._id), m]));
  const myIndex = ranked.findIndex((r) => String(r.id) === String(user._id));
  const shown = ranked.slice(0, BOARD_SIZE).map((r, i) => ({ ...r, rank: i + 1 }));
  if (myIndex >= BOARD_SIZE) shown.push({ ...ranked[myIndex], rank: myIndex + 1 });
  const pets = await Pet.find({ userId: { $in: shown.map((r) => r.id) }, isActive: true }).select('userId species stage').lean();
  const petBy = new Map(pets.map((p) => [String(p.userId), p]));

  const canDrop = tier > 0 && ranked.length >= rules.leagueMinForDrop;
  return {
    tier,
    tierName: rules.leagueTiers[tier],
    tiers: rules.leagueTiers,
    promoteTop: tier < rules.leagueTiers.length - 1 ? rules.leaguePromote : 0,
    dropFrom: canDrop ? ranked.length - rules.leaguePromote + 1 : null,
    daysLeft: Math.max(0, 6 - daysBetween(from, today)),
    total: ranked.length,
    myRank: myIndex >= 0 ? myIndex + 1 : null,
    hourlyCap: rules.hourlyCap,
    rev: revision(channels.league(tier)),
    rows: shown.map((r) => {
      const m = memberBy.get(String(r.id));
      const pet = petBy.get(String(r.id));
      const username = m?.username ?? m?.nickname ?? 'walker';
      return {
        rank: r.rank,
        userId: String(r.id),
        username,
        nickname: username,
        streak: m?.currentStreak ?? 0,
        steps: r.steps,
        isMe: String(r.id) === String(user._id),
        species: pet?.species ?? null,
        stage: pet?.stage ?? null,
      };
    }),
  };
}

// Run on Monday: moves last week's top walkers up a tier and the bottom ones down.
// Remembers the week it handled, so a second run (restart, second server) changes nothing.
export async function rolloverLeagues(now = new Date()) {
  const today = dayKey(now, config.timezone);
  const from = addDays(weekStart(today), -7);
  const to = addDays(from, 6);
  const claim = await Meta.updateOne({ key: 'leagueRollover', value: { $ne: from } }, { $set: { value: from } }, { upsert: false });
  if (!claim.modifiedCount) {
    // First run ever: create the marker. A duplicate key means another run created it first.
    const exists = await Meta.exists({ key: 'leagueRollover' });
    if (exists) return 0;
    try {
      await Meta.create({ key: 'leagueRollover', value: from });
    } catch {
      return 0;
    }
  }
  // Decide every move from last week's tiers first, so nobody moves twice in one run.
  const moves: { ids: Types.ObjectId[]; league: number }[] = [];
  for (let tier = 0; tier < rules.leagueTiers.length; tier++) {
    const members = await User.find(competing(tier)).select('_id').lean();
    const ranked = await weeklySteps(
      members.map((m) => m._id),
      from,
      to,
    );
    const up = tier < rules.leagueTiers.length - 1 ? ranked.slice(0, rules.leaguePromote).filter((r) => r.steps > 0) : [];
    const upIds = new Set(up.map((r) => String(r.id)));
    const down = tier > 0 && ranked.length >= rules.leagueMinForDrop ? ranked.slice(-rules.leaguePromote).filter((r) => !upIds.has(String(r.id))) : [];
    if (up.length) moves.push({ ids: up.map((r) => r.id), league: tier + 1 });
    if (down.length) moves.push({ ids: down.map((r) => r.id), league: tier - 1 });
  }
  for (const m of moves) await User.updateMany({ _id: { $in: m.ids } }, { $set: { league: m.league } });
  return moves.reduce((s, m) => s + m.ids.length, 0);
}
