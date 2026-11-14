import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, useColors } from '@/components/ui';
import { haptic } from '@/lib/feel';

export interface ChartBar {
  label: string; // shown under the bar when `showLabel` is set
  value: number;
  tip: string; // shown above the chart when the bar is tapped
  showLabel?: boolean;
  today?: boolean;
}

// Bars that grow in on change. A dashed line marks the goal; bars at or over it are grass, the rest mint.
// Tap a bar to read its value.
export function StatsChart({ bars, goal, height = 170, emptyText }: { bars: ChartBar[]; goal?: number; height?: number; emptyText: string }) {
  const c = useColors();
  const [picked, setPicked] = useState<number | null>(null);
  const grow = useRef(new Animated.Value(0)).current;
  const key = bars.map((b) => b.value).join(',');

  useEffect(() => {
    setPicked(null);
    grow.setValue(0);
    Animated.spring(grow, { toValue: 1, useNativeDriver: false, speed: 12, bounciness: 4 }).start();
  }, [key, grow]);

  const max = Math.max(1, goal ?? 0, ...bars.map((b) => b.value)) * 1.08;
  const empty = bars.every((b) => b.value === 0);
  const gap = bars.length > 20 ? 2 : bars.length > 10 ? 3 : 8;
  const tip = picked != null ? bars[picked]?.tip : null;

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.tipRow}>
        <Text style={[styles.tip, { flex: 1, color: tip ? c.ink : c.muted }]} numberOfLines={1}>
          {tip ?? (empty ? emptyText : 'Tap a bar to see its steps')}
        </Text>
        {goal ? (
          <View style={styles.legend}>
            <View style={[styles.legendLine, { borderColor: c.goldText }]} />
            <Text style={[styles.goalText, { color: c.goldText }]}>Goal {goal.toLocaleString('en')}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap }}>
        {goal ? (
          <View pointerEvents="none" style={[styles.goal, { bottom: (goal / max) * height, borderColor: c.goldText }]} />
        ) : null}
        {bars.map((b, i) => {
          const h = Math.max(4, (b.value / max) * height);
          const hit = goal ? b.value >= goal : b.value > 0;
          const on = picked === i;
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={b.tip}
              onPress={() => {
                haptic.select();
                setPicked(on ? null : i);
              }}
              style={{ flex: 1, height, justifyContent: 'flex-end' }}
            >
              <Animated.View
                style={{
                  height: grow.interpolate({ inputRange: [0, 1], outputRange: [4, h] }),
                  borderRadius: bars.length > 20 ? 3 : 8,
                  backgroundColor: b.value === 0 ? c.surfaceAlt : on ? c.skyBlue : hit ? c.accent : c.accentSoft,
                  borderWidth: b.today ? 2 : 0,
                  borderColor: c.accentDeep,
                }}
              />
            </Pressable>
          );
        })}
      </View>
      {/* Labels are centred under their bar but free to be wider than it, so short bars don't clip them. */}
      <View style={{ height: 16 }}>
        {bars.map((b, i) =>
          b.showLabel ? (
            <Text
              key={i}
              style={[styles.label, { left: `${((i + 0.5) / bars.length) * 100}%`, color: b.today ? c.accentText : c.muted }]}
              numberOfLines={1}
            >
              {b.label}
            </Text>
          ) : null,
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tipRow: { minHeight: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLine: { width: 16, borderTopWidth: 2, borderStyle: 'dashed' },
  tip: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  goal: { position: 'absolute', left: 0, right: 0, borderTopWidth: 2, borderStyle: 'dashed', zIndex: 1 },
  goalText: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  label: { position: 'absolute', width: 36, marginLeft: -18, textAlign: 'center', fontFamily: fonts.bodyHeavy, fontSize: 10 },
});
