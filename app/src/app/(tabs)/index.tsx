import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Modal, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoldenRadar } from '@/components/GoldenRadar';
import { PetArt, PetView } from '@/components/PetView';
import { ShareCard } from '@/components/ShareCard';
import { Sky } from '@/components/Sky';
import { StepRing } from '@/components/StepRing';
import { Button, Card, colors, ErrorText, Muted, Pill, radius, T } from '@/components/ui';
import { WalkRhythm } from '@/components/WalkRhythm';
import { api } from '@/lib/api';
import { bandFor, haptic, SKY, useReducedMotion } from '@/lib/feel';
import { itemEmoji, itemLabel } from '@/lib/items';
import { getHourlySums } from '@/lib/localDb';
import { FORM_LABEL, growthMessage, moodLine, petReply, STAGE_LABEL } from '@/lib/petText';
import { useSession } from '@/lib/session';
import { cachedSync, syncSteps, takePendingSurprises } from '@/lib/sync';
import type { Pet, Stage, Surprise, SyncResult } from '@/lib/types';

function greeting(hour: number) {
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { user } = useSession();
  const [data, setData] = useState<SyncResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surprises, setSurprises] = useState<Surprise[]>([]);
  const [sharing, setSharing] = useState(false);
  const [weekSteps, setWeekSteps] = useState(0);
  const [weekSums, setWeekSums] = useState<number[]>(Array(24).fill(0));
  const [bubble, setBubble] = useState<string | null>(null);
  const pets = useRef(0);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await syncSteps();
      if (result) {
        setData(result);
        setError(null);
        if (!result.pet) return router.replace('/onboarding');
      }
      setSurprises(await takePendingSurprises());
      setWeekSums(await getHourlySums(7));
      const { days } = await api<{ days: { total: number }[] }>('/steps/history?days=7');
      setWeekSteps(days.reduce((s, d) => s + d.total, 0));
    } catch (e) {
      setError(`Couldn't sync: ${(e as Error).message}. Showing your last saved data.`);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cachedSync().then((c) => c && setData((d) => d ?? c));
    getHourlySums(7).then(setWeekSums).catch(() => {});
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void refresh());
    return () => sub.remove();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const pet = data?.pet;
  if (!data || !pet) {
    return (
      <Sky style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Muted>{error ?? 'Waking up your pet…'}</Muted>
      </Sky>
    );
  }

  const hour = new Date().getHours();
  const band = bandFor(hour);
  const light = SKY[band].light;
  const stageName = pet.stage === 'adult' && pet.form ? FORM_LABEL[pet.form].name : STAGE_LABEL[pet.stage];
  const grew = pet.stage !== pet.seenStage;
  const left = Math.max(0, data.today.goal - data.today.total);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} progressViewOffset={insets.top} />}
    >
      {focused && <StatusBar style={light ? 'light' : 'dark'} />}
      <Sky band={band} showOrb style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topRow}>
          <View>
            <T v="label" style={{ color: light ? '#C9D6EA' : colors.muted }}>{greeting(hour)}</T>
            <T v="h2" style={{ color: light ? '#fff' : colors.ink }}>{user?.nickname ?? 'Walker'}</T>
          </View>
          <Pill tone="glass">🔥 {data.streak.current} day{data.streak.current === 1 ? '' : 's'}</Pill>
        </View>

        <View style={styles.bubbleWrap}>
          <View style={styles.bubble}>
            <T v="bodyStrong" style={{ textAlign: 'center', fontSize: 15 }}>{bubble ?? moodLine(pet)}</T>
          </View>
          <View style={styles.bubbleTail} />
        </View>

        <PetView
          look={pet}
          size={220}
          onPet={() => {
            pets.current += 1;
            setBubble(petReply(pet, pets.current));
          }}
        />

        <View style={{ alignItems: 'center', gap: 6 }}>
          <T v="title" style={{ color: light ? '#fff' : colors.ink }}>{pet.name}</T>
          <Pill tone="glass" style={{ alignSelf: 'center' }}>{stageName}</Pill>
          <T v="small" style={{ color: light ? '#C9D6EA' : colors.muted, fontSize: 12 }}>Tap {pet.name} to say hi</T>
        </View>
      </Sky>

      <View style={styles.body}>
        <ErrorText message={error} />

        <Card style={[styles.today, styles.lifted]}>
          <StepRing steps={data.today.total} goal={data.today.goal} size={128} />
          <View style={{ flex: 1, gap: 8 }}>
            <T v="label">Today</T>
            <T v="h2">{left ? `${left.toLocaleString()} to go` : 'Goal reached!'}</T>
            <View style={styles.stats}>
              <Stat value={weekSteps ? `${Math.round(weekSteps / 1000)}k` : '–'} label="7 days" />
              <Stat value={String(data.streak.best)} label="best streak" />
            </View>
          </View>
        </Card>

        <WalkRhythm hourly={data.today.hourly} weekSums={weekSums} form={pet.stage === 'adult' ? pet.form : null} petName={pet.name} />
        <GoldenRadar golden={data.golden} petName={pet.name} />
        <GrowthCard pet={pet} />

        <Button
          label={`Share ${pet.name}`}
          kind="dark"
          icon={<Ionicons name="share-social" size={18} color="#fff" />}
          onPress={() => setSharing(true)}
        />
      </View>

      <ShareCard pet={pet} weekSteps={weekSteps} streak={data.streak.current} visible={sharing} onClose={() => setSharing(false)} />
      <SurpriseModal petName={pet.name} surprises={grew ? [] : surprises} onDone={() => setSurprises([])} />
      <GrowModal
        pet={pet}
        visible={grew}
        onDone={async () => {
          const { pet: seen } = await api<{ pet: Pet }>('/pet/seen', { method: 'POST' });
          setData((d) => (d ? { ...d, pet: seen } : d));
        }}
      />
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <T v="number" style={{ fontSize: 18 }}>{value}</T>
      <T v="small" style={{ fontSize: 12 }}>{label}</T>
    </View>
  );
}

