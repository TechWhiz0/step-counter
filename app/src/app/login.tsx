import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { EggHeader, MeadowBackdrop } from '@/components/Doodles';
import { Button, ErrorText, Field, Screen, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Pet, User } from '@/lib/types';

export default function Login() {
  const colors = useColors();
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ token: string; user: User }>('/auth/login', { body: { email, password } });
      await signIn(res.token, res.user);
      const { pet } = await api<{ pet: Pet | null }>('/pet');
      router.replace(pet ? '/(tabs)' : '/onboarding');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MeadowBackdrop height={110} />
      <Screen style={{ backgroundColor: 'transparent' }}>
        <EggHeader />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
        <ErrorText message={error} />
        <Button label="Log in" onPress={submit} busy={busy} disabled={!email || !password} />
      </Screen>
    </View>
  );
}
