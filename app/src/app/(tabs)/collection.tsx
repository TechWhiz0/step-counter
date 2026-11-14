import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { PetArt, PetView } from '@/components/PetView';
import { Sky } from '@/components/Sky';
import { Button, Card, colors, ErrorText, Muted, Pill, radius, T, Tap } from '@/components/ui';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import { itemEmoji, itemLabel } from '@/lib/items';
import { FORM_LABEL, STAGE_LABEL } from '@/lib/petText';
import type { OwnedItem, Pet } from '@/lib/types';

const MAX_EQUIPPED = 3;
const formBand = (p: Pet) => (p.form === 'sunrise' ? 'sunrise' : p.form === 'moonlight' ? 'moonlight' : 'daytime');

export default function Collection() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [items, setItems] = useState<OwnedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, i] = await Promise.all([api<{ pets: Pet[] }>('/pet/collection'), api<{ items: OwnedItem[] }>('/pet/items')]);
      setPets(p.pets);
      setItems(i.items);
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

  const active = pets.find((p) => p.isActive);
  const past = pets.filter((p) => !p.isActive);
  const canWear = !!active && active.stage !== 'egg';

  // Updates the preview at once, then saves; rolls back if the server says no.
  async function toggle(item: string) {
    if (!active) return;
    const before = active.equipped;
    const on = before.includes(item);
    const next = on ? before.filter((i) => i !== item) : [...before, item].slice(-MAX_EQUIPPED);
    setPets((ps) => ps.map((p) => (p.id === active.id ? { ...p, equipped: next } : p)));
    try {
      await api<{ pet: Pet }>('/pet/equip', { body: { items: next } });
    } catch (e) {
      haptic.warn();
      setPets((ps) => ps.map((p) => (p.id === active.id ? { ...p, equipped: before } : p)));
      setError((e as Error).message);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <ErrorText message={error} />
      {active && (
        <Card style={styles.stageCard}>
          <Sky style={styles.stage}>
            <PetView look={active} size={190} onPet={() => {}} />
          </Sky>
          <View style={styles.stageInfo}>
            <View style={{ flex: 1 }}>
              <T v="h2">{active.name}</T>
              <Muted>{active.stage === 'adult' && active.form ? FORM_LABEL[active.form].name : STAGE_LABEL[active.stage]}</Muted>
            </View>
            <Pill tone="gold">
              {active.equipped.length}/{MAX_EQUIPPED} worn
            </Pill>
          </View>
          {active.stage === 'adult' && <Button label="Start a new egg" onPress={() => router.push('/new-egg')} />}
        </Card>
      )}

      <View style={{ gap: 4 }}>
        <T v="h2">Wardrobe</T>
        <Muted>
          {items.length === 0
            ? 'Reach golden steps and keep streaks going to find items for your pet.'
            : canWear
              ? `Tap to try things on. Up to ${MAX_EQUIPPED} at once.`
              : 'Items can be worn once your egg hatches.'}
        </Muted>
      </View>
      {items.length > 0 && (
        <View style={styles.grid}>
          {items.map((i) => {
            const on = !!active?.equipped.includes(i.item);
            return (
              <Tap
                key={i.item}
                onPress={() => toggle(i.item)}
                disabled={!canWear}
                feedback="select"
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: !canWear }}
                style={[styles.tile, on && styles.tileOn, !canWear && { opacity: 0.5 }]}
              >
                <T v="hero" style={{ fontSize: 32, lineHeight: 40 }}>{itemEmoji(i.item)}</T>
                <T v="bodyStrong" style={{ fontSize: 13 }} numberOfLines={1}>{itemLabel(i.item)}</T>
                {i.count > 1 && (
                  <View style={styles.badge}>
                    <T v="label" style={{ color: '#fff', fontSize: 10, letterSpacing: 0 }}>×{i.count}</T>
                  </View>
                )}
                {on && (
                  <View style={styles.check}>
                    <T v="label" style={{ color: '#fff', fontSize: 11, letterSpacing: 0 }}>✓</T>
                  </View>
                )}
              </Tap>
            );
          })}
        </View>
      )}

      <View style={{ gap: 4 }}>
        <T v="h2">Grown-up pets</T>
        {past.length === 0 && <Muted>When a pet is fully grown you can start a new egg. Your grown pets live here forever.</Muted>}
      </View>
      {past.length > 0 && (
        <View style={styles.grid}>
          {past.map((p) => (
            <Card key={p.id} style={styles.pastCard}>
              <Sky band={formBand(p)} style={styles.pastSky}>
                <PetArt look={p} size={110} />
              </Sky>
              <T v="h3">{p.name}</T>
              <Muted style={{ fontSize: 12 }}>{p.form ? FORM_LABEL[p.form].name : STAGE_LABEL[p.stage]}</Muted>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 18, paddingBottom: 40 },
  stageCard: { padding: 0, overflow: 'hidden', gap: 0 },
  stage: { alignItems: 'center', paddingVertical: 12 },
  stageInfo: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: 100,
    height: 100,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  badge: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.ink, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  check: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  pastCard: { width: '47%', alignItems: 'center', padding: 10, gap: 4 },
  pastSky: { alignSelf: 'stretch', alignItems: 'center', borderRadius: radius.md, marginBottom: 4 },
});
