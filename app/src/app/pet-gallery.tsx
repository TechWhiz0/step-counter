import { Redirect } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { PetArt, type PetLook } from '@/components/PetView';
import { Text, useColors } from '@/components/ui';
import type { Traits } from '@/lib/types';

// Dev-only gallery of pet looks, for checking the renderer without walking. Not reachable in release builds.
const looks: (PetLook & { label: string })[] = [
  { label: 'Egg, 60%', stage: 'egg', form: null, traits: null, mood: 'neutral', equipped: [], stageProgress: 0.9 },
  ...([
    ['Baby · happy', 'baby', null, 'happy', { hue: 20, pattern: 'spots', markings: 1, size: 'medium', eyes: 'round', ears: 'none', cheeks: true }, []],
    ['Teen · sleepy', 'teen', null, 'sleepy', { hue: 200, pattern: 'stripes', markings: 3, size: 'small', eyes: 'oval', ears: 'cat', cheeks: false }, []],
    ['Sunrise', 'adult', 'sunrise', 'happy', { hue: 35, pattern: 'stars', markings: 4, size: 'large', eyes: 'sparkle', ears: 'bunny', cheeks: true }, ['cap']],
    ['Daytime', 'adult', 'daytime', 'neutral', { hue: 110, pattern: 'hearts', markings: 3, size: 'medium', eyes: 'dot', ears: 'antenna', cheeks: true }, ['glasses']],
    ['Moonlight', 'adult', 'moonlight', 'happy', { hue: 260, pattern: 'stars', markings: 6, size: 'medium', eyes: 'sparkle', ears: 'cat', cheeks: false }, ['crown', 'scarf-gold']],
    ['Balanced', 'adult', 'balanced', 'sleepy', { hue: 320, pattern: 'spots', markings: 5, size: 'large', eyes: 'round', ears: 'none', cheeks: true }, ['headphones', 'star-badge']],
    ['Adult + balloon', 'adult', 'sunrise', 'neutral', { hue: 170, pattern: 'stripes', markings: 2, size: 'small', eyes: 'oval', ears: 'bunny', cheeks: true }, ['bow', 'balloon', 'scarf']],
    ['Adult + flower', 'adult', 'moonlight', 'neutral', { hue: 5, pattern: 'hearts', markings: 4, size: 'large', eyes: 'round', ears: 'antenna', cheeks: false }, ['flower', 'leaf']],
  ] as const).map(([label, stage, form, mood, traits, equipped]) => ({
    label,
    stage,
    form,
    mood,
    traits: traits as Traits,
    equipped: [...equipped],
  })),
  // Monster faces: every mood, plus asleep (night) and weak (low energy); Pip has the one-eyed face.
  ...(['happy', 'neutral', 'sleepy', 'asleep', 'weak'] as const).flatMap((mood) =>
    (['mochi', 'pip'] as const).map((species) => ({
      label: `${species} · ${mood}`,
      species,
      stage: 'adult' as const,
      form: null,
      traits: null,
      mood,
      equipped: [],
    })),
  ),
];

export default function PetGallery() {
  const colors = useColors();
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 }}>
      {looks.map((l) => (
        <View key={l.label} style={{ alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 8 }}>
          <PetArt look={l} size={160} />
          <Text style={{ color: colors.ink, fontWeight: '700' }}>{l.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
