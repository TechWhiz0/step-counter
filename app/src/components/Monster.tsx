import { memo, type ReactElement } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { FaceMood, Form, Stage } from '@/lib/types';

// Every monster: a soft watercolour fill, one warm ink outline, big shiny eyes, blush,
// and one signature detail nobody else has. Drawn on a 120 x 110 board, feet near y = 100.

const INK = '#3A2F2A';
const SW = 2.4;
const ink = { stroke: INK, strokeWidth: SW, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

interface Face {
  eyes: [number, number, number, number]; // left x, right x, y, radius
  cheeks: [number, number, number];
  mouth: string;
  blush: string;
  shine?: [number, number, number];
  top: number; // top of the head, where hats sit
  neck: number; // where scarves sit
}

interface Species {
  name: string;
  color: string;
  face: Face;
  body: () => ReactElement;
}

const feet = (color: string, y = 99) => (
  <>
    <Ellipse cx={44} cy={y} rx={9} ry={5} fill={color} {...ink} />
    <Ellipse cx={76} cy={y} rx={9} ry={5} fill={color} {...ink} />
  </>
);

const ROUND = 'M18 72 C14 40 36 22 60 22 C84 22 106 40 102 72 C100 92 84 100 60 100 C36 100 20 92 18 72 Z';

export const SPECIES: Record<string, Species> = {
  mochi: {
    name: 'Mochi',
    color: '#F6B49B',
    face: { eyes: [47, 73, 60, 5], cheeks: [38, 82, 71], mouth: 'M56 68 q4 4 8 0', blush: '#F08C8C', shine: [36, 40, -35], top: 22, neck: 80 },
    body: () => (
      <>
        <Path d="M60 22 C60 14 60 10 58 6" fill="none" {...ink} stroke="#4E8A45" />
        <Path d="M58 10 C50 4 44 8 46 13 C52 14 56 12 58 10 Z" fill="#9CCB7E" {...ink} />
        <Path d="M59 9 C66 2 74 5 71 11 C66 13 62 12 59 9 Z" fill="#9CCB7E" {...ink} />
        {feet('#F6B49B')}
        <Path d={ROUND} fill="#F6B49B" {...ink} />
        <Ellipse cx={60} cy={82} rx={24} ry={14} fill="#FCDACB" />
      </>
    ),
  },
  pip: {
    name: 'Pip',
    color: '#7E8AD6',
    face: { eyes: [47, 73, 58, 5.6], cheeks: [32, 88, 74], mouth: '', blush: '#F29BB5', shine: [40, 38, -30], top: 28, neck: 82 },
    body: () => (
      <>
        <Path d="M34 40 L28 14 L50 30 Z" fill="#6C78C8" {...ink} />
        <Path d="M86 40 L92 14 L70 30 Z" fill="#6C78C8" {...ink} />
        <Ellipse cx={46} cy={100} rx={8} ry={4.5} fill="#F2B35E" {...ink} />
        <Ellipse cx={74} cy={100} rx={8} ry={4.5} fill="#F2B35E" {...ink} />
        <Path d="M24 76 C20 46 36 28 60 28 C84 28 100 46 96 76 C94 94 80 102 60 102 C40 102 26 94 24 76 Z" fill="#7E8AD6" {...ink} />
        <Path d="M26 70 C16 76 18 88 28 88 M94 70 C104 76 102 88 92 88" fill="none" {...ink} />
        <Circle cx={47} cy={58} r={12} fill="#F6F1E4" {...ink} />
        <Circle cx={73} cy={58} r={12} fill="#F6F1E4" {...ink} />
        <Path d="M56 70 L60 77 L64 70 Z" fill="#F2B35E" {...ink} />
        <Ellipse cx={60} cy={89} rx={19} ry={10} fill="#C9D0F5" />
        <Path d="M55 84 a6 6 0 1 0 8 7 a4.6 4.6 0 1 1 -8 -7 z" fill="#F7D774" />
      </>
    ),
  },
  bop: {
    name: 'Bop',
    color: '#8ED6B8',
    face: { eyes: [48, 72, 62, 4.6], cheeks: [36, 84, 72], mouth: 'M52 71 q8 7 16 0', blush: '#F08C8C', shine: [32, 52, -25], top: 36, neck: 82 },
    body: () => (
      <>
        <Path d="M60 36 C60 26 64 18 68 15" fill="none" {...ink} />
        <Circle cx={69} cy={12} r={6} fill="#F7C948" {...ink} />
        {feet('#8ED6B8', 100)}
        <Path d="M16 74 C14 50 34 36 60 36 C86 36 106 50 104 74 C102 94 84 102 60 102 C36 102 18 94 16 74 Z" fill="#8ED6B8" {...ink} />
        <Path d="M18 76 c-8 2 -9 10 -3 12 M102 76 c8 2 9 10 3 12" fill="none" {...ink} />
        <Ellipse cx={60} cy={86} rx={26} ry={11} fill="#CDEFE0" />
        <Path d="M40 90 h6 M50 92 h6 M64 92 h6 M74 90 h6" stroke="#5FB592" strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
  nubs: {
    name: 'Nubs',
    color: '#C3A6E6',
    face: { eyes: [47, 73, 62, 4.2], cheeks: [37, 83, 72], mouth: 'M57 72 q3 3 6 0', blush: '#F29BB5', shine: [36, 46, -30], top: 26, neck: 80 },
    body: () => (
      <>
        <Circle cx={33} cy={36} r={11} fill="#C3A6E6" {...ink} />
        <Circle cx={87} cy={36} r={11} fill="#C3A6E6" {...ink} />
        {feet('#C3A6E6')}
        <Path d="M20 70 C18 44 38 30 60 30 C82 30 102 44 100 70 C98 92 82 100 60 100 C38 100 22 92 20 70 Z" fill="#C3A6E6" {...ink} />
        <Circle cx={33} cy={36} r={5} fill="#F2B6C8" />
        <Circle cx={87} cy={36} r={5} fill="#F2B6C8" />
        <Ellipse cx={60} cy={84} rx={20} ry={12} fill="#E8DAF7" />
        <Path d="M60 92 c-9 -7 -12 -12 -7 -15 c3 -2 7 0 7 3 c0 -3 4 -5 7 -3 c5 3 2 8 -7 15 z" fill="#F29BB5" />
      </>
    ),
  },
  mossy: {
    name: 'Mossy',
    color: '#9FCB7C',
    face: { eyes: [48, 72, 60, 4.6], cheeks: [38, 82, 70], mouth: 'M56 70 q4 4 8 0', blush: '#F08C8C', shine: [36, 56, -20], top: 14, neck: 80 },
    body: () => (
      <>
        {feet('#9FCB7C', 100)}
        <Path d="M26 80 C22 48 38 26 60 26 C82 26 98 48 94 80 C92 96 80 102 60 102 C40 102 28 96 26 80 Z" fill="#9FCB7C" {...ink} />
        <Path d="M32 44 C36 24 84 24 88 44 C80 36 72 40 66 33 C60 40 52 35 46 40 C40 37 36 40 32 44 Z" fill="#5E9E58" {...ink} />
        <Path d="M71 24 h7 v9 h-7 z" fill="#F6F1E4" {...ink} />
        <Path d="M64 25 C64 13 85 13 85 25 Z" fill="#E86A5A" {...ink} />
        <Circle cx={70} cy={19} r={1.8} fill="#FFF7EC" />
        <Circle cx={78} cy={18} r={2.2} fill="#FFF7EC" />
        <Ellipse cx={60} cy={86} rx={18} ry={11} fill="#D9EDC4" />
        <Path d="M54 88 q6 -10 12 0 q-6 6 -12 0 z" fill="#7DB36A" />
      </>
    ),
  },
  drip: {
    name: 'Drip',
    color: '#86C7EE',
    face: { eyes: [48, 72, 66, 4.6], cheeks: [38, 82, 76], mouth: 'M56 74 q4 4 8 0', blush: '#F29BB5', top: 14, neck: 84 },
    body: () => (
      <>
        <Path d="M60 12 C50 34 22 50 22 74 C22 92 40 102 60 102 C80 102 98 92 98 74 C98 50 70 34 60 12 Z" fill="#86C7EE" {...ink} />
        <Path d="M36 66 q2 -12 10 -18" fill="none" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" opacity={0.75} />
        <Path d="M32 88 q7 -6 14 0 t14 0 t14 0 t14 0" fill="none" stroke="#4F9BD0" strokeWidth={2.4} strokeLinecap="round" />
      </>
    ),
  },
  pebble: {
    name: 'Pebble',
    color: '#E3C79E',
    face: { eyes: [49, 71, 70, 4.2], cheeks: [37, 83, 79], mouth: 'M57 80 q3 3 6 0', blush: '#F08C8C', shine: [30, 58, -15], top: 22, neck: 88 },
    body: () => (
      <>
        <Path d="M60 46 v-9" fill="none" {...ink} stroke="#4E8A45" />
        <Path d="M12 80 C10 60 30 46 60 46 C90 46 110 60 108 80 C106 96 86 102 60 102 C34 102 14 96 12 80 Z" fill="#E3C79E" {...ink} />
        <Circle cx={54} cy={31} r={5} fill="#F59AC0" {...ink} />
        <Circle cx={66} cy={31} r={5} fill="#F59AC0" {...ink} />
        <Circle cx={60} cy={25} r={5} fill="#F59AC0" {...ink} />
        <Circle cx={60} cy={36} r={5} fill="#F59AC0" {...ink} />
        <Circle cx={60} cy={31} r={3} fill="#F7C948" />
        <G fill="#B98E5E">
          <Circle cx={28} cy={72} r={1.7} />
          <Circle cx={34} cy={65} r={1.3} />
          <Circle cx={90} cy={68} r={1.7} />
          <Circle cx={95} cy={75} r={1.3} />
          <Circle cx={84} cy={90} r={1.4} />
        </G>
      </>
    ),
  },
  bloop: {
    name: 'Bloop',
    color: '#6CC6C2',
    face: { eyes: [48, 72, 60, 5], cheeks: [37, 83, 70], mouth: 'M54 68 q6 7 12 0', blush: '#F08C8C', top: 14, neck: 80 },
    body: () => (
      <>
        <Path d="M60 14 c-4 6 -6 9 -6 12 a6 6 0 0 0 12 0 c0 -3 -2 -6 -6 -12 z" fill="#86C7EE" {...ink} />
        <Path d="M20 72 C18 44 38 32 60 32 C82 32 102 44 100 72 C100 82 96 90 90 94 C84 98 36 98 30 94 C24 90 20 82 20 72 Z" fill="#6CC6C2" {...ink} />
        <Path d="M34 92 h17 v11 h-22 q0 -6 5 -6 z" fill="#F7C948" {...ink} />
        <Path d="M69 92 h17 v11 h-22 q0 -6 5 -6 z" fill="#F7C948" {...ink} />
        <Ellipse cx={60} cy={80} rx={20} ry={9} fill="#C4EAE7" />
        <Path d="M30 48 q4 -8 12 -10" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      </>
    ),
  },
  spike: {
    name: 'Spike',
    color: '#F7C948',
    face: { eyes: [48, 72, 66, 4.6], cheeks: [36, 84, 76], mouth: 'M54 74 q6 6 12 0', blush: '#E2574C', shine: [34, 66, -20], top: 22, neck: 84 },
    body: () => (
      <>
        <Path d="M28 48 L20 30 L40 38 L46 18 L56 34 L66 16 L72 34 L86 20 L84 40 L102 36 L92 52 Z" fill="#F29E4C" {...ink} />
        {feet('#F7C948', 100)}
        <Path d="M20 74 C18 50 38 36 60 36 C82 36 102 50 100 74 C98 94 82 102 60 102 C38 102 22 94 20 74 Z" fill="#F7C948" {...ink} />
        <Path d="M25 56 C44 48 76 48 95 56" fill="none" stroke="#E2574C" strokeWidth={5} strokeLinecap="round" />
        <Ellipse cx={60} cy={88} rx={20} ry={10} fill="#FCE7A6" />
      </>
    ),
  },
  fizz: {
    name: 'Fizz',
    color: '#F59AC0',
    face: { eyes: [48, 72, 62, 5], cheeks: [36, 84, 72], mouth: 'M56 72 q4 4 8 0', blush: '#E86A9A', shine: [36, 46, -30], top: 32, neck: 80 },
    body: () => (
      <>
        <Circle cx={40} cy={24} r={5} fill="#FDEAF2" {...ink} strokeWidth={2.2} />
        <Circle cx={52} cy={13} r={3.5} fill="#FDEAF2" {...ink} strokeWidth={2.2} />
        <Circle cx={79} cy={20} r={6} fill="#FDEAF2" {...ink} strokeWidth={2.2} />
        <Circle cx={90} cy={9} r={3} fill="#FDEAF2" {...ink} strokeWidth={2.2} />
        <Ellipse cx={46} cy={100} rx={8} ry={4.5} fill="#F59AC0" {...ink} />
        <Ellipse cx={74} cy={100} rx={8} ry={4.5} fill="#F59AC0" {...ink} />
        <Path d="M24 76 C22 50 38 32 60 32 C82 32 98 50 96 76 C94 94 80 102 60 102 C40 102 26 94 24 76 Z" fill="#F59AC0" {...ink} />
        <Ellipse cx={60} cy={87} rx={18} ry={11} fill="#FBD3E3" />
        <Path d="M60 79 l3 6 6.4 0.9 -4.7 4.4 1.2 6.4 -5.9 -3.1 -5.9 3.1 1.2 -6.4 -4.7 -4.4 6.4 -0.9 z" fill="#FFE27A" {...ink} strokeWidth={1.4} />
      </>
    ),
  },
  puff: {
    name: 'Puff',
    color: '#E4ECF7',
    face: { eyes: [50, 70, 66, 4.2], cheeks: [40, 80, 74], mouth: 'M57 74 q3 3 6 0', blush: '#F29BB5', top: 34, neck: 84 },
    body: () => (
      <>
        <Path d="M24 84 C11 84 9 65 22 61 C20 44 38 36 48 44 C52 29 75 27 80 42 C95 38 107 52 98 63 C111 67 107 86 94 86 C88 97 32 97 24 84 Z" fill="#E4ECF7" {...ink} />
        <Path d="M42 98 c-2 3 -3 5 -3 6.5 a3 3 0 0 0 6 0 c0 -1.5 -1 -3.5 -3 -6.5 z" fill="#86C7EE" {...ink} />
        <Path d="M78 98 c-2 3 -3 5 -3 6.5 a3 3 0 0 0 6 0 c0 -1.5 -1 -3.5 -3 -6.5 z" fill="#86C7EE" {...ink} />
        <Path d="M30 60 q4 -8 12 -9" fill="none" stroke="#FFFFFF" strokeWidth={3.4} strokeLinecap="round" />
      </>
    ),
  },
  inky: {
    name: 'Inky',
    color: '#9D80D6',
    face: { eyes: [48, 72, 54, 5], cheeks: [38, 82, 63], mouth: 'M57 62 q3 3 6 0', blush: '#F29BB5', top: 20, neck: 70 },
    body: () => (
      <>
        <Path
          d="M24 66 C22 40 40 26 60 26 C80 26 98 40 96 66 C96 78 100 90 96 94 C90 98 86 90 82 84 C80 86 80 96 74 98 C66 100 64 92 60 84 C54 86 56 96 50 98 C42 100 40 92 38 84 C34 86 32 98 26 96 C20 92 24 80 24 66 Z"
          fill="#9D80D6"
          {...ink}
        />
        <Path d="M70 27 c2 -11 15 -11 17 0 z" fill="#F6C9B5" {...ink} />
        <G fill="#C2AEEB">
          <Circle cx={40} cy={40} r={3.4} />
          <Circle cx={52} cy={34} r={2.2} />
          <Circle cx={84} cy={44} r={2.6} />
        </G>
        <Path d="M74 25 v-6 M78 25 v-7 M82 25 v-6" stroke="#E2A58C" strokeWidth={1.4} strokeLinecap="round" />
      </>
    ),
  },
  buzz: {
    name: 'Buzz',
    color: '#F7C948',
    face: { eyes: [48, 72, 58, 4.8], cheeks: [36, 84, 68], mouth: 'M55 66 q5 5 10 0', blush: '#F08C8C', shine: [36, 44, -30], top: 26, neck: 76 },
    body: () => (
      <>
        <Ellipse cx={30} cy={44} rx={14} ry={9} fill="#E6F3FB" {...ink} strokeWidth={2} transform="rotate(-30 30 44)" opacity={0.95} />
        <Ellipse cx={90} cy={44} rx={14} ry={9} fill="#E6F3FB" {...ink} strokeWidth={2} transform="rotate(30 90 44)" opacity={0.95} />
        <Path d="M50 30 C46 20 42 16 38 14 M70 30 C74 20 78 16 82 14" fill="none" {...ink} />
        <Circle cx={37} cy={13} r={3.5} fill="#3A2F2A" />
        <Circle cx={83} cy={13} r={3.5} fill="#3A2F2A" />
        {feet('#F7C948', 100)}
        <Path d="M20 70 C18 44 38 28 60 28 C82 28 102 44 100 70 C98 92 82 100 60 100 C38 100 22 92 20 70 Z" fill="#F7C948" {...ink} />
        <Path d="M24 82 C44 88 76 88 96 82 M30 92 C46 97 74 97 90 92" fill="none" stroke="#8A5A2B" strokeWidth={5} strokeLinecap="round" />
      </>
    ),
  },
  shroom: {
    name: 'Shroom',
    color: '#E07A63',
    face: { eyes: [49, 71, 72, 4.4], cheeks: [39, 81, 81], mouth: 'M57 80 q3 3 6 0', blush: '#F08C8C', top: 18, neck: 88 },
    body: () => (
      <>
        {feet('#F3E6D0', 100)}
        <Path d="M34 60 C30 74 32 96 60 98 C88 96 90 74 86 60 Z" fill="#F3E6D0" {...ink} />
        <Path d="M10 62 C10 34 32 18 60 18 C88 18 110 34 110 62 C96 68 24 68 10 62 Z" fill="#E07A63" {...ink} />
        <G fill="#FFF7EC" {...ink} strokeWidth={1.6}>
          <Circle cx={36} cy={40} r={6} />
          <Circle cx={60} cy={30} r={7} />
          <Circle cx={86} cy={42} r={5} />
          <Circle cx={72} cy={52} r={3.5} />
        </G>
      </>
    ),
  },
  gourdy: {
    name: 'Gourdy',
    color: '#F29E4C',
    face: { eyes: [48, 72, 64, 4.8], cheeks: [36, 84, 74], mouth: 'M53 73 l3 3 l4 -3 l4 3 l3 -3', blush: '#E2574C', top: 22, neck: 84 },
    body: () => (
      <>
        <Path d="M60 32 C60 24 62 18 66 14" fill="none" {...ink} stroke="#4E8A45" strokeWidth={4} />
        <Path d="M66 18 C74 10 86 14 84 22 C76 26 70 24 66 18 Z" fill="#9CCB7E" {...ink} />
        {feet('#E0863A', 100)}
        <Path d="M14 70 C12 44 34 32 60 32 C86 32 108 44 106 70 C104 94 84 102 60 102 C36 102 16 94 14 70 Z" fill="#F29E4C" {...ink} />
        <Path d="M42 36 C32 52 32 84 42 100 M78 36 C88 52 88 84 78 100 M60 34 V102" fill="none" stroke="#D9772E" strokeWidth={2.4} />
      </>
    ),
  },
  jelly: {
    name: 'Jelly',
    color: '#E4A6E8',
    face: { eyes: [48, 72, 50, 5], cheeks: [36, 84, 59], mouth: 'M56 58 q4 4 8 0', blush: '#F29BB5', shine: [36, 36, -30], top: 18, neck: 66 },
    body: () => (
      <>
        <Circle cx={60} cy={52} r={46} fill="#F6D8F7" opacity={0.45} />
        <Path d="M36 70 q-4 10 2 18 t0 16 M50 72 q4 10 -2 18 t2 14 M70 72 q-4 10 2 18 t-2 14 M84 70 q4 10 -2 18 t0 16" fill="none" stroke="#C97FCF" strokeWidth={3} strokeLinecap="round" />
        <Path d="M18 66 C16 38 36 18 60 18 C84 18 104 38 102 66 C88 74 32 74 18 66 Z" fill="#E4A6E8" {...ink} />
        <Path d="M22 64 q8 6 16 0 t16 0 t16 0 t16 0 t14 0" fill="none" {...ink} strokeWidth={2} />
      </>
    ),
  },
  gem: {
    name: 'Gem',
    color: '#7FD1C9',
    face: { eyes: [48, 72, 64, 4.6], cheeks: [37, 83, 74], mouth: 'M56 73 q4 4 8 0', blush: '#F29BB5', top: 12, neck: 84 },
    body: () => (
      <>
        {feet('#5FB8B0', 100)}
        <Path d="M60 12 L98 42 L92 88 L60 102 L28 88 L22 42 Z" fill="#7FD1C9" {...ink} />
        <Path d="M22 42 L60 52 L98 42 M60 12 L60 52 M60 52 L60 102" fill="none" stroke="#4FA79F" strokeWidth={1.8} />
        <Path d="M36 30 L46 36 L40 46 Z" fill="#E8FAF7" opacity={0.85} />
      </>
    ),
  },
  ember: {
    name: 'Ember',
    color: '#F27A4C',
    face: { eyes: [48, 72, 66, 4.6], cheeks: [36, 84, 76], mouth: 'M54 74 q6 6 12 0', blush: '#E2574C', top: 16, neck: 84 },
    body: () => (
      <>
        {feet('#E25E3A', 100)}
        <Path d="M60 8 C66 24 80 22 84 36 C90 30 92 22 90 18 C104 32 108 52 104 70 C100 92 84 102 60 102 C36 102 20 92 16 70 C12 50 22 34 32 28 C32 36 36 42 40 44 C40 30 48 18 60 8 Z" fill="#F27A4C" {...ink} />
        <Path d="M60 50 C66 60 76 64 74 78 C72 90 48 90 46 78 C44 66 54 62 60 50 Z" fill="#FFD36B" />
      </>
    ),
  },
  twinkle: {
    name: 'Twinkle',
    color: '#FFE27A',
    face: { eyes: [50, 70, 62, 4.6], cheeks: [40, 80, 71], mouth: 'M56 70 q4 4 8 0', blush: '#F59AC0', top: 8, neck: 80 },
    body: () => (
      <>
        <Path d="M60 6 L73 38 L108 40 L81 62 L91 98 L60 78 L29 98 L39 62 L12 40 L47 38 Z" fill="#FFE27A" {...ink} />
        <Path d="M16 12 v8 M12 16 h8 M102 10 v6 M99 13 h6 M104 84 v8 M100 88 h8" stroke="#E9B93A" strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
  frost: {
    name: 'Frost',
    color: '#DCEBF7',
    face: { eyes: [48, 72, 62, 4.6], cheeks: [36, 84, 72], mouth: 'M56 71 q4 4 8 0', blush: '#F29BB5', top: 24, neck: 82 },
    body: () => (
      <>
        <Path d="M44 30 l-6 -14 l10 8 l4 -16 l6 16 l6 -16 l4 16 l10 -8 l-6 14 Z" fill="#B9DDF5" {...ink} strokeWidth={2} />
        {feet('#DCEBF7')}
        <Path d="M18 74 C14 44 36 28 60 28 C84 28 106 44 102 74 C100 92 84 100 60 100 C36 100 20 92 18 74 Z" fill="#DCEBF7" {...ink} />
        <Path d="M22 80 C40 86 80 86 98 80 L96 90 C78 96 42 96 24 90 Z" fill="#5B8FD6" {...ink} strokeWidth={2} />
        <Path d="M76 88 l6 14 l6 -2 l-4 -14" fill="#5B8FD6" {...ink} strokeWidth={2} />
      </>
    ),
  },
};

const STAGE_SCALE: Record<Stage, number> = { egg: 1, baby: 0.72, teen: 0.86, adult: 1 };

// Small emblem an adult wears for the hours it was walked in.
function FormMark({ form }: { form: Form }) {
  if (form === 'sunrise') return <Circle cx={14} cy={16} r={6} fill="#F7C948" {...ink} strokeWidth={1.6} />;
  if (form === 'moonlight') return <Path d="M16 9 a7 7 0 1 0 6 11 a6 6 0 1 1 -6 -11 z" fill="#F7D774" {...ink} strokeWidth={1.6} />;
  if (form === 'daytime') return <Path d="M8 20 q0 -6 6 -6 q2 -5 8 -3 q5 0 5 5 q4 1 3 4 z" fill="#FFFFFF" {...ink} strokeWidth={1.6} />;
  return <Path d="M15 9 l2 5 5 .6 -3.8 3.4 1 5 -4.2 -2.5 -4.2 2.5 1 -5 -3.8 -3.4 5 -.6 z" fill="#F59AC0" {...ink} strokeWidth={1.4} />;
}

// Closet items drawn on the pet, placed from its face.
function Wearing({ items, face }: { items: string[]; face: Face }) {
  const [lx, rx, ey, r] = face.eyes;
  const cx = (lx + rx) / 2;
  return (
    <>
      {items.includes('balloon') && (
        <G>
          <Path d={`M104 ${face.neck} C110 70 102 54 106 40`} fill="none" stroke={INK} strokeWidth={1.2} />
          <Ellipse cx={106} cy={30} rx={10} ry={12} fill="#E86A5A" {...ink} strokeWidth={2} />
        </G>
      )}
      {(items.includes('scarf-gold') || items.includes('scarf')) && (
        <G>
          <Path d={`M${cx - 30} ${face.neck} Q${cx} ${face.neck + 12} ${cx + 30} ${face.neck} L${cx + 28} ${face.neck + 7} Q${cx} ${face.neck + 18} ${cx - 28} ${face.neck + 7} Z`} fill={items.includes('scarf-gold') ? '#F2C14E' : '#E86A5A'} {...ink} strokeWidth={2} />
          <Path d={`M${cx + 14} ${face.neck + 9} l4 14 l7 -2 l-3 -13`} fill={items.includes('scarf-gold') ? '#F2C14E' : '#E86A5A'} {...ink} strokeWidth={2} />
        </G>
      )}
      {items.includes('star-badge') && (
        <Path d={`M${cx + 18} ${face.neck + 2} l2.4 5 5.4 .7 -4 3.7 1 5.3 -4.8 -2.6 -4.8 2.6 1 -5.3 -4 -3.7 5.4 -.7 z`} fill="#FFE27A" {...ink} strokeWidth={1.4} />
      )}
      {items.includes('glasses') && (
        <G fill="none" {...ink} strokeWidth={2}>
          <Circle cx={lx} cy={ey} r={r + 4} fill="rgba(255,255,255,0.25)" />
          <Circle cx={rx} cy={ey} r={r + 4} fill="rgba(255,255,255,0.25)" />
          <Path d={`M${lx + r + 4} ${ey - 1} Q${cx} ${ey - 5} ${rx - r - 4} ${ey - 1}`} />
        </G>
      )}
      {items.includes('cap') && (
        <G>
          <Path d={`M${cx - 18} ${face.top + 8} Q${cx} ${face.top - 14} ${cx + 18} ${face.top + 8} Z`} fill="#5B8FD6" {...ink} strokeWidth={2} />
          <Path d={`M${cx + 10} ${face.top + 8} h18 q2 3 -2 4 h-16 z`} fill="#4472B8" {...ink} strokeWidth={2} />
        </G>
      )}
      {items.includes('crown') && (
        <Path d={`M${cx - 14} ${face.top + 6} l-2 -14 l8 6 l8 -11 l8 11 l8 -6 l-2 14 z`} fill="#F2C14E" {...ink} strokeWidth={2} />
      )}
      {items.includes('flower') && (
        <G>
          {[0, 72, 144, 216, 288].map((a) => (
            <Circle key={a} cx={cx + 22 + 5 * Math.cos((a * Math.PI) / 180)} cy={face.top + 6 + 5 * Math.sin((a * Math.PI) / 180)} r={4} fill="#F59AC0" {...ink} strokeWidth={1.2} />
          ))}
          <Circle cx={cx + 22} cy={face.top + 6} r={3} fill="#F7C948" />
        </G>
      )}
      {items.includes('night-glow') && <Path d="M20 30 a8 8 0 1 0 7 12 a6.5 6.5 0 1 1 -7 -12 z" fill="#F7D774" {...ink} strokeWidth={1.6} />}
    </>
  );
}

function FaceLayer({ face, mood, eyeScale }: { face: Face; mood: FaceMood; eyeScale: number }) {
  const [lx, rx, ey, r0] = face.eyes;
  const r = r0 * eyeScale;
  const asleep = mood === 'asleep';
  const droopy = mood === 'sleepy' || mood === 'weak';
  const mouth = mood === 'happy' && face.mouth ? face.mouth.replace(/q(\d+(\.\d+)?) (\d+(\.\d+)?)/, (_m, a, _b, c) => `q${a} ${Number(c) + 2}`) : face.mouth;
  return (
    <>
      {face.shine && (
        <Ellipse cx={face.shine[0]} cy={face.shine[1]} rx={7} ry={4} fill="#FFFFFF" opacity={0.5} transform={`rotate(${face.shine[2]} ${face.shine[0]} ${face.shine[1]})`} />
      )}
      <Ellipse cx={face.cheeks[0]} cy={face.cheeks[2]} rx={6} ry={3.6} fill={face.blush} opacity={0.8} />
      <Ellipse cx={face.cheeks[1]} cy={face.cheeks[2]} rx={6} ry={3.6} fill={face.blush} opacity={0.8} />
      {asleep ? (
        <Path d={`M${lx - r} ${ey} q${r} ${r * 0.9} ${2 * r} 0 M${rx - r} ${ey} q${r} ${r * 0.9} ${2 * r} 0`} fill="none" stroke="#2A2622" strokeWidth={2.4} strokeLinecap="round" />
      ) : (
        <>
          <Ellipse cx={lx} cy={ey} rx={r} ry={droopy ? r * 0.6 : r * 1.12} fill="#2A2622" />
          <Ellipse cx={rx} cy={ey} rx={r} ry={droopy ? r * 0.6 : r * 1.12} fill="#2A2622" />
          <Circle cx={lx + r * 0.35} cy={ey - r * 0.45} r={r * 0.38} fill="#FFFFFF" />
          <Circle cx={rx + r * 0.35} cy={ey - r * 0.45} r={r * 0.38} fill="#FFFFFF" />
          {droopy && <Path d={`M${lx - r - 1} ${ey - r * 0.5} h${2 * r + 2} M${rx - r - 1} ${ey - r * 0.5} h${2 * r + 2}`} stroke="#2A2622" strokeWidth={2} strokeLinecap="round" />}
        </>
      )}
      {mouth ? <Path d={mouth} fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /> : null}
    </>
  );
}

export function Egg({ size, wobble }: { size: number; wobble?: boolean }) {
  return (
    <Svg width={size} height={size * (150 / 132)} viewBox="0 0 132 150" accessibilityLabel="An egg with colourful spots" accessibilityRole="image">
      <Ellipse cx={66} cy={144} rx={34} ry={4} fill="#2A2622" opacity={0.12} />
      <Path d="M66 10 C34 10 16 62 16 92 C16 124 38 140 66 140 C94 140 116 124 116 92 C116 62 98 10 66 10 Z" fill="#F7F1E4" {...ink} />
      <G stroke={INK} strokeWidth={1.4}>
        <Circle cx={44} cy={104} r={7} fill="#F6B49B" />
        <Circle cx={86} cy={112} r={5} fill="#8ED6B8" />
        <Circle cx={82} cy={46} r={5.5} fill="#C3A6E6" />
        <Circle cx={60} cy={124} r={4} fill="#F7C948" />
        <Circle cx={96} cy={84} r={3.5} fill="#86C7EE" />
        <Circle cx={50} cy={66} r={3.5} fill="#F59AC0" />
      </G>
      {wobble && <Path d="M44 70 l9 8 l8 -10 l9 9 l8 -8" fill="none" {...ink} strokeWidth={1.8} />}
      <Path d="M34 70 q4 -18 16 -30" fill="none" stroke="#FFFFFF" strokeWidth={3.4} strokeLinecap="round" opacity={0.8} />
    </Svg>
  );
}

export interface MonsterProps {
  species?: string | null;
  stage?: Stage;
  mood?: FaceMood;
  form?: Form | null;
  equipped?: string[];
  size: number;
  ghost?: boolean;
  style?: StyleProp<ViewStyle>;
  label?: string;
}

// One monster drawing. `ghost` greys out a monster that isn't unlocked yet.
export const Monster = memo(function Monster({ species, stage = 'adult', mood = 'neutral', form, equipped = [], size, ghost, style, label }: MonsterProps) {
  if (stage === 'egg') {
    return (
      <View style={style}>
        <Egg size={size * 0.9} wobble />
      </View>
    );
  }
  const def = SPECIES[species ?? ''] ?? SPECIES.mochi;
  const scale = STAGE_SCALE[stage];
  // Little ones have bigger eyes for their size.
  const eyeScale = stage === 'baby' ? 1.25 : stage === 'teen' ? 1.1 : 1;
  const t = `translate(${60 - 60 * scale} ${104 - 104 * scale}) scale(${scale})`;
  return (
    <View
      style={[{ width: size, height: (size * 110) / 120, opacity: ghost ? 0.38 : 1 }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label ?? `${def.name}${mood === 'asleep' ? ', asleep' : ''}${ghost ? ', not met yet' : ''}`}
    >
      <Svg width="100%" height="100%" viewBox="0 0 120 110">
        <Ellipse cx={60} cy={104} rx={34 * scale} ry={4} fill="#2A2622" opacity={0.12} />
        <G transform={t}>
          {def.body()}
          <FaceLayer face={def.face} mood={mood} eyeScale={eyeScale} />
          {equipped.length > 0 && <Wearing items={equipped} face={def.face} />}
        </G>
        {stage === 'adult' && form && <FormMark form={form} />}
        {ghost && <Rect x={0} y={0} width={120} height={110} fill="#E7E0D2" opacity={0.55} />}
      </Svg>
    </View>
  );
});

export const speciesName = (id?: string | null) => SPECIES[id ?? '']?.name ?? 'Mochi';
