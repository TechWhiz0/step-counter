import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { dialog } from '@/components/Dialog';
import { Monster } from '@/components/Monster';
import { ErrorText, Loading, PaperScreen, T, fmt, fonts, useColors } from '@/components/paper';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import { itemLabel } from '@/lib/items';
import type { ClosetItem, ClosetResult, Pet } from '@/lib/types';

const MAX_WORN = 3;

// Ink drawings for each item, on a 40 x 32 board.
const ITEM_PATH: Record<string, string> = {
  glasses: 'M4 16a6 6 0 1 0 12 0a6 6 0 1 0 -12 0 M24 16a6 6 0 1 0 12 0a6 6 0 1 0 -12 0 M16 15q4 -3 8 0 M4 14l-2 -3 M36 14l2 -3',
  cap: 'M8 22q0 -13 12 -13q12 0 12 13z M8 22h26 M20 9v-3',
  'star-badge': 'M20 4l4.2 8.6 9.4 1.3-6.8 6.6 1.6 9.3L20 25.4l-8.4 4.4 1.6-9.3-6.8-6.6 9.4-1.3z',
  'scarf-gold': 'M6 11q14 8 28 0 M8 14q12 7 24 0 M24 16l2 12 M28 15l3 11',
  balloon: 'M20 3c-6 0-9 5-9 10 0 6 5 10 9 10s9-4 9-10c0-5-3-10-9-10z M18 23l2 2 2-2 M20 25q-3 3 0 6',
  'night-glow': 'M24 5a11 11 0 1 0 8 18a9 9 0 1 1 -8 -18z',
  flower: 'M17 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M20 13q-4 -9 0 -10q4 1 0 10 M23 16q9 -4 10 0q-1 4 -10 0 M20 19q4 9 0 10q-4 -1 0 -10 M17 16q-9 4 -10 0q1 -4 10 0',
  crown: 'M7 24l-2-14 8 7 7-11 7 11 8-7-2 14z M7 28h26',
};

function ItemCell({ item, on, onPress }: { item: ClosetItem; on: boolean; onPress: () => void }) {
  const c = useColors();
  const owned = item.count > 0;
  const how = item.rule.kind === 'steps' ? `${fmt(item.rule.steps)} steps` : `${item.rule.days}-day run`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${itemLabel(item.item)}. ${owned ? (on ? 'Wearing. Tap to take off.' : 'Earned. Tap to wear.') : `Unlocks at ${how}.`}`}
      accessibilityState={{ selected: on, disabled: !owned }}
      disabled={!owned}
      onPress={onPress}
      style={({ pressed }) => ({
        width: '48%',
        alignItems: 'center',
        gap: 6,
        paddingTop: 10,
        paddingBottom: 8,
        borderRadius: 16,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: on ? c.ink : 'transparent',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 86,
          height: 42,
          borderRadius: 21,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: owned ? '#F6F1E7' : '#E5DED0',
          borderBottomWidth: owned ? 2 : 0,
          borderBottomColor: '#DDD4C3',
          borderTopWidth: owned ? 0 : 1.5,
          borderTopColor: '#D3CBBB',
          elevation: owned ? 3 : 0,
          shadowColor: '#2A1C12',
          shadowOpacity: owned ? 0.18 : 0,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <Svg width={40} height={32} viewBox="0 0 40 32">
          <Path d={ITEM_PATH[item.item] ?? 'M8 8h24v16H8z'} fill="none" stroke={owned ? c.ink : '#B3A897'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <T v="small" color={owned ? c.ink : c.muted}>
        {itemLabel(item.item)}
      </T>
      <T v="small" style={{ fontSize: 10.5 }}>
        {owned ? (on ? 'wearing' : 'earned') : how}
      </T>
    </Pressable>
  );
}

export default function Closet() {
  const c = useColors();
  const [data, setData] = useState<ClosetResult | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(Promise.resolve());

  const load = useCallback(async () => {
    try {
      const [closet, p] = await Promise.all([api<ClosetResult>('/pet/closet'), api<{ pet: Pet | null }>('/pet')]);
      setData(closet);
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

  function toggle(item: string) {
    if (!pet) return;
    const worn = pet.equipped.includes(item);
    if (!worn && pet.equipped.length >= MAX_WORN) {
      haptic.warn();
      return dialog('Three at a time', `${pet.name} can wear three things at once. Take one off first.`);
    }
    const next = worn ? pet.equipped.filter((i) => i !== item) : [...pet.equipped, item];
    const before = pet;
    haptic.select();
    setPet({ ...pet, equipped: next });
    // Saves in order; a failed save puts the outfit back.
    saving.current = saving.current.then(() =>
      api<{ pet: Pet }>('/pet/equip', { body: { items: next } })
        .then((r) => setPet(r.pet))
        .catch((e) => {
          setPet(before);
          setError((e as Error).message);
        }),
    );
  }

  const worn = pet?.equipped ?? [];
  return (
    <PaperScreen title="Closet">
      {!data || !pet ? (
        error ? (
          <View style={{ padding: 28 }}>
            <ErrorText message={error} />
          </View>
        ) : (
          <Loading kind="items" />
        )
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 28, paddingTop: 8 }}>
            <Monster species={pet.species} stage={pet.stage} form={pet.form} equipped={worn} mood="happy" size={112} />
            <View style={{ flex: 1, gap: 6 }}>
              <T>What {pet.name} wears today.</T>
              <T v="small">{worn.length ? `Wearing ${worn.map((i) => itemLabel(i).toLowerCase()).join(', ')}.` : 'Nothing yet. Tap to try one on.'}</T>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 28, marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.rule }}>
            <T style={{ fontFamily: fonts.bodyBold }}>Things</T>
            <T v="small">
              {worn.length} of {MAX_WORN} worn
            </T>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 10, rowGap: 6 }}>
            {data.items.map((it) => (
              <ItemCell key={it.item} item={it} on={worn.includes(it.item)} onPress={() => toggle(it.item)} />
            ))}
          </View>
          <ErrorText message={error} />
          <T v="small" style={{ textAlign: 'center', marginTop: 18, marginHorizontal: 28 }}>
            Nothing here is bought. Every thing is walked for.
          </T>
        </>
      )}
    </PaperScreen>
  );
}
