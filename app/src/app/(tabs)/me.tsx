import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, LeagueBadge, leagueName } from '@/components/icons';
import { MonsterIcon, monsterTint } from '@/components/monsters';
import { PetArt } from '@/components/PetView';
import { ServerSetting } from '@/components/ServerSetting';
import { Button, compact, ErrorText, fonts, T, Tap, useColors } from '@/components/ui';
import { WeekBars } from '@/components/WeekBars';
import { api } from '@/lib/api';
import { lookNow, useDayPhase } from '@/lib/petState';
import { lastDays } from '@/lib/dates';
import { haptic } from '@/lib/feel';
import { openHealthSettings } from '@/lib/health';
import { useSession } from '@/lib/session';
import type { MonstersResult, Pet, User } from '@/lib/types';

const GOAL_STEP = 500;
const GOAL_MIN = 1000;
const GOAL_MAX = 50000;
const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Open = 'goal' | 'data' | null;

function StatTile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  const c = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.border }]} accessible accessibilityLabel={`${value} ${label}`}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={[styles.statValue, { color: c.ink }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={[styles.statLabel, { color: c.muted }]}>{label}</Text>
      </View>
    </View>
  );
}

// A settings row: label, current value and a chevron that turns when the row is open.
function Row({ label, value, open, onPress, last, children }: { label: string; value?: string; open?: boolean; onPress: () => void; last?: boolean; children?: ReactNode }) {
  const c = useColors();
  return (
    <View style={[!last && { borderBottomWidth: 2, borderBottomColor: c.surfaceAlt }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          haptic.select();
          onPress();
        }}
        style={styles.row}
      >
        <Text style={[styles.rowLabel, { color: c.ink }]}>{label}</Text>
        {value ? <Text style={[styles.rowValue, { color: c.muted }]}>{value}</Text> : null}
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <Icon.chevronRight size={18} color={c.muted} />
        </View>
      </Pressable>
      {open && children ? <View style={{ paddingBottom: 14, gap: 12 }}>{children}</View> : null}
    </View>
  );
}

