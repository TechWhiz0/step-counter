import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, AppState, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { GoldenRadar } from '@/components/GoldenRadar';
import { petLevel } from '@/components/GrowthPath';
import { Icon } from '@/components/icons';
import { PetArt, PetView } from '@/components/PetView';
import { QuestList } from '@/components/QuestList';
import { ShareCard } from '@/components/ShareCard';
import { Sky } from '@/components/Sky';
import { Bar, Button, ErrorText, fonts, Muted, radius, Ring, T, TopBar, useColors } from '@/components/ui';
import { WalkRhythm } from '@/components/WalkRhythm';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import { itemEmoji, itemLabel } from '@/lib/items';
import { getHourlySums } from '@/lib/localDb';
import { ENERGY_LABEL, energyLevel, lookNow, phaseReply, statusLine, useDayPhase, type DayPhase } from '@/lib/petState';
import { FORM_LABEL, growthMessage, petReply, STAGE_LABEL } from '@/lib/petText';
import { useSession } from '@/lib/session';
import { cachedSync, syncSteps, takePendingSurprises } from '@/lib/sync';
import type { Palette } from '@/lib/theme';
import type { Pet, Quest, QuestsResult, Surprise, SyncResult } from '@/lib/types';

// Hero colours follow the time of day: pale gold morning, peach afternoon, coral evening, navy night.
const HERO: Record<DayPhase, { bg: string; ledge: string; blob: string; text: string; name: string; pill: string; pillText: string; track: string }> = {
  morning: { bg: '#FFF3CC', ledge: '#FFE08A', blob: '#FFE7A3', text: '#6B4A00', name: '#1D2433', pill: '#FFFFFF', pillText: '#1D2433', track: '#FFFFFFAA' },
  afternoon: { bg: '#FFE9D9', ledge: '#FFD3B5', blob: '#FFD9BE', text: '#6B3A1A', name: '#1D2433', pill: '#FFFFFF', pillText: '#1D2433', track: '#FFFFFFAA' },
  evening: { bg: '#FFE0D6', ledge: '#FFC2B0', blob: '#FFCDBE', text: '#7A2E1F', name: '#1D2433', pill: '#FFFFFF', pillText: '#1D2433', track: '#FFFFFFAA' },
  night: { bg: '#22305A', ledge: '#141E3D', blob: '#2C3B6B', text: '#C9D4FF', name: '#FFFFFF', pill: '#141E3D', pillText: '#E3E9FF', track: '#FFFFFF26' },
};
const PHASE_LABEL: Record<DayPhase, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Asleep' };
const STARS: [number, number, number][] = [[18, 14, 2], [46, 30, 1.5], [70, 10, 2], [120, 22, 1.5], [150, 8, 2.2], [178, 34, 1.4], [96, 44, 1.2]];

