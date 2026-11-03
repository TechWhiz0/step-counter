import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { PetView } from '@/components/PetView';
import { Button, ErrorText, Field, Muted, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { syncSteps } from '@/lib/sync';

export default function NewEgg() {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await api('/pet/new-egg', { body: { name: name.trim() } });
      await syncSteps().catch(() => null);
      router.dismissTo('/(tabs)');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center' }}>
        <PetView look={{ stage: 'egg', form: null, traits: null, mood: 'neutral', equipped: [], stageProgress: 0 }} size={160} />
      </View>
      <Muted>Your grown-up pet moves to the collection. The new egg hatches after 5,000 steps, and it will look completely different.</Muted>
      <Field label="Name the new egg" value={name} onChangeText={setName} maxLength={20} autoFocus />
      <ErrorText message={error} />
      <Button label="Start new egg" onPress={create} busy={busy} disabled={!name.trim()} />
    </Screen>
  );
}
