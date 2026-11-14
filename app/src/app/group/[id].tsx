import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Alert, Animated, Easing, FlatList, RefreshControl, Share, StyleSheet, View } from 'react-native';
import { PetArt } from '@/components/PetView';
import { Button, ErrorText, Muted, Pill, radius, shadow, T, Tap, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { useReducedMotion } from '@/lib/feel';
import type { Palette } from '@/lib/theme';
import type { Group, LeaderboardRow } from '@/lib/types';

interface Board {
  group: Group;
  week: { from: string; to: string };
  hourlyCap: number;
  rows: LeaderboardRow[];
}

// Podium order on screen: 2nd, 1st, 3rd.
const PODIUM = [
  { rank: 2, height: 78, color: '#C9D3DF' },
  { rank: 1, height: 112, color: '#FFD27A' },
  { rank: 3, height: 58, color: '#F2B98C' },
];

const visit = (row: LeaderboardRow) => !row.isMe && router.push({ pathname: '/friend/[userId]', params: { userId: row.userId } });

export default function GroupScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBoard(await api<Board>(`/groups/${id}/leaderboard`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function leave() {
    Alert.alert('Leave group?', 'You can join again later with the code.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await api(`/groups/${id}/leave`, { method: 'POST' });
          router.back();
        },
      },
    ]);
  }

  const rows = board?.rows ?? [];
  const top = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: board?.group.name ?? 'Leaderboard' }} />
      <FlatList
        data={rest}
        keyExtractor={(r) => r.userId}
        contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 6 }}>
            <ErrorText message={error} />
            {board && (
              <>
                <Muted>
                  This week, {board.week.from} to {board.week.to}. Steps above {board.hourlyCap.toLocaleString()} in one hour don't count.
                </Muted>
                {top.length > 0 && <Podium rows={top} />}
                <Button
                  label={`Invite with code ${board.group.code}`}
                  kind="secondary"
                  icon={<Ionicons name="paper-plane" size={16} color={colors.accentDeep} />}
                  onPress={() => Share.share({ message: `Join "${board.group.name}" on Step Pet with code ${board.group.code}` })}
                />
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Tap disabled={item.isMe} onPress={() => visit(item)} scaleTo={0.98} style={[styles.row, item.isMe && styles.rowMe]}>
            <T v="number" style={styles.rank}>{item.rank}</T>
            {item.pet ? <PetArt look={item.pet} size={48} /> : <View style={{ width: 48 }} />}
            <View style={{ flex: 1 }}>
              <T v="h3">
                {item.nickname}
                {item.isMe ? ' (you)' : ''}
              </T>
              <Muted style={{ fontSize: 13 }}>🔥 {item.streak} day streak</Muted>
            </View>
            <T v="number" style={{ fontSize: 17 }}>{item.steps.toLocaleString()}</T>
          </Tap>
        )}
        ListFooterComponent={board ? <View style={{ marginTop: 16 }}><Button label="Leave group" kind="danger" onPress={leave} /></View> : undefined}
      />
    </View>
  );
}

// Top three stand on blocks that rise in when the board loads. Tap a friend's pet to visit.
function Podium({ rows }: { rows: LeaderboardRow[] }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const reduced = useReducedMotion();
  const rise = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.timing(rise, { toValue: 1, duration: 700, easing: Easing.out(Easing.back(1.4)), useNativeDriver: false }).start();
  }, [reduced, rise]);

  return (
    <View style={styles.podium}>
      {PODIUM.map((slot) => {
        const row = rows.find((r) => r.rank === slot.rank);
        if (!row) return <View key={slot.rank} style={{ flex: 1 }} />;
        return (
          <Tap key={slot.rank} disabled={row.isMe} onPress={() => visit(row)} style={styles.podiumCol} scaleTo={0.97}>
            {slot.rank === 1 && <T v="h2" style={{ marginBottom: -6 }}>👑</T>}
            {row.pet ? <PetArt look={row.pet} size={slot.rank === 1 ? 84 : 66} /> : <View style={{ height: 66 }} />}
            <T v="h3" numberOfLines={1} style={{ fontSize: 14 }}>{row.isMe ? 'You' : row.nickname}</T>
            <Pill tone="glass" style={{ alignSelf: 'center', paddingVertical: 2, backgroundColor: colors.surface }}>
              {row.steps.toLocaleString()}
            </Pill>
            <Animated.View
              style={[
                styles.block,
                { backgroundColor: slot.color, height: rise.interpolate({ inputRange: [0, 1], outputRange: [8, slot.height] }) },
              ]}
            >
              <T v="title" style={{ color: colors.ink, opacity: 0.7 }}>{slot.rank}</T>
            </Animated.View>
          </Tap>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow },
  rowMe: { backgroundColor: colors.accentSoft },
  rank: { width: 28, textAlign: 'center', fontSize: 17, color: colors.muted },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingTop: 8 },
  podiumCol: { flex: 1, alignItems: 'center', gap: 6 },
  block: { alignSelf: 'stretch', borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, alignItems: 'center', paddingTop: 8, marginTop: 4 },
});
