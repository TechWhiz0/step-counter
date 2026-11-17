import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Monster } from '@/components/Monster';
import { Button, DeskScreen, ErrorText, Field, Footer, T, useColors } from '@/components/paper';
import { api, deviceName } from '@/lib/api';
import { haptic } from '@/lib/feel';
import { useSession } from '@/lib/session';
import type { Pet, User } from '@/lib/types';

export default function Login() {
  const c = useColors();
  const { signIn } = useSession();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!login.trim() || !password) return setError('Type your username or email and your password.');
    setBusy(true);
    setError(null);
    try {
      const { token, user } = await api<{ token: string; user: User }>('/auth/login', { body: { login: login.trim(), password, device: deviceName } });
      haptic.success();
      await signIn(token, user);
      if (user.role === 'admin') return router.replace('/admin');
      // A walker without a pet yet (signed up but never finished) picks up where they left off.
      const { pet } = await api<{ pet: Pet | null }>('/pet').catch(() => ({ pet: {} as Pet }));
      router.replace(pet ? '/(tabs)' : '/onboarding');
    } catch (e) {
      haptic.warn();
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeskScreen
      back
      keyboard
      right="SIGN IN"
      footer={
        <Footer>
          <Button label="Sign in" onPress={submit} busy={busy} />
          <Button kind="link" label="New here? Get an egg" onPress={() => router.replace('/register')} />
        </Footer>
      }
    >
      <View style={{ paddingHorizontal: 32, paddingTop: 36, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ gap: 10 }}>
          <T v="display" style={{ fontSize: 36, lineHeight: 39 }}>
            Welcome{'\n'}back.
          </T>
          <T v="small" color={c.inkSoft}>
            Your pet kept your spot warm.
          </T>
        </View>
        <Monster species="mochi" size={104} />
      </View>
      <View style={{ paddingHorizontal: 32, paddingTop: 34, gap: 24 }}>
        <Field
          label="Username or email"
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          placeholder="@you or you@example.com"
          returnKeyType="next"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          onSubmitEditing={submit}
          returnKeyType="go"
        />
        <View style={{ alignItems: 'flex-end', marginTop: -14 }}>
          <Button kind="danger" label="Forgot password?" onPress={() => router.push({ pathname: '/forgot', params: { email: login.includes('@') ? login.trim() : '' } })} />
        </View>
        <ErrorText message={error} />
      </View>
    </DeskScreen>
  );
}
