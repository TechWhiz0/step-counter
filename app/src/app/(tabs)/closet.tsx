import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, ItemIcon } from '@/components/icons';
import { PetArt } from '@/components/PetView';
import { compact, ErrorText, fonts, StatChip, Tap, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { lookNow, useDayPhase } from '@/lib/petState';
import { haptic } from '@/lib/feel';
import { itemLabel } from '@/lib/items';
import type { ClosetItem, ClosetResult, Pet } from '@/lib/types';

const SLOTS = 3;

const ruleText = (i: ClosetItem) =>
  i.rule.kind === 'steps' ? `at ${compact(i.rule.steps)}` : i.rule.kind === 'streak' ? `${i.rule.days}-day streak` : 'Golden step';

export default function Closet() {
  const c = useColors();
  const phase = useDayPhase();
  const insets = useSafeAreaInsets();
  const [closet, setCloset] = useState<ClosetResult | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [tab, setTab] = useState<'wearing' | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cl, p] = await Promise.all([api<ClosetResult>('/pet/closet'), api<{ pet: Pet | null }>('/pet')]);
      setCloset(cl);
      setPet(p.pet);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const equipped = pet?.equipped ?? [];
  const canWear = !!pet && pet.stage !== 'egg';

  // The closest step milestone not yet earned.
  const next = useMemo(
    () =>
      closet?.items
        .filter((i) => i.count === 0 && i.rule.kind === 'steps')
        .sort((a, b) => (a.rule.kind === 'steps' && b.rule.kind === 'steps' ? a.rule.steps - b.rule.steps : 0))[0],
    [closet],
  );

  // Updates the preview at once, then saves; rolls back if the server says no.
  async function toggle(item: string) {
    if (!pet) return;
    if (!canWear) {
      haptic.warn();
      return setError('Your pet can wear things once it hatches.');
    }
    const before = pet.equipped;
    const on = before.includes(item);
    if (!on && before.length >= SLOTS) {
      haptic.warn();
      return setError(`All ${SLOTS} slots are in use. Take something off first.`);
    }
    const nextItems = on ? before.filter((i) => i !== item) : [...before, item];
    setError(null);
    setPet({ ...pet, equipped: nextItems });
    haptic.select();
    try {
      await api<{ pet: Pet }>('/pet/equip', { body: { items: nextItems } });
    } catch (e) {
      haptic.warn();
      setPet((p) => (p ? { ...p, equipped: before } : p));
      setError((e as Error).message);
    }
  }

  const items = closet ? (tab === 'wearing' ? closet.items.filter((i) => equipped.includes(i.item)) : closet.items) : [];
  const owned = items.filter((i) => i.count > 0);
  const locked = items.filter((i) => i.count === 0);

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          tintColor={c.accent}
        />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.h1, { color: c.ink }]}>Closet</Text>
        {closet && <StatChip tone="sky" icon={<Icon.feet size={18} />} value={compact(closet.lifetimeSteps)} label={`${closet.lifetimeSteps.toLocaleString('en')} lifetime steps`} />}
      </View>

      {!closet ? (
        error ? <ErrorText message={error} /> : <ActivityIndicator color={c.accent} style={{ marginTop: 80 }} />
      ) : (
        <>
          <View style={[styles.look, { backgroundColor: c.skySoft, borderBottomColor: c.skyBlue + '40' }]}>
            {pet ? <PetArt look={lookNow(pet, phase)} size={96} /> : <View style={{ width: 96 }} />}
            <View style={{ gap: 6, flex: 1 }}>
              <Text style={[styles.lookTitle, { color: c.ink }]} numberOfLines={1}>
                {pet ? `${pet.name}'s look` : 'Your look'}
              </Text>
              <Text style={[styles.lookSub, { color: c.skyText }]}>
                {equipped.length} of {SLOTS} slots used
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Wearing ${equipped.map(itemLabel).join(', ') || 'nothing'}`}>
                {Array.from({ length: SLOTS }, (_, i) => {
                  const item = equipped[i];
                  return item ? (
                    <Pressable key={i} onPress={() => toggle(item)} accessibilityLabel={`Take off ${itemLabel(item)}`} style={[styles.slot, { backgroundColor: c.card }]}>
                      <ItemIcon item={item} size={24} />
                    </Pressable>
                  ) : (
                    <View key={i} style={[styles.slot, styles.slotEmpty, { borderColor: c.skyBlue + '88' }]} />
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.tabs} accessibilityRole="tablist">
            {(['wearing', 'all'] as const).map((t) => {
              const on = tab === t;
              return (
                <Pressable
                  key={t}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    haptic.select();
                    setTab(t);
                  }}
                  style={[styles.tab, { backgroundColor: on ? c.accentSoft : c.card, borderColor: on ? c.accent : c.border }]}
                >
                  <Text style={[styles.tabText, { color: on ? c.accentText : c.muted }]}>{t === 'wearing' ? `Wearing · ${equipped.length}` : 'All items'}</Text>
                </Pressable>
              );
            })}
          </View>

          {next && next.rule.kind === 'steps' && tab === 'all' && (
            <View style={[styles.next, { backgroundColor: c.grape, shadowColor: c.grapeDeep }]}>
              <View style={[styles.nextIcon, { backgroundColor: '#FFFFFF33' }]}>
                <ItemIcon item={next.item} size={32} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.nextLabel}>Next unlock · {compact(next.rule.steps)} steps</Text>
                <Text style={styles.nextName} numberOfLines={1}>
                  {itemLabel(next.item)}
                </Text>
                <View style={[styles.nextTrack, { backgroundColor: c.grapeDeep }]}>
                  <View style={[styles.nextFill, { width: `${Math.min(100, (closet.lifetimeSteps / next.rule.steps) * 100)}%` }]} />
                </View>
              </View>
              <Tap onPress={() => router.push('/unlocks')} style={styles.nextBtn} accessibilityRole="link">
                <Text style={[styles.nextBtnText, { color: c.grapeDeep }]}>All unlocks</Text>
              </Tap>
            </View>
          )}

          <ErrorText message={error} />

          {items.length === 0 ? (
            <Text style={[styles.empty, { color: c.muted }]}>{tab === 'wearing' ? 'Nothing on yet. Pick something from All items.' : 'No items yet.'}</Text>
          ) : (
            <View style={styles.grid}>
              {owned.map((i) => {
                const on = equipped.includes(i.item);
                return (
                  <View key={i.item} style={styles.tileSlot}>
                  <Tap
                    onPress={() => toggle(i.item)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${itemLabel(i.item)}, ${on ? 'wearing, tap to take off' : 'tap to wear'}`}
                    style={[styles.tile, { width: '100%', backgroundColor: on ? c.accentSoft : c.card, borderColor: on ? c.accent : c.border }]}
                  >
                    <ItemIcon item={i.item} size={36} />
                    <Text style={[styles.tileName, { color: c.ink }]} numberOfLines={1}>
                      {itemLabel(i.item)}
                    </Text>
                    <Text style={[styles.tileAction, { color: c.accentText }]}>{on ? 'Wearing' : 'Wear'}</Text>
                  </Tap>
                  </View>
                );
              })}
              {locked.map((i) =>
                i.rule.kind === 'golden' ? (
                  <View
                    key={i.item}
                    accessibilityLabel={`Locked: ${itemLabel(i.item)}, find it on a golden step`}
                    style={[styles.tile, styles.tileLocked, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                  >
                    <Icon.lock size={24} color={c.muted} />
                    <Text style={[styles.lockedText, { color: c.muted }]}>Golden step</Text>
                  </View>
                ) : (
                  <View key={i.item} accessibilityLabel={`Locked: ${itemLabel(i.item)}, ${ruleText(i)}`} style={[styles.tile, { backgroundColor: c.card, borderColor: c.border }]}>
                    <View style={{ opacity: 0.45 }}>
                      <ItemIcon item={i.item} size={36} />
                    </View>
                    <Text style={[styles.tileName, { color: c.ink }]} numberOfLines={1}>
                      {itemLabel(i.item)}
                    </Text>
                    <Text style={[styles.tileAction, { color: c.muted }]}>{ruleText(i)}</Text>
                  </View>
                ),
              )}
            </View>
          )}
          <Text style={[styles.foot, { color: c.muted }]}>Nothing here is sold. Every item is earned by walking.</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 18, paddingBottom: 32, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { fontFamily: fonts.display, fontSize: 28, includeFontPadding: false },
  look: { borderRadius: 26, borderBottomWidth: 6, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  lookTitle: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, includeFontPadding: false },
  lookSub: { fontFamily: fonts.bodyBold, fontSize: 13 },
  slot: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  slotEmpty: { borderWidth: 2, borderStyle: 'dashed' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, height: 44, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  next: {
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 5 },
    elevation: 0,
    marginBottom: 5,
  },
  nextIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  nextLabel: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#E3D1FF' },
  nextName: { fontFamily: fonts.display, fontSize: 19, lineHeight: 22, color: '#FFFFFF', includeFontPadding: false },
  nextTrack: { height: 10, borderRadius: 999, overflow: 'hidden' },
  nextFill: { height: 10, borderRadius: 999, backgroundColor: '#FFC233' },
  nextBtn: { height: 40, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  nextBtnText: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31.4%', borderWidth: 2, borderBottomWidth: 5, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 4 },
  tileSlot: { width: '31.4%' },
  tileLocked: { borderStyle: 'dashed', borderBottomWidth: 2, justifyContent: 'center', minHeight: 100 },
  tileName: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  tileAction: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  lockedText: { fontFamily: fonts.bodyHeavy, fontSize: 11, textAlign: 'center' },
  empty: { textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 14, paddingVertical: 20 },
  foot: { textAlign: 'center', fontFamily: fonts.body, fontSize: 12 },
});
