import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { EggHeader, MeadowBackdrop } from '@/components/Doodles';
import { Button, ErrorText, Field, Muted, Screen, useColors } from '@/components/ui';
import { api } from '@/lib/api';
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
      router.replace('/onboarding');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MeadowBackdrop height={110} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <Screen style={{ backgroundColor: 'transparent' }}>
            <EggHeader />
            <Field label="Nickname (shown on leaderboards)" value={nickname} onChangeText={setNickname} maxLength={24} autoCapitalize="words" />
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <Field label="Password (8+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
            <ErrorText message={error} />
            <Button label="Create account" onPress={submit} busy={busy} disabled={!nickname || !email || password.length < 8} />
            <Muted>We only ever read your step count. No location, no heart rate.</Muted>
          </Screen>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
