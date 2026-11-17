import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, RefreshControl, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { dialog } from '@/components/Dialog';
import { Monster, speciesName } from '@/components/Monster';
import { DeskScreen, Icon, Loading, Meta, Rail, Rhythm, Rule, Stamp, Struck, T, fmt, fonts, useColors } from '@/components/paper';
import { api } from '@/lib/api';
import { haptic, useReducedMotion } from '@/lib/feel';
import { itemLabel } from '@/lib/items';
import { useAppActive, useLive } from '@/lib/live';
import { getHourlySums } from '@/lib/localDb';
import { useLiveSteps } from '@/lib/pedometer';
import { lookNow, statusLine, useDayPhase } from '@/lib/petState';
import { petReply } from '@/lib/petText';
import { useSession } from '@/lib/session';
import { cachedSync, syncSteps } from '@/lib/sync';
import { ThemeProvider } from '@/lib/theme';
import type { Quest, QuestsResult, TodayState } from '@/lib/types';

const SYNC_EVERY_MS = 45_000;
const DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MOON_HOURS = [17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4];

function dateLabel(d = new Date()) {
  return `${DAY[d.getDay()]} · ${d.getDate()} ${MONTH[d.getMonth()]}`;
}

// The pet, bobbing gently, with a speech line when tapped.
function PetStage({ state, night }: { state: TodayState; night: boolean }) {
  const c = useColors();
  const phase = useDayPhase();
  const reduced = useReducedMotion();
  const [said, setSaid] = useState<string | null>(null);
  const taps = useRef(0);
  const bob = useRef(new Animated.Value(0)).current;
  const squish = useRef(new Animated.Value(1)).current;
  const pet = state.pet!;
  const look = lookNow(pet, night ? 'night' : phase === 'night' ? 'evening' : phase);
  useEffect(() => {
    if (reduced || look.mood === 'asleep') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, reduced, look.mood]);
  useEffect(() => {
    if (!said) return;
    const t = setTimeout(() => setSaid(null), 3500);
    return () => clearTimeout(t);
  }, [said]);

  return (
    <View style={{ alignItems: 'center' }}>
      {said ? (
        <View style={{ position: 'absolute', top: -6, zIndex: 2, backgroundColor: c.paperRaised, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: c.rule }}>
          <T v="small" color={c.ink}>
            {said}
          </T>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${pet.name}, ${pet.stage === 'egg' ? 'an egg' : speciesName(pet.species)}. Tap to say hello.`}
        onPress={() => {
          haptic.pet();
          taps.current += 1;
          setSaid(petReply(pet, taps.current));
          squish.setValue(0.9);
          Animated.spring(squish, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 14 }).start();
        }}
      >
        <Animated.View
          style={{
            transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }, { scaleY: squish }, { scaleX: Animated.divide(1, squish) as unknown as number }],
          }}
        >
          <Monster species={pet.species} stage={pet.stage} mood={look.mood} form={pet.form} equipped={pet.equipped} size={168} />
        </Animated.View>
      </Pressable>
      {night && look.mood === 'asleep' ? (
        <View style={{ position: 'absolute', right: 96, top: 8 }} accessibilityElementsHidden>
          <T color={c.ink}>z</T>
          <T v="small" color={c.muted} style={{ marginLeft: 10, marginTop: -16 }}>
            z
          </T>
        </View>
      ) : null}
    </View>
  );
}

function QuestLine({ q, onClaim, busy }: { q: Quest; onClaim: (id: Quest['id']) => void; busy: boolean }) {
  const c = useColors();
  const ready = q.done && !q.claimed;
  return (
    <Pressable
      accessibilityRole={ready ? 'button' : 'text'}
      accessibilityLabel={`${q.title}. ${q.claimed ? 'Done' : ready ? 'Finished, tap to claim' : `${fmt(q.progress)} of ${fmt(q.target)}`}`}
      disabled={!ready || busy}
      onPress={() => onClaim(q.id)}
      style={{ flexDirection: 'row', justifyContent: 'space-between', minHeight: 30, alignItems: 'center' }}
    >
      {q.claimed ? <Struck>{q.title}</Struck> : <T>{q.title}</T>}
      <T color={ready ? c.accent : c.muted} style={ready ? { fontFamily: fonts.bodyBold } : undefined}>
        {q.claimed ? 'done' : ready ? (busy ? '…' : 'claim') : `${fmt(q.progress)} / ${fmt(q.target)}`}
      </T>
    </Pressable>
  );
}

function TodayBody({ initial }: { initial: TodayState | null }) {
  const c = useColors();
  const { user } = useSession();
  const phase = useDayPhase();
  const night = phase === 'night';
  const active = useAppActive();
  const liveSteps = useLiveSteps();
  const [state, setState] = useState<TodayState | null>(initial);
  const [syncing, setSyncing] = useState(false);
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [eveningShare, setEveningShare] = useState<number | null>(null);
  const liveAtSync = useRef(0);
  const liveRef = useRef(liveSteps);
  liveRef.current = liveSteps;
  const shown = useRef(new Set<string>());

  // Other devices: the server pushes their syncs to this screen as they happen.
  const live = useLive<TodayState>('/steps/state', { initial });
  useEffect(() => {
    if (live.data && (!state || (live.data.rev ?? 0) >= (state.rev ?? 0))) setState(live.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.data]);

  const loadQuests = useCallback(async () => {
    const r = await api<QuestsResult>('/quests').catch(() => null);
    if (r) setQuests(r.quests);
  }, []);

  const sync = useCallback(
    async (manual?: boolean) => {
      if (manual) setSyncing(true);
      const before = liveRef.current;
      try {
        const result = await syncSteps();
        if (result) {
          liveAtSync.current = before;
          setState(result);
          if (!result.pet) return router.replace('/onboarding');
        }
        void loadQuests();
        const sums = await getHourlySums(14);
        const total = sums.reduce((a, b) => a + b, 0);
        setEveningShare(total ? MOON_HOURS.reduce((s, h) => s + sums[h], 0) / total : null);
      } catch (e) {
        if (manual) dialog("Couldn't sync", (e as Error).message);
      } finally {
        setSyncing(false);
      }
    },
    [loadQuests],
  );

  useFocusEffect(
    useCallback(() => {
      void sync();
    }, [sync]),
  );
  // While open, keep the server (and the league) up to date as you walk.
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => void sync(), SYNC_EVERY_MS);
    return () => clearInterval(t);
  }, [active, sync]);

  // Growing up happens quietly on the page (no reveal screen): just tell the server it's been seen.
  // New closet items still get a short note, once each.
  useEffect(() => {
    const pet = state?.pet;
    if (!pet) return;
    if (pet.stage !== pet.seenStage && !shown.current.has(`grow:${pet.id}:${pet.stage}`)) {
      shown.current.add(`grow:${pet.id}:${pet.stage}`);
      void api('/pet/seen', { method: 'POST' }).catch(() => {});
    }
    for (const item of state?.unlockedItems ?? []) {
      if (shown.current.has(`item:${item}`)) continue;
      shown.current.add(`item:${item}`);
      haptic.reward();
      dialog('New in the closet', `You walked far enough for the ${itemLabel(item).toLowerCase()}. Put it on in the closet.`);
    }
  }, [state]);

  // The typewriter bell, once, when today's goal is reached while you watch.
  const metBefore = useRef<boolean | null>(null);
  useEffect(() => {
    if (!state) return;
    const met = Math.max(state.today.total, state.today.total + liveSteps - liveAtSync.current) >= state.today.goal;
    if (metBefore.current === false && met) haptic.bell();
    metBefore.current = met;
  }, [state, liveSteps]);

  const claim = useCallback(async (id: Quest['id']) => {
    setClaiming(id);
    try {
      const r = await api<QuestsResult>(`/quests/${id}/claim`, { method: 'POST' });
      haptic.reward();
      setQuests(r.quests);
    } catch (e) {
      dialog("Couldn't claim", (e as Error).message);
    } finally {
      setClaiming(null);
    }
  }, []);

  const total = state ? Math.max(state.today.total, state.today.total + liveSteps - liveAtSync.current) : 0;
  const goal = state?.today.goal ?? user?.dailyGoal ?? 6000;
  const left = Math.max(0, goal - total);
  const nowHour = new Date().getHours();
  const hourly = useMemo(() => state?.today.hourly ?? Array(24).fill(0), [state]);
  const pet = state?.pet;

  const header = {
    left: (
      <Pressable accessibilityRole="button" accessibilityLabel="Me and settings" onPress={() => router.push('/me')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
        <Icon name="me" size={16} color={c.deskText} />
        <Meta color={c.deskText}>{dateLabel()}</Meta>
      </Pressable>
    ),
    right: `${fmt(total)} / ${fmt(goal)}`,
  };

  if (!state || !pet) {
    return (
      <DeskScreen {...header} night={night}>
        {live.error && !state ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <T v="small">{live.error}</T>
          </View>
        ) : (
          <Loading kind="today" />
        )}
      </DeskScreen>
    );
  }

  const line =
    pet.stage === 'egg'
      ? `${pet.name} is wiggling inside the egg.\n\n${fmt(pet.stepsToNextStage)} more steps\nand it hatches.`
      : left === 0
        ? `${pet.name} ${night ? 'fell asleep happy' : 'is bouncing with joy'}.\n\nGoal met. ${state.streak.current > 0 ? `That makes\n${state.streak.current + 1} days in a row.` : 'Lovely walking.'}`
        : `${statusLine(pet, phase, left)}\n\n${fmt(left)} steps to go.\n${night ? 'Tomorrow is a new page.' : 'A short walk would do it.'}`;

  const quest = quests ?? [];
  return (
    <DeskScreen
      {...header}
      night={night}
      refreshControl={
        <RefreshControl
          refreshing={syncing}
          onRefresh={() => {
            haptic.page();
            void sync(true);
          }}
          tintColor={c.ink}
          colors={[c.ink]}
        />
      }
    >
      <View style={{ paddingHorizontal: 28, paddingTop: 28, flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
        <T style={{ flex: 1, color: night ? c.ink : c.ink }}>{line}</T>
        <Stamp value={state.streak.current} label="DAY RUN" />
      </View>

      <View style={{ marginTop: 4 }}>
        {night && <NightBeam />}
        <PetStage state={state} night={night} />
      </View>

      <View style={{ marginTop: 6 }}>
        <Rail steps={total} goal={goal} night={night} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 28 }}>
          <Meta>0</Meta>
          <Meta color={left ? c.muted : c.sage}>{left ? `${fmt(left)} to go` : `goal met · +${fmt(total - goal)}`}</Meta>
          <Meta>goal {fmt(goal)}</Meta>
        </View>
      </View>

      <View style={{ paddingHorizontal: 28, paddingTop: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Meta>Today's rhythm</Meta>
          <T v="small">{liveSteps > 0 ? 'counting live' : 'from your phone'}</T>
        </View>
        <Rhythm hourly={hourly} nowHour={nowHour} />
      </View>

      {night && pet.stage !== 'egg' && pet.stage !== 'adult' && eveningShare !== null && (
        <View style={{ marginHorizontal: 28, marginTop: 24, gap: 10 }}>
          <Rule dashed />
          <Meta>What {pet.name} is becoming</Meta>
          <T>
            {eveningShare >= 0.45
              ? 'Your evening walks are winning. Keep it up and the moonlight form settles in.'
              : `Evenings hold ${Math.round(eveningShare * 100)}% of your walks. Past 45% and ${pet.name} grows into the moonlight form.`}
          </T>
          <View style={{ height: 4, backgroundColor: c.rule, borderRadius: 2 }}>
            <View style={{ width: `${Math.round(eveningShare * 100)}%`, height: 4, backgroundColor: c.ink, borderRadius: 2 }} />
            <View style={{ position: 'absolute', left: '45%', top: -5, width: 1, height: 14, backgroundColor: c.accent }} />
          </View>
        </View>
      )}

      {quest.length > 0 && (
        <View style={{ marginHorizontal: 28, marginTop: 22, gap: 8 }}>
          <Rule dashed />
          <View style={{ gap: 4, paddingTop: 6 }}>
            {quest.map((q) => (
              <QuestLine key={q.id} q={q} onClaim={claim} busy={claiming === q.id} />
            ))}
          </View>
        </View>
      )}

      {pet.stage === 'adult' && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/new-egg')} style={{ marginHorizontal: 28, marginTop: 18, minHeight: 44, justifyContent: 'center' }}>
          <T v="small" style={{ textDecorationLine: 'underline' }}>
            {pet.name} is grown up. Meet a new monster
          </T>
        </Pressable>
      )}
    </DeskScreen>
  );
}

// A soft pool of lamplight over the sleeping pet.
function NightBeam() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: -70, height: 300 }}>
      <Svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="lamp" cx="50%" cy="62%" rx="42%" ry="58%">
            <Stop offset="0" stopColor="#FFE2B4" stopOpacity={0.3} />
            <Stop offset="0.55" stopColor="#FFE2B4" stopOpacity={0.1} />
            <Stop offset="1" stopColor="#FFE2B4" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="400" height="300" fill="url(#lamp)" />
      </Svg>
    </View>
  );
}

export default function Today() {
  const phase = useDayPhase();
  const [initial, setInitial] = useState<TodayState | null | undefined>(undefined);
  useEffect(() => {
    cachedSync()
      .then((s) => setInitial(s ?? null))
      .catch(() => setInitial(null));
  }, []);
  if (initial === undefined) return null;
  return (
    <ThemeProvider mode={phase === 'night' ? 'night' : 'day'}>
      <TodayBody initial={initial} />
    </ThemeProvider>
  );
}
