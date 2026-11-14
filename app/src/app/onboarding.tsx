import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EggArt, EggTile, GuideBubble, LockedEggTile, StepProgress, type EggKind } from '@/components/AuthArt';
import { Button, Chip, ErrorText, Field, fonts, T, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import { healthStatus, requestStepAccess, type HealthStatus } from '@/lib/health';
import { setupNotifications } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { syncSteps } from '@/lib/sync';
import type { User } from '@/lib/types';

const GOALS = [
  { steps: 4000, name: 'Easy' },
  { steps: 6000, name: 'Steady' },
  { steps: 8000, name: 'Active' },
  { steps: 10000, name: 'Athlete' },
];
const EGGS: { kind: EggKind; label: string }[] = [
  { kind: 'confetti', label: 'Confetti egg' },
  { kind: 'meadow', label: 'Meadow egg' },
  { kind: 'starry', label: 'Starry egg' },
];
const HEALTH_CONNECT_STORE = 'market://details?id=com.google.android.apps.healthdata';

// Sign-up is step 1 of 4; this screen covers 2 (pick an egg), 3 (step access) and 4 (name, goal, group).
export default function Onboarding() {
  const c = useColors();
  const { setUser } = useSession();
  const [step, setStep] = useState(0);
  const [egg, setEgg] = useState<EggKind>('confetti');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState(6000);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    healthStatus().then(setHealth).catch(() => setHealth('missing'));
  }, []);

  async function allowSteps() {
    setBusy(true);
    setError(null);
    try {
      const ok = await requestStepAccess();
      if (!ok) setError('Step access was not given. Your egg can only hatch from steps, so please allow it.');
      else {
        haptic.success();
        setStep(2);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<{ user: User }>('/auth/me', { method: 'PATCH', body: { dailyGoal: goal } });
      setUser(user);
      await api('/pet', { body: { name: name.trim() } });
      if (code.trim()) {
        try {
          await api('/groups/join', { body: { code: code.trim() } });
        } catch (e) {
          setBusy(false);
          return setError(`Group code: ${(e as Error).message}. Fix it or clear it to skip.`);
        }
      }
      await setupNotifications().catch(() => false);
      await syncSteps().catch(() => null);
      haptic.success();
      router.replace('/(tabs)');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const source = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <StepProgress step={step + 2} total={4} />

          {step === 0 && (
            <>
              <GuideBubble text="Pick an egg! What hatches depends on how you walk, so no two are the same." />
              <View accessibilityRole="radiogroup" accessibilityLabel="Choose an egg" style={styles.grid}>
                {EGGS.map((e) => (
                  <View key={e.kind} style={styles.cell}>
                    <EggTile kind={e.kind} label={e.label} on={egg === e.kind} onPress={() => setEgg(e.kind)} />
                  </View>
                ))}
                <View style={styles.cell}>
                  <LockedEggTile label="7-day streak" />
                </View>
              </View>
              <View style={{ flexGrow: 1 }} />
              <Button label="Hatch this one" onPress={() => setStep(1)} />
            </>
          )}

          {step === 1 && (
            <>
              <GuideBubble text={`Your egg hatches from steps, so I need to read your step count from ${source}.`} />
              <View style={[styles.eggCard, { backgroundColor: c.skySoft, borderColor: c.skyBlue }]}>
                <EggArt kind={egg} size={140} />
              </View>
              {health === 'missing' && Platform.OS === 'android' && (
                <T v="small">Health Connect isn't on this phone yet. Install it first, then come back.</T>
              )}
              {health === 'update-required' && <T v="small">Health Connect needs an update before Step Pet can use it.</T>}
              <ErrorText message={error} />
              <View style={{ flexGrow: 1 }} />
              {health !== 'ok' && Platform.OS === 'android' ? (
                <Button label="Get Health Connect" onPress={() => Linking.openURL(HEALTH_CONNECT_STORE)} />
              ) : (
                <Button label="Allow step access" onPress={allowSteps} busy={busy} />
              )}
              <Button label="Check again" kind="secondary" onPress={() => healthStatus().then(setHealth)} />
              <Button label="Back" kind="ghost" onPress={() => setStep(0)} />
            </>
          )}

          {step === 2 && (
            <>
              <GuideBubble text="Last bit! Name your egg and pick a daily goal. It hatches after 5,000 steps." />
              <View style={styles.nameRow}>
                <EggArt kind={egg} size={84} />
                <View style={{ flex: 1 }}>
                  <Field label="Egg name" value={name} onChangeText={setName} maxLength={20} placeholder="e.g. Mochi" />
                </View>
              </View>
              <T v="label">Daily step goal</T>
              <View style={styles.goals}>
                {GOALS.map((g) => (
                  <View key={g.steps} style={{ alignItems: 'center', gap: 4 }}>
                    <Chip label={g.steps.toLocaleString('en')} on={g.steps === goal} onPress={() => setGoal(g.steps)} />
                    <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 12, color: c.muted }}>{g.name}</Text>
                  </View>
                ))}
              </View>
              <Field
                label="Group code (optional)"
                hint="From your batch, building or team. You can skip this."
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                autoCapitalize="characters"
                maxLength={6}
              />
              <ErrorText message={error} />
              <View style={{ flexGrow: 1 }} />
              <Button label={`Meet ${name.trim() || 'my egg'}`} onPress={finish} busy={busy} disabled={!name.trim()} />
              <Button label="Back" kind="ghost" onPress={() => setStep(1)} />
            </>
          )}

          <Text style={[styles.privacy, { color: c.muted }]}>We only read your step count. No location, no heart rate.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, gap: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, rowGap: 12 },
  cell: { width: '50%', paddingHorizontal: 6 },
  eggCard: { alignItems: 'center', borderRadius: 24, borderWidth: 3, paddingVertical: 18 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  goals: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  privacy: { textAlign: 'center', fontFamily: fonts.body, fontSize: 13 },
});
