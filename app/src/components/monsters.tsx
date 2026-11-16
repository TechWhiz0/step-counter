import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { FaceMood } from '@/lib/types';

// The monster family, drawn in a 120x120 box with feet resting near y=108.
// Bodies are mood-free; the shared face layer below draws eyes and mouth for the pet's mood.

const INK = '#1D2433';

type FaceSpec = { eyes: [number, number][]; r: number; mouthY: number } | { cyclops: [number, number]; r: number; mouthY: number };

interface MonsterDef {
  body: ReactNode;
  face: FaceSpec;
  // Home colour, used behind the monster on cards.
  tint: string;
}

const shadow = (rx = 30) => <Ellipse cx={60} cy={111} rx={rx} ry={5} fill={INK} opacity={0.12} />;
const shine = (cx: number, cy: number, rx = 10, ry = 6, rot = -25) => (
  <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" opacity={0.38} transform={`rotate(${rot} ${cx} ${cy})`} />
);

export const MONSTERS: Record<string, MonsterDef> = {
  mochi: {
    tint: '#FFF1E6',
    face: { eyes: [[46, 66], [74, 66]], r: 6.5, mouthY: 78 },
    body: (
      <G>
        {shadow()}
        <Circle cx={33} cy={33} r={13} fill="#FF8B4A" />
        <Circle cx={87} cy={33} r={13} fill="#FF8B4A" />
        <Circle cx={33} cy={33} r={6} fill="#FFC9A3" />
        <Circle cx={87} cy={33} r={6} fill="#FFC9A3" />
        <Path d="M18 72c0-25 19-44 42-44s42 19 42 44-19 36-42 36-42-11-42-36z" fill="#FF9A5C" />
        <Path d="M18 72c0 25 19 36 42 36s42-11 42-36c0 0-12 24-42 24S18 72 18 72z" fill="#E8743A" opacity={0.5} />
        {shine(40, 48)}
        <Ellipse cx={60} cy={86} rx={21} ry={15} fill="#FFE1C8" />
      </G>
    ),
  },
  pip: {
    tint: '#F1ECFF',
    face: { cyclops: [60, 64], r: 16, mouthY: 88 },
    body: (
      <G>
        {shadow(28)}
        <Path d="M60 6l9 24H51z" fill="#FFC233" />
        <Path d="M60 6l9 24h-9z" fill="#E0A000" />
        <Path d="M22 72c0-26 17-44 38-44s38 18 38 44c0 22-14 36-38 36S22 94 22 72z" fill="#A98BFF" />
        <Path d="M22 72c0 22 14 36 38 36s38-14 38-36c0 0-10 24-38 24S22 72 22 72z" fill="#7F5CF0" opacity={0.5} />
        {shine(40, 48, 9, 5, -30)}
      </G>
    ),
  },
  bop: {
    tint: '#E3F7F3',
    face: { eyes: [[46, 64], [74, 64]], r: 7, mouthY: 82 },
    body: (
      <G>
        {shadow()}
        <Path d="M44 30Q38 14 30 12M76 30q6-16 14-18" stroke="#2FA894" strokeWidth={4} fill="none" strokeLinecap="round" />
        <Circle cx={30} cy={12} r={6.5} fill="#FF5C8A" />
        <Circle cx={90} cy={12} r={6.5} fill="#FF5C8A" />
        <Rect x={20} y={28} width={80} height={80} rx={34} fill="#52CDB8" />
        <Path d="M20 80c0 16 12 28 34 28h12c22 0 34-12 34-28 0 0-10 18-40 18S20 80 20 80z" fill="#2FA894" opacity={0.5} />
        {shine(40, 44, 10, 5, -20)}
      </G>
    ),
  },
  fizz: {
    tint: '#FFF6D6',
    face: { eyes: [[50, 58], [70, 58]], r: 5.5, mouthY: 70 },
    body: (
      <G>
        {shadow(28)}
        <Path d="M60 12l9 14 16-6-2 17 17 3-11 13 11 13-17 3 2 17-16-6-9 14-9-14-16 6 2-17-17-3 11-13-11-13 17-3-2-17 16 6z" fill="#FFC233" />
        <Circle cx={60} cy={61} r={29} fill="#FFE08A" />
        <Path d="M31 64c2 14 14 25 29 25s27-11 29-25c-6 10-16 16-29 16s-23-6-29-16z" fill="#F2B90F" opacity={0.45} />
        {shine(48, 44, 8, 4)}
      </G>
    ),
  },
  nubs: {
    tint: '#FFE8F1',
    face: { eyes: [[48, 66], [72, 66]], r: 6, mouthY: 82 },
    body: (
      <G>
        {shadow()}
        <Path d="M40 36l-7-16 15 9zM80 36l7-16-15 9z" fill="#E0568A" />
        <Ellipse cx={60} cy={72} rx={41} ry={36} fill="#FF9EC0" />
        <Path d="M19 74c2 20 19 34 41 34s39-14 41-34c-6 14-20 24-41 24S25 88 19 74z" fill="#E86E9B" opacity={0.45} />
        {shine(40, 52, 10, 5)}
      </G>
    ),
  },
  mossy: {
    tint: '#E6F7E8',
    face: { eyes: [[46, 68], [74, 68]], r: 6.5, mouthY: 80 },
    body: (
      <G>
        {shadow()}
        <Path d="M60 30q-6-18 8-24 4 14-8 24z" fill="#7BD88F" />
        <Path d="M60 30q4-16-12-20 0 14 12 20z" fill="#4FBF6A" />
        <Path d="M18 74c0-25 19-44 42-44s42 19 42 44-19 34-42 34-42-9-42-34z" fill="#5FCB79" />
        <Path d="M18 74c0 25 19 34 42 34s42-9 42-34c0 0-14 20-42 20S18 74 18 74z" fill="#3FA85C" opacity={0.6} />
        {shine(40, 52)}
        <Circle cx={35} cy={86} r={4} fill="#3FA85C" opacity={0.6} />
        <Circle cx={86} cy={62} r={3} fill="#3FA85C" opacity={0.6} />
      </G>
    ),
  },
  drip: {
    tint: '#E3F0FE',
    face: { eyes: [[48, 72], [72, 72]], r: 6, mouthY: 84 },
    body: (
      <G>
        {shadow(28)}
        <Path d="M60 8C70 30 96 48 96 74c0 20-16 34-36 34S24 94 24 74C24 48 50 30 60 8z" fill="#5AAEF7" />
        <Path d="M24 76c2 19 17 32 36 32s34-13 36-32c-6 14-19 22-36 22S30 90 24 76z" fill="#2E86DB" opacity={0.5} />
        <Path d="M46 46q-6 10-6 22" stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.45} />
      </G>
    ),
  },
  pebble: {
    tint: '#EEF0F3',
    face: { eyes: [[48, 70], [74, 70]], r: 6, mouthY: 84 },
    body: (
      <G>
        {shadow(34)}
        <Path d="M20 84c-4-22 8-46 30-52 18-5 38 2 46 16 8 14 8 34-4 46-10 10-28 14-44 12-14-2-26-8-28-22z" fill="#A8B2C1" />
        <Path d="M20 84c2 14 14 20 28 22 16 2 34-2 44-12 3-3 5-6 7-10-10 10-28 14-46 12-14-2-26-6-33-12z" fill="#7D8899" opacity={0.7} />
        <Path d="M40 40q16-10 34-4-10 4-16 12-8-6-18-8z" fill="#6BCB7E" />
        {shine(44, 54, 8, 4, -20)}
      </G>
    ),
  },
  bloop: {
    tint: '#E2F6F1',
    face: { eyes: [[46, 74], [74, 74]], r: 7, mouthY: 88 },
    body: (
      <G>
        {shadow(34)}
        <Path d="M14 98c0-36 20-66 46-66s46 30 46 66c0 6-4 10-10 10H24c-6 0-10-4-10-10z" fill="#3CC9B0" />
        <Path d="M14 98c0 6 4 10 10 10h72c6 0 10-4 10-10-14 6-30 8-46 8s-32-2-46-8z" fill="#219E88" opacity={0.6} />
        <Path d="M84 40q8 4 6 14" stroke="#3CC9B0" strokeWidth={7} fill="none" strokeLinecap="round" />
        <Circle cx={90} cy={58} r={5} fill="#3CC9B0" />
        {shine(40, 54, 10, 6, -30)}
      </G>
    ),
  },
  spike: {
    tint: '#EAF7E3',
    face: { eyes: [[50, 66], [70, 66]], r: 5.5, mouthY: 78 },
    body: (
      <G>
        {shadow(26)}
        <Path d="M28 70q-12 0-12-14v-8q0-6 6-6t6 6v8q0 4 4 4h4v10z" fill="#5BBF6E" />
        <Path d="M92 62q12 0 12-12v-6q0-6-6-6t-6 6v6q0 2-2 2h-4v10z" fill="#5BBF6E" />
        <Rect x={32} y={26} width={56} height={84} rx={28} fill="#6ED27F" />
        <Path d="M32 82v4c0 14 12 24 28 24s28-10 28-24v-4c-6 10-16 16-28 16s-22-6-28-16z" fill="#46A85A" opacity={0.6} />
        <Path d="M48 40v4M60 34v4M72 40v4M44 60v4M76 60v4" stroke="#2F7D40" strokeWidth={2.5} strokeLinecap="round" />
        <Circle cx={52} cy={24} r={5} fill="#FF8FB0" />
        <Circle cx={68} cy={24} r={5} fill="#FF8FB0" />
        <Circle cx={60} cy={22} r={7} fill="#FF5C8A" />
        <Circle cx={60} cy={22} r={3} fill="#FFC233" />
      </G>
    ),
  },
  puff: {
    tint: '#EAF4FF',
    face: { eyes: [[48, 64], [74, 64]], r: 6, mouthY: 74 },
    body: (
      <G>
        <Ellipse cx={60} cy={112} rx={32} ry={5} fill={INK} opacity={0.1} />
        <Path d="M44 96l-2 10M60 96v10M76 96l2 10" stroke="#7FB8F0" strokeWidth={3} strokeLinecap="round" />
        <Path d="M26 88c-12 0-18-10-14-20 3-8 11-11 17-9 1-14 13-24 27-22 7-10 22-11 31-2 11 0 20 9 19 21 9 3 13 13 9 21-3 7-9 11-16 11z" fill="#FFFFFF" />
        <Path d="M14 82c3 5 7 6 12 6h73c7 0 13-4 16-11-12 9-28 10-50 10s-38-1-51-5z" fill="#CFE3F7" />
        <Ellipse cx={50} cy={44} rx={10} ry={5} fill="#EAF4FF" />
      </G>
    ),
  },
  buzz: {
    tint: '#FFF6D6',
    face: { eyes: [[48, 58], [72, 58]], r: 5.5, mouthY: 66 },
    body: (
      <G>
        {shadow(28)}
        <Ellipse cx={34} cy={40} rx={16} ry={22} fill="#DDF0FF" opacity={0.95} transform="rotate(-30 34 40)" />
        <Ellipse cx={86} cy={40} rx={16} ry={22} fill="#DDF0FF" opacity={0.95} transform="rotate(30 86 40)" />
        <Path d="M46 26q-6-12-14-12M74 26q6-12 14-12" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Circle cx={32} cy={14} r={4} fill={INK} />
        <Circle cx={88} cy={14} r={4} fill={INK} />
        <Ellipse cx={60} cy={70} rx={36} ry={38} fill="#FFC233" />
        <Path d="M26 80h68M28 94h64" stroke={INK} strokeWidth={9} strokeLinecap="round" />
        <Path d="M24 70c2 22 18 38 36 38s34-16 36-38c-6 18-20 28-36 28S30 88 24 70z" fill="#E0A000" opacity={0.45} />
        {shine(46, 44, 8, 4)}
      </G>
    ),
  },
  shroom: {
    tint: '#FFECE8',
    face: { eyes: [[51, 82], [69, 82]], r: 5, mouthY: 92 },
    body: (
      <G>
        {shadow(26)}
        <Path d="M38 60h44v32c0 10-8 16-22 16s-22-6-22-16z" fill="#FFF1DE" />
        <Path d="M38 86c0 14 8 22 22 22s22-8 22-22c-4 8-12 12-22 12s-18-4-22-12z" fill="#E8CFAE" opacity={0.7} />
        <Path d="M12 62C12 34 34 16 60 16s48 18 48 46c0 4-4 6-8 6H20c-4 0-8-2-8-6z" fill="#F0564A" />
        <Path d="M12 62c0 4 4 6 8 6h80c4 0 8-2 8-6-10 4-26 6-48 6s-38-2-48-6z" fill="#C93A30" opacity={0.6} />
        <Circle cx={40} cy={38} r={7} fill="#fff" />
        <Circle cx={72} cy={30} r={5} fill="#fff" />
        <Circle cx={88} cy={48} r={6} fill="#fff" />
        <Circle cx={58} cy={50} r={4} fill="#fff" />
      </G>
    ),
  },
  inky: {
    tint: '#F3EAFF',
    face: { eyes: [[48, 56], [72, 56]], r: 6.5, mouthY: 70 },
    body: (
      <G>
        {shadow(34)}
        <Path d="M28 78q-10 14-4 26M42 82q-4 14 2 24M60 84v24M78 82q4 14-2 24M92 78q10 14 4 26" stroke="#9A6BF2" strokeWidth={9} fill="none" strokeLinecap="round" />
        <Path d="M20 62C20 36 38 16 60 16s40 20 40 46c0 14-18 24-40 24S20 76 20 62z" fill="#A67CFF" />
        <Path d="M20 62c0 14 18 24 40 24s40-10 40-24c-8 12-22 18-40 18S28 74 20 62z" fill="#7F53E0" opacity={0.55} />
        {shine(42, 36)}
        <Circle cx={76} cy={40} r={4} fill="#8D63EB" />
        <Circle cx={84} cy={52} r={3} fill="#8D63EB" />
      </G>
    ),
  },
  jelly: {
    tint: '#F3EAFF',
    face: { eyes: [[48, 54], [72, 54]], r: 6, mouthY: 64 },
    body: (
      <G>
        <Ellipse cx={60} cy={113} rx={24} ry={4} fill={INK} opacity={0.1} />
        <Path d="M36 74q-4 14 2 26M50 76q-2 14 4 28M66 76q2 14-4 28M80 74q4 14-2 26" stroke="#C69CFF" strokeWidth={5} fill="none" strokeLinecap="round" />
        <Path d="M18 66C18 38 36 18 60 18s42 20 42 48c0 6-4 10-10 10H28c-6 0-10-4-10-10z" fill="#B98BFF" opacity={0.92} />
        <Path d="M18 66c0 6 4 10 10 10h64c6 0 10-4 10-10-10 6-24 8-42 8s-32-2-42-8z" fill="#8B5CF6" opacity={0.6} />
        <Ellipse cx={42} cy={36} rx={10} ry={6} fill="#fff" opacity={0.45} transform="rotate(-25 42 36)" />
      </G>
    ),
  },
  gem: {
    tint: '#E0F6F6',
    face: { eyes: [[50, 66], [70, 66]], r: 5.5, mouthY: 78 },
    body: (
      <G>
        {shadow()}
        <Path d="M60 8l30 22 8 40-18 36H40L22 70l8-40z" fill="#5ED6D6" />
        <Path d="M60 8l30 22-30 14-30-14z" fill="#9BEAEA" />
        <Path d="M30 30l30 14v62H40L22 70z" fill="#45C2C2" />
        <Path d="M90 30L60 44v62h20l18-36z" fill="#2EA6A6" />
        <Path d="M40 20l8 6M74 18l-6 8" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      </G>
    ),
  },
  ember: {
    tint: '#FFEEE3',
    face: { eyes: [[50, 80], [70, 80]], r: 5.5, mouthY: 90 },
    body: (
      <G>
        {shadow(28)}
        <Path d="M60 8c8 16 4 22 14 30 6-8 6-14 4-20 16 12 24 30 24 50 0 24-18 40-42 40S18 92 18 68c0-14 8-26 16-32 0 8 4 14 10 16-2-18 6-32 16-44z" fill="#FF6B3D" />
        <Path d="M60 50c6 10 22 16 22 34 0 12-10 20-22 20s-22-8-22-20c0-10 8-16 12-22 2 6 6 8 10 8-2-8-2-14 0-20z" fill="#FFC233" />
        {shine(42, 56, 7, 4, -30)}
      </G>
    ),
  },
  twinkle: {
    tint: '#FFF9E0',
    face: { eyes: [[51, 58], [69, 58]], r: 5, mouthY: 68 },
    body: (
      <G>
        {shadow(28)}
        <Path d="M60 8l14 30 32 4-24 22 6 32-28-16-28 16 6-32-24-22 32-4z" fill="#FFD23F" stroke="#F2B90F" strokeWidth={3} strokeLinejoin="round" />
        <Path d="M34 86l26-14 26 14-2-10c-8 4-16 6-24 6s-16-2-24-6z" fill="#E0A000" opacity={0.5} />
        {shine(52, 40, 6, 3.5, -30)}
        <Path d="M104 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM16 92l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" fill="#FFC233" />
      </G>
    ),
  },
  gourdy: {
    tint: '#FFF0DD',
    face: { eyes: [[48, 62], [72, 62]], r: 6, mouthY: 80 },
    body: (
      <G>
        {shadow(34)}
        <Path d="M58 22q-2-10 6-14 4 2 2 8-4 2-8 6z" fill="#3FA85C" />
        <Ellipse cx={38} cy={68} rx={22} ry={38} fill="#FF9A3C" />
        <Ellipse cx={82} cy={68} rx={22} ry={38} fill="#FF9A3C" />
        <Ellipse cx={60} cy={68} rx={26} ry={40} fill="#FFAE52" />
        <Path d="M20 80c2 18 18 28 40 28s38-10 40-28c-8 12-22 18-40 18S28 92 20 80z" fill="#E07A1C" opacity={0.55} />
        {shine(50, 44, 8, 5)}
      </G>
    ),
  },
  frost: {
    tint: '#EEF3FF',
    face: { eyes: [[50, 64], [70, 64]], r: 5.5, mouthY: 76 },
    body: (
      <G>
        {shadow(32)}
        <Path d="M60 14c10 0 14 8 22 8 10 0 18 10 16 20 8 6 10 18 4 26 4 10-2 22-12 24-4 10-16 14-30 14s-26-4-30-14c-10-2-16-14-12-24-6-8-4-20 4-26-2-10 6-20 16-20 8 0 12-8 22-8z" fill="#FFFFFF" />
        <Path d="M18 94c4 6 10 10 16 10 6 6 16 8 26 8s20-2 26-8c6 0 12-4 16-10-12 4-26 6-42 6s-30-2-42-6z" fill="#C9D7F2" />
        <Ellipse cx={60} cy={68} rx={26} ry={22} fill="#BFD4FF" />
      </G>
    ),
  },
};

