import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text, useColors } from './ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Ring from 0 to the daily goal, steps in the middle. It fills and counts up when the number changes.
export function StepRing({ steps, goal, size = 150 }: { steps: number; goal: number; size?: number }) {
  const colors = useColors();
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const met = steps >= goal;

  const progress = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) => setShown(Math.round(value)));
    Animated.timing(progress, { toValue: steps, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => progress.removeListener(id);
  }, [progress, steps]);

  const dashOffset = progress.interpolate({ inputRange: [0, Math.max(goal, 1)], outputRange: [c, 0], extrapolate: 'clamp' });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.accentSoft} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={met ? colors.gold : colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink }}>{shown.toLocaleString()}</Text>
      <Text style={{ fontSize: 13, color: colors.muted }}>{met ? 'goal reached!' : `of ${goal.toLocaleString()}`}</Text>
    </View>
  );
}
