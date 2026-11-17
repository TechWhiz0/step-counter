import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb } from './db.js';
import { runDayClose, scheduleDayClose } from './jobs/dayClose.js';
import { backfillUsernames } from './lib/username.js';

await connectDb(config.mongoUrl);
const filled = await backfillUsernames();
if (filled) console.log(`Gave ${filled} older accounts a username`);
scheduleDayClose();
void runDayClose().catch((e) => console.error('day close failed', e));
const server = createApp().listen(config.port, () => console.log(`Step Pet API on http://localhost:${config.port}`));
// Long-polls hold a request for up to 25 s; keep idle connections open a little longer than that.
server.keepAliveTimeout = 30_000;
server.headersTimeout = 31_000;
