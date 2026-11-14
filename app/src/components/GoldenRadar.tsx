import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '@/lib/feel';
import type { GoldenHint } from '@/lib/types';
import { Card, colors, T } from './ui';

const LOOK = {
  cold: { color: '#8FB3DA', period: 2600, title: 'Cold', line: 'No golden step nearby yet. Keep walking.' },
  warm: { color: colors.gold, period: 1500, title: 'Warmer…', line: 'A golden step is getting close.' },
  hot: { color: colors.accent, period: 800, title: 'Hot!', line: 'A golden step is only a short walk away.' },
  done: { color: colors.good, period: 0, title: 'All found', line: 'Every golden step today is found. New ones tomorrow.' },
};

const SIZE = 92;

// Pulses faster and warmer as you walk toward the next hidden golden step.
export function GoldenRadar({ golden, petName }: { golden?: GoldenHint; petName: string }) {
  const reduced = useReducedMotion();
  const rings = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const state = !golden ? null : golden.hint ?? (golden.found >= golden.total ? 'done' : 'cold');
  const look = LOOK[state ?? 'cold'];

  useEffect(() => {
    if (reduced || !look.period) return rings.forEach((r) => r.setValue(0));
    const loops = rings.map((r, i) => {
      r.setValue(0);
      return Animated.loop(
        Animated.sequence([
          Animated.delay((look.period / 3) * i),
          Animated.timing(r, { toValue: 1, duration: look.period, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
      );
    });
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [look.period, reduced, rings]);

  return (
    <Card style={styles.row}>
      <View style={styles.radar}>
        {rings.map((r, i) => (
          <Animated.View
            key={i}
            style={[
              styles.ring,
              {
                borderColor: look.color,
                opacity: r.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.8, 0] }),
                transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }],
              },
            ]}
          />
        ))}
        <View style={[styles.core, { backgroundColor: look.color }]}>
          <T v="h3" style={{ color: '#fff', fontSize: 18 }}>✦</T>
        </View>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <T v="label">Golden steps</T>
        <T v="h2">{state ? look.title : 'Hidden treasure'}</T>
        <T v="small">{state ? look.line : `Three hidden step numbers wait today. Reach one and ${petName} finds a surprise.`}</T>
        {golden && (
          <View style={styles.coins}>
            {Array.from({ length: golden.total }, (_, i) => (
              <View key={i} style={[styles.coin, i < golden.found && styles.coinFound]} />
            ))}
            <T v="small" style={{ fontSize: 13 }}>
              {golden.found} of {golden.total} found
            </T>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  radar: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 3 },
  core: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  coins: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  coin: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.gold },
  coinFound: { backgroundColor: colors.gold },
});
