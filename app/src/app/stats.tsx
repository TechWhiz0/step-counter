import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons';
import { StatsChart, type ChartBar } from '@/components/StatsChart';
import { compact, fonts, Tap, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { dayKey } from '@/lib/dates';
import { haptic } from '@/lib/feel';
import { useSession } from '@/lib/session';

type Period = 'day' | 'week' | 'month';
interface HistoryDay {
  day: string;
  total: number;
  goalMet?: boolean;
  hourly?: number[];
}

const HISTORY_DAYS = 90;
const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 30 };
// How far back each view can page, given 90 days of history.
const MAX_OFFSET: Record<Period, number> = { day: HISTORY_DAYS - 1, week: Math.floor(HISTORY_DAYS / 7) - 1, month: Math.floor(HISTORY_DAYS / 30) - 1 };
const ACTIVE_HOUR = 250; // steps in an hour that count as an active hour
const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const daysAgo = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};
const fmt = (n: number) => Math.round(n).toLocaleString('en');
const short = (d: Date) => d.toLocaleDateString('en', { day: 'numeric', month: 'short' });
const hourName = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'am' : 'pm'}`;

function Segment({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const c = useColors();
  const items: { p: Period; label: string }[] = [
    { p: 'day', label: 'Day' },
    { p: 'week', label: 'Week' },
    { p: 'month', label: 'Month' },
  ];
  return (
    <View accessibilityRole="tablist" style={[styles.segment, { backgroundColor: c.surfaceAlt }]}>
      {items.map(({ p, label }) => {
        const on = p === value;
        return (
          <Pressable
            key={p}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (on) return;
              haptic.select();
              onChange(p);
            }}
            style={[styles.segItem, on && { backgroundColor: c.card, borderColor: c.border }]}
          >
            <Text style={[styles.segText, { color: on ? c.ink : c.muted }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'grass' | 'sky' | 'sun' | 'berry' }) {
  const c = useColors();
  const t = {
    grass: { bg: c.accentSoft, fg: c.accentText },
    sky: { bg: c.skySoft, fg: c.skyText },
    sun: { bg: c.goldSoft, fg: c.goldText },
    berry: { bg: c.berrySoft, fg: c.berryText },
  }[tone];
  return (
    <View style={[styles.kpi, { backgroundColor: t.bg }]} accessible accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`}>
      <Text style={[styles.kpiLabel, { color: t.fg }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: c.ink }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? (
        <Text style={[styles.kpiSub, { color: c.muted }]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function Card({ children, style }: { children: ReactNode; style?: object }) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>;
}

// Change against the previous period, as a small pill: green up, berry down.
function Delta({ now, before, what }: { now: number; before: number; what: string }) {
  const c = useColors();
  if (before <= 0) return null;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  return (
    <View style={[styles.delta, { backgroundColor: up ? c.accentSoft : c.berrySoft }]}>
      <Text style={[styles.deltaText, { color: up ? c.accentText : c.berryText }]}>
        {up ? '▲' : '▼'} {Math.abs(pct)}% vs {what}
      </Text>
    </View>
  );
}

export default function Stats() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const goal = user?.dailyGoal ?? 8000;
  const [period, setPeriod] = useState<Period>('week');
  const [offset, setOffset] = useState(0);
  const [history, setHistory] = useState<Map<string, HistoryDay>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ days: HistoryDay[] }>(`/steps/history?days=${HISTORY_DAYS}`);
      setHistory(new Map(res.days.filter((d) => d.day).map((d) => [d.day, d])));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const view = useMemo(() => {
    const len = PERIOD_DAYS[period];
    const start = offset * len; // days ago of the newest day in the window
    const window = (from: number) =>
      Array.from({ length: len }, (_, i) => {
        const date = daysAgo(from + len - 1 - i);
        const row = history.get(dayKey(date));
        return { date, total: row?.total ?? 0, hourly: row?.hourly ?? [] };
      });
    const days = window(start);
    const prev = start + len <= HISTORY_DAYS ? window(start + len) : [];
    const total = days.reduce((s, d) => s + d.total, 0);
    const prevTotal = prev.reduce((s, d) => s + d.total, 0);

    if (period === 'day') {
      const d = days[0];
      const hours = Array.from({ length: 24 }, (_, h) => d.hourly[h] ?? 0);
      const best = hours.reduce((bi, v, i) => (v > hours[bi] ? i : bi), 0);
      const active = hours.filter((h) => h >= ACTIVE_HOUR).length;
      const title = offset === 0 ? 'Today' : offset === 1 ? 'Yesterday' : d.date.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' });
      const bars: ChartBar[] = hours.map((v, h) => ({
        label: ['12a', '6a', '12p', '6p'][h / 6] ?? '',
        showLabel: h % 6 === 0,
        value: v,
        tip: `${hourName(h)} – ${hourName((h + 1) % 24)} · ${fmt(v)} steps`,
      }));
      return {
        title,
        total,
        prevTotal,
        compare: 'the day before',
        bars,
        chartGoal: undefined,
        kpis: [
          { label: 'Steps', value: fmt(total), sub: `${Math.round((total / goal) * 100)}% of goal`, tone: 'grass' as const },
          { label: 'To goal', value: total >= goal ? 'Done!' : fmt(goal - total), sub: total >= goal ? 'Goal reached' : 'steps left', tone: 'sun' as const },
          { label: 'Active hours', value: String(active), sub: `${ACTIVE_HOUR}+ steps an hour`, tone: 'sky' as const },
          { label: 'Best hour', value: hours[best] ? hourName(best) : '–', sub: hours[best] ? `${fmt(hours[best])} steps` : 'No steps yet', tone: 'berry' as const },
        ],
        chartTitle: 'Steps by hour',
      };
    }

    const goalDays = days.filter((d) => d.total >= goal).length;
    const best = days.reduce((b, d) => (d.total > b.total ? d : b), days[0]);
    const walked = days.filter((d) => d.total > 0).length;
    const first = days[0].date;
    const last = days[days.length - 1].date;
    const title =
      period === 'week'
        ? offset === 0
          ? 'Last 7 days'
          : offset === 1
            ? 'The 7 days before'
            : `${short(first)} – ${short(last)}`
        : offset === 0
          ? 'Last 30 days'
          : `${short(first)} – ${short(last)}`;
    const bars: ChartBar[] = days.map((d, i) => ({
      label: period === 'week' ? WEEKDAY[d.date.getDay()] : String(d.date.getDate()),
      showLabel: period === 'week' || i % 5 === 4 || i === 0,
      value: d.total,
      today: offset === 0 && i === days.length - 1,
      tip: `${d.date.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmt(d.total)} steps`,
    }));
    return {
      title,
      total,
      prevTotal,
      compare: period === 'week' ? 'previous 7 days' : 'previous 30 days',
      bars,
      chartGoal: goal,
      kpis: [
        { label: 'Total', value: compact(total), sub: `${fmt(total)} steps`, tone: 'grass' as const },
        { label: 'Daily average', value: fmt(total / days.length), sub: walked ? `${walked} of ${days.length} days walked` : 'No walks yet', tone: 'sky' as const },
        { label: 'Goal days', value: `${goalDays} / ${days.length}`, sub: `${fmt(goal)} a day`, tone: 'sun' as const },
        {
          label: 'Best day',
          value: best.total ? fmt(best.total) : '–',
          sub: best.total ? best.date.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' }) : 'No steps yet',
          tone: 'berry' as const,
        },
      ],
      chartTitle: period === 'week' ? 'Steps per day' : 'Daily steps this month',
    };
  }, [period, offset, history, goal]);

  // How many of the last 30 days hit the goal, for the consistency card.
  const consistency = useMemo(() => {
    const keys = Array.from({ length: 30 }, (_, i) => dayKey(daysAgo(i)));
    const hit = keys.filter((k) => (history.get(k)?.total ?? 0) >= goal).length;
    return { hit, of: keys.length };
  }, [history, goal]);

  const canOlder = offset < MAX_OFFSET[period];
  const canNewer = offset > 0;
  const page = (d: number) => {
    haptic.select();
    setOffset((o) => Math.min(MAX_OFFSET[period], Math.max(0, o + d)));
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={c.accent} />}
    >
      <View style={styles.header}>
        <Tap onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={[styles.back, { backgroundColor: c.card, borderColor: c.border }]}>
          <Icon.chevronLeft size={20} color={c.ink} />
        </Tap>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: c.accentText }]}>Your walking</Text>
          <Text style={[styles.title, { color: c.ink }]}>Stats</Text>
        </View>
      </View>

      <Segment
        value={period}
        onChange={(p) => {
          setPeriod(p);
          setOffset(0);
        }}
      />

      <View style={styles.pager}>
        <Tap
          onPress={() => page(1)}
          disabled={!canOlder}
          accessibilityRole="button"
          accessibilityLabel="Earlier"
          style={[styles.pageBtn, { backgroundColor: c.card, borderColor: c.border, opacity: canOlder ? 1 : 0.35 }]}
        >
          <Icon.chevronLeft size={18} color={c.ink} />
        </Tap>
        <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Text style={[styles.period, { color: c.ink }]}>{view.title}</Text>
          <Delta now={view.total} before={view.prevTotal} what={view.compare} />
        </View>
        <Tap
          onPress={() => page(-1)}
          disabled={!canNewer}
          accessibilityRole="button"
          accessibilityLabel="Later"
          style={[styles.pageBtn, { backgroundColor: c.card, borderColor: c.border, opacity: canNewer ? 1 : 0.35 }]}
        >
          <Icon.chevronRight size={18} color={c.ink} />
        </Tap>
      </View>

      {error ? (
        <Card style={{ padding: 14 }}>
          <Text style={[styles.note, { color: c.danger }]}>{error}</Text>
        </Card>
      ) : null}

      <View style={styles.kpis}>
        {view.kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </View>

      <Card style={{ padding: 14, gap: 4 }}>
        <Text style={[styles.h2, { color: c.ink }]}>{view.chartTitle}</Text>
        <StatsChart bars={view.bars} goal={view.chartGoal} emptyText={loading ? 'Loading…' : 'No steps in this period'} />
      </Card>

      <Card style={{ padding: 14, gap: 10 }}>
        <View style={styles.rowBetween}>
          <Text style={[styles.h2, { color: c.ink }]}>Consistency</Text>
          <Text style={[styles.note, { color: c.muted }]}>last 30 days</Text>
        </View>
        <View style={styles.dots} accessible accessibilityLabel={`Goal reached on ${consistency.hit} of the last 30 days`}>
          {Array.from({ length: 30 }, (_, i) => {
            const total = history.get(dayKey(daysAgo(29 - i)))?.total ?? 0;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: total >= goal ? c.flame : total > 0 ? c.goldSoft : c.surfaceAlt },
                  i === 29 && { borderWidth: 2, borderColor: c.flame },
                ]}
              />
            );
          })}
        </View>
        <Text style={[styles.note, { color: c.muted }]}>
          Goal reached on <Text style={{ color: c.ink, fontFamily: fonts.bodyHeavy }}>{consistency.hit}</Text> of the last {consistency.of} days. Best streak{' '}
          {user?.bestStreak ?? 0} days.
        </Text>
      </Card>

      <View style={styles.kpis}>
        <Kpi label="Lifetime" value={compact(user?.lifetimeSteps ?? 0)} sub="steps walked" tone="sky" />
        <Kpi label="Streak" value={`${user?.currentStreak ?? 0} days`} sub={`best ${user?.bestStreak ?? 0}`} tone="sun" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 18, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, includeFontPadding: false },
  segment: { flexDirection: 'row', borderRadius: 16, padding: 4, gap: 4 },
  segItem: { flex: 1, height: 40, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  period: { fontFamily: fonts.display, fontSize: 20, includeFontPadding: false },
  delta: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  deltaText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { flexGrow: 1, flexBasis: '45%', borderRadius: 18, padding: 12, gap: 2 },
  kpiLabel: { fontFamily: fonts.bodyHeavy, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  kpiValue: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, includeFontPadding: false },
  kpiSub: { fontFamily: fonts.body, fontSize: 12 },
  card: { borderWidth: 2, borderBottomWidth: 5, borderRadius: 22 },
  h2: { fontFamily: fonts.display, fontSize: 19, includeFontPadding: false },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dot: { width: 18, height: 18, borderRadius: 9 },
});
