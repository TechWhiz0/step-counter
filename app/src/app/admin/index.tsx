import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { AdminFrame } from '@/components/AdminFrame';
import { Monster, speciesName } from '@/components/Monster';
import { ErrorText, Loading, Meta, T, fmt, fonts, useColors } from '@/components/paper';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import type { AdminOverview } from '@/lib/types';

const RANGES = [
  { days: 1, label: 'today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
];
const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : fmt(n));

function Stat({ label, value, note, right }: { label: string; value: string; note: string; right?: boolean }) {
  const c = useColors();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}, ${note}`}
      style={{ width: '50%', paddingVertical: 12, paddingLeft: right ? 16 : 0, borderBottomWidth: 1, borderBottomColor: c.rule, borderRightWidth: right ? 0 : 1, borderRightColor: c.rule }}
    >
      <Meta>{label}</Meta>
      <T v="num" style={{ fontSize: 22, marginTop: 4 }}>
        {value}
      </T>
      <T v="small">{note}</T>
    </View>
  );
}

export default function AdminOverviewScreen() {
  const c = useColors();
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (d: number) => {
    try {
      setData(await api<AdminOverview>(`/admin/overview?days=${d}`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load(days);
    }, [load, days]),
  );

  const note = days === 1 ? 'today' : `last ${days} days`;
  const series = data?.stepsPerDay.slice(-7) ?? [];
  const top = Math.max(1, ...series.map((s) => s.steps));
  const weekSteps = data?.stepsPerDay.reduce((s, d) => s + d.steps, 0) ?? 0;

  return (
    <AdminFrame
      title="Overview"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load(days);
            setRefreshing(false);
          }}
          tintColor={c.ink}
        />
      }
    >
      <View style={{ flexDirection: 'row', gap: 4, marginHorizontal: 22, marginTop: 6 }} accessibilityRole="radiogroup">
        {RANGES.map((r) => {
          const on = r.days === days;
          return (
            <Pressable
              key={r.days}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => {
                haptic.select();
                setDays(r.days);
              }}
              style={{ minHeight: 44, paddingHorizontal: 6, justifyContent: 'center' }}
            >
              <T style={{ fontFamily: on ? fonts.bodyBold : fonts.body, color: on ? c.ink : c.muted, textDecorationLine: on ? 'underline' : 'none' }}>{r.label}</T>
            </Pressable>
          );
        })}
      </View>
      <ErrorText message={error} style={{ marginHorizontal: 28, marginTop: 8 }} />
      {!data ? (
        <Loading kind="stats" />
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 28, marginTop: 6, borderTopWidth: 1, borderTopColor: c.ink }}>
            <Stat label="Walkers today" value={fmt(data.walkersToday)} note={`of ${fmt(data.users)} walkers`} />
            <Stat label="Avg steps" value={fmt(data.avgStepsToday)} note="today, so far" right />
            <Stat label="Eggs hatched" value={fmt(data.eggsHatched)} note={note} />
            <Stat label="Rare unlocks" value={fmt(data.rareUnlocks)} note={note} right />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/admin/review')}
            style={{ marginHorizontal: 28, marginTop: 14, minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: data.needsReview ? c.accent : c.rule, borderRadius: 14 }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: data.needsReview ? c.accent : c.sageSoft }} />
            <T style={{ flex: 1 }}>{data.needsReview ? `${data.needsReview} walker${data.needsReview === 1 ? '' : 's'} need a look` : 'Nothing waiting for review'}</T>
            {data.needsReview > 0 && <T style={{ color: c.accent, fontFamily: fonts.bodyBold }}>Review →</T>}
          </Pressable>

          <View style={{ marginHorizontal: 28, marginTop: 22 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Meta>Steps per day</Meta>
              <T v="small">{compact(weekSteps)} in range</T>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 80, marginTop: 10, borderBottomWidth: 1, borderBottomColor: c.ink }}>
              {series.map((s, i) => (
                <View key={s.day} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3, height: '100%' }} accessible accessibilityLabel={`${s.day}: ${fmt(s.steps)} steps by ${s.walkers} walkers`}>
                  <T v="small" style={{ fontSize: 9.5 }}>
                    {compact(s.steps)}
                  </T>
                  <View style={{ width: '100%', height: Math.max(2, Math.round((s.steps / top) * 56)), backgroundColor: i === series.length - 1 ? c.accent : c.ink, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
              {series.map((s) => (
                <T key={s.day} v="small" style={{ flex: 1, textAlign: 'center', fontSize: 10 }}>
                  {DAY_LETTER[new Date(`${s.day}T12:00:00`).getDay()]}
                </T>
              ))}
            </View>
          </View>

          <View style={{ marginHorizontal: 28, marginTop: 22 }}>
            <Meta>What hatches</Meta>
            {data.hatchesBySpecies.slice(0, 5).map((h) => (
              <View key={h.species} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 36 }}>
                <Monster species={h.species} size={30} />
                <T style={{ width: 64 }}>{speciesName(h.species)}</T>
                <View style={{ flex: 1, height: 4, backgroundColor: c.rule, borderRadius: 2 }}>
                  <View style={{ width: `${Math.round(h.share * 100)}%`, height: 4, backgroundColor: c.ink, borderRadius: 2 }} />
                </View>
                <T style={{ width: 38, textAlign: 'right' }}>{Math.round(h.share * 100)}%</T>
              </View>
            ))}
            {data.hatchesBySpecies.length === 0 && <T v="small">No eggs have hatched yet.</T>}
          </View>

          <View style={{ marginHorizontal: 28, marginTop: 22 }}>
            <Meta>Walkers per league</Meta>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              {data.leagues.map((l) => (
                <View key={l.tier} style={{ flex: 1 }}>
                  <T v="num" style={{ fontSize: 17 }}>
                    {fmt(l.walkers)}
                  </T>
                  <T v="small">{l.tier}</T>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </AdminFrame>
  );
}
