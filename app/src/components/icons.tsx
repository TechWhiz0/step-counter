import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import type { LeagueTier } from '@/lib/types';

// Icons from the Quest Meadow design, drawn in a 24 box.
// Line icons take a colour; filled "sticker" icons carry their own colours.

type LineProps = { size?: number; color?: string; width?: number };

function Line({ size = 22, color = '#1D2433', width = 2.4, children }: LineProps & { children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export const Icon = {
  // Tab bar
  paw: ({ size = 22, color = '#1D2433' }: LineProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx={12} cy={15} r={5} />
      <Circle cx={5.5} cy={8} r={2} />
      <Circle cx={18.5} cy={8} r={2} />
      <Circle cx={9.5} cy={4} r={1.6} />
      <Circle cx={14.5} cy={4} r={1.6} />
    </Svg>
  ),
  path: (p: LineProps) => (
    <Line {...p}>
      <Path d="M6 20c0-4 12-4 12-8s-12-4-12-8" />
      <Circle cx={6} cy={20} r={2} />
      <Circle cx={18} cy={12} r={2} />
      <Circle cx={6} cy={4} r={2} />
    </Line>
  ),
  shield: (p: LineProps) => (
    <Line {...p}>
      <Path d="M12 2l8 3.5v6c0 5.5-3.5 9-8 10.5-4.5-1.5-8-5-8-10.5v-6z" />
    </Line>
  ),
  bag: (p: LineProps) => (
    <Line {...p}>
      <Path d="M5 8h14l-1 12H6z" />
      <Path d="M9 8a3 3 0 0 1 6 0" />
    </Line>
  ),
  person: (p: LineProps) => (
    <Line {...p}>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7" />
    </Line>
  ),
  // General
  bell: (p: LineProps) => (
    <Line {...p}>
      <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
      <Path d="M10 20a2 2 0 0 0 4 0" />
    </Line>
  ),
  check: (p: LineProps) => (
    <Line width={3} {...p}>
      <Path d="M5 12l5 5 9-10" />
    </Line>
  ),
  chevronRight: (p: LineProps) => (
    <Line {...p}>
      <Path d="M9 5l7 7-7 7" />
    </Line>
  ),
  chevronLeft: (p: LineProps) => (
    <Line {...p}>
      <Path d="M15 5l-7 7 7 7" />
    </Line>
  ),
  lock: (p: LineProps) => (
    <Line {...p}>
      <Rect x={5} y={11} width={14} height={10} rx={3} />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Line>
  ),
  flag: (p: LineProps) => (
    <Line {...p}>
      <Path d="M4 21V4h12l-2 4 2 4H4" />
    </Line>
  ),
  grid: (p: LineProps) => (
    <Line {...p}>
      <Rect x={3} y={3} width={7} height={9} rx={2} />
      <Rect x={14} y={3} width={7} height={5} rx={2} />
      <Rect x={14} y={12} width={7} height={9} rx={2} />
      <Rect x={3} y={16} width={7} height={5} rx={2} />
    </Line>
  ),
  users: (p: LineProps) => (
    <Line {...p}>
      <Circle cx={9} cy={8} r={3.5} />
      <Path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
      <Circle cx={17} cy={9} r={2.5} />
    </Line>
  ),
  egg: (p: LineProps) => (
    <Line {...p}>
      <Path d="M12 3c4 0 7 6 7 10 0 5-3 8-7 8s-7-3-7-8c0-4 3-10 7-10z" />
    </Line>
  ),
  warning: (p: LineProps) => (
    <Line {...p}>
      <Path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </Line>
  ),
  calendar: (p: LineProps) => (
    <Line {...p}>
      <Rect x={3} y={5} width={18} height={16} rx={3} />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </Line>
  ),
  logout: (p: LineProps) => (
    <Line {...p}>
      <Path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <Path d="M10 16l-4-4 4-4M6 12h10" />
    </Line>
  ),
  plus: (p: LineProps) => (
    <Line {...p}>
      <Path d="M12 5v14M5 12h14" />
    </Line>
  ),
  search: (p: LineProps) => (
    <Line {...p}>
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20l-4-4" />
    </Line>
  ),
  sun: (p: LineProps) => (
    <Line {...p}>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </Line>
  ),
  book: (p: LineProps) => (
    <Line {...p}>
      <Path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z" />
    </Line>
  ),
  // Stickers (own colours)
  flame: ({ size = 18, inner = false }: { size?: number; inner?: boolean }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-8z" fill="#FF8A2B" />
      {inner && <Path d="M12 12c.5 2 3 3 3 5.5a3 3 0 0 1-6 0c0-1.5 1-2.5 1.5-3.5.5 1 1 1.5 1.5 1.5z" fill="#FFC233" />}
    </Svg>
  ),
  feet: ({ size = 18, color = '#3D9BF5' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8 3c1.5 0 2.5 1.5 2.5 3.5S9.5 10 8 10 5.5 8.5 5.5 6.5 6.5 3 8 3zm8 6c1.5 0 2.5 1.5 2.5 3.5S17.5 16 16 16s-2.5-1.5-2.5-3.5S14.5 9 16 9z"
        fill={color}
      />
    </Svg>
  ),
  berry: ({ size = 18 }: { size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={14} r={7} fill="#FF5C8A" />
      <Path d="M12 7c0-3 3-4 5-4-1 2-2 4-5 4z" fill="#138A47" />
    </Svg>
  ),
  bolt: ({ size = 18, color = '#FFC233' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13 2L4 14h7l-1 8 9-12h-7z" fill={color} />
    </Svg>
  ),
  moon: ({ size = 18, color = '#FFE08A' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15 3a8 8 0 1 0 6 13A9 9 0 0 1 15 3z" fill={color} />
    </Svg>
  ),
  eggSticker: ({ size = 18 }: { size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2c4 0 7 6 7 10 0 5-3 9-7 9s-7-4-7-9c0-4 3-10 7-10z" fill="#FFFDF7" stroke="#C9A26B" strokeWidth={1.5} />
      <Circle cx={10} cy={9} r={1.4} fill="#A98BFF" />
      <Circle cx={14} cy={13} r={1.6} fill="#FF9EC0" />
    </Svg>
  ),
};

// League shields: sprout, bloom, sunflower, starfruit.
export function LeagueBadge({ tier, size = 44 }: { tier: LeagueTier; size?: number }) {
  const shield = 'M22 2l18 8v14c0 12-8 19-18 22C12 43 4 36 4 24V10z';
  const h = (size * 48) / 44;
  return (
    <Svg width={size} height={h} viewBox="0 0 44 48">
      {tier === 'sprout' && (
        <>
          <Path d={shield} fill="#8BD9A0" />
          <Path d="M22 34V18M22 22q-6-6-10-2 4 6 10 2zM22 20q6-6 10-2-4 6-10 2z" stroke="#1F7A3D" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </>
      )}
      {tier === 'bloom' && (
        <>
          <Path d={shield} fill="#FFB3C7" />
          <Circle cx={22} cy={24} r={5} fill="#D93A68" />
          <Circle cx={22} cy={16} r={4} fill="#FF5C8A" />
          <Circle cx={22} cy={32} r={4} fill="#FF5C8A" />
          <Circle cx={14} cy={24} r={4} fill="#FF5C8A" />
          <Circle cx={30} cy={24} r={4} fill="#FF5C8A" />
        </>
      )}
      {tier === 'sunflower' && (
        <>
          <Path d={shield} fill="#FFE08A" />
          <Circle cx={22} cy={24} r={7} fill="#E0A000" />
          <Path d="M22 10v4M22 34v4M10 24h-2M36 24h-2M13 15l2 2M31 15l-2 2M13 33l2-2M31 33l-2-2" stroke="#E0A000" strokeWidth={2.5} strokeLinecap="round" />
        </>
      )}
      {tier === 'starfruit' && (
        <>
          <Path d={shield} fill="#C9B5FF" />
          <Path d="M22 13l3.2 6.6 7.2 1-5.2 5 1.3 7.2L22 29.4l-6.5 3.4 1.3-7.2-5.2-5 7.2-1z" fill="#6B3FD6" />
        </>
      )}
    </Svg>
  );
}

export const leagueName = (tier: LeagueTier) => tier.charAt(0).toUpperCase() + tier.slice(1);

// Closet item stickers. Falls back to a gift box for items without art.
export function ItemIcon({ item, size = 30 }: { item: string; size?: number }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24' };
  switch (item) {
    case 'crown':
      return (
        <Svg {...s}>
          <Path d="M3 18L5 6l4 5 3-7 3 7 4-5 2 12z" fill="#FFC233" />
        </Svg>
      );
    case 'scarf':
    case 'scarf-gold':
      return (
        <Svg {...s}>
          <Path d="M3 10q9 6 18 0l-1 4q-8 5-16 0z" fill={item === 'scarf' ? '#3D9BF5' : '#FFC233'} />
          <Path d="M15 14l2 7 3-1-2-6z" fill={item === 'scarf' ? '#2179CC' : '#E0A000'} />
        </Svg>
      );
    case 'glasses':
      return (
        <Svg {...s}>
          <Circle cx={7} cy={13} r={4} fill="none" stroke="#1D2433" strokeWidth={2} />
          <Circle cx={17} cy={13} r={4} fill="none" stroke="#1D2433" strokeWidth={2} />
          <Path d="M11 13h2" stroke="#1D2433" strokeWidth={2} />
        </Svg>
      );
    case 'balloon':
      return (
        <Svg {...s}>
          <Ellipse cx={12} cy={9} rx={6} ry={7} fill="#FF5C8A" />
          <Path d="M12 16q-2 3 0 6" stroke="#5B6474" strokeWidth={1.5} fill="none" />
        </Svg>
      );
    case 'cap':
      return (
        <Svg {...s}>
          <Path d="M4 14q8-12 16 0z" fill="#138A47" />
          <Rect x={3} y={14} width={18} height={3} rx={1.5} fill="#0B6634" />
        </Svg>
      );
    case 'flower':
      return (
        <Svg {...s}>
          <Circle cx={12} cy={12} r={3} fill="#FFC233" />
          <Circle cx={12} cy={6} r={3} fill="#FF9EC0" />
          <Circle cx={12} cy={18} r={3} fill="#FF9EC0" />
          <Circle cx={6} cy={12} r={3} fill="#FF9EC0" />
          <Circle cx={18} cy={12} r={3} fill="#FF9EC0" />
        </Svg>
      );
    case 'bow':
      return (
        <Svg {...s}>
          <Path d="M12 12L4 7v10zM12 12l8-5v10z" fill="#FF5C8A" />
          <Circle cx={12} cy={12} r={2.5} fill="#D93A68" />
        </Svg>
      );
    case 'star-badge':
      return (
        <Svg {...s}>
          <Path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="#FFC233" />
        </Svg>
      );
    case 'night-glow':
      return (
        <Svg {...s}>
          <Path d="M15 3a8 8 0 1 0 6 13A9 9 0 0 1 15 3z" fill="#8B5CF6" />
          <Circle cx={18} cy={6} r={1.3} fill="#FFC233" />
        </Svg>
      );
    case 'leaf':
      return (
        <Svg {...s}>
          <Path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z" fill="#4FBF6A" />
          <Path d="M5 19L14 10" stroke="#1F7A3D" strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    case 'headphones':
      return (
        <Svg {...s}>
          <Path d="M4 15v-3a8 8 0 0 1 16 0v3" stroke="#1D2433" strokeWidth={2.2} fill="none" />
          <Rect x={3} y={14} width={5} height={7} rx={2} fill="#3D9BF5" />
          <Rect x={16} y={14} width={5} height={7} rx={2} fill="#3D9BF5" />
        </Svg>
      );
    default:
      return (
        <Svg {...s}>
          <Rect x={4} y={9} width={16} height={12} rx={2} fill="#FF8A2B" />
          <Rect x={3} y={6} width={18} height={4} rx={1.5} fill="#FFC233" />
          <Path d="M12 6v15" stroke="#FFFFFF" strokeWidth={2} />
        </Svg>
      );
  }
}