function EnergyMeter({ energy, hero }: { energy: number | undefined; hero: (typeof HERO)[DayPhase] }) {
  const c = useColors();
  const level = energyLevel(energy);
  const color = { full: c.accent, okay: c.gold, tired: c.flame, weak: c.berry }[level];
  const value = energy ?? 70;
  return (
    <View style={{ gap: 4, marginTop: 2 }} accessible accessibilityLabel={`Energy ${value} percent, ${ENERGY_LABEL[level]}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon.bolt size={14} color={color} />
        <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 12, color: hero.text }}>
          Energy · {ENERGY_LABEL[level]}
        </Text>
      </View>
      <Bar value={value / 100} height={10} color={color} track={hero.track} />
    </View>
  );
}

// Mon..Sun dots for this week: past streak days filled, today ringed (filled once the goal is met).
function weekDots(streak: number, goalMet: boolean) {
  const dow = (new Date().getDay() + 6) % 7; // Monday = 0
  const pastStreak = goalMet ? streak - 1 : streak;
  return Array.from({ length: 7 }, (_, i) => {
    if (i > dow) return 'future' as const;
    if (i === dow) return goalMet ? ('done' as const) : ('today' as const);
    return dow - i <= pastStreak ? ('done' as const) : ('missed' as const);
  });
}

export default function Home() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [treats, setTreats] = useState<number | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const pets = useRef(0);
  const phase = useDayPhase();
  const hero = HERO[phase];

  const loadQuests = useCallback(async () => {
    try {
      const r = await api<QuestsResult>('/quests');
      setQuests(r.quests);
      setTreats(r.treats);
    } catch {
      // Quests are a bonus; the rest of home still works offline.
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await syncSteps();
      if (result) {
        setData(result);
        setError(null);
        if (!result.pet) return router.replace('/onboarding');
      }
      void loadQuests();
      setSurprises(await takePendingSurprises());
      setWeekSums(await getHourlySums(7));
      const { days } = await api<{ days: { total: number }[] }>('/steps/history?days=7');
      setWeekSteps(days.reduce((s, d) => s + d.total, 0));
    } catch (e) {
      setError(`Couldn't sync: ${(e as Error).message}. Showing your last saved data.`);
    } finally {
      setRefreshing(false);
    }
  }, [loadQuests]);

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

  const claim = useCallback(async (id: Quest['id']) => {
    setClaiming(id);
    try {
      const r = await api<QuestsResult>(`/quests/${id}/claim`, { method: 'POST' });
      haptic.success();
      setQuests(r.quests);
      setTreats(r.treats);
    } catch (e) {
      Alert.alert("Couldn't claim", (e as Error).message);
    } finally {
      setClaiming(null);
    }
  }, []);

  const pet = data?.pet;
  if (!data || !pet) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 24 }}>
        <Muted>{error ?? 'Waking up your pet…'}</Muted>
      </View>
    );
  }

  const stageName = pet.stage === 'adult' && pet.form ? FORM_LABEL[pet.form].name : STAGE_LABEL[pet.stage];
  const grew = pet.stage !== pet.seenStage;
  const { total, goal } = data.today;
  const left = Math.max(0, goal - total);
  const pct = goal ? total / goal : 0;
  const lifetime = data.lifetimeSteps ?? user?.lifetimeSteps ?? 0;
  const treatCount = treats ?? data.treats ?? user?.treats ?? 0;
  const claimable = quests?.filter((q) => q.done && !q.claimed).length ?? 0;
  const dots = weekDots(data.streak.current, left === 0);
  const mood = bubble ?? statusLine(pet, phase, left);
  const look = lookNow(pet, phase);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.body, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} progressViewOffset={insets.top} />}
    >
      {focused && <StatusBar style="dark" />}
      <TopBar
        streak={data.streak.current}
        lifetime={lifetime}
        treats={treatCount}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={claimable ? `Notifications, ${claimable} new` : 'Notifications'}
            onPress={() => {
              haptic.tap();
              Alert.alert(
                claimable ? `${claimable} reward${claimable === 1 ? '' : 's'} to claim` : 'All caught up',
                claimable ? 'Finished quests are waiting in Daily quests.' : `${pet.name} will nudge you when something happens.`,
              );
            }}
            style={[styles.bell, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Icon.bell size={20} color={colors.ink} />
            {claimable > 0 && <View style={[styles.bellDot, { backgroundColor: colors.berry, borderColor: colors.card }]} />}
          </Pressable>
        }
      />

      <View style={[styles.hero, { backgroundColor: hero.bg, borderBottomColor: hero.ledge }]}>
        <View style={[styles.heroBlob, { backgroundColor: hero.blob }]} />
        {phase === 'night' && (
          <Svg pointerEvents="none" width={200} height={50} style={{ position: 'absolute', top: 6, left: 12 }}>
            {STARS.map(([x, y, r]) => (
              <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#FFFFFF" opacity={0.7} />
            ))}
          </Svg>
        )}
        {phase === 'night' && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 12, right: 16 }}>
            <Icon.moon size={26} />
          </View>
        )}
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.stagePill, { backgroundColor: hero.pill }]}>
            <Text style={[styles.stagePillText, { color: hero.pillText }]}>
              {stageName} · Lv {petLevel(pet)} · {PHASE_LABEL[phase]}
            </Text>
          </View>
          <Text style={[styles.petName, { color: hero.name }]} numberOfLines={1}>
            {pet.name}
          </Text>
          <Text style={[styles.mood, { color: hero.text }]}>{mood}</Text>
          {pet.stage !== 'egg' && <EnergyMeter energy={pet.energy} hero={hero} />}
        </View>
        <PetView
          look={look}
          size={140}
          onPet={() => {
            pets.current += 1;
            setBubble(phaseReply(pet, phase, pets.current) ?? petReply(pet, pets.current));
          }}
        />
      </View>

      <View style={styles.duo}>
        <View style={[styles.tile, { flex: 1.15, backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Ring value={pct} size={78} stroke={18}>
            <Text style={[styles.ringPct, { color: colors.ink }]}>{Math.min(999, Math.round(pct * 100))}%</Text>
          </Ring>
          <View style={{ flexShrink: 1 }}>
            <Text style={[styles.bigNum, { color: colors.ink }]}>{total.toLocaleString('en')}</Text>
            <Text style={[styles.tileNote, { color: colors.muted }]}>of {goal.toLocaleString('en')} steps</Text>
          </View>
        </View>
        <View style={[styles.tile, { flex: 1, backgroundColor: colors.goldSoft, borderColor: '#FFE3A0', gap: 4 }]}>
          <Text style={[styles.tileLabel, { color: '#7A5600' }]}>Streak</Text>
          <Text style={[styles.streakNum, { color: colors.goldText }]}>
            {data.streak.current} day{data.streak.current === 1 ? '' : 's'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 3 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {dots.map((d, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  d === 'done' && { backgroundColor: colors.flame },
                  d === 'today' && { borderWidth: 2.5, borderColor: colors.flame },
                  (d === 'future' || d === 'missed') && { backgroundColor: '#F2E3B8' },
                ]}
              />
            ))}
          </View>
        </View>
      </View>

      <QuestList quests={quests} onClaim={claim} busy={claiming} />

      <ErrorText message={error} />

      <WalkRhythm hourly={data.today.hourly} weekSums={weekSums} form={pet.stage === 'adult' ? pet.form : null} petName={pet.name} />
      <GoldenRadar golden={data.golden} petName={pet.name} />

      <Button
        label={`Share ${pet.name}`}
        kind="dark"
        icon={<Ionicons name="share-social" size={18} color={colors.bg} />}
        onPress={() => setSharing(true)}
      />

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

function SurpriseModal({ petName, surprises, onDone }: { petName: string; surprises: Surprise[]; onDone: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
          <Muted style={{ textAlign: 'center' }}>Put it on your pet from the Closet tab.</Muted>
          <Button label="Yay!" onPress={onDone} />
        </View>
      </View>
    </Modal>
  );
}

function GrowModal({ pet, visible, onDone }: { pet: Pet; visible: boolean; onDone: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    body: { paddingHorizontal: 18, paddingBottom: 28, gap: 12 },
    bell: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    bellDot: { position: 'absolute', top: 6, right: 7, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
    hero: { borderRadius: 28, borderBottomWidth: 6, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8, overflow: 'hidden' },
    heroBlob: { position: 'absolute', right: -30, bottom: -40, width: 200, height: 120, borderRadius: 100 },
    stagePill: { alignSelf: 'flex-start', height: 26, paddingHorizontal: 10, borderRadius: 999, justifyContent: 'center' },
    stagePillText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
    petName: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, includeFontPadding: false },
    mood: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19 },
    duo: { flexDirection: 'row', gap: 10 },
    tile: { borderWidth: 2, borderBottomWidth: 5, borderRadius: 22, padding: 12 },
    ringPct: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
    bigNum: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, includeFontPadding: false },
    tileNote: { fontFamily: fonts.body, fontSize: 12 },
    tileLabel: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
    streakNum: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, includeFontPadding: false },
    dot: { width: 14, height: 14, borderRadius: 7 },
    sheetBackdrop: { flex: 1, backgroundColor: 'rgba(20,16,12,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.surface, padding: 24, paddingTop: 12, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, gap: 14 },
    grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 6 },
    loot: { flexDirection: 'row', justifyContent: 'center', gap: 12, flexWrap: 'wrap' },
    lootItem: { alignItems: 'center', backgroundColor: colors.goldSoft, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 18, gap: 2 },
    grow: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  });
