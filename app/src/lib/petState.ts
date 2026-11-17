import { useEffect, useState } from 'react';
import type { FaceMood, Pet } from './types';

// The pet keeps the same day as you: it wakes up in the morning, slows down after lunch,
// winds down in the evening and sleeps at night. Energy comes from the server (last week of walks).

export type DayPhase = 'morning' | 'afternoon' | 'evening' | 'night';

export function dayPhase(d = new Date()): DayPhase {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

// Re-renders when the phase changes, checking once a minute.
export function useDayPhase(): DayPhase {
  const [phase, setPhase] = useState(dayPhase);
  useEffect(() => {
    const id = setInterval(() => setPhase(dayPhase()), 60_000);
    return () => clearInterval(id);
  }, []);
  return phase;
}

export type EnergyLevel = 'full' | 'okay' | 'tired' | 'weak';

export function energyLevel(energy: number | undefined): EnergyLevel {
  const e = energy ?? 70;
  if (e >= 70) return 'full';
  if (e >= 45) return 'okay';
  if (e >= 20) return 'tired';
  return 'weak';
}

export const ENERGY_LABEL: Record<EnergyLevel, string> = {
  full: 'Full of energy',
  okay: 'Doing fine',
  tired: 'Getting tired',
  weak: 'Needs energy!',
};

// What the face shows right now. Sleeping at night wins; then low energy; then the server mood.
export function faceFor(pet: Pet, phase: DayPhase): FaceMood {
  if (pet.stage === 'egg') return pet.mood;
  if (phase === 'night') return 'asleep';
  const level = energyLevel(pet.energy);
  if (level === 'weak') return 'weak';
  if (level === 'tired') return 'sleepy';
  return pet.mood;
}

// The pet as it should be drawn right now.
export function lookNow<T extends Pet>(pet: T, phase: DayPhase): Omit<T, 'mood'> & { mood: FaceMood } {
  return { ...pet, mood: faceFor(pet, phase) };
}

// One short phrase for the Home hero. The step ring already shows steps left, so this stays brief.
export function statusLine(pet: Pet, phase: DayPhase, stepsLeft: number): string {
  const level = energyLevel(pet.energy);
  if (pet.stage === 'egg') return phase === 'night' ? 'Resting till morning.' : 'Wiggling inside!';
  if (phase === 'night') return level === 'weak' ? 'Asleep, worn out.' : 'Fast asleep. Zzz…';
  if (level === 'weak') return 'Feeling weak. Walk me!';
  if (level === 'tired') return 'Getting tired. Walk soon?';
  if (!stepsLeft) return 'Today is perfect!';
  if (phase === 'morning') return 'Up and stretching!';
  if (phase === 'afternoon') return pet.mood === 'happy' ? 'Bouncing with joy!' : 'Lazy afternoon.';
  return 'Winding down.';
}

// What the pet says when tapped, given the time and its energy. Falls back to the normal replies.
export function phaseReply(pet: Pet, phase: DayPhase, taps: number): string | null {
  if (pet.stage === 'egg') return null;
  const level = energyLevel(pet.energy);
  const pick = (list: string[]) => list[(taps - 1) % list.length];
  if (phase === 'night') return pick(['Zzz…', '*snore* …five more minutes…', 'Mmm… dreaming of walks…', 'Zzz… oh, hi… zzz']);
  if (level === 'weak') return pick(['I feel so weak…', 'Could we go for a walk?', 'A few steps would really help.', 'I miss our walks…']);
  if (level === 'tired') return pick(['*yawn* A walk would wake me up.', "I'm a bit sleepy today.", 'Let’s stretch our legs?']);
  if (phase === 'morning' && taps === 1) return 'Good morning! Ready to walk?';
  if (phase === 'evening' && taps === 1) return 'One more evening stroll?';
  return null;
}
