import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { PetView } from '@/components/PetView';
import { Button, ErrorText, Muted, Screen, Text, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { FORM_LABEL, moodLine, STAGE_LABEL } from '@/lib/petText';
import type { Pet } from '@/lib/types';

export default function FriendScreen() {
  const colors = useColors();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [data, setData] = useState<{ nickname: string; streak: number; pet: Pet | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ nickname: string; streak: number; pet: Pet | null }>(`/friends/${userId}/pet`)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [userId]);

  async function treat() {
    setBusy(true);
    setError(null);
    try {
      const { pet } = await api<{ pet: Pet }>(`/friends/${userId}/treat`, { method: 'POST' });
      setData((d) => (d ? { ...d, pet } : d));
      setNote(`${pet.name} loved it! 🍪`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const pet = data?.pet;
  return (
    <Screen style={{ alignItems: 'center' }}>
      <Stack.Screen options={{ title: data ? `${data.nickname}'s pet` : 'Visit' }} />
      <ErrorText message={error} />
      {data && !pet && <Muted>{data.nickname} hasn't got a pet yet.</Muted>}
      {pet && (
        <>
          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.ink }}>{pet.name}</Text>
          <Muted>{pet.stage === 'adult' && pet.form ? FORM_LABEL[pet.form].name : STAGE_LABEL[pet.stage]}</Muted>
          <PetView look={pet} size={240} />
          <Text style={{ fontSize: 16, color: colors.ink, textAlign: 'center' }}>{moodLine(pet)}</Text>
          <Muted>
            🔥 {data.streak} day streak · {pet.treatsReceived} treats received
          </Muted>
          <View style={{ alignSelf: 'stretch', gap: 8 }}>
            {note ? <Text style={{ textAlign: 'center', fontSize: 16, color: colors.good }}>{note}</Text> : null}
            <Button label="Send a treat" onPress={treat} busy={busy} disabled={!!note} />
            <Muted style={{ textAlign: 'center' }}>One treat per friend per day. A treat cheers up a sleepy pet.</Muted>
          </View>
        </>
      )}
    </Screen>
  );
}
