import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, colors, ErrorText, Field, Muted } from '@/components/ui';
import { api } from '@/lib/api';
import type { Group } from '@/lib/types';

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
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
      {groups.length === 0 ? (
        <Muted>No groups yet. Join your batch or team with a code, or start a group and share its code.</Muted>
      ) : (
        groups.map((g) => (
          <Pressable key={g.id} onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}>
            <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>{g.name}</Text>
                <Muted>
                  {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'} · code {g.code}
                </Muted>
              </View>
              <Text style={{ fontSize: 22, color: colors.muted }}>›</Text>
            </Card>
          </Pressable>
        ))
      )}

      <ErrorText message={error} />
      <Card style={{ gap: 12 }}>
        <Text style={{ fontWeight: '800', fontSize: 16, color: colors.ink }}>Join a group</Text>
        <Field label="6-letter code" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" maxLength={6} />
        <Button label="Join" onPress={() => run('join')} busy={busy === 'join'} disabled={code.length !== 6} />
      </Card>
      <Card style={{ gap: 12 }}>
        <Text style={{ fontWeight: '800', fontSize: 16, color: colors.ink }}>Start a group</Text>
        <Field label="Group name" value={name} onChangeText={setName} maxLength={40} placeholder="e.g. Batch 42, Building 3" />
        <Button label="Create" kind="secondary" onPress={() => run('create')} busy={busy === 'create'} disabled={name.trim().length < 2} />
      </Card>
    </ScrollView>
  );
}
