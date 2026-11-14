import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, colors, ErrorText, Field, Muted, Pill, radius, shadow, T, Tap } from '@/components/ui';
import { api } from '@/lib/api';
import type { Group } from '@/lib/types';

// A stable colour per group so each one is easy to spot.
const TINTS = ['#FFB38A', '#8FD3F4', '#9EDB9A', '#FFD27A', '#F6A6B2', '#A8C5E8'];
const tintFor = (id: string) => TINTS[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % TINTS.length];
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<'join' | 'create' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ groups: Group[] }>('/groups');
      setGroups(res.groups);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function run(kind: 'join' | 'create') {
    setBusy(kind);
    setError(null);
    try {
      const { group } = await api<{ group: Group }>(kind === 'join' ? '/groups/join' : '/groups', {
        body: kind === 'join' ? { code } : { name },
      });
      setCode('');
      setName('');
      await load();
      router.push({ pathname: '/group/[id]', params: { id: group.id } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {groups.length === 0 ? (
        <Card style={styles.empty}>
          <T v="hero">👟</T>
          <T v="h2">Walk together</T>
          <Muted style={{ textAlign: 'center' }}>Join your batch or team with a code, or start a group and share its code.</Muted>
        </Card>
      ) : (
        groups.map((g) => (
          <Tap key={g.id} onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })} style={styles.row} scaleTo={0.98}>
            <View style={[styles.avatar, { backgroundColor: tintFor(g.id) }]}>
              <T v="h2" style={{ color: colors.ink }}>{initials(g.name)}</T>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <T v="h3" numberOfLines={1}>{g.name}</T>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Muted style={{ fontSize: 13 }}>
                  {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
                </Muted>
                <Pill tone="soft" style={{ paddingVertical: 2, paddingHorizontal: 8 }}>{g.code}</Pill>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.faint} />
          </Tap>
        ))
      )}

      <ErrorText message={error} />
      <Card style={{ gap: 14 }}>
        <T v="h2">Join a group</T>
        <Field label="6-letter code" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" maxLength={6} placeholder="ABC234" />
        <Button label="Join" onPress={() => run('join')} busy={busy === 'join'} disabled={code.length !== 6} />
      </Card>
      <Card style={{ gap: 14 }}>
        <T v="h2">Start a group</T>
        <Field label="Group name" value={name} onChangeText={setName} maxLength={40} placeholder="e.g. Batch 42, Building 3" />
        <Button label="Create" kind="secondary" onPress={() => run('create')} busy={busy === 'create'} disabled={name.trim().length < 2} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 14, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, ...shadow },
  avatar: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
