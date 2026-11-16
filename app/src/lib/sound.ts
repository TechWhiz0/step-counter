import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Little sounds for micro-interactions, played next to the matching haptic (see lib/feel.ts).
// They mix with music instead of pausing it, stay quiet when the phone is on silent (iOS),
// and can be switched off in Me. Failures are ignored: a missing sound never breaks a tap.

const FILES = {
  tap: require('../../assets/sounds/tap.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  press: require('../../assets/sounds/press.wav'),
  boop: require('../../assets/sounds/boop.wav'),
  chime: require('../../assets/sounds/chime.wav'),
  reward: require('../../assets/sounds/reward.wav'),
  fanfare: require('../../assets/sounds/fanfare.wav'),
  oops: require('../../assets/sounds/oops.wav'),
} as const;

export type SoundName = keyof typeof FILES;

// Quieter for the frequent ones so they stay a texture, louder for rewards.
const VOLUME: Record<SoundName, number> = { tap: 0.45, tick: 0.35, press: 0.5, boop: 0.7, chime: 0.7, reward: 0.75, fanfare: 0.8, oops: 0.55 };

const KEY = 'steppet.sounds';
const players = new Map<SoundName, AudioPlayer>();
const lastPlayed = new Map<SoundName, number>();
let enabled = true;
let setupDone = false;
const listeners = new Set<(on: boolean) => void>();

const prefs =
  Platform.OS === 'web'
    ? { get: async () => globalThis.localStorage?.getItem(KEY) ?? null, set: async (v: string) => globalThis.localStorage?.setItem(KEY, v) }
    : { get: () => SecureStore.getItemAsync(KEY), set: (v: string) => SecureStore.setItemAsync(KEY, v) };

prefs
  .get()
  .then((v) => setEnabled(v !== 'off', false))
  .catch(() => {});

function setup() {
  if (setupDone) return;
  setupDone = true;
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {});
}

function player(name: SoundName): AudioPlayer {
  let p = players.get(name);
  if (!p) {
    p = createAudioPlayer(FILES[name]);
    p.volume = VOLUME[name];
    players.set(name, p);
  }
  return p;
}

export function playSound(name: SoundName) {
  if (!enabled || Platform.OS === 'web') return;
  // The same sound twice within 40 ms (a double-fired handler) plays once.
  const now = Date.now();
  if (now - (lastPlayed.get(name) ?? 0) < 40) return;
  lastPlayed.set(name, now);
  try {
    setup();
    const p = player(name);
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // No audio: stay silent.
  }
}

export function soundsEnabled() {
  return enabled;
}

export function setEnabled(on: boolean, save = true) {
  enabled = on;
  if (save) prefs.set(on ? 'on' : 'off').catch(() => {});
  listeners.forEach((l) => l(on));
}

export function useSoundsEnabled(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(enabled);
  useEffect(() => {
    listeners.add(setOn);
    setOn(enabled);
    return () => {
      listeners.delete(setOn);
    };
  }, []);
  return [on, setEnabled];
}