export default function Me() {
  const c = useColors();
  const phase = useDayPhase();
  const insets = useSafeAreaInsets();
  const { user, setUser, signOut } = useSession();
  const [open, setOpen] = useState<Open>(null);
  const [goal, setGoal] = useState(user?.dailyGoal ?? 6000);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [week, setWeek] = useState<{ label: string; total: number }[]>([]);
  const [monsters, setMonsters] = useState<MonstersResult | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);

  const load = useCallback(async () => {
    const days = lastDays(7);
    const [hist, mons, col, me] = await Promise.allSettled([
      api<{ days: { day?: string; total: number }[] }>('/steps/history?days=7'),
      api<MonstersResult>('/monsters'),
      api<{ pets: Pet[] }>('/pet/collection'),
      api<{ user: User }>('/auth/me'),
    ]);
    if (hist.status === 'fulfilled') {
      const rows = hist.value.days;
      const byDay = new Map(rows.filter((r) => r.day).map((r) => [r.day!, r.total]));
      // Older servers (and demo mode) send totals without days; line those up to end on today.
      const tail = rows.every((r) => !r.day) ? rows.slice(-7).map((r) => r.total) : null;
      setWeek(
        days.map((d, i) => ({
          label: DAY_LETTER[d.start.getDay()],
          total: tail ? (tail[i - (7 - tail.length)] ?? 0) : (byDay.get(d.day) ?? 0),
        })),
      );
    }
    if (mons.status === 'fulfilled') setMonsters(mons.value);
    if (col.status === 'fulfilled') setPets(col.value.pets);
    if (me.status === 'fulfilled') setUser(me.value.user);
  }, [setUser]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const dirty = goal !== user?.dailyGoal;
  const toggle = (o: Open) => setOpen((cur) => (cur === o ? null : o));

  function bump(delta: number) {
    const next = Math.min(GOAL_MAX, Math.max(GOAL_MIN, goal + delta));
    if (next === goal) return haptic.warn();
    haptic.select();
    setGoal(next);
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await api<{ user: User }>('/auth/me', { method: 'PATCH', body: { dailyGoal: goal } });
      setUser(res.user);
      haptic.success();
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const active = pets.find((p) => p.isActive);
  const firstDay = pets.map((p) => p.startDay).sort()[0];
  const since = firstDay ? new Date(`${firstDay}T12:00:00`).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : null;
  const lifetime = user?.lifetimeSteps ?? monsters?.lifetimeSteps ?? 0;
  const met = monsters?.monsters.filter((m) => m.raised).length ?? 0;
  const metTotal = monsters?.monsters.filter((m) => m.enabled || m.raised).length ?? 0;
  const nextMonster = monsters?.monsters
    .filter((m) => !m.unlocked && m.enabled && m.unlock.kind === 'steps')
    .sort((a, b) => (a.unlock.kind === 'steps' && b.unlock.kind === 'steps' ? a.unlock.steps - b.unlock.steps : 0))[0];
  const weekTotal = week.reduce((s, d) => s + d.total, 0);
  const goalSaveRow = (
    <>
      <ErrorText message={error} />
      <Button label={saved && !dirty ? 'Saved' : 'Save changes'} onPress={save} busy={busy} disabled={!dirty} />
    </>
  );

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: active && active.stage !== 'egg' ? monsterTint(active.species) : c.goldSoft }]}>
          {active ? <PetArt look={lookNow(active, phase)} size={56} /> : <MonsterIcon species="mochi" size={50} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>
            {user?.nickname ?? 'Walker'}
          </Text>
          <Text style={[styles.since, { color: c.muted }]}>{since ? `Walking since ${since}` : user?.email}</Text>
        </View>
      </View>


      <View style={styles.stats}>
        <StatTile icon={<Icon.feet size={26} color={c.skyBlue} />} value={compact(lifetime)} label="total steps" />
        <StatTile icon={<Icon.flame size={26} inner />} value={`${user?.bestStreak ?? 0} days`} label="best streak" />
        <StatTile
          icon={<LeagueBadge tier={user?.league ?? 'sprout'} size={24} />}
          value={leagueName(user?.league ?? 'sprout')}
          label="league"
        />
        <StatTile icon={<Icon.eggSticker size={26} />} value={`${met} / ${metTotal || '–'}`} label="monsters met" />
      </View>

      <Tap
        onPress={() => router.push('/stats')}
        accessibilityRole="link"
        accessibilityLabel={`This week, ${weekTotal.toLocaleString('en')} steps. Open stats`}
        scaleTo={0.98}
        style={[styles.card, { backgroundColor: c.card, borderColor: c.border, padding: 14, gap: 10 }]}
      >
        <View style={styles.cardHead}>
          <Text style={[styles.h2, { color: c.ink }]}>This week</Text>
          <Text style={[styles.weekTotal, { color: c.accentText }]}>{weekTotal.toLocaleString('en')} steps</Text>
        </View>
        <WeekBars days={week.length ? week : lastDays(7).map((d) => ({ label: DAY_LETTER[d.start.getDay()], total: 0 }))} />
        <View style={[styles.cardHead, { justifyContent: 'center', gap: 4 }]}>
          <Text style={[styles.weekTotal, { color: c.accentText }]}>See day, week and month stats</Text>
          <Icon.chevronRight size={16} color={c.accentText} />
        </View>
      </Tap>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 4 }]}>
        <Row label="Daily step goal" value={(user?.dailyGoal ?? goal).toLocaleString('en')} open={open === 'goal'} onPress={() => toggle('goal')}>
          <View style={[styles.stepper, { backgroundColor: c.surfaceAlt }]}>
            <Tap onPress={() => bump(-GOAL_STEP)} style={[styles.stepBtn, { backgroundColor: c.card }]} accessibilityLabel="Lower goal by 500" feedback="none">
              <Text style={[styles.stepSign, { color: c.ink }]}>−</Text>
            </Tap>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <T v="title" style={{ fontVariant: ['tabular-nums'] }}>
                {goal.toLocaleString('en')}
              </T>
              <T v="small" style={{ fontSize: 12 }}>
                steps a day
              </T>
            </View>
            <Tap onPress={() => bump(GOAL_STEP)} style={[styles.stepBtn, { backgroundColor: c.card }]} accessibilityLabel="Raise goal by 500" feedback="none">
              <Text style={[styles.stepSign, { color: c.ink }]}>+</Text>
            </Tap>
          </View>
          {goalSaveRow}
        </Row>
        <Row label="Step stats" value="Day · Week · Month" onPress={() => router.push('/stats')} />
        <Row label="Groups & friends" onPress={() => router.push('/groups')} />
        <Row label="Your data" value="Steps only" open={open === 'data'} onPress={() => toggle('data')} last>
          <T v="small">
            Step Pet reads only your hourly step counts. No location, heart rate or other health data. Leagues and groups show your nickname, pet and
            weekly steps.
          </T>
          <Button label="Step access settings" kind="ghost" onPress={openHealthSettings} />
        </Row>
      </View>

      <Tap onPress={() => router.push('/unlocks')} accessibilityRole="link" scaleTo={0.98} style={[styles.unlock, { backgroundColor: c.grape, shadowColor: c.grapeDeep }]}>
        <View style={styles.unlockPic}>{nextMonster ? <MonsterIcon species={nextMonster.id} size={36} mood="sleepy" /> : <Icon.eggSticker size={30} />}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.unlockTitle}>{nextMonster ? `Next unlock: ${nextMonster.name}` : 'Rare unlocks'}</Text>
          <Text style={styles.unlockSub}>
            {nextMonster && nextMonster.unlock.kind === 'steps'
              ? `${Math.max(0, nextMonster.unlock.steps - lifetime).toLocaleString('en')} steps to go`
              : 'See every monster you can hatch'}
          </Text>
        </View>
        <Icon.chevronRight size={20} color="#FFFFFF" />
      </Tap>

      {user?.role === 'admin' && (
        <Tap onPress={() => router.push('/admin')} accessibilityRole="link" scaleTo={0.98} style={[styles.card, styles.adminRow, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.adminIcon, { backgroundColor: c.accentSoft }]}>
            <Icon.grid size={20} color={c.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: c.ink }]}>Admin</Text>
            <Text style={[styles.since, { color: c.muted }]}>Overview, users and monsters</Text>
          </View>
          <Icon.chevronRight size={18} color={c.muted} />
        </Tap>
      )}

      <ServerSetting />
      <Button label="Log out" kind="ghost" onPress={signOut} />
      <Text style={[styles.foot, { color: c.muted }]}>Signed in as {user?.email}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 18, paddingBottom: 32, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, includeFontPadding: false },
  since: { fontFamily: fonts.body, fontSize: 13 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '48.5%', flexGrow: 1, flexBasis: '45%', borderWidth: 2, borderBottomWidth: 5, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statValue: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, includeFontPadding: false },
  statLabel: { fontFamily: fonts.body, fontSize: 12 },
  card: { borderWidth: 2, borderBottomWidth: 5, borderRadius: 22 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h2: { fontFamily: fonts.display, fontSize: 19, includeFontPadding: false },
  weekTotal: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54 },
  rowLabel: { flex: 1, fontFamily: fonts.bodyHeavy, fontSize: 15 },
  rowValue: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, padding: 8 },
  stepBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontFamily: fonts.bodyHeavy, fontSize: 24, lineHeight: 28 },
  unlock: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 5,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 5 },
  },
  unlockPic: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF33', alignItems: 'center', justifyContent: 'center' },
  unlockTitle: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: '#FFFFFF' },
  unlockSub: { fontFamily: fonts.body, fontSize: 12, color: '#E3D1FF' },
  adminRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  adminIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  foot: { textAlign: 'center', fontFamily: fonts.body, fontSize: 13 },
});
