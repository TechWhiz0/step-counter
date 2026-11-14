import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, View } from 'react-native';
import { bandFor, haptic, useReducedMotion, type Band } from '@/lib/feel';
import { FORM_LABEL } from '@/lib/petText';
import type { Form } from '@/lib/types';
import { Card, fonts, radius, T, useColors } from './ui';

const BAND_COLOR: Record<Band, string> = { sunrise: '#FF9A52', daytime: '#38B2E3', moonlight: '#35568A' };
const BAND_NAME: Record<Band, string> = { sunrise: 'Sunrise', daytime: 'Daytime', moonlight: 'Moonlight' };
const BAR_AREA = 96;
const DOMINANT_SHARE = 0.45; // matches the server rule

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'am' : 'pm'}`;

// Today's steps hour by hour, coloured by the time band that shapes the adult form.
// Drag across the bars to read any hour. Below: which form the last week of walks points to.
export function WalkRhythm({ hourly, weekSums, form, petName }: { hourly: number[]; weekSums: number[]; form: Form | null; petName: string }) {
  const c = useColors();
  const [picked, setPicked] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const grow = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  const now = new Date().getHours();
  const max = Math.max(...hourly, 1);

  useEffect(() => {
    if (reduced) return grow.setValue(1);
    grow.setValue(0);
    Animated.timing(grow, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [hourly, reduced, grow]);

  const lastPick = useRef<number | null>(null);
  const pickAt = (x: number) => {
    if (!width) return;
    const i = Math.max(0, Math.min(23, Math.floor((x / width) * 24)));
    if (i !== lastPick.current) {
      lastPick.current = i;
      haptic.select();
      setPicked(i);
    }
  };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
        // A vertical swipe belongs to the page scroll; only sideways drags stay on the bars.
        onPanResponderTerminationRequest: (_, g) => Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: (e) => pickAt(e.nativeEvent.locationX),
        onPanResponderMove: (e) => pickAt(e.nativeEvent.locationX),
        onPanResponderRelease: () => {
          // Let the reading linger, then return to the day overview.
          setTimeout(() => {
            lastPick.current = null;
            setPicked(null);
          }, 1800);
        },
      }),
    // pickAt only depends on width
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width],
  );

  const shares = useMemo(() => {
    const total = weekSums.reduce((a, b) => a + b, 0);
    const by: Record<Band, number> = { sunrise: 0, daytime: 0, moonlight: 0 };
    weekSums.forEach((s, h) => (by[bandFor(h)] += s));
    return { total, by };
  }, [weekSums]);

  const leading = (Object.keys(shares.by) as Band[]).reduce((a, b) => (shares.by[b] > shares.by[a] ? b : a));
  const leadShare = shares.total ? shares.by[leading] / shares.total : 0;
  const leaning: Form = leadShare >= DOMINANT_SHARE ? leading : 'balanced';

  const todayTotal = hourly.reduce((a, b) => a + b, 0);
  const headline =
    picked !== null
      ? `${hourLabel(picked)} – ${hourLabel((picked + 1) % 24)}`
      : todayTotal
        ? `Most steps at ${hourLabel(hourly.indexOf(max))}`
        : 'No steps yet today';

  return (
    <Card style={{ gap: 14 }}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <T v="label">Walk rhythm</T>
          <T v="h2">{headline}</T>
        </View>
        {picked !== null && (
          <View style={[styles.readout, { backgroundColor: BAND_COLOR[bandFor(picked)] }]}>
            <T v="h3" style={{ color: '#fff' }}>{hourly[picked].toLocaleString()}</T>
          </View>
        )}
      </View>

      <View
        {...pan.panHandlers}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={styles.bars}
        accessible
        accessibilityLabel="Steps by hour today. Drag to read an hour."
      >
        {hourly.map((h, i) => {
          const band = bandFor(i);
          const height = Math.max(4, (h / max) * BAR_AREA);
          const dim = picked !== null && picked !== i;
          return (
            <View key={i} style={styles.barSlot}>
              <Animated.View
                style={[
                  styles.bar,
                  {
                    height: grow.interpolate({ inputRange: [0, 1], outputRange: [4, height] }),
                    backgroundColor: h ? BAND_COLOR[band] : c.surfaceAlt,
                    opacity: dim ? 0.35 : i > now ? 0.4 : 1,
                  },
                  i === now && [styles.barNow, { borderColor: c.ink }],
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.axis}>
        {['12a', '6a', '12p', '6p', '12a'].map((l, i) => (
          <T key={i} v="small" style={[styles.axisText, { color: c.faint }]}>{l}</T>
        ))}
      </View>

      <View style={styles.compass}>
        {(['sunrise', 'daytime', 'moonlight'] as Band[]).map((b) => (
          <View
            key={b}
            style={{
              flex: shares.total ? Math.max(shares.by[b], shares.total * 0.02) : 1,
              backgroundColor: BAND_COLOR[b],
              opacity: shares.total ? 1 : 0.25,
            }}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {(['sunrise', 'daytime', 'moonlight'] as Band[]).map((b) => (
          <View key={b} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: BAND_COLOR[b] }]} />
            <T v="small" style={{ fontSize: 13 }}>
              {BAND_NAME[b]} {shares.total ? `${Math.round((shares.by[b] / shares.total) * 100)}%` : ''}
            </T>
          </View>
        ))}
      </View>
      <T v="small">
        {form
          ? `${petName} is ${FORM_LABEL[form].name.toLowerCase()} for good. ${FORM_LABEL[form].line}.`
          : shares.total
            ? `This week's walks point ${petName} toward the ${FORM_LABEL[leaning].name.toLowerCase()}.`
            : `When you walk decides ${petName}'s adult form. Your first walks will show up here.`}
      </T>
    </Card>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  readout: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  bars: { height: BAR_AREA, flexDirection: 'row', alignItems: 'flex-end' },
  barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '64%', borderRadius: 4 },
  barNow: { borderWidth: 1.5 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
  axisText: { fontSize: 11, fontFamily: fonts.bodyBold },
  compass: { height: 10, borderRadius: radius.pill, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
