import { useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LeagueBadge, leagueName } from '@/components/icons';
import { MonsterIcon, monsterTint } from '@/components/monsters';
import { PetArt } from '@/components/PetView';
import { ErrorText, fonts, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import type { LeagueBoard, LeagueRow } from '@/lib/types';

// Medal colours for the top three ranks.
const RANK_COLOR = ['#E0A000', '#8A93A3', '#C2703A'];

function Avatar({ row }: { row: LeagueRow }) {
  const c = useColors();
  const egg = row.stage === 'egg' || !row.species;
  return (
    <View style={[styles.avatar, { backgroundColor: egg ? c.surfaceAlt : monsterTint(row.species) }]}>
      {egg ? (
        <PetArt look={{ stage: 'egg', form: null, traits: null, mood: 'neutral', equipped: [] }} size={34} />
      ) : (
        <MonsterIcon species={row.species!} size={34} />
      )}
    </View>
  );
}

function ZoneLine({ label, color, line }: { label: string; color: string; line: string }) {
  return (
    <View accessible={false} style={styles.zone}>
      <View style={[styles.zoneRule, { backgroundColor: line }]} />
      <Text style={[styles.zoneText, { color }]}>{label}</Text>
      <View style={[styles.zoneRule, { backgroundColor: line }]} />
    </View>
  );
}

export default function Leagues() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [board, setBoard] = useState<LeagueBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setBoard(await api<LeagueBoard>('/leagues'));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} />}
    >
      {!board ? (
        error ? <ErrorText message={error} /> : <ActivityIndicator color={c.accent} style={{ marginTop: 80 }} />
      ) : (
        <>
          <View style={styles.hero}>
            <View style={styles.badges} accessible={false}>
              {board.tiers.map((t, i) => (
                <View key={t} style={{ opacity: i > board.tier ? 0.45 : 1 }}>
                  <LeagueBadge tier={t} size={i === board.tier ? 62 : 38} />
                </View>
              ))}
            </View>
            <Text style={[styles.title, { color: c.ink }]}>{leagueName(board.tierName)} League</Text>
            <Text style={[styles.sub, { color: c.muted }]}>
              {board.promoteTop > 0 ? `Top ${board.promoteTop} move up · ` : 'Top league · '}
              <Text style={{ color: c.ink, fontFamily: fonts.bodyHeavy }}>
                {board.daysLeft === 0 ? 'Last day' : `${board.daysLeft} ${board.daysLeft === 1 ? 'day' : 'days'} left`}
              </Text>
            </Text>
          </View>

          <View style={[styles.table, { backgroundColor: c.card, borderColor: c.border }]}>
            {board.rows.length === 0 && <Text style={[styles.empty, { color: c.muted }]}>No walkers here yet this week.</Text>}
            {board.rows.map((row, i) => {
              const prev = board.rows[i - 1];
              const showPromo = board.promoteTop > 0 && prev && prev.rank <= board.promoteTop && row.rank > board.promoteTop;
              const showDrop = board.dropFrom !== null && row.rank >= board.dropFrom && (!prev || prev.rank < board.dropFrom);
              const gap = prev && row.rank - prev.rank > 1;
              const dropping = board.dropFrom !== null && row.rank >= board.dropFrom;
              return (
                <Fragment key={row.userId}>
                  {gap && <Text style={[styles.gap, { color: c.faint }]}>· · ·</Text>}
                  {showPromo && <ZoneLine label="Promotion zone" color={c.accent} line={c.accent + '66'} />}
                  {showDrop && <ZoneLine label="Drop zone" color={c.danger} line={c.danger + '55'} />}
                  <View
                    accessibilityLabel={`Rank ${row.rank}, ${row.isMe ? 'you' : row.nickname}, ${row.steps.toLocaleString('en')} steps`}
                    style={[styles.row, row.isMe && { backgroundColor: c.accentSoft }, dropping && !row.isMe && { opacity: 0.75 }]}
                  >
                    {row.isMe && <View style={[styles.meBar, { backgroundColor: c.accent }]} />}
                    <Text style={[styles.rank, { color: RANK_COLOR[row.rank - 1] ?? c.muted }]}>{row.rank}</Text>
                    <Avatar row={row} />
                    <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>
                      {row.isMe ? 'You' : row.nickname}
                    </Text>
                    <Text style={[styles.steps, { color: row.isMe ? c.accentText : c.muted }]}>{row.steps.toLocaleString('en')}</Text>
                  </View>
                </Fragment>
              );
            })}
          </View>
          <ErrorText message={error} />
          <Text style={[styles.foot, { color: c.muted }]}>Steps above 2,500 in one hour don't count toward leagues.</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 18, paddingBottom: 32, gap: 12 },
  hero: { alignItems: 'center', gap: 6 },
  badges: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, includeFontPadding: false },
  sub: { fontFamily: fonts.body, fontSize: 14 },
  table: { borderWidth: 2, borderBottomWidth: 5, borderRadius: 22, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  meBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  rank: { width: 26, fontFamily: fonts.display, fontSize: 18, includeFontPadding: false },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontFamily: fonts.bodyHeavy, fontSize: 15 },
  steps: { fontFamily: fonts.bodyHeavy, fontSize: 14, fontVariant: ['tabular-nums'] },
  zone: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 14 },
  zoneRule: { flex: 1, height: 2 },
  zoneText: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  gap: { textAlign: 'center', fontFamily: fonts.bodyHeavy, paddingVertical: 2 },
  empty: { padding: 20, textAlign: 'center', fontFamily: fonts.bodySemi },
  foot: { textAlign: 'center', fontFamily: fonts.body, fontSize: 12 },
});
