import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { ServerSetting } from '@/components/ServerSetting';
import { Button, Card, ErrorText, Field, Muted, Text, ThemePicker, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { openHealthSettings } from '@/lib/health';
import { useSession } from '@/lib/session';
import type { User } from '@/lib/types';

export default function Settings() {
  const colors = useColors();
  const { user, setUser, signOut } = useSession();
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [goal, setGoal] = useState(String(user?.dailyGoal ?? 6000));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await api<{ user: User }>('/auth/me', { method: 'PATCH', body: { nickname: nickname.trim(), dailyGoal: Number(goal) } });
      setUser(res.user);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function deleteAccount() {
    Alert.alert('Delete your account?', 'Your pets, steps and items will be deleted for good. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api('/auth/me', { method: 'DELETE' });
            await signOut();
          } catch (e) {
            setError((e as Error).message);
          }
        },
      },
    ]);
  }

  const goalNum = Number(goal);
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: 12 }}>
        <Text style={{ fontWeight: '800', fontSize: 16, color: colors.ink }}>Appearance</Text>
        <ThemePicker />
      </Card>

      <Card style={{ gap: 12 }}>
        <Field label="Nickname" value={nickname} onChangeText={setNickname} maxLength={24} />
        <Field label="Daily step goal" value={goal} onChangeText={(t) => setGoal(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={5} />
        <ErrorText message={error} />
        {saved && <Text style={{ color: colors.good }}>Saved</Text>}
        <Button label="Save" onPress={save} busy={busy} disabled={nickname.trim().length < 2 || goalNum < 1000 || goalNum > 50000} />
      </Card>

      <Card>
        <Text style={{ fontWeight: '800', fontSize: 16, color: colors.ink }}>Your data</Text>
        <Muted>
          Step Pet reads only your hourly step counts. No location, heart rate or other health data. Leaderboards show your nickname and weekly
          steps only to people in your groups.
        </Muted>
        <Button label="Step access settings" kind="secondary" onPress={openHealthSettings} />
      </Card>

      <ServerSetting />
      <Button label="Log out" kind="secondary" onPress={signOut} />
      <Button label="Delete account" kind="danger" onPress={deleteAccount} />
      <Muted style={{ textAlign: 'center' }}>Signed in as {user?.email}</Muted>
    </ScrollView>
  );
}
