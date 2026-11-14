import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ServerSetting } from '@/components/ServerSetting';
import { Button, Card, ErrorText, Field, Muted, radius, T, Tap, ThemePicker, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import { openHealthSettings } from '@/lib/health';
import { useSession } from '@/lib/session';
import type { Palette } from '@/lib/theme';
import type { User } from '@/lib/types';

const GOAL_STEP = 500;
const GOAL_MIN = 1000;
const GOAL_MAX = 50000;

export default function Settings() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, setUser, signOut } = useSession();
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [goal, setGoal] = useState(user?.dailyGoal ?? 6000);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = nickname.trim() !== user?.nickname || goal !== user?.dailyGoal;

  function bump(delta: number) {
    const next = Math.min(GOAL_MAX, Math.max(GOAL_MIN, goal + delta));
    if (next === goal) return haptic.warn();
    setGoal(next);
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await api<{ user: User }>('/auth/me', { method: 'PATCH', body: { nickname: nickname.trim(), dailyGoal: goal } });
      setUser(res.user);
      haptic.success();
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

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: 16 }}>
        <Field label="Nickname" value={nickname} onChangeText={(t) => (setNickname(t), setSaved(false))} maxLength={24} />
        <View style={{ gap: 8 }}>
          <T v="label">Daily step goal</T>
          <View style={styles.stepper}>
            <Tap onPress={() => bump(-GOAL_STEP)} style={styles.stepBtn} accessibilityLabel="Lower goal by 500">
              <Ionicons name="remove" size={22} color={colors.ink} />
            </Tap>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <T v="title" style={{ fontVariant: ['tabular-nums'] }}>{goal.toLocaleString()}</T>
              <Muted style={{ fontSize: 12 }}>steps a day</Muted>
            </View>
            <Tap onPress={() => bump(GOAL_STEP)} style={styles.stepBtn} accessibilityLabel="Raise goal by 500">
              <Ionicons name="add" size={22} color={colors.ink} />
            </Tap>
          </View>
        </View>
        <ErrorText message={error} />
        <Button label={saved && !dirty ? 'Saved' : 'Save changes'} onPress={save} busy={busy} disabled={!dirty || nickname.trim().length < 2} />
      </Card>

      <Card style={{ gap: 12 }}>
        <T v="h3">Appearance</T>
        <ThemePicker />
      </Card>

      <Card style={{ gap: 12 }}>
        <View style={styles.headRow}>
          <View style={styles.icon}>
            <Ionicons name="shield-checkmark" size={18} color={colors.good} />
          </View>
          <T v="h3">Your data</T>
        </View>
        <Muted>
          Step Pet reads only your hourly step counts. No location, heart rate or other health data. Leaderboards show your nickname and weekly
          steps only to people in your groups.
        </Muted>
        <Button label="Step access settings" kind="ghost" onPress={openHealthSettings} />
      </Card>

      <ServerSetting />
      <Button label="Log out" kind="ghost" onPress={signOut} />
      <Button label="Delete account" kind="danger" onPress={deleteAccount} />
      <Muted style={{ textAlign: 'center' }}>Signed in as {user?.email}</Muted>
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  scroll: { padding: 20, gap: 14, paddingBottom: 40 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: 8 },
  stepBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.goodSoft, alignItems: 'center', justifyContent: 'center' },
});
