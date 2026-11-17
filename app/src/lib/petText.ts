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

const EGG_REPLIES = ['*wiggle wiggle*', 'Something tapped back!', 'Warm and cosy in here.', 'Almost ready… keep walking!'];
const HAPPY_REPLIES = ['Hehe, that tickles!', 'Best walk buddy ever!', 'Again! Again!', 'I feel so bouncy today!', 'Let’s go somewhere new!'];
const SLEEPY_REPLIES = ['Five more minutes…', '*yawn* Is it walk time?', 'A little walk would wake me up.', 'Zzz… oh, hi!'];
const NEUTRAL_REPLIES = ['Hi! Ready for a walk?', 'I like it when you visit.', 'What’s out there today?', 'Every step makes me stronger!'];

// What the pet says when tapped. Cycles so repeated taps feel alive.
export function petReply(pet: Pet, taps: number) {
  const list = pet.stage === 'egg' ? EGG_REPLIES : pet.mood === 'happy' ? HAPPY_REPLIES : pet.mood === 'sleepy' ? SLEEPY_REPLIES : NEUTRAL_REPLIES;
  if (taps > 0 && taps % 10 === 0) return `That’s ${taps} pats! ${pet.name} loves you.`;
  return list[(taps - 1) % list.length];
}

export function growthMessage(pet: Pet) {
  if (pet.stage === 'baby' && pet.seenStage === 'egg') return { title: 'Your egg hatched!', body: `Say hello to ${pet.name}.` };
  if (pet.stage === 'teen') return { title: `${pet.name} grew up a bit!`, body: 'Teen now. Keep walking to see what they become.' };
  if (pet.stage === 'adult' && pet.form) {
    const f = FORM_LABEL[pet.form];
    return { title: `${pet.name} evolved!`, body: `${f.name}. ${f.line}.` };
  }
  return { title: `${pet.name} grew!`, body: 'Keep walking.' };
}
