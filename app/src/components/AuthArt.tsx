import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { MonsterIcon } from './monsters';
import { Bar, fonts, Tap, useColors } from './ui';

// Art and small pieces shared by the sign-up flow (Quest Meadow "Welcome & pick your egg" board).

export type EggKind = 'confetti' | 'meadow' | 'starry';

const SHELL = 'M60 10c22 0 38 40 38 62 0 22-16 36-38 36S22 94 22 72c0-22 16-62 38-62z';

export function EggArt({ kind, size = 96 }: { kind: EggKind | 'locked'; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {kind !== 'locked' && <Ellipse cx={60} cy={110} rx={26} ry={5} fill="#1D2433" opacity={0.1} />}
      {kind === 'confetti' && (
        <>
          <Path d={SHELL} fill="#FFFDF7" stroke="#EADBC4" strokeWidth={2} />
          <Circle cx={48} cy={48} r={5} fill="#A98BFF" />
          <Circle cx={74} cy={40} r={4} fill="#5AAEF7" />
          <Circle cx={76} cy={74} r={6} fill="#FF9EC0" />
          <Circle cx={44} cy={84} r={4} fill="#FFC233" />
        </>
      )}
      {kind === 'meadow' && (
        <>
          <Path d={SHELL} fill="#E6F7E8" stroke="#BFE5C6" strokeWidth={2} />
          <Path d="M28 60q16-8 32 0t32 0" stroke="#5FCB79" strokeWidth={5} fill="none" />
          <Path d="M26 80q17-8 34 0t34 0" stroke="#5FCB79" strokeWidth={5} fill="none" />
        </>
      )}
      {kind === 'starry' && (
        <>
          <Path d={SHELL} fill="#2B3A5C" />
          <Path d="M74 36a10 10 0 1 1-10-10 7 7 0 0 0 10 10z" fill="#FFE08A" />
          <Circle cx={44} cy={62} r={2.5} fill="#fff" />
          <Circle cx={72} cy={80} r={2} fill="#fff" />
          <Circle cx={52} cy={90} r={1.6} fill="#fff" />
        </>
      )}
      {kind === 'locked' && (
        <>
          <Path d={SHELL} fill="#E3D49A" opacity={0.55} />
          <Rect x={44} y={60} width={32} height={26} rx={6} fill="#8A93A3" />
          <Path d="M50 60v-8a10 10 0 0 1 20 0v8" stroke="#8A93A3" strokeWidth={5} fill="none" />
        </>
      )}
    </Svg>
  );
}

// "2 / 4" progress bar at the top of the flow.
export function StepProgress({ step, total }: { step: number; total: number }) {
  const c = useColors();
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      accessibilityLabel={`Step ${step} of ${total}`}
    >
      <View style={{ flex: 1 }}>
        <Bar value={step / total} track={c.border} />
      </View>
      <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 13, color: c.muted }}>
        {step} / {total}
      </Text>
    </View>
  );
}

// Mossy, the guide, with a speech bubble.
export function GuideBubble({ text, species = 'mossy' }: { text: string; species?: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View accessibilityLabel="Mossy, your guide">
        <MonsterIcon species={species} size={72} />
      </View>
      <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: c.card, borderWidth: 2, borderColor: c.border }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22, color: c.ink }}>{text}</Text>
      </View>
    </View>
  );
}

// A selectable egg tile: sky outline and ledge when chosen, plain card otherwise.
export function EggTile({ kind, label, on, onPress }: { kind: EggKind; label: string; on: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Tap
      onPress={onPress}
      feedback="select"
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={{ paddingBottom: 5 }}
    >
      <View style={{ position: 'absolute', left: 0, right: 0, top: 5, bottom: 0, borderRadius: 24, backgroundColor: on ? c.skyBlue : c.border }} />
      <View
        style={{
          height: 176,
          borderRadius: 24,
          borderWidth: on ? 3 : 2,
          borderColor: on ? c.skyBlue : c.border,
          backgroundColor: on ? c.skySoft : c.card,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <EggArt kind={kind} />
        <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 16, color: c.ink }}>{label}</Text>
      </View>
    </Tap>
  );
}

export function LockedEggTile({ label }: { label: string }) {
  const c = useColors();
  return (
    <View
      accessibilityLabel={`Locked: Golden egg, unlock with a ${label}`}
      style={{
        height: 176,
        borderRadius: 24,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: c.inputBorder,
        backgroundColor: c.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <EggArt kind="locked" />
      <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 14, color: c.muted }}>{label}</Text>
    </View>
  );
}
