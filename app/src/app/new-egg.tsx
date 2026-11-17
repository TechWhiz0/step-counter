import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Monster } from '@/components/Monster';
import { Button, DeskScreen, ErrorText, Field, Footer, T, useColors } from '@/components/paper';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import { syncSteps } from '@/lib/sync';

// Once a pet is grown up a new monster joins, already hatched. Only the very first pet is an egg.
// Who comes is picked from the monsters the walker has unlocked; the grown-up moves to "Pets you raised".
export default function NewMonster() {
  const c = useColors();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function welcome() {
    if (!name.trim()) return setError('Give them a name.');
    setBusy(true);
    setError(null);
    try {
      await api('/pet/new', { body: { name: name.trim() } });
      await syncSteps().catch(() => null);
      haptic.celebrate();
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeskScreen
      back
      keyboard
      right="NEW FRIEND"
      footer={
        <Footer>
          <Button label="Welcome them" onPress={welcome} busy={busy} />
        </Footer>
      }
    >
      <View style={{ paddingHorizontal: 32, paddingTop: 36, gap: 12 }}>
        <T v="display">Someone new{'\n'}is coming.</T>
        <T color={c.inkSoft}>Your grown-up pet moves to Pets you raised. A new monster joins you today, picked from the ones you've unlocked by walking.</T>
        <View style={{ alignItems: 'center', marginVertical: 20 }}>
          <Monster species="mochi" size={124} ghost label="A new monster, still a surprise" />
        </View>
        <Field label="A name for them" value={name} onChangeText={setName} maxLength={20} placeholder="Pip" style={{ fontSize: 20 }} onSubmitEditing={welcome} returnKeyType="done" />
        <ErrorText message={error} />
      </View>
    </DeskScreen>
  );
}
