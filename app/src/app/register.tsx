import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Monster } from '@/components/Monster';
import { Button, DeskScreen, ErrorText, Field, Footer, T, useColors } from '@/components/paper';
import { api, ApiError, deviceName } from '@/lib/api';
import { haptic } from '@/lib/feel';
import { useSession } from '@/lib/session';
import type { User, UsernameCheck } from '@/lib/types';

const LOCAL = /^[a-z0-9_]*$/;

// Checks the username as it's typed (after a short pause), so "taken" shows before the button.
function useUsernameCheck(raw: string) {
  const [check, setCheck] = useState<UsernameCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const seq = useRef(0);
  const name = raw.trim().replace(/^@/, '').toLowerCase();
  useEffect(() => {
    setCheck(null);
    if (name.length < 3 || name.length > 20 || !LOCAL.test(name)) return;
    const mine = ++seq.current;
    setChecking(true);
    const t = setTimeout(() => {
      api<UsernameCheck>(`/auth/username?u=${encodeURIComponent(name)}`)
        .then((r) => mine === seq.current && setCheck(r))
        .catch(() => {})
        .finally(() => mine === seq.current && setChecking(false));
    }, 350);
    return () => clearTimeout(t);
  }, [name]);

  let status: 'ok' | 'bad' | null = null;
  let note: string | null = '3 to 20 letters, numbers or _';
  if (name.length && !LOCAL.test(name)) [status, note] = ['bad', 'Only letters, numbers and _'];
  else if (name.length > 20) [status, note] = ['bad', 'At most 20 characters'];
  else if (name.length && name.length < 3) note = 'At least 3 characters';
  else if (checking && !check) note = 'Checking…';
  else if (check?.available) [status, note] = ['ok', `@${name} is free. It's yours.`];
  else if (check?.reason === 'taken') [status, note] = ['bad', `@${name} is taken.${check.suggestions.length ? ` Try ${check.suggestions.map((s) => '@' + s).join(' or ')}` : ''}`];
  else if (check?.reason) [status, note] = ['bad', check.reason];
  return { name, status, note, ok: status === 'ok' };
}

export default function Register() {
  const c = useColors();
  const { signIn } = useSession();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const check = useUsernameCheck(username);
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const ready = check.ok && emailOk && password.length >= 8;

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    setEmailError(null);
    try {
      const { token, user } = await api<{ token: string; user: User }>('/auth/register', {
        body: {
          username: check.name,
          email: email.trim(),
          password,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          device: deviceName,
        },
      });
      haptic.success();
      await signIn(token, user);
      router.replace('/onboarding');
    } catch (e) {
      haptic.warn();
      const body = e instanceof ApiError ? e.body : {};
      if (body.field === 'email') setEmailError(e instanceof Error ? e.message : 'Email problem');
      else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeskScreen
      back
      keyboard
      right="NEW ACCOUNT"
      footer={
        <Footer>
          <Button label="Create account" onPress={submit} busy={busy} disabled={!ready} />
          <Button kind="link" label="Already walking? Sign in" onPress={() => router.replace('/login')} />
        </Footer>
      }
    >
      <View style={{ paddingHorizontal: 32, paddingTop: 30, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1, gap: 10 }}>
          <T v="display">Make your{'\n'}walking name.</T>
          <T v="small" color={c.inkSoft}>
            Friends and leagues see your username. Nobody else can have it.
          </T>
        </View>
        <Monster species="bop" size={84} />
      </View>
      <View style={{ paddingHorizontal: 32, paddingTop: 26, gap: 20 }}>
        <Field
          label="Username"
          prefix="@"
          value={username}
          onChangeText={(t) => setUsername(t.replace(/\s/g, '').toLowerCase())}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          textContentType="username"
          maxLength={21}
          status={check.status}
          hint={check.note}
          returnKeyType="next"
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
          error={emailError}
          hint="Only for signing in and resetting your password."
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password-new"
          textContentType="newPassword"
          placeholder="at least 8 letters"
          onSubmitEditing={submit}
          returnKeyType="go"
        />
        <ErrorText message={error} />
      </View>
    </DeskScreen>
  );
}
