import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HERO, HeroDecor } from '@/components/HeroTheme';
import { Icon } from '@/components/icons';
import { PetView, type PetHandle } from '@/components/PetView';
import { Button, ErrorText, fonts, Tap, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import { useDayPhase } from '@/lib/petState';
import { FORM_LABEL, moodLine, STAGE_LABEL } from '@/lib/petText';
import type { Pet } from '@/lib/types';

// The same tile as Me's stats: icon on the left, number and label on the right, on a ledge.
function StatTile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  const c = useColors();
  return (
    <View style={[styles.tile, { backgroundColor: c.card, borderColor: c.border }]} accessible accessibilityLabel={`${value} ${label}`}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={[styles.tileValue, { color: c.ink }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.tileLabel, { color: c.muted }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function FriendScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  // The card's colours follow your time of day; the pet itself shows its owner's mood.
  const phase = useDayPhase();
  const hero = HERO[phase];
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const petRef = useRef<PetHandle>(null);
  const [data, setData] = useState<{ nickname: string; streak: number; pet: Pet | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
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
      haptic.reward();
      setSent(`${pet.name} loved it!`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const pet = data?.pet;
  const stage = pet ? (pet.stage === 'adult' && pet.form ? FORM_LABEL[pet.form].name : STAGE_LABEL[pet.stage]) : '';

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Tap onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={[styles.back, { backgroundColor: c.card, borderColor: c.border }]}>
          <Icon.chevronLeft size={20} color={c.ink} />
        </Tap>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: c.accentText }]}>Visiting</Text>
          <Text style={[styles.title, { color: c.ink }]} numberOfLines={1}>
            {data?.nickname ?? '…'}
          </Text>
        </View>
      </View>

      <View style={[styles.hero, { backgroundColor: hero.bg, borderBottomColor: hero.ledge }]}>
        <HeroDecor phase={phase} blob="center" />
        {pet ? (
          <>
            <PetView ref={petRef} look={pet} size={190} onPet={() => {}} />
            <Text style={[styles.petName, { color: hero.name }]} numberOfLines={1}>
              {pet.name}
            </Text>
            <View style={[styles.pill, { backgroundColor: hero.pill }]}>
              <Text style={[styles.pillText, { color: hero.pillText }]} numberOfLines={1}>
                {stage}
              </Text>
            </View>
            <Text style={[styles.mood, { color: hero.text }]}>{moodLine(pet).replace(`${pet.name} is `, '').replace(/^./, (m) => m.toUpperCase())}</Text>
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={[styles.mood, { color: hero.text }]}>{data ? `${data.nickname} hasn't hatched a pet yet.` : 'Loading…'}</Text>
          </View>
        )}
      </View>

      <ErrorText message={error} />

      {pet && data && (
        <>
          <View style={styles.tiles}>
            <StatTile icon={<Icon.flame size={26} inner />} value={`${data.streak} ${data.streak === 1 ? 'day' : 'days'}`} label="streak" />
            <StatTile icon={<Icon.berry size={26} />} value={String(pet.treatsReceived)} label="treats received" />
          </View>
          <Button label={sent ? 'Treat sent' : 'Send a treat'} onPress={treat} busy={busy} disabled={!!sent} icon={sent ? undefined : <Icon.berry size={18} />} />
          <Text style={[styles.note, { color: sent ? c.accentText : c.muted }]}>{sent ?? 'One treat per friend each day. It cheers up a sleepy pet.'}</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 18, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, includeFontPadding: false },
  hero: { borderRadius: 28, borderBottomWidth: 6, paddingTop: 18, paddingBottom: 20, paddingHorizontal: 18, alignItems: 'center', gap: 6, overflow: 'hidden' },
  petName: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, includeFontPadding: false },
  pill: { height: 26, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center' },
  pillText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  mood: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, textAlign: 'center', marginTop: 2 },
  empty: { height: 220, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderWidth: 2, borderBottomWidth: 5, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tileValue: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, includeFontPadding: false },
  tileLabel: { fontFamily: fonts.body, fontSize: 12 },
  note: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
