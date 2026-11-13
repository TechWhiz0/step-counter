import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Share, View } from 'react-native';
import { PetArt } from '@/components/PetView';
import { Button, ErrorText, Muted, Text, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import type { Group, LeaderboardRow } from '@/lib/types';

interface Board {
  group: Group;
  week: { from: string; to: string };
  hourlyCap: number;
  rows: LeaderboardRow[];
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function GroupScreen() {
  const colors = useColors();
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: board?.group.name ?? 'Leaderboard' }} />
      <FlatList
        data={board?.rows ?? []}
        keyExtractor={(r) => r.userId}
        contentContainerStyle={{ padding: 20, gap: 10 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        ListHeaderComponent={
          board ? (
            <View style={{ gap: 8, marginBottom: 6 }}>
              <Muted>
                This week ({board.week.from} to {board.week.to}). Steps above {board.hourlyCap.toLocaleString()} in one hour don't count.
              </Muted>
              <Button
                label={`Invite: code ${board.group.code}`}
                kind="secondary"
                onPress={() => Share.share({ message: `Join "${board.group.name}" on Step Pet with code ${board.group.code}` })}
              />
              <ErrorText message={error} />
            </View>
          ) : (
            <ErrorText message={error} />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            disabled={item.isMe}
            onPress={() => router.push({ pathname: '/friend/[userId]', params: { userId: item.userId } })}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: 16,
              backgroundColor: item.isMe ? colors.accentSoft : colors.card,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ width: 32, fontSize: 18, fontWeight: '800', color: colors.ink, textAlign: 'center' }}>
              {MEDALS[item.rank - 1] ?? item.rank}
            </Text>
            {item.pet ? <PetArt look={item.pet} size={52} /> : <View style={{ width: 52 }} />}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>
                {item.nickname}
                {item.isMe ? ' (you)' : ''}
              </Text>
              <Muted>🔥 {item.streak} day streak</Muted>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>{item.steps.toLocaleString()}</Text>
          </Pressable>
        )}
        ListFooterComponent={board ? <View style={{ marginTop: 16 }}><Button label="Leave group" kind="danger" onPress={leave} /></View> : undefined}
      />
    </View>
  );
}
