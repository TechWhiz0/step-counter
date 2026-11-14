import type { Pet, Stage } from '@/lib/types';

// Growth-step thresholds for each stage (mirrors backend rules.stageThresholds).
export const STAGE_AT: Record<Stage, number> = { egg: 0, baby: 5000, teen: 55000, adult: 205000 };
const ORDER: Stage[] = ['egg', 'baby', 'teen', 'adult'];

const CHAPTER_NAME: Record<Stage, string> = { egg: 'Egg days', baby: 'Baby steps', teen: 'Teen weeks', adult: 'All grown up' };

// A friendly level from growth steps, shown on the home hero ("Teen · Lv 7").
export function petLevel(pet: Pet) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, pet.growth) / 1500)) + 1);
}

export type NodeKind = 'start' | 'steps' | 'chest' | 'final';
export interface PathNode {
  kind: NodeKind;
  at: number; // growth steps needed
  state: 'done' | 'current' | 'locked';
  label: string;
}

const round = (n: number) => (n >= 10_000 ? Math.round(n / 5000) * 5000 : Math.round(n / 500) * 500);

// The current chapter: from this stage's start to the next stage, split into six stops.
export function chapterFor(pet: Pet) {
  const i = ORDER.indexOf(pet.stage);
  const next = pet.nextStage;
  const from = STAGE_AT[pet.stage];
  const to = next ? STAGE_AT[next] : from;
  const span = to - from;
  const kinds: NodeKind[] = ['start', 'steps', 'steps', 'chest', 'steps', 'final'];
  const fractions = [0, 0.2, 0.4, 0.6, 0.8, 1];
  let currentSet = false;
  const nodes: PathNode[] = kinds.map((kind, k) => {
    const at = k === 0 ? from : k === 5 ? to : from + round(span * fractions[k]);
    const done = !next || pet.growth >= at;
    let state: PathNode['state'] = done ? 'done' : 'locked';
    if (!done && !currentSet) {
      state = 'current';
      currentSet = true;
    }
    const label =
      kind === 'start'
        ? pet.stage === 'egg'
          ? 'Egg found'
          : pet.stage === 'baby'
            ? 'Hatched'
            : `${CHAPTER_NAME[pet.stage]} begin`
        : kind === 'chest'
          ? 'Treasure chest'
          : kind === 'final'
            ? next === 'baby'
              ? 'Hatching'
              : `${next ?? 'adult'} form`
            : `${at.toLocaleString('en')} steps`;
    return { kind, at, state, label };
  });
  const current = nodes.find((n) => n.state === 'current') ?? null;
  // Progress toward the current stop, from the stop before it.
  const prev = current ? nodes[nodes.indexOf(current) - 1] : null;
  const legProgress = current && prev ? (pet.growth - prev.at) / Math.max(1, current.at - prev.at) : 1;
  const goal = next === 'baby' ? 'Hatch' : next === 'teen' ? `Grow ${pet.name} into a teen` : next === 'adult' ? `Grow ${pet.name} into an adult` : `${pet.name} is fully grown`;
  return {
    chapter: i + 1,
    chapterName: CHAPTER_NAME[pet.stage],
    title: next === 'baby' ? `Hatch ${pet.name}'s egg` : goal,
    nodes,
    current,
    legProgress: Math.max(0, Math.min(1, legProgress)),
    left: current ? Math.max(0, current.at - pet.growth) : 0,
  };
}
