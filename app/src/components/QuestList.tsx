import { Text, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Bar, Card, CardHeader, fonts, IconTile, SmallButton, useColors } from '@/components/ui';
import type { Quest } from '@/lib/types';

function hoursToMidnight() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 3_600_000));
}

// Daily quests: icon tile, title over a labelled bar, and the reward or a Claim button.
export function QuestList({ quests, onClaim, busy }: { quests: Quest[] | null; onClaim: (id: Quest['id']) => void; busy: string | null }) {
  const c = useColors();
  const look = (q: Quest) =>
    ({
      morning: { tile: c.goldSoft, bar: c.gold, label: c.goldText, icon: <Icon.flame size={22} /> },
      treat: { tile: c.berrySoft, bar: c.berry, label: c.berryText, icon: <Icon.berry size={22} /> },
      golden: { tile: c.goldSoft, bar: c.gold, label: c.goldText, icon: <Icon.flame size={22} inner /> },
      goal: { tile: c.skySoft, bar: c.skyBlue, label: c.skyText, icon: <Icon.feet size={22} /> },
    })[q.id];

  return (
    <Card style={{ padding: 14, gap: 12 }}>
      <CardHeader title="Daily quests" note={`Resets in ${hoursToMidnight()} h`} />
      {!quests ? (
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: c.muted }}>Loading quests…</Text>
      ) : (
        quests.map((q) => {
          const l = look(q);
          const fmt = (n: number) => n.toLocaleString('en');
          return (
            <View key={q.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <IconTile bg={q.done ? c.goodSoft : l.tile}>{q.done ? <Icon.check size={22} color={c.accent} /> : l.icon}</IconTile>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{
                    fontFamily: fonts.bodyHeavy,
                    fontSize: 14,
                    color: q.done ? c.muted : c.ink,
                    textDecorationLine: q.done ? 'line-through' : 'none',
                  }}
                >
                  {q.title}
                </Text>
                {q.done ? (
                  <Bar value={1} color={c.accent} />
                ) : (
                  <Bar value={q.progress / q.target} color={l.bar} label={`${fmt(q.progress)} / ${fmt(q.target)}`} labelColor={q.progress ? l.label : c.muted} />
                )}
              </View>
              {q.claimed ? (
                <Text style={{ fontFamily: fonts.display, fontSize: 16, color: c.accent, includeFontPadding: false }}>Done</Text>
              ) : q.done ? (
                <SmallButton label="Claim" tone="sun" disabled={busy === q.id} onPress={() => onClaim(q.id)} />
              ) : (
                <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 12, color: c.berryText }}>
                  +{q.reward} treat{q.reward === 1 ? '' : 's'}
                </Text>
              )}
            </View>
          );
        })
      )}
    </Card>
  );
}
