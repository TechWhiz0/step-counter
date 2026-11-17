import { Pedometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { dayKey, emptyHours } from './dates';

// Live step counting while the app is open. Health Connect / HealthKit only see steps after the phone
// writes them (often minutes later), so the phone's own step sensor fills the gap: every new step is
// added to the hour it happened in. Sync then sends max(health store, health store at start + live),
// which can never count a step twice and is replaced by the health store once it catches up.

interface LiveDay {
  day: string;
  hourly: number[];
}

let live: LiveDay = { day: dayKey(new Date()), hourly: emptyHours() };
let sub: { remove: () => void } | null = null;
let last = 0;
let wanted = false;
const listeners = new Set<() => void>();

function add(steps: number) {
  const now = new Date();
  const day = dayKey(now);
  if (day !== live.day) live = { day, hourly: emptyHours() };
  live.hourly[now.getHours()] += steps;
  listeners.forEach((l) => l());
}

async function start() {
  if (sub) return;
  try {
    if (!(await Pedometer.isAvailableAsync())) return;
    const perm = await Pedometer.getPermissionsAsync();
    if (!perm.granted && !(perm.canAskAgain && (await Pedometer.requestPermissionsAsync()).granted)) return;
    if (!wanted || sub) return;
    last = 0;
    sub = Pedometer.watchStepCount(({ steps }) => {
      const delta = steps - last;
      last = steps;
      if (delta > 0 && delta < 1000) add(delta);
    });
  } catch {
    // No sensor or no permission: the health store alone still works.
  }
}

function stop() {
  sub?.remove();
  sub = null;
}

// Counts while the app is in the foreground and a walker is signed in.
export function setLiveCounting(on: boolean) {
  wanted = on;
  if (on && AppState.currentState === 'active') void start();
  if (!on) {
    stop();
    live = { day: dayKey(new Date()), hourly: emptyHours() };
  }
}

AppState.addEventListener('change', (s) => {
  if (!wanted) return;
  if (s === 'active') void start();
  else stop();
});

// Steps seen by the sensor today, per hour, since counting started.
export function liveHours(day: string): number[] | null {
  return live.day === day && live.hourly.some((h) => h > 0) ? [...live.hourly] : null;
}

// Re-renders on every live step. Returns today's live total (0 when not counting).
export function useLiveSteps(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const l = () => setN(live.day === dayKey(new Date()) ? live.hourly.reduce((a, b) => a + b, 0) : 0);
    listeners.add(l);
    l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return n;
}
