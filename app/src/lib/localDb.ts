import * as SQLite from 'expo-sqlite';

// Local cache so the app opens instantly and works offline. The server stays the source of truth.
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  dbPromise ??= (async () => {
    const db = await SQLite.openDatabaseAsync('steppet.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS step_days (day TEXT PRIMARY KEY NOT NULL, hourly TEXT NOT NULL, total INTEGER NOT NULL, synced INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    `);
    return db;
  })();
  return dbPromise;
}

export async function saveStepDays(days: { day: string; hourly: number[] }[]) {
  const db = await getDb();
  for (const d of days) {
    const total = d.hourly.reduce((a, b) => a + b, 0);
    await db.runAsync(
      `INSERT INTO step_days (day, hourly, total, synced) VALUES (?, ?, ?, 0)
       ON CONFLICT(day) DO UPDATE SET hourly = excluded.hourly, total = excluded.total,
         synced = CASE WHEN step_days.total = excluded.total THEN step_days.synced ELSE 0 END`,
      d.day,
      JSON.stringify(d.hourly),
      total,
    );
  }
}

export async function markSynced(days: string[]) {
  const db = await getDb();
  for (const day of days) await db.runAsync('UPDATE step_days SET synced = 1 WHERE day = ?', day);
}

export async function getStepDay(day: string) {
  const db = await getDb();
  const row = await db.getFirstAsync<{ hourly: string; total: number }>('SELECT hourly, total FROM step_days WHERE day = ?', day);
  return row ? { hourly: JSON.parse(row.hourly) as number[], total: row.total } : null;
}

// Steps per hour of day, summed over the cached days (up to the last 7).
export async function getHourlySums(days = 7) {
  const db = await getDb();
  const rows = await db.getAllAsync<{ hourly: string }>('SELECT hourly FROM step_days ORDER BY day DESC LIMIT ?', days);
  const sums = Array(24).fill(0) as number[];
  for (const r of rows) (JSON.parse(r.hourly) as number[]).forEach((h, i) => (sums[i] += h));
  return sums;
}

export async function getJson<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return row ? (JSON.parse(row.value) as T) : null;
}

export async function setJson(key: string, value: unknown) {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, JSON.stringify(value));
}

export async function clearLocal() {
  const db = await getDb();
  await db.execAsync('DELETE FROM step_days; DELETE FROM kv;');
}
