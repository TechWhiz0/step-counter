import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { Icon } from '@/components/icons';
import { MonsterIcon, monsterTint } from '@/components/monsters';
import { ErrorText, fonts, Tap, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import type { MonsterEntry, MonstersResult, Unlock } from '@/lib/types';

const RARITY = { starter: 'Starter', rare: 'Rare', epic: 'Epic' };

const unlockText = (u: Unlock) =>
  u.kind === 'steps' ? `${u.steps.toLocaleString('en')} steps` : u.kind === 'streak' ? `${u.days}-day streak` : u.kind === 'event' ? u.event : 'Starter';

const stepsOf = (m: MonsterEntry) => (m.unlock.kind === 'steps' ? m.unlock.steps : Infinity);

// A grey blob with a question mark, for epics you haven't got close to yet.
function Mystery({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Path d="M18 74c0-25 19-44 42-44s42 19 42 44-19 34-42 34-42-9-42-34z" fill="#C7CFDA" />
      <SvgText x={60} y={90} fontSize={48} fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
        ?
      </SvgText>
    </Svg>
  );
}

export default function Unlocks() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<MonstersResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      api<MonstersResult>('/monsters')
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e: Error) => setError(e.message));
    }, []),
  );

  const special = (data?.monsters ?? [])
    .filter((m) => m.rarity !== 'starter' && (m.enabled || m.unlocked))
    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || stepsOf(a) - stepsOf(b));
  const starters = (data?.monsters ?? []).filter((m) => m.rarity === 'starter');
  const unlockedCount = special.filter((m) => m.unlocked).length;
  const next = special.filter((m) => !m.unlocked && m.unlock.kind === 'steps')[0];
  const lifetime = data?.lifetimeSteps ?? 0;

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Tap
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[styles.back, { backgroundColor: c.card, borderColor: c.border }]}
        >
          <Icon.chevronLeft size={22} color={c.ink} />
        </Tap>
        <Text style={[styles.h1, { color: c.ink }]}>Rare unlocks</Text>
      </View>

      {!data ? (
        error ? <ErrorText message={error} /> : <ActivityIndicator color={c.accent} style={{ marginTop: 80 }} />
      ) : (
        <>
          <View style={[styles.hero, { backgroundColor: c.accent, shadowColor: c.accentDeep }]}>
            <Text style={styles.heroLabel}>Lifetime steps</Text>
            <View style={styles.heroRow}>
              <Text style={styles.heroNum}>{lifetime.toLocaleString('en')}</Text>
              <Text style={styles.heroCount}>
                {unlockedCount} of {special.length} unlocked
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: c.accentDeep }]}>
              <View style={[styles.fill, { width: `${next ? Math.min(100, (lifetime / stepsOf(next)) * 100) : 100}%` }]} />
            </View>
            <Text style={styles.heroNote}>
              {next
                ? `${(stepsOf(next) - lifetime).toLocaleString('en')} more steps until ${next.name} hatches from your next egg.`
                : 'Every step monster is unlocked. Legend.'}
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            {special.map((m) => {
              const isNext = m.id === next?.id;
              if (m.unlocked) {
                return (
                  <View key={m.id} style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
                    <View style={[styles.pic, { backgroundColor: monsterTint(m.id) }]}>
                      <MonsterIcon species={m.id} size={46} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: c.ink }]}>{m.name}</Text>
                      <Text style={[styles.meta, { color: c.muted }]}>
                        {RARITY[m.rarity]} · {unlockText(m.unlock)}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: c.accentSoft }]}>
                      <Text style={[styles.badgeText, { color: c.accentText }]}>{m.raised ? 'Raised' : 'Unlocked'}</Text>
                    </View>
                  </View>
                );
              }
              if (isNext) {
                return (
                  <View key={m.id} style={[styles.row, styles.rowNext, { backgroundColor: c.grapeSoft, borderColor: c.grape }]}>
                    <View style={[styles.pic, { backgroundColor: c.card }]}>
                      <MonsterIcon species={m.id} size={46} mood="sleepy" />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[styles.name, { color: c.ink }]}>
                        {m.name} <Text style={[styles.meta, { color: c.grapeText }]}>· Next up</Text>
                      </Text>
                      <Text style={[styles.meta, { color: c.grapeText }]}>
                        {RARITY[m.rarity]} · {unlockText(m.unlock)}
                      </Text>
                      <View style={[styles.miniTrack, { backgroundColor: c.grape + '33' }]}>
                        <View style={[styles.miniFill, { width: `${m.progress * 100}%`, backgroundColor: c.grape }]} />
                      </View>
                    </View>
                  </View>
                );
              }
              const mystery = m.rarity === 'epic';
              return (
                <View key={m.id} style={[styles.row, styles.rowLocked, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <View style={[styles.pic, { backgroundColor: c.card }]}>
                    {mystery ? (
                      <Mystery size={44} />
                    ) : (
                      <View style={{ opacity: 0.35 }}>
                        <MonsterIcon species={m.id} size={46} mood="sleepy" />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: c.ink, opacity: 0.8 }]}>{mystery ? 'Mystery monster' : m.name}</Text>
                    <Text style={[styles.meta, { color: c.muted }]}>
                      {RARITY[m.rarity]} · {unlockText(m.unlock)}
                    </Text>
                    {m.unlock.kind === 'streak' && (
                      <View style={[styles.miniTrack, { backgroundColor: c.border, marginTop: 4 }]}>
                        <View style={[styles.miniFill, { width: `${m.progress * 100}%`, backgroundColor: c.flame }]} />
                      </View>
                    )}
                  </View>
                  <Icon.lock size={20} color={c.muted} />
                </View>
              );
            })}
          </View>

          {starters.length > 0 && (
            <View style={[styles.starters, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.startersTitle, { color: c.ink }]}>Starter friends</Text>
              <Text style={[styles.meta, { color: c.muted }]}>Any of these can hatch from an egg. A badge means you raised one.</Text>
              <View style={styles.starterGrid}>
                {starters.map((m) => (
                  <View key={m.id} style={styles.starter} accessibilityLabel={`${m.name}${m.raised ? ', raised' : ''}`}>
                    <View style={[styles.starterPic, { backgroundColor: monsterTint(m.id) }, !m.raised && { opacity: 0.6 }]}>
                      <MonsterIcon species={m.id} size={40} />
                      {m.raised && (
                        <View style={[styles.tick, { backgroundColor: c.accent, borderColor: c.card }]}>
                          <Icon.check size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.starterName, { color: c.muted }]}>{m.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <ErrorText message={error} />
          <Text style={[styles.foot, { color: c.muted }]}>Unlocked monsters can hatch from your next egg. Everything is earned by walking.</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 18, paddingBottom: 32, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: fonts.display, fontSize: 26, includeFontPadding: false },
  hero: {
    borderRadius: 24,
    padding: 16,
    gap: 8,
    marginBottom: 5,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 5 },
  },
  heroLabel: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#CFF2DC' },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  heroNum: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, color: '#FFFFFF', includeFontPadding: false },
  heroCount: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: '#CFF2DC', marginBottom: 6 },
  track: { height: 14, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 14, borderRadius: 999, backgroundColor: '#FFC233' },
  heroNote: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#FFFFFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 2, borderBottomWidth: 5, borderRadius: 20 },
  rowNext: { borderWidth: 3, borderBottomWidth: 6 },
  rowLocked: { borderStyle: 'dashed', borderBottomWidth: 2 },
  pic: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bodyHeavy, fontSize: 16 },
  meta: { fontFamily: fonts.body, fontSize: 12 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  badgeText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  miniTrack: { height: 10, borderRadius: 999, overflow: 'hidden' },
  miniFill: { height: 10, borderRadius: 999 },
  starters: { borderWidth: 2, borderBottomWidth: 5, borderRadius: 22, padding: 14, gap: 6 },
  startersTitle: { fontFamily: fonts.display, fontSize: 19, includeFontPadding: false },
  starterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  starter: { width: 56, alignItems: 'center', gap: 2 },
  starterPic: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tick: { position: 'absolute', right: -3, bottom: -3, width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  starterName: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  foot: { textAlign: 'center', fontFamily: fonts.body, fontSize: 13 },
});
