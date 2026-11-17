import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Egg, Monster } from '@/components/Monster';
import { Button, Choice, DeskScreen, ErrorText, Field, Footer, Icon, T, fmt, useColors } from '@/components/paper';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import { healthStatus, requestStepAccess, type HealthStatus } from '@/lib/health';
import { setupNotifications } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { beginLiveCounting, syncSteps } from '@/lib/sync';
import type { User } from '@/lib/types';

const GOALS = [
  { steps: 4000, note: 'a gentle start' },
  { steps: 6000, note: 'most days' },
  { steps: 8000, note: 'on the move' },
  { steps: 10000, note: 'always out' },
];
const HEALTH_CONNECT_STORE = 'market://details?id=com.google.android.apps.healthdata';

function Dots({ step }: { step: number }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} accessibilityLabel={`Step ${step + 1} of 3`}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: i === step ? 18 : 6, height: 4, borderRadius: 2, backgroundColor: i <= step ? c.deskText : '#5E574E' }} />
      ))}
      <T v="meta" color={c.deskText} style={{ marginLeft: 6 }}>
        {`${step + 1} / 3`}
      </T>
    </View>
  );
}

export default function Onboarding() {
  const c = useColors();
  const { setUser, status } = useSession();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(6000);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    healthStatus().then(setHealth).catch(() => setHealth('missing'));
  }, []);
  useEffect(() => {
    if (status === 'signedOut') router.replace('/welcome');
  }, [status]);

  async function allowSteps() {
    setBusy(true);
    setError(null);
    try {
      const ok = await requestStepAccess();
      if (!ok) setError('Step access was not given. You can still go on: Step Pet counts with the phone while the app is open.');
      else haptic.success();
      if (ok) setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!name.trim()) return setError('Give your egg a name.');
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<{ user: User }>('/auth/me', { method: 'PATCH', body: { dailyGoal: goal } });
      setUser(user);
      await api('/pet', { body: { name: name.trim() } }).catch((e) => {
        // Already has a pet (finished on another phone): carry on.
        if ((e as { status?: number }).status !== 409) throw e;
      });
      await setupNotifications().catch(() => false);
      await beginLiveCounting();
      await syncSteps().catch(() => null);
      haptic.celebrate();
      router.replace('/(tabs)');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const source = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';
  const needsApp = health !== null && health !== 'ok' && Platform.OS === 'android';

  return (
    <DeskScreen
      back={step > 0 ? () => setStep((s) => s - 1) : undefined}
      keyboard
      right={<Dots step={step} />}
      footer={
        <Footer>
          {step === 0 && <Button label="Next" onPress={() => setStep(1)} />}
          {step === 1 &&
            (needsApp ? (
              <Button label={health === 'update-required' ? 'Update Health Connect' : 'Get Health Connect'} onPress={() => Linking.openURL(HEALTH_CONNECT_STORE)} />
            ) : (
              <Button label="Allow step access" onPress={allowSteps} busy={busy} />
            ))}
          {step === 1 && <Button kind="link" label="Not now" onPress={() => setStep(2)} />}
          {step === 2 && <Button label="Lay the egg" onPress={finish} busy={busy} />}
        </Footer>
      }
    >
      {step === 0 && (
        <View style={{ paddingHorizontal: 32, paddingTop: 36, gap: 12 }}>
          <T v="display">How far do you{'\n'}walk most days?</T>
          <T color={c.inkSoft}>This becomes your daily goal. Pick what feels easy. You can change it any time.</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 }} accessibilityRole="radiogroup">
            {GOALS.map((g) => (
              <Choice key={g.steps} on={goal === g.steps} onPress={() => setGoal(g.steps)} label={`${fmt(g.steps)} steps, ${g.note}`} style={{ width: '47%', height: 96, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <T v="num">{fmt(g.steps)}</T>
                <T v="small">{g.note}</T>
              </Choice>
            ))}
          </View>
        </View>
      )}

      {step === 1 && (
        <View style={{ paddingHorizontal: 32, paddingTop: 36, gap: 12 }}>
          <T v="display">Let Step Pet{'\n'}count your steps</T>
          <T color={c.inkSoft}>
            Your phone already counts them in {source}. Step Pet reads the step count only, nothing else, and keeps counting while the app is closed.
          </T>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginVertical: 18 }}>
            <Monster species="bop" size={96} />
            <Monster species="drip" size={96} />
          </View>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Icon name="check" color={c.sage} />
              <T>Steps per hour, last 7 days</T>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Icon name="cross" color={c.muted} />
              <T style={{ textDecorationLine: 'line-through', color: c.muted }}>Location, heart rate, anything else</T>
            </View>
          </View>
          {needsApp && (
            <T v="small" color={c.accent}>
              {health === 'update-required' ? 'Health Connect needs an update before Step Pet can use it.' : "Health Connect isn't on this phone yet. Install it, then come back."}
            </T>
          )}
          <ErrorText message={error} />
        </View>
      )}

      {step === 2 && (
        <View style={{ paddingHorizontal: 32, paddingTop: 36, gap: 12 }}>
          <T v="display">Name your egg.</T>
          <T color={c.inkSoft}>It hatches after 5 000 steps. Who comes out depends on how you walk.</T>
          <View style={{ alignItems: 'center', marginVertical: 18 }}>
            <Egg size={124} />
          </View>
          <Field label="A name for it" value={name} onChangeText={setName} maxLength={20} placeholder="Mochi" style={{ fontSize: 20 }} onSubmitEditing={finish} returnKeyType="done" />
          <ErrorText message={error} />
        </View>
      )}
    </DeskScreen>
  );
}
