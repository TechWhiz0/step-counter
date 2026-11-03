import type { Form, Pet, Stage } from './types';

export const STAGE_LABEL: Record<Stage, string> = { egg: 'Egg', baby: 'Baby', teen: 'Teen', adult: 'Adult' };

export const FORM_LABEL: Record<Form, { name: string; line: string }> = {
  sunrise: { name: 'Sunrise form', line: 'Grown from morning walks' },
  daytime: { name: 'Daytime form', line: 'Grown from walks during the day' },
  moonlight: { name: 'Moonlight form', line: 'Grown from evening walks' },
  balanced: { name: 'Balanced form', line: 'Grown from walks at all hours' },
};

export function moodLine(pet: Pet) {
  if (pet.stage === 'egg') return `${pet.name} is wiggling inside the egg.`;
  if (pet.mood === 'happy') return `${pet.name} is bouncing with joy!`;
  if (pet.mood === 'sleepy') return `${pet.name} is sleepy. A walk will wake them up.`;
  return `${pet.name} is waiting for a walk.`;
}

export function growthMessage(pet: Pet) {
  if (pet.stage === 'baby' && pet.seenStage === 'egg') return { title: 'Your egg hatched!', body: `Say hello to ${pet.name}. Nobody else has a pet that looks like this one.` };
  if (pet.stage === 'teen') return { title: `${pet.name} grew up a bit!`, body: 'Teen now. Keep walking to see what they become.' };
  if (pet.stage === 'adult' && pet.form) {
    const f = FORM_LABEL[pet.form];
    return { title: `${pet.name} evolved!`, body: `${f.name}. ${f.line}.` };
  }
  return { title: `${pet.name} grew!`, body: 'Keep walking.' };
}
