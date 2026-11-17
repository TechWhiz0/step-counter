import { EventEmitter } from 'node:events';
import { rules } from '../config.js';

// Long-poll change feed. A channel (one user, one league tier) has a revision that goes up whenever
// something in it changes. A client sends the revision it last saw; the server answers right away if
// there is something newer, otherwise it holds the request until a change or a timeout.
// Revisions start at boot time, so a revision from before a restart always looks old and is answered at once.
const BOOT = Date.now();
const revs = new Map<string, number>();
const bus = new EventEmitter();
bus.setMaxListeners(0);

export const channels = {
  user: (id: unknown) => `user:${String(id)}`,
  league: (tier: number) => `league:${Math.min(Math.max(tier, 0), rules.leagueTiers.length - 1)}`,
};

export function revision(channel: string): number {
  return revs.get(channel) ?? BOOT;
}

export function bump(...list: string[]) {
  for (const channel of list) {
    const next = Math.max(revision(channel) + 1, Date.now());
    revs.set(channel, next);
    bus.emit(channel, next);
  }
}

// Resolves with the channel's revision once it differs from `seen`, or after `ms`.
export function waitForChange(channel: string, seen: number, ms: number, signal?: AbortSignal): Promise<number> {
  const now = revision(channel);
  if (now !== seen) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      bus.off(channel, onChange);
      signal?.removeEventListener('abort', done);
      resolve(revision(channel));
    };
    const onChange = () => done();
    const timer = setTimeout(done, ms);
    bus.on(channel, onChange);
    signal?.addEventListener('abort', done);
  });
}

// Reads ?wait=<revision> from a request. Returns null when the client isn't long-polling.
export function waitParam(value: unknown): number | null {
  if (value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export const LONG_POLL_MS = 25_000;
