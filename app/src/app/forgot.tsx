import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { Monster } from '@/components/Monster';
import { Button, DeskScreen, ErrorText, Field, Footer, T, useColors } from '@/components/paper';
import { api, deviceName } from '@/lib/api';
import { haptic } from '@/lib/feel';
import { useSession } from '@/lib/session';
import type { User } from '@/lib/types';

const RESEND_SECONDS = 45;

function Envelope() {
  return (
    <Svg width={180} height={126} viewBox="0 0 200 140" accessibilityRole="image" accessibilityLabel="A sealed envelope">
      <G stroke="#3A2F2A" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round">
        <Rect x={14} y={16} width={172} height={112} rx={6} fill="#F6F1E6" />
        <Path d="M14 22 L100 84 L186 22" fill="none" />
        <Path d="M14 122 L80 70 M186 122 L120 70" fill="none" opacity={0.5} />
        <Circle cx={100} cy={84} r={17} fill="#C2553A" />
      </G>
      <Path d="M93 84 q7 -10 14 0 q-7 8 -14 0 z" fill="#E98C6E" />
    </Svg>
  );
}

export default function Forgot() {
  const c = useColors();
  const { signIn } = useSession();
  const params = useLocalSearchParams<{ email?: string }>();
  const [stage, setStage] = useState<'ask' | 'code'>('ask');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wait) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Type the email you signed up with.');
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ minutes: number }>('/auth/forgot', { body: { email: email.trim() } });
      setMinutes(r.minutes);
      setStage('code');
      setWait(RESEND_SECONDS);
      haptic.success();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!/^\d{6}$/.test(code.trim())) return setError('The code is the 6 digits in the email.');
    if (password.length < 8) return setError('The new password needs at least 8 characters.');
    setBusy(true);
    setError(null);
    try {
      const { token, user } = await api<{ token: string; user: User }>('/auth/reset', {
        body: { email: email.trim(), code: code.trim(), password, device: deviceName },
      });
      haptic.success();
      await signIn(token, user);
      router.replace('/');
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
      right="NEW PASSWORD"
      footer={
        <Footer>
          {stage === 'ask' ? (
            <>
              <Button label="Send the code" onPress={send} busy={busy} />
              <Button kind="link" label="I remember it now" onPress={() => router.back()} />
            </>
          ) : (
            <>
              <Button label="Set new password" onPress={reset} busy={busy} />
              <Button
                kind="link"
                label={wait ? `Send another in 0:${String(wait).padStart(2, '0')}` : 'Send another code'}
                disabled={!!wait || busy}
                onPress={send}
              />
            </>
          )}
        </Footer>
      }
    >
      {stage === 'ask' ? (
        <View style={{ paddingHorizontal: 32, paddingTop: 36, gap: 14 }}>
          <T v="display">Lost your key?</T>
          <T color={c.inkSoft}>Type the email you signed up with. We'll send a 6-digit code to choose a new password. Your pet and steps stay just as they are.</T>
          <View style={{ alignItems: 'center', marginVertical: 14 }}>
            <Monster species="pip" size={118} />
          </View>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <ErrorText message={error} />
        </View>
      ) : (
        <View style={{ paddingHorizontal: 32, paddingTop: 36, gap: 14 }}>
          <T v="display">It's in the post.</T>
          <T color={c.inkSoft}>
            If an account uses {email.trim()}, a code is on its way. It works for {minutes} minutes. Check spam if it's slow.
          </T>
          <View style={{ alignItems: 'center', marginVertical: 6 }}>
            <Envelope />
          </View>
          <Field
            label="6-digit code"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            placeholder="000000"
            style={{ letterSpacing: 6, fontSize: 20 }}
          />
          <Field
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password-new"
            placeholder="at least 8 letters"
            onSubmitEditing={reset}
            returnKeyType="go"
          />
          <T v="small">Setting a new password signs you out on your other phones.</T>
          <ErrorText message={error} />
          <Button kind="link" label="Use a different email" onPress={() => setStage('ask')} />
        </View>
      )}
    </DeskScreen>
  );
}
