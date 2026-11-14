import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { MeadowBackdrop } from '@/components/Doodles';
import { PetView } from '@/components/PetView';
import { Button, ErrorText, Field, Muted, Screen, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
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
      haptic.success();
      router.replace(pet ? '/(tabs)' : '/onboarding');
    } catch (e) {
      haptic.warn();
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
            <View style={{ alignItems: 'center' }}>
              <PetView look={{ stage: 'egg', form: null, traits: null, mood: 'neutral', equipped: [], stageProgress: 0.9 }} size={120} />
            </View>
            <Muted style={{ textAlign: 'center' }}>Your pet missed you. Log in to see how it's doing.</Muted>
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={submit} />
            <ErrorText message={error} />
            <Button label="Log in" onPress={submit} busy={busy} disabled={!email || !password} />
          </Screen>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
