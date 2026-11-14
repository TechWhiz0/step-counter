import cron from 'node-cron';
import { config } from '../config.js';
import { closeDays, todayFor } from '../lib/game.js';
import { rolloverLeagues } from '../lib/leagues.js';
import { User } from '../models/index.js';

// Closes yesterday for every user: goal result, streak, mood, growth, streak rewards.
// Sync also closes days on demand, so a missed run is caught up later.
export async function runDayClose(now = new Date()) {
  let closed = 0;
  for await (const user of User.find().cursor()) {
    try {
      await closeDays(user, todayFor(user, now));
      closed++;
    } catch (e) {
      console.error(`day close failed for ${user._id}`, e);
    }
  }
  return closed;
}

export function scheduleDayClose() {
  cron.schedule('20 0 * * 1', () => void rolloverLeagues().catch((e) => console.error('league rollover failed', e)), {
    timezone: config.timezone,
  });
  return cron.schedule('5 0 * * *', () => void runDayClose(), { timezone: config.timezone });
}