const STAGES: Stage[] = ['egg', 'baby', 'teen', 'adult'];

function GrowthCard({ pet }: { pet: Pet }) {
  const reduced = useReducedMotion();
  const fill = useRef(new Animated.Value(0)).current;
  const at = STAGES.indexOf(pet.stage);

  useEffect(() => {
    const to = pet.nextStage ? pet.stageProgress : 1;
    if (reduced) return fill.setValue(to);
    Animated.timing(fill, { toValue: to, duration: 900, useNativeDriver: false }).start();
  }, [pet.stageProgress, pet.nextStage, reduced, fill]);

  const next = pet.nextStage === 'baby' ? 'hatching' : pet.nextStage ? STAGE_LABEL[pet.nextStage] : null;
  return (
    <Card style={{ gap: 14 }}>
      <View>
        <T v="label">Growth</T>
        <T v="h2">{next ? `Growing to ${next}` : 'Fully grown'}</T>
      </View>
      <View style={styles.track}>
        {STAGES.map((s, i) => (
          <View key={s} style={styles.trackStep}>
            <View style={[styles.trackDot, i <= at && styles.trackDotOn, i === at && styles.trackDotNow]} />
            <T v="small" style={[{ fontSize: 12 }, i === at && { color: colors.ink, fontFamily: 'Nunito_800ExtraBold' }]}>{STAGE_LABEL[s]}</T>
          </View>
        ))}
      </View>
      <View style={styles.bar}>
        <Animated.View style={[styles.barFill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <Muted>
        {next
          ? `${pet.stepsToNextStage.toLocaleString()} more steps.${pet.nextStage === 'adult' ? ` When you walk decides ${pet.name}'s adult form.` : ''}`
          : `${pet.form ? FORM_LABEL[pet.form].line : 'All grown up'}. Start a new egg from your Collection any time.`}
      </Muted>
    </Card>
  );
}

function SurpriseModal({ petName, surprises, onDone }: { petName: string; surprises: Surprise[]; onDone: () => void }) {
  useEffect(() => {
    if (surprises.length) haptic.success();
  }, [surprises.length]);
  return (
    <Modal visible={surprises.length > 0} transparent animationType="slide" onRequestClose={onDone}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <T v="hero" style={{ textAlign: 'center' }}>✨</T>
          <T v="title" style={{ textAlign: 'center' }}>{petName} found something!</T>
          <View style={styles.loot}>
            {surprises.map((s) => (
              <View key={s.step} style={styles.lootItem}>
                <T v="hero">{itemEmoji(s.item)}</T>
                <T v="h3">{itemLabel(s.item)}</T>
                <T v="small" style={{ fontSize: 12 }}>step {s.step.toLocaleString()}</T>
              </View>
            ))}
          </View>
          <Muted style={{ textAlign: 'center' }}>Put it on your pet from the Collection tab.</Muted>
          <Button label="Yay!" onPress={onDone} />
        </View>
      </View>
    </Modal>
  );
}

function GrowModal({ pet, visible, onDone }: { pet: Pet; visible: boolean; onDone: () => void }) {
  const scale = useRef(new Animated.Value(0.2)).current;
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    haptic.success();
    scale.setValue(0.2);
    spin.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
      Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, spin]);
  const msg = growthMessage(pet);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <Sky band="moonlight" style={styles.grow}>
        <Animated.View style={{ transform: [{ scale }, { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] }) }] }}>
          <PetArt look={pet} size={260} />
        </Animated.View>
        <T v="hero" style={{ color: '#fff', textAlign: 'center' }}>{msg.title}</T>
        <T v="body" style={{ color: '#D7E2F2', textAlign: 'center' }}>{msg.body}</T>
        <View style={{ alignSelf: 'stretch' }}>
          <Button label="Amazing!" onPress={onDone} />
        </View>
      </Sky>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hero: { borderBottomLeftRadius: radius.xl + 8, borderBottomRightRadius: radius.xl + 8, paddingHorizontal: 20, paddingBottom: 64, alignItems: 'center' },
  topRow: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bubbleWrap: { alignItems: 'center', marginTop: 18, marginBottom: -6, maxWidth: 280, zIndex: 1 },
  bubble: { backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.lg },
  bubbleTail: {
    width: 14,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    transform: [{ rotate: '45deg' }],
    marginTop: -8,
  },
  body: { paddingHorizontal: 20, gap: 16 },
  lifted: { marginTop: -44 },
  today: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 10 },
  track: { flexDirection: 'row', justifyContent: 'space-between' },
  trackStep: { alignItems: 'center', gap: 6, flex: 1 },
  trackDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.surfaceAlt },
  trackDotOn: { backgroundColor: colors.accent },
  trackDotNow: { width: 18, height: 18, borderRadius: 9, borderWidth: 4, borderColor: colors.accentSoft },
  bar: { height: 12, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.accent, borderRadius: radius.pill },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(20,16,12,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: 24, paddingTop: 12, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, gap: 14 },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 6 },
  loot: { flexDirection: 'row', justifyContent: 'center', gap: 12, flexWrap: 'wrap' },
  lootItem: { alignItems: 'center', backgroundColor: colors.goldSoft, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 18, gap: 2 },
  grow: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
});
