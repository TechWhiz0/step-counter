import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { DayPhase } from '@/lib/petState';
import { Icon } from './icons';

// The pet hero card's colours follow the time of day: pale gold morning, peach afternoon, coral evening, navy night.
// Shared by Home and a friend's page so both feel like the same world.
export type HeroColors = { bg: string; ledge: string; blob: string; text: string; name: string; pill: string; pillText: string; track: string };

export const HERO: Record<DayPhase, HeroColors> = {
  morning: { bg: '#FFF3CC', ledge: '#FFE08A', blob: '#FFE7A3', text: '#6B4A00', name: '#1D2433', pill: '#FFFFFF', pillText: '#1D2433', track: '#FFFFFFAA' },
  afternoon: { bg: '#FFE9D9', ledge: '#FFD3B5', blob: '#FFD9BE', text: '#6B3A1A', name: '#1D2433', pill: '#FFFFFF', pillText: '#1D2433', track: '#FFFFFFAA' },
  evening: { bg: '#FFE0D6', ledge: '#FFC2B0', blob: '#FFCDBE', text: '#7A2E1F', name: '#1D2433', pill: '#FFFFFF', pillText: '#1D2433', track: '#FFFFFFAA' },
  night: { bg: '#22305A', ledge: '#141E3D', blob: '#2C3B6B', text: '#C9D4FF', name: '#FFFFFF', pill: '#141E3D', pillText: '#E3E9FF', track: '#FFFFFF26' },
};

export const PHASE_LABEL: Record<DayPhase, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Asleep' };

const STARS: [number, number, number][] = [[18, 14, 2], [46, 30, 1.5], [70, 10, 2], [120, 22, 1.5], [150, 8, 2.2], [178, 34, 1.4], [96, 44, 1.2]];

// Background shapes inside a hero card: a soft hill blob, plus stars and a moon at night.
// `blob` places the hill: bottom-right on Home, centred under the pet on a friend's page.
export function HeroDecor({ phase, blob = 'right' }: { phase: DayPhase; blob?: 'right' | 'center' }) {
  const hero = HERO[phase];
  return (
    <>
      <View
        pointerEvents="none"
        style={[
          { position: 'absolute', height: 120, borderRadius: 100, backgroundColor: hero.blob },
          blob === 'right' ? { right: -30, bottom: -40, width: 200 } : { left: '10%', right: '10%', bottom: -60 },
        ]}
      />
      {phase === 'night' && (
        <Svg pointerEvents="none" width={200} height={50} style={{ position: 'absolute', top: 6, left: 12 }}>
          {STARS.map(([x, y, r]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#FFFFFF" opacity={0.7} />
          ))}
        </Svg>
      )}
      {phase === 'night' && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 12, right: 16 }}>
          <Icon.moon size={26} />
        </View>
      )}
    </>
  );
}
