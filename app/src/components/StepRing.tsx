import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useReducedMotion } from '@/lib/feel';
import { colors, fonts } from './ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Ring from 0 to the daily goal; the arc sweeps and the number counts up when steps change.
export function StepRing({ steps, goal, size = 150 }: { steps: number; goal: number; size?: number }) {
  const stroke = Math.round(size * 0.085);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const met = steps >= goal;
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(reduced ? steps : 0);

  useEffect(() => {
    const target = Math.min(steps / goal, 1);
    if (reduced) {
      progress.setValue(target);
      setShown(steps);
      return;
    }
    const id = progress.addListener(({ value }) => setShown(Math.round((value / Math.max(target, 0.0001)) * steps)));
    Animated.timing(progress, { toValue: target, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => setShown(steps));
    return () => progress.removeListener(id);
  }, [steps, goal, reduced, progress]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={met ? '#3FC488' : '#FFA45C'} />
            <Stop offset="1" stopColor={met ? colors.good : colors.accentDeep} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceAlt} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [c, 0] })}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: size * 0.2, color: colors.ink, fontVariant: ['tabular-nums'] }}>
        {shown.toLocaleString()}
      </Text>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: met ? colors.good : colors.muted }}>
        {met ? 'goal reached' : `of ${goal.toLocaleString()}`}
      </Text>
    </View>
  );
}
