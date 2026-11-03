import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from './ui';

// Ring from 0 to the daily goal, steps in the middle.
export function StepRing({ steps, goal, size = 150 }: { steps: number; goal: number; size?: number }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(steps / goal, 1);
  const met = steps >= goal;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.accentSoft} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={met ? colors.good : colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - p)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink }}>{steps.toLocaleString()}</Text>
      <Text style={{ fontSize: 13, color: colors.muted }}>{met ? 'goal reached!' : `of ${goal.toLocaleString()}`}</Text>
    </View>
  );
}
