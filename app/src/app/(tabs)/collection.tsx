import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { PetArt } from '@/components/PetView';
import { Button, Card, ErrorText, Muted, Text, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { itemLabel } from '@/lib/items';
import { FORM_LABEL, STAGE_LABEL } from '@/lib/petText';
import type { OwnedItem, Pet } from '@/lib/types';

const MAX_EQUIPPED = 3;

export default function Collection() {
  const colors = useColors();
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

  async function toggle(item: string) {
    if (!active) return;
    const on = active.equipped.includes(item);
    const next = on ? active.equipped.filter((i) => i !== item) : [...active.equipped, item].slice(-MAX_EQUIPPED);
    try {
      const { pet } = await api<{ pet: Pet }>('/pet/equip', { body: { items: next } });
      setPets((ps) => ps.map((p) => (p.id === pet.id ? pet : p)));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <ErrorText message={error} />
      {active && (
        <Card style={{ alignItems: 'center' }}>
          <PetArt look={active} size={180} />
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.ink }}>{active.name}</Text>
          <Muted>{active.stage === 'adult' && active.form ? FORM_LABEL[active.form].name : STAGE_LABEL[active.stage]}</Muted>
          {active.stage === 'adult' && (
            <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
              <Button label="Start a new egg" onPress={() => router.push('/new-egg')} />
            </View>
          )}
        </Card>
      )}

      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>Wardrobe</Text>
      {items.length === 0 ? (
        <Muted>Reach golden steps and keep streaks going to find items for your pet.</Muted>
      ) : (
        <>
          <Muted>Tap to put on or take off. Up to {MAX_EQUIPPED} at once.</Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {items.map((i) => {
              const on = !!active?.equipped.includes(i.item);
              return (
                <Pressable
                  key={i.item}
                  onPress={() => toggle(i.item)}
                  disabled={!active || active.stage === 'egg'}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    backgroundColor: on ? colors.accent : colors.card,
                    borderWidth: 1,
                    borderColor: on ? colors.accent : colors.border,
                  }}
                >
                  <Text style={{ color: on ? colors.onAccent : colors.ink, fontWeight: '700' }}>
                    {itemLabel(i.item)}
                    {i.count > 1 ? ` ×${i.count}` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {active?.stage === 'egg' && <Muted>Items can be worn once your egg hatches.</Muted>}
        </>
      )}

      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>Grown-up pets</Text>
      {past.length === 0 ? (
        <Muted>When a pet is fully grown you can start a new egg. Your grown pets live here forever.</Muted>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {past.map((p) => (
            <Card key={p.id} style={{ width: '47%', alignItems: 'center', padding: 10 }}>
              <PetArt look={p} size={120} />
              <Text style={{ fontWeight: '800', color: colors.ink }}>{p.name}</Text>
              <Muted>{p.form ? FORM_LABEL[p.form].name : STAGE_LABEL[p.stage]}</Muted>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
