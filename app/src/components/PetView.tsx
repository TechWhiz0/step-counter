import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Form, Mood, Stage, Traits } from '@/lib/types';

export interface PetLook {
  stage: Stage;
  form: Form | null;
  traits: Traits | null;
  mood: Mood;
  equipped: string[];
  stageProgress?: number; // egg cracks
}

const hsl = (h: number, s: number, l: number) => `hsl(${((h % 360) + 360) % 360}, ${s}%, ${l}%)`;

const STAGE_SCALE: Record<Stage, number> = { egg: 1, baby: 0.62, teen: 0.82, adult: 1 };
const SIZE_SCALE = { small: 0.9, medium: 1, large: 1.1 };

// Body centre, used by every part below.
const CX = 100;
const CY = 120;

// Marking positions on the body, used in order up to the markings count.
const SPOTS: [number, number][] = [
  [72, 128], [128, 132], [96, 150], [118, 104], [80, 104], [108, 160],
];

function Marking({ pattern, x, y, color }: { pattern: Traits['pattern']; x: number; y: number; color: string }) {
  switch (pattern) {
    case 'spots':
      return <Circle cx={x} cy={y} r={6} fill={color} />;
    case 'stripes':
      return <Path d={`M${x - 8} ${y - 3} Q${x} ${y + 4} ${x + 8} ${y - 3}`} stroke={color} strokeWidth={3.5} strokeLinecap="round" fill="none" />;
    case 'stars':
      return (
        <Polygon
          points={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
            .map((i) => {
              const r = i % 2 ? 3 : 7.5;
              const a = (Math.PI / 5) * i - Math.PI / 2;
              return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`;
            })
            .join(' ')}
          fill={color}
        />
      );
    case 'hearts':
      return <Path d={`M${x} ${y + 6} C${x - 9} ${y - 1} ${x - 5} ${y - 9} ${x} ${y - 4} C${x + 5} ${y - 9} ${x + 9} ${y - 1} ${x} ${y + 6}Z`} fill={color} />;
  }
}

function Ears({ ears, body, inner }: { ears: Traits['ears']; body: string; inner: string }) {
  switch (ears) {
    case 'bunny':
      return (
        <G>
          <Ellipse cx={78} cy={52} rx={11} ry={30} fill={body} transform="rotate(-12 78 52)" />
          <Ellipse cx={122} cy={52} rx={11} ry={30} fill={body} transform="rotate(12 122 52)" />
          <Ellipse cx={78} cy={54} rx={5} ry={20} fill={inner} transform="rotate(-12 78 54)" />
          <Ellipse cx={122} cy={54} rx={5} ry={20} fill={inner} transform="rotate(12 122 54)" />
        </G>
      );
    case 'cat':
      return (
        <G>
          <Polygon points="58,92 66,50 94,74" fill={body} />
          <Polygon points="142,92 134,50 106,74" fill={body} />
          <Polygon points="66,82 70,62 84,74" fill={inner} />
          <Polygon points="134,82 130,62 116,74" fill={inner} />
        </G>
      );
    case 'antenna':
      return (
        <G>
          <Line x1={100} y1={70} x2={100} y2={40} stroke={body} strokeWidth={4} strokeLinecap="round" />
          <Circle cx={100} cy={36} r={8} fill={inner} />
        </G>
      );
    default:
      return null;
  }
}

function Eyes({ eyes, mood }: { eyes: Traits['eyes']; mood: Mood }) {
  const ink = '#2B2233';
  if (mood === 'sleepy') {
    return (
      <G>
        <Path d="M74 112 Q82 118 90 112" stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Path d="M110 112 Q118 118 126 112" stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />
      </G>
    );
  }
  const eye = (x: number) => {
    switch (eyes) {
      case 'oval':
        return (
          <G key={x}>
            <Ellipse cx={x} cy={110} rx={6} ry={9} fill={ink} />
            <Circle cx={x + 2} cy={106} r={2.2} fill="#fff" />
          </G>
        );
      case 'sparkle':
        return (
          <G key={x}>
            <Circle cx={x} cy={110} r={9} fill={ink} />
            <Circle cx={x + 3} cy={106} r={3} fill="#fff" />
            <Circle cx={x - 3} cy={114} r={1.6} fill="#fff" />
          </G>
        );
      case 'dot':
        return <Circle key={x} cx={x} cy={111} r={4.5} fill={ink} />;
      default:
        return (
          <G key={x}>
            <Circle cx={x} cy={110} r={7} fill={ink} />
            <Circle cx={x + 2} cy={107} r={2.4} fill="#fff" />
          </G>
        );
    }
  };
  return <G>{[82, 118].map(eye)}</G>;
}

function Mouth({ mood }: { mood: Mood }) {
  const ink = '#2B2233';
  if (mood === 'happy') return <Path d="M90 124 Q100 138 110 124 Z" fill={ink} />;
  if (mood === 'sleepy') return <Ellipse cx={100} cy={128} rx={3.5} ry={2.5} fill={ink} />;
  return <Path d="M92 125 Q100 132 108 125" stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />;
}

// Signature of each adult form, drawn behind or around the body.
function FormBack({ form, hue }: { form: Form | null; hue: number }) {
  if (form === 'sunrise') {
    return (
      <G>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (Math.PI / 6) * i;
          return <Line key={i} x1={CX + 72 * Math.cos(a)} y1={CY - 10 + 72 * Math.sin(a)} x2={CX + 88 * Math.cos(a)} y2={CY - 10 + 88 * Math.sin(a)} stroke="#FFB547" strokeWidth={5} strokeLinecap="round" />;
        })}
        <Circle cx={CX} cy={CY - 10} r={66} fill="#FFD27A" opacity={0.45} />
      </G>
    );
  }
  if (form === 'moonlight') {
    return (
      <G>
        <Circle cx={CX} cy={CY - 6} r={74} fill={hsl(hue + 200, 45, 30)} opacity={0.25} />
        <Path d="M152 34 a16 16 0 1 0 14 24 a12 12 0 1 1 -14 -24Z" fill="#FFE9A8" />
        {[[38, 46], [164, 92], [30, 120]].map(([x, y]) => (
          <Circle key={`${x}-${y}`} cx={x} cy={y} r={2.5} fill="#FFE9A8" />
        ))}
      </G>
    );
  }
  if (form === 'balanced') {
    return (
      <G>
        <Path d="M50 116 C18 96 14 132 46 140 Z" fill="#fff" stroke={hsl(hue, 30, 75)} strokeWidth={2} />
        <Path d="M150 116 C182 96 186 132 154 140 Z" fill="#fff" stroke={hsl(hue, 30, 75)} strokeWidth={2} />
      </G>
    );
  }
  return null;
}

function FormFront({ form }: { form: Form | null }) {
  if (form !== 'daytime') return null;
  return (
    <G>
      <Path d="M100 72 C100 60 100 54 100 50" stroke="#4E9F3D" strokeWidth={3} strokeLinecap="round" />
      <Path d="M100 54 C88 40 76 50 84 58 C90 62 98 58 100 54Z" fill="#6CC04A" />
      <Path d="M100 50 C110 34 126 42 118 52 C112 58 104 54 100 50Z" fill="#83D65E" />
    </G>
  );
}

function Accessory({ item }: { item: string }) {
  switch (item) {
    case 'cap':
      return (
        <G>
          <Path d="M64 82 Q100 46 136 82 Z" fill="#E94F4F" />
          <Rect x={116} y={76} width={36} height={8} rx={4} fill="#C23B3B" />
        </G>
      );
    case 'crown':
      return <Polygon points="74,80 78,52 90,68 100,48 110,68 122,52 126,80" fill="#FFC531" stroke="#E0A100" strokeWidth={2} />;
    case 'bow':
      return (
        <G>
          <Path d="M120 72 L104 62 L104 82 Z" fill="#FF6FA8" />
          <Path d="M120 72 L136 62 L136 82 Z" fill="#FF6FA8" />
          <Circle cx={120} cy={72} r={5} fill="#E2508A" />
        </G>
      );
    case 'flower':
      return (
        <G>
          {[0, 72, 144, 216, 288].map((a) => (
            <Circle key={a} cx={76 + 7 * Math.cos((a * Math.PI) / 180)} cy={74 + 7 * Math.sin((a * Math.PI) / 180)} r={5.5} fill="#FFFFFF" />
          ))}
          <Circle cx={76} cy={74} r={4} fill="#FFC531" />
        </G>
      );
    case 'leaf':
      return <Path d="M120 70 C130 54 148 60 140 72 C134 80 124 78 120 70Z" fill="#6CC04A" />;
    case 'glasses':
      return (
        <G stroke="#2B2233" strokeWidth={3} fill="none">
          <Circle cx={82} cy={110} r={13} />
          <Circle cx={118} cy={110} r={13} />
          <Line x1={95} y1={110} x2={105} y2={110} />
        </G>
      );
    case 'headphones':
      return (
        <G>
          <Path d="M54 112 Q54 56 100 56 Q146 56 146 112" stroke="#3D3D5C" strokeWidth={6} fill="none" />
          <Rect x={44} y={102} width={16} height={26} rx={6} fill="#5B5BD6" />
          <Rect x={140} y={102} width={16} height={26} rx={6} fill="#5B5BD6" />
        </G>
      );
    case 'scarf':
    case 'scarf-gold': {
      const c = item === 'scarf' ? '#4A90E2' : '#FFC531';
      return (
        <G>
          <Path d="M58 140 Q100 156 142 140 L142 150 Q100 166 58 150 Z" fill={c} />
          <Rect x={118} y={148} width={12} height={24} rx={4} fill={c} />
        </G>
      );
    }
    case 'star-badge':
      return (
        <Polygon
          points={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
            .map((i) => {
              const r = i % 2 ? 4 : 9;
              const a = (Math.PI / 5) * i - Math.PI / 2;
              return `${66 + r * Math.cos(a)},${148 + r * Math.sin(a)}`;
            })
            .join(' ')}
          fill="#FFC531"
          stroke="#E0A100"
          strokeWidth={1.5}
        />
      );
    case 'balloon':
      return (
        <G>
          <Line x1={150} y1={150} x2={166} y2={70} stroke="#888" strokeWidth={1.5} />
          <Ellipse cx={168} cy={52} rx={16} ry={20} fill="#FF6F6F" />
        </G>
      );
    default:
      return null;
  }
}

function Egg({ progress = 0 }: { progress?: number }) {
  return (
    <G>
      <Ellipse cx={100} cy={176} rx={44} ry={8} fill="#000" opacity={0.08} />
      <Path d="M100 44 C140 44 152 110 150 132 C148 160 128 176 100 176 C72 176 52 160 50 132 C48 110 60 44 100 44Z" fill="#FFF6E5" stroke="#E8D7B5" strokeWidth={3} />
      <Circle cx={80} cy={96} r={7} fill="#F6C98A" />
      <Circle cx={118} cy={78} r={5} fill="#9BD3E8" />
      <Circle cx={124} cy={136} r={8} fill="#F6A6B2" />
      <Circle cx={74} cy={146} r={5} fill="#B9E29B" />
      {progress > 0.5 && <Path d="M70 110 L82 118 L90 108 L100 120 L110 110" stroke="#B89B6B" strokeWidth={2.5} fill="none" strokeLinejoin="round" />}
      {progress > 0.8 && <Path d="M110 110 L120 120 L130 112" stroke="#B89B6B" strokeWidth={2.5} fill="none" strokeLinejoin="round" />}
    </G>
  );
}

export function PetArt({ look, size = 220 }: { look: PetLook; size?: number }) {
  const { stage, traits, mood, form, equipped } = look;
  if (stage === 'egg' || !traits) {
    return (
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Egg progress={look.stageProgress} />
      </Svg>
    );
  }
  const hue = traits.hue;
  const body = hsl(hue, 70, 72);
  const belly = hsl(hue, 80, 88);
  const edge = hsl(hue, 45, 52);
  const mark = hsl(hue + 30, 65, 58);
  const inner = hsl(hue + 330, 80, 82);
  const shownForm = stage === 'adult' ? form : null;
  const scale = STAGE_SCALE[stage] * SIZE_SCALE[traits.size];
  // Scale around the feet so smaller pets still stand on the ground.
  const transform = `translate(${CX} 176) scale(${scale}) translate(${-CX} -176)`;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id="shine" cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#fff" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#fff" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <G transform={transform}>
        <FormBack form={shownForm} hue={hue} />
        <Ellipse cx={100} cy={178} rx={50} ry={8} fill="#000" opacity={0.08} />
        <Ears ears={traits.ears} body={body} inner={inner} />
        <Ellipse cx={76} cy={170} rx={16} ry={9} fill={edge} />
        <Ellipse cx={124} cy={170} rx={16} ry={9} fill={edge} />
        <Ellipse cx={CX} cy={CY} rx={58} ry={54} fill={body} stroke={edge} strokeWidth={3} />
        <Ellipse cx={CX} cy={CY + 18} rx={34} ry={26} fill={belly} />
        {SPOTS.slice(0, traits.markings).map(([x, y]) => (
          <Marking key={`${x}-${y}`} pattern={traits.pattern} x={x} y={y} color={mark} />
        ))}
        <Ellipse cx={CX} cy={CY} rx={58} ry={54} fill="url(#shine)" />
        <Eyes eyes={traits.eyes} mood={mood} />
        {traits.cheeks && (
          <G>
            <Ellipse cx={68} cy={124} rx={8} ry={5} fill="#FF8FA3" opacity={0.6} />
            <Ellipse cx={132} cy={124} rx={8} ry={5} fill="#FF8FA3" opacity={0.6} />
          </G>
        )}
        <Mouth mood={mood} />
        <FormFront form={shownForm} />
        {equipped.map((item) => (
          <Accessory key={item} item={item} />
        ))}
      </G>
    </Svg>
  );
}

// The pet with an idle animation: a bounce when awake, slow breathing when sleepy, a wobble as an egg.
export function PetView({ look, size = 220 }: { look: PetLook; size?: number }) {
  const t = useRef(new Animated.Value(0)).current;
  const sleepy = look.mood === 'sleepy';
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: sleepy ? 2200 : 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: sleepy ? 2200 : 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, sleepy]);

  const style =
    look.stage === 'egg'
      ? { transform: [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) }] }
      : sleepy
        ? { transform: [{ scaleY: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) }] }
        : { transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] };

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={style}>
        <PetArt look={look} size={size} />
      </Animated.View>
    </View>
  );
}
