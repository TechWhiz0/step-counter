import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { bandFor, SKY, useReducedMotion, type Band } from '@/lib/feel';

// Fixed star field so it doesn't jump between renders.
const STARS = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7) % 62,
  r: i % 4 === 0 ? 1.6 : 1,
}));

// A sky that matches the hour: warm at sunrise, blue by day, starry at night.
export function Sky({
  band = bandFor(new Date().getHours()),
  showOrb = false,
  children,
  style,
}: {
  band?: Band;
  showOrb?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const sky = SKY[band];
  const reduced = useReducedMotion();
  const twinkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (band !== 'moonlight' || reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(twinkle, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [band, reduced, twinkle]);

  return (
    <View style={[styles.wrap, { backgroundColor: sky.bottom }, style]}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky.top} />
            <Stop offset="1" stopColor={sky.bottom} />
          </LinearGradient>
          <RadialGradient id="glow" cx="50%" cy="58%" r="45%">
            <Stop offset="0" stopColor={sky.glow} stopOpacity={band === 'moonlight' ? 0.55 : 0.9} />
            <Stop offset="1" stopColor={sky.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#sky)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#glow)" />
      </Svg>
      {/* Sun or moon in its own square canvas so it stays round however the sky stretches. */}
      {showOrb && (
        <Svg style={styles.orb} width={ORB} height={ORB} viewBox="0 0 40 40">
          {band === 'moonlight' ? (
            <>
              <Circle cx="20" cy="20" r="13" fill="#F4F1E1" />
              <Circle cx="26" cy="15" r="11.5" fill={sky.top} />
            </>
          ) : (
            <Circle cx="20" cy="20" r="14" fill={band === 'sunrise' ? '#FFD27A' : '#FFE27A'} opacity={0.9} />
          )}
        </Svg>
      )}
      {band === 'moonlight' && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }]}>
          <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
            {STARS.map((s, i) => (
              <Circle key={i} cx={s.x} cy={s.y} r={s.r * 0.35} fill="#FFFFFF" />
            ))}
          </Svg>
        </Animated.View>
      )}
      {children}
    </View>
  );
}

const ORB = 56;

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  orb: { position: 'absolute', top: '30%', left: 18 },
});
