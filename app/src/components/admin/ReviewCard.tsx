import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { leagueName } from '@/components/icons';
import { MonsterIcon, monsterTint } from '@/components/monsters';
import { Button, Card, fonts, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import type { AdminUser, LeagueTier } from '@/lib/types';

export const TIERS: LeagueTier[] = ['sprout', 'bloom', 'sunflower', 'starfruit'];
export const tierLabel = (i: number) => leagueName(TIERS[Math.min(Math.max(i, 0), TIERS.length - 1)]);

// Hours over this don't count toward leagues (matches the server rule).
const HOUR_CAP = 2500;

type Hours = { days: { day: string; hourly: number[]; total: number }[] };

// The worst day's 24 hours: spikes over the cap in flame, normal walking in mint, idle hours as stubs.
function HourBars({ userId }: { userId: string }) {
  const c = useColors();
  const [day, setDay] = useState<Hours['days'][number] | null>(null);
  useEffect(() => {
    api<Hours>(`/admin/users/${userId}/hours`)
      .then(({ days }) => {
        const worst = days.reduce<Hours['days'][number] | null>((w, d) => (!w || Math.max(...d.hourly) > Math.max(...w.hourly) ? d : w), null);
        setDay(worst);
      })
      .catch(() => setDay(null));
  }, [userId]);
  if (!day) return <View style={{ height: 46 }} />;
  const max = Math.max(HOUR_CAP, ...day.hourly);
  return (
    <View style={{ gap: 4 }}>
      <View accessibilityRole="image" accessibilityLabel={`Hourly steps on ${day.day}`} style={styles.bars}>
        {day.hourly.map((h, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: h ? Math.max(6, (h / max) * 44) : 4,
              borderRadius: 3,
              backgroundColor: h > HOUR_CAP ? c.flame : h > 0 ? '#9FDDB4' : c.shadow,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {['12a', '6a', '12p', '6p', '11p'].map((l) => (
          <Text key={l} style={{ fontFamily: fonts.bodyHeavy, fontSize: 10, color: c.muted }}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function Avatar({ species, size = 38, square }: { species: string | null | undefined; size?: number; square?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: square ? 14 : size / 2, backgroundColor: monsterTint(species), alignItems: 'center', justifyContent: 'center' }}>
      {species ? <MonsterIcon species={species} size={size * 0.82} /> : null}
    </View>
  );
}

// A flagged walker: what tripped the check, their hours, and the two decisions.
export function ReviewCard({ user, onDone }: { user: AdminUser; onDone: (u: AdminUser) => void }) {
  const c = useColors();
  const [busy, setBusy] = useState<'clear' | 'hide' | null>(null);
  const act = async (action: 'clear' | 'hide') => {
    setBusy(action);
    try {
      const r = await api<{ flagged: boolean; hiddenFromLeagues: boolean }>(`/admin/users/${user.id}/review`, { body: { action } });
      onDone({ ...user, ...r, flagReason: r.flagged ? user.flagReason : null });
    } finally {
      setBusy(null);
    }
  };
  return (
    <Card style={{ gap: 10, padding: 14 }}>
      <View style={styles.head}>
        <Avatar species={user.pet?.species} size={46} square />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: c.ink }]}>{user.nickname}</Text>
          <Text style={[styles.sub, { color: c.muted }]}>
            {tierLabel(user.league)} · {user.steps7d.toLocaleString('en')} steps this week
          </Text>
        </View>
        <View style={[styles.tag, { backgroundColor: c.goldSoft }]}>
          <Text style={[styles.tagText, { color: c.goldText }]}>Flagged</Text>
        </View>
      </View>
      <Text style={[styles.reason, { color: c.ink }]}>
        {user.flagReason ?? 'Unusual step pattern.'} Hours over {HOUR_CAP.toLocaleString('en')} were already left out of leagues.
      </Text>
      <HourBars userId={user.id} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label="Looks fine" kind="secondary" busy={busy === 'clear'} disabled={!!busy} onPress={() => act('clear')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Hide" kind="danger" busy={busy === 'hide'} disabled={!!busy} onPress={() => act('hide')} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontFamily: fonts.bodyHeavy, fontSize: 16 },
  sub: { fontFamily: fonts.body, fontSize: 12 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  reason: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  bars: { height: 46, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
});
