import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { GuideBubble, StepProgress } from '@/components/AuthArt';
import { Button, ErrorText, Field, Muted, Screen, T, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import { useSession } from '@/lib/session';
import type { User } from '@/lib/types';

export default function Register() {
  const colors = useColors();
  const { signIn } = useSession();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await api<{ token: string; user: User }>('/auth/register', { body: { nickname, email, password, timezone } });
      await signIn(res.token, res.user);
      haptic.success();
      router.replace('/onboarding');
    } catch (e) {
      haptic.warn();
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Four bars that fill as the password gets longer than the 8-character minimum.
  const strength = Math.min(4, Math.floor(password.length / 3));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Screen style={{ backgroundColor: 'transparent' }}>
          <StepProgress step={1} total={4} />
          <GuideBubble text="Hi, I'm Mossy! Make an account and I'll help you pick an egg." />
          <Field label="Nickname" hint="Shown on group leaderboards" value={nickname} onChangeText={setNickname} maxLength={24} autoCapitalize="words" />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <View style={{ gap: 8 }}>
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: i < strength ? (password.length >= 8 ? colors.accent : colors.gold) : colors.surfaceAlt,
                  }}
                />
              ))}
            </View>
            <T v="small" style={{ fontSize: 13 }}>{password.length >= 8 ? 'Looks good' : `${8 - password.length} more characters`}</T>
          </View>
          <ErrorText message={error} />
          <Button label="Create account" onPress={submit} busy={busy} disabled={!nickname || !email || password.length < 8} />
          <Button label="I have an account" kind="secondary" onPress={() => router.replace('/login')} />
          <Muted style={{ textAlign: 'center', fontSize: 13 }}>We only read your step count. No location, no heart rate.</Muted>
        </Screen>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