export const MONSTER_IDS = Object.keys(MONSTERS);

export function isMonster(species: string | null | undefined): species is string {
  return !!species && species in MONSTERS;
}

function Face({ spec, mood, blink = false }: { spec: FaceSpec; mood: FaceMood; blink?: boolean }) {
  const mouthX = 60;
  const { mouthY } = spec;
  const closed = blink || mood === 'sleepy' || mood === 'asleep';
  const mouth =
    mood === 'happy' ? (
      <Path d={`M${mouthX - 7} ${mouthY - 2}q7 10 14 0z`} fill={INK} />
    ) : mood === 'sleepy' ? (
      <Ellipse cx={mouthX} cy={mouthY} rx={3.5} ry={2.5} fill={INK} />
    ) : mood === 'asleep' ? (
      <Ellipse cx={mouthX} cy={mouthY} rx={2.5} ry={2} fill={INK} opacity={0.8} />
    ) : mood === 'weak' ? (
      <Path d={`M${mouthX - 6} ${mouthY + 2}q6 -6 12 0`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
    ) : (
      <Path d={`M${mouthX - 6} ${mouthY - 2}q6 6 12 0`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
    );
  // Worried brows and a sweat drop when the pet is low on energy.
  const eyeXs = 'cyclops' in spec ? [spec.cyclops[0]] : spec.eyes.map(([x]) => x);
  const eyeY = 'cyclops' in spec ? spec.cyclops[1] : spec.eyes[0][1];
  const weakBits =
    mood === 'weak' ? (
      <G>
        {'cyclops' in spec ? (
          <Path d={`M${eyeXs[0] - 14} ${eyeY - spec.r - 6}l28 -4`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
        ) : (
          eyeXs.map((x, i) => (
            <Path
              key={x}
              d={i === 0 ? `M${x - 7} ${eyeY - spec.r - 4}l12 -4` : `M${x - 5} ${eyeY - spec.r - 8}l12 4`}
              stroke={INK}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))
        )}
        <Path d="M92 40q5 7 0 11q-5-4 0-11z" fill="#7CC4FF" />
      </G>
    ) : null;

  if ('cyclops' in spec) {
    const [x, y] = spec.cyclops;
    return (
      <G>
        {closed ? (
          <Path d={`M${x - 12} ${y}q12 8 24 0`} stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
        ) : (
          <G>
            <Circle cx={x} cy={y} r={spec.r} fill="#fff" />
            <Circle cx={x + 2} cy={y + (mood === 'weak' ? 4 : 2)} r={spec.r * 0.56} fill={INK} />
            <Circle cx={x + 5} cy={y - 2} r={spec.r * 0.19} fill="#fff" />
          </G>
        )}
        {weakBits}
        {mouth}
      </G>
    );
  }
  return (
    <G>
      {spec.eyes.map(([x, y]) =>
        closed ? (
          <Path key={x} d={`M${x - spec.r} ${y}q${spec.r} ${spec.r * 0.8} ${spec.r * 2} 0`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
        ) : (
          <G key={x}>
            <Circle cx={x} cy={y} r={mood === 'weak' ? spec.r * 0.8 : spec.r} fill={INK} />
            <Circle cx={x + spec.r * 0.3} cy={y - spec.r * 0.3} r={spec.r * 0.34} fill="#fff" />
          </G>
        ),
      )}
      {weakBits}
      {mouth}
    </G>
  );
}

// The monster as SVG children in the 120 box, for composing into a bigger drawing.
// `blink` closes the eyes for a moment while keeping the mouth.
export function MonsterShape({ species, mood = 'happy', blink }: { species: string; mood?: FaceMood; blink?: boolean }) {
  const def = MONSTERS[species] ?? MONSTERS.mochi;
  return (
    <G>
      {def.body}
      <Face spec={def.face} mood={mood} blink={blink} />
    </G>
  );
}

export function monsterTint(species: string | null | undefined): string {
  return (species && MONSTERS[species]?.tint) || '#F6F8F3';
}

// A standalone monster picture for lists, cards and avatars.
export function MonsterIcon({ species, size = 48, mood = 'happy' }: { species: string; size?: number; mood?: FaceMood }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <MonsterShape species={species} mood={mood} />
    </Svg>
  );
}
