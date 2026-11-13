import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PetView } from '@/components/PetView';
import { Button, ErrorText, Field, Muted, Text, Title, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { healthStatus, requestStepAccess, type HealthStatus } from '@/lib/health';
import { setupNotifications } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { syncSteps } from '@/lib/sync';
import type { User } from '@/lib/types';

const GOALS = [4000, 6000, 8000, 10000];
const HEALTH_CONNECT_STORE = 'market://details?id=com.google.android.apps.healthdata';

export default function Onboarding() {
  const colors = useColors();
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
      else setStep(1);
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
      router.replace('/(tabs)');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 18, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center' }}>
          <PetView look={{ stage: 'egg', form: null, traits: null, mood: 'neutral', equipped: [], stageProgress: step * 0.4 }} size={170} />
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
            <Button label="Check again" kind="secondary" onPress={() => healthStatus().then(setHealth)} />
          </>
        )}

        {step === 1 && (
          <>
            <Title>Name your egg</Title>
            <Muted>It hatches after your first 5,000 steps. What's inside is a surprise.</Muted>
            <Field label="Pet name" value={name} onChangeText={setName} maxLength={20} autoFocus />
            <Text style={{ fontWeight: '700', color: colors.ink }}>Daily step goal</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {GOALS.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGoal(g)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    backgroundColor: g === goal ? colors.accent : colors.accentSoft,
                  }}
                >
                  <Text style={{ color: g === goal ? colors.onAccent : colors.ink, fontWeight: '700' }}>{g.toLocaleString()}</Text>
                </Pressable>
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
            <Button label="Back" kind="secondary" onPress={() => setStep(1)} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
