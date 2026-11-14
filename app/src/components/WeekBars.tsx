import { StyleSheet, Text, View } from 'react-native';
import { fonts, useColors } from './ui';

// Seven day bars for the Me screen. The best day is solid grass, other walking days a lighter green,
// days with no steps a short grey stub.
export function WeekBars({ days, height = 110 }: { days: { label: string; total: number }[]; height?: number }) {
  const c = useColors();
  const max = Math.max(1, ...days.map((d) => d.total));
  const best = days.reduce((b, d, i) => (d.total > days[b].total ? i : b), 0);
  const bestLabel = days[best]?.total ? `, best day ${days[best].total.toLocaleString('en')} steps` : '';
  const barMax = height - 22;
  return (
    <View accessibilityRole="image" accessibilityLabel={`Steps per day this week${bestLabel}`} style={[styles.row, { height }]}>
      {days.map((d, i) => {
        const isBest = i === best && d.total > 0;
        const h = d.total > 0 ? Math.max(12, (d.total / max) * barMax) : 8;
        return (
          <View key={i} style={styles.col}>
            <View
              style={{
                width: '100%',
                height: h,
                borderTopLeftRadius: d.total > 0 ? 8 : 4,
                borderTopRightRadius: d.total > 0 ? 8 : 4,
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 4,
                backgroundColor: d.total === 0 ? c.surfaceAlt : isBest ? c.accent : c.accent + '66',
              }}
            />
            <Text style={[styles.label, { color: isBest ? c.ink : c.muted }]}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
});
