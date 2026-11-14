import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AdminPage, BackButton, Segmented, SquareButton } from '@/components/admin/AdminChrome';
import { Icon } from '@/components/icons';
import { MonsterIcon } from '@/components/monsters';
import { Card, CardHeader, compact, ErrorText, fonts, Tap, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import type { AdminOverview } from '@/lib/types';

const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  const c = useColors();
  return (
    <Card style={styles.stat}>
      <Text style={[styles.statLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: c.ink }]}>{value}</Text>
      {note ? <Text style={[styles.statNote, { color: c.accentText }]}>{note}</Text> : null}
    </Card>
  );
}

// Steps per day as rounded columns; empty days sit as a flat stub.
function StepsChart({ data }: { data: AdminOverview['stepsPerDay'] }) {
  const c = useColors();
  const max = Math.max(1, ...data.map((d) => d.steps));
  const many = data.length > 10;
  const best = data.reduce((b, d, i) => (d.steps > data[b].steps ? i : b), 0);
  return (
    <View accessibilityRole="image" accessibilityLabel={`Steps per day, highest ${compact(data[best]?.steps ?? 0)}`} style={styles.chart}>
      {data.map((d, i) => {
        const h = d.steps ? Math.max(8, (d.steps / max) * 88) : 6;
        const letter = DAY_LETTER[new Date(`${d.day}T12:00:00`).getDay()];
        return (
          <View key={d.day} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View style={{ width: '100%', height: h, borderRadius: many ? 3 : 6, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: d.steps ? c.accent : c.surfaceAlt }} />
            {!many && <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 11, color: i === best ? c.ink : c.muted }}>{letter}</Text>}
          </View>
        );
      })}
    </View>
  );
}

export default function AdminOverviewScreen() {
  const c = useColors();
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      setError(null);
      api<AdminOverview>(`/admin/overview?days=${days}`)
        .then((d) => live && setData(d))
        .catch((e: Error) => live && setError(e.message));
      return () => {
        live = false;
      };
    }, [days]),
  );

  const totalHatched = data?.hatchesBySpecies.reduce((s, r) => s + r.count, 0) ?? 0;

  return (
    <AdminPage active="overview" reviewCount={data?.needsReview}>
      <View style={styles.header}>
        <BackButton />
        <MonsterIcon species="mochi" size={40} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: c.muted }]}>Step Pet admin</Text>
          <Text style={[styles.h1, { color: c.ink }]}>Overview</Text>
        </View>
        <SquareButton label="Search users" onPress={() => router.replace('/admin/users')}>
          <Icon.search size={20} color={c.ink} />
        </SquareButton>
      </View>

      <Segmented
        options={[
          { value: 1, label: 'Today' },
          { value: 7, label: '7 days' },
          { value: 30, label: '30 days' },
        ]}
        value={days}
        onChange={setDays}
      />

      <ErrorText message={error} />
      {!data ? (
        !error && <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.grid}>
            <Stat label="Walkers today" value={data.walkersToday.toLocaleString('en')} note={`of ${data.users.toLocaleString('en')} users`} />
            <Stat label="Avg steps" value={data.avgStepsToday.toLocaleString('en')} note="today" />
            <Stat label="Eggs hatched" value={data.eggsHatched.toLocaleString('en')} note={days === 1 ? 'today' : `last ${days} days`} />
            <Stat label="Rare unlocks" value={data.rareUnlocks.toLocaleString('en')} note={days === 1 ? 'today' : `last ${days} days`} />
          </View>

          <Card style={{ gap: 10, borderRadius: 20 }}>
            <CardHeader title="Steps per day" note={compact(data.stepsPerDay.reduce((s, d) => s + d.steps, 0)) + ' total'} />
            <StepsChart data={data.stepsPerDay} />
          </Card>

          <Card style={{ gap: 8, borderRadius: 20 }}>
            <CardHeader
              title="Needs a look"
              right={
                data.needsReview ? (
                  <Tap onPress={() => router.replace({ pathname: '/admin/users', params: { filter: 'flagged' } })}>
                    <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 13, color: c.accentText }}>Open</Text>
                  </Tap>
                ) : undefined
              }
            />
            {data.needsReview ? (
              <Tap
                onPress={() => router.replace({ pathname: '/admin/users', params: { filter: 'flagged' } })}
                style={[styles.alert, { backgroundColor: c.goldSoft }]}
                scaleTo={0.98}
              >
                <Icon.warning size={20} color={c.goldText} />
                <Text style={[styles.alertText, { color: c.goldText }]}>
                  {data.needsReview} step {data.needsReview === 1 ? 'anomaly' : 'anomalies'}
                </Text>
                <Icon.chevronRight size={16} color={c.goldText} />
              </Tap>
            ) : (
              <View style={[styles.alert, { backgroundColor: c.accentSoft }]}>
                <Icon.check size={20} color={c.accentText} />
                <Text style={[styles.alertText, { color: c.accentText }]}>Nothing waiting for review</Text>
              </View>
            )}
          </Card>

          {data.hatchesBySpecies.length > 0 && (
            <Card style={{ gap: 10, borderRadius: 20 }}>
              <CardHeader title="Hatches by monster" note={`${totalHatched.toLocaleString('en')} total`} />
              {data.hatchesBySpecies.slice(0, 6).map((r) => (
                <View key={r.species} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <MonsterIcon species={r.species} size={30} />
                  <Text style={{ width: 64, fontFamily: fonts.bodyHeavy, fontSize: 14, color: c.ink, textTransform: 'capitalize' }}>{r.species}</Text>
                  <View style={{ flex: 1, height: 12, borderRadius: 999, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.max(3, r.share * 100)}%`, height: 12, borderRadius: 999, backgroundColor: c.skyBlue }} />
                  </View>
                  <Text style={{ width: 40, textAlign: 'right', fontFamily: fonts.bodyHeavy, fontSize: 12, color: c.muted }}>{Math.round(r.share * 100)}%</Text>
                </View>
              ))}
            </Card>
          )}

          {data.topGroups.length > 0 && (
            <Card style={{ gap: 8, borderRadius: 20 }}>
              <CardHeader title="Top groups this week" />
              {data.topGroups.map((g, i) => (
                <View key={g.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                  <Text style={{ width: 20, fontFamily: fonts.display, fontSize: 18, color: c.muted }}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 15, color: c.ink }}>{g.name}</Text>
                    <Text style={{ fontFamily: fonts.body, fontSize: 12, color: c.muted }}>{g.members} members</Text>
                  </View>
                  <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 14, color: c.ink }}>{compact(g.steps)}</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kicker: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  h1: { fontFamily: fonts.display, fontSize: 24, includeFontPadding: false },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexBasis: '47%', flexGrow: 1, borderRadius: 18, padding: 12, gap: 2 },
  statLabel: { fontFamily: fonts.bodyHeavy, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  statValue: { fontFamily: fonts.display, fontSize: 26, includeFontPadding: false },
  statNote: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  chart: { height: 110, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14 },
  alertText: { flex: 1, fontFamily: fonts.bodyHeavy, fontSize: 14 },
});
