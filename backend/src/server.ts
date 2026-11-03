import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb } from './db.js';
import { runDayClose, scheduleDayClose } from './jobs/dayClose.js';

await connectDb(config.mongoUrl);
scheduleDayClose();
void runDayClose();
createApp().listen(config.port, () => console.log(`Step Pet API on http://localhost:${config.port}`));
