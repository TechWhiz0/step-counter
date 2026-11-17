import { User } from '../models/index.js';

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
// Names nobody can take, so they can't pose as the app or its staff.
const RESERVED = new Set(['admin', 'administrator', 'steppet', 'step_pet', 'support', 'help', 'root', 'system', 'moderator', 'staff', 'me', 'you']);

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase();
}

export function usernameProblem(username: string): string | null {
  if (username.length < 3) return 'At least 3 characters';
  if (username.length > 20) return 'At most 20 characters';
  if (!USERNAME_RE.test(username)) return 'Only letters, numbers and _';
  if (RESERVED.has(username)) return 'That name is reserved';
  return null;
}

export async function isUsernameFree(username: string): Promise<boolean> {
  return !(await User.exists({ username }));
}

// A few free names close to what was asked for.
export async function suggestUsernames(base: string, count = 2): Promise<string[]> {
  const stem = (base.replace(/[^a-z0-9_]/g, '') || 'walker').slice(0, 15).padEnd(3, '_');
  const tries = [`${stem}_walks`, `${stem}${new Date().getFullYear() % 100}`, ...Array.from({ length: 6 }, () => `${stem}${Math.floor(Math.random() * 900 + 100)}`)];
  const taken = new Set((await User.find({ username: { $in: tries } }).select('username').lean()).map((u) => u.username));
  return tries.filter((t) => USERNAME_RE.test(t) && !taken.has(t) && !RESERVED.has(t)).slice(0, count);
}

// Accounts made before usernames existed get one from their nickname or email, made unique with a number.
export async function backfillUsernames() {
  let filled = 0;
  for await (const user of User.find({ $or: [{ username: null }, { username: { $exists: false } }] }).cursor()) {
    const base = (user.nickname || user.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16).padEnd(3, '_');
    let candidate = RESERVED.has(base) ? `${base}_1` : base;
    for (let n = 1; !(await isUsernameFree(candidate)); n++) candidate = `${base.slice(0, 16)}${n}`;
    user.username = candidate;
    await user.save();
    filled++;
  }
  return filled;
}
