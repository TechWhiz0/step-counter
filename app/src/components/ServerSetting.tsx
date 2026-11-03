import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { DEFAULT_API_URL, serverStore } from '@/lib/api';
import { Button, colors, ErrorText, Field, Muted } from './ui';

// Lets testers point the app at a different backend (a new Wi-Fi IP, or an ngrok URL) without a new build.
export function ServerSetting() {
  const [server, setServer] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    serverStore.get().then(setServer);
  }, []);

  async function test(url: string) {
    setStatus('Checking…');
    setError(null);
    try {
      const res = await fetch(`${url}/health`, { headers: { 'ngrok-skip-browser-warning': '1' } });
      setStatus(res.ok ? 'Connected ✓' : null);
      if (!res.ok) setError(`Server answered ${res.status}`);
      return res.ok;
    } catch {
      setStatus(null);
      setError("Can't reach it from this phone.");
      return false;
    }
  }

  async function save() {
    const url = draft.trim().replace(/\/+$/, '');
    if (!/^https?:\/\/.+/.test(url)) return setError('Start with http:// or https://');
    await serverStore.set(url);
    setServer(url);
    setEditing(false);
    await test(url);
  }

  if (!editing) {
    return (
      <Pressable
        onPress={() => {
          setDraft(server ?? DEFAULT_API_URL);
          setEditing(true);
        }}
        style={{ alignItems: 'center', paddingVertical: 6 }}
      >
        <Muted style={{ fontSize: 12 }}>Server: {server ?? '…'} (tap to change)</Muted>
        {status && <Text style={{ fontSize: 12, color: colors.good }}>{status}</Text>}
        <ErrorText message={error} />
      </Pressable>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <Field label="Server address" value={draft} onChangeText={setDraft} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
      <ErrorText message={error} />
      {status && <Text style={{ color: colors.good }}>{status}</Text>}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label="Test" kind="secondary" onPress={() => test(draft.trim().replace(/\/+$/, ''))} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Save" onPress={save} />
        </View>
      </View>
    </View>
  );
}
