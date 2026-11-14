import { router } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PetView } from '@/components/PetView';
import { Button, Chip, ErrorText, Field, Muted, radius, T, Title, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import { healthStatus, requestStepAccess, type HealthStatus } from '@/lib/health';
import { setupNotifications } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { syncSteps } from '@/lib/sync';
import type { Palette } from '@/lib/theme';
import type { User } from '@/lib/types';

const GOALS = [
  { steps: 4000, name: 'Easy' },
  { steps: 6000, name: 'Steady' },
  { steps: 8000, name: 'Active' },
  { steps: 10000, name: 'Athlete' },
];
const HEALTH_CONNECT_STORE = 'market://details?id=com.google.android.apps.healthdata';

export default function Onboarding() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { setUser } = useSession();
  const [step, setStep] = useState(0);
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
        setStep(1);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotOn, i < step && styles.dotDone]} />
          ))}
        </View>
        <View style={styles.eggStage}>
          <PetView look={{ stage: 'egg', form: null, traits: null, mood: 'neutral', equipped: [], stageProgress: step * 0.4 }} size={170} onPet={() => {}} />
        </View>

        {step === 0 && (
          <>
            <Title>Your egg needs steps</Title>
            <Muted>
              Step Pet reads only your step count from {Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}. Nothing else: no location,
              no heart rate.
            </Muted>
            {health === 'missing' && Platform.OS === 'android' && (
              <Muted>Health Connect isn't on this phone yet. Install it first, then come back.</Muted>
            )}
            {health === 'update-required' && <Muted>Health Connect needs an update before Step Pet can use it.</Muted>}
            <ErrorText message={error} />
            {health !== 'ok' && Platform.OS === 'android' ? (
              <Button label="Get Health Connect" onPress={() => Linking.openURL(HEALTH_CONNECT_STORE)} />
            ) : (
              <Button label="Allow step access" onPress={allowSteps} busy={busy} />
            )}
            <Button label="Check again" kind="ghost" onPress={() => healthStatus().then(setHealth)} />
          </>
        )}

        {step === 1 && (
          <>
            <Title>Name your egg</Title>
            <Muted>It hatches after your first 5,000 steps. What's inside is a surprise.</Muted>
            <Field label="Pet name" value={name} onChangeText={setName} maxLength={20} autoFocus placeholder="e.g. Mochi" />
            <T v="label">Daily step goal</T>
            <View style={styles.goals}>
              {GOALS.map((g) => (
                <View key={g.steps} style={{ alignItems: 'center', gap: 4 }}>
                  <Chip label={g.steps.toLocaleString()} on={g.steps === goal} onPress={() => setGoal(g.steps)} />
                  <T v="small" style={{ fontSize: 12 }}>{g.name}</T>
                </View>
              ))}
            </View>
            <Button label="Next" onPress={() => setStep(2)} disabled={!name.trim()} />
          </>
        )}

        {step === 2 && (
          <>
            <Title>Join your campus group</Title>
            <Muted>Got a code from your batch, building or team? Enter it to see the weekly leaderboard. You can skip this.</Muted>
            <Field label="Group code (optional)" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" maxLength={6} />
            <ErrorText message={error} />
            <Button label={`Meet ${name.trim() || 'my egg'}`} onPress={finish} busy={busy} />
            <Button label="Back" kind="ghost" onPress={() => setStep(1)} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  scroll: { padding: 24, gap: 18, flexGrow: 1 },
  dots: { flexDirection: 'row', gap: 6, alignSelf: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotOn: { width: 28, backgroundColor: colors.accent },
  dotDone: { backgroundColor: colors.accentSoft },
  eggStage: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: radius.xl, paddingVertical: 12 },
  goals: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
