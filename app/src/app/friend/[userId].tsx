import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PetView, type PetHandle } from '@/components/PetView';
import { Sky } from '@/components/Sky';
import { Button, ErrorText, Muted, Pill, radius, T, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { bandFor, haptic, SKY } from '@/lib/feel';
import { FORM_LABEL, moodLine, STAGE_LABEL } from '@/lib/petText';
import type { Palette } from '@/lib/theme';
import type { Pet } from '@/lib/types';

export default function FriendScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const petRef = useRef<PetHandle>(null);
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
      petRef.current?.react('treat');
      haptic.success();
      setNote(`${pet.name} loved it!`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const pet = data?.pet;
  const band = bandFor(new Date().getHours());
  const light = SKY[band].light;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <Stack.Screen options={{ headerTintColor: light ? '#fff' : colors.ink }} />
      <StatusBar style={light ? 'light' : 'dark'} />
      <Sky band={band} style={[styles.hero, { paddingTop: insets.top + 56 }]}>
        {data && (
          <T v="label" style={{ color: light ? '#C9D6EA' : colors.muted }}>
            Visiting {data.nickname}
          </T>
        )}
        {pet ? (
          <>
            <PetView ref={petRef} look={pet} size={230} onPet={() => {}} />
            <T v="title" style={{ color: light ? '#fff' : colors.ink }}>{pet.name}</T>
            <Pill tone="glass" style={{ alignSelf: 'center' }}>
              {pet.stage === 'adult' && pet.form ? FORM_LABEL[pet.form].name : STAGE_LABEL[pet.stage]}
            </Pill>
          </>
        ) : (
          <View style={{ height: 200, justifyContent: 'center' }}>
            {data && <Muted>{data.nickname} hasn't got a pet yet.</Muted>}
          </View>
        )}
      </Sky>

      <View style={styles.body}>
        <ErrorText message={error} />
        {pet && data && (
          <>
            <T v="body" style={{ textAlign: 'center' }}>{moodLine(pet)}</T>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <T v="number">🔥 {data.streak}</T>
                <Muted style={{ fontSize: 12 }}>day streak</Muted>
              </View>
              <View style={styles.stat}>
                <T v="number">🍪 {pet.treatsReceived}</T>
                <Muted style={{ fontSize: 12 }}>treats received</Muted>
              </View>
            </View>
            {note ? <T v="h3" style={{ textAlign: 'center', color: colors.good }}>{note}</T> : null}
            <Button label={note ? 'Treat sent' : 'Send a treat'} onPress={treat} busy={busy} disabled={!!note} />
            <Muted style={{ textAlign: 'center' }}>One treat per friend per day. A treat cheers up a sleepy pet.</Muted>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  hero: { alignItems: 'center', gap: 6, paddingBottom: 40, borderBottomLeftRadius: radius.xl + 8, borderBottomRightRadius: radius.xl + 8 },
  body: { padding: 20, gap: 14 },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, alignItems: 'center', gap: 2 },
});
