import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { chapterFor, type PathNode } from '@/components/GrowthPath';
import { Icon } from '@/components/icons';
import { PetView } from '@/components/PetView';
import { Bar, fonts, Muted, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { lookNow, useDayPhase } from '@/lib/petState';
import { haptic } from '@/lib/feel';
import { cachedSync } from '@/lib/sync';
import type { Pet } from '@/lib/types';

// Node positions from the design (left, top of each stop in a 390-wide frame), spaced evenly enough
// that whichever stop is current (bigger, with a "YOU ARE HERE" label above) never overlaps its neighbours.
const SPOTS: { x: number; y: number }[] = [
  { x: 155, y: 30 },
  { x: 95, y: 165 },
  { x: 140, y: 300 },
  { x: 228, y: 415 },
  { x: 165, y: 520 },
  { x: 70, y: 610 },
];
const FIELD_H = 710;

function Chest() {
  return (
    <Svg width={38} height={34} viewBox="0 0 38 34">
      <Rect x={3} y={12} width={32} height={20} rx={4} fill="#C9A26B" />
      <Path d="M3 16a10 10 0 0 1 10-10h12a10 10 0 0 1 10 10z" fill="#B08650" />
      <Rect x={15} y={14} width={8} height={10} rx={2} fill="#FFC233" />
    </Svg>
  );
}

function Mystery() {
  return (
    <Svg width={62} height={62} viewBox="0 0 120 120">
      <Circle cx={33} cy={35} r={12} fill="#D8CCF5" />
      <Circle cx={87} cy={35} r={12} fill="#D8CCF5" />
      <Path d="M18 74c0-25 19-44 42-44s42 19 42 44-19 34-42 34-42-9-42-34z" fill="#D8CCF5" />
      <SvgText x={60} y={88} textAnchor="middle" fontFamily={fonts.display} fontSize={40} fill="#8B5CF6">
        ?
      </SvgText>
    </Svg>
  );
}

function Stop({ node, x, y }: { node: PathNode; x: number; y: number }) {
  const c = useColors();
  const lockedFace = c.disabledFace;
  const lockedEdge = c.shadow;

  if (node.kind === 'final' && node.state !== 'done') {
    return (
      <View accessibilityLabel={`Locked: ${node.label}`} style={[styles.abs, { left: x, top: y }]}>
        <View style={[styles.final, { backgroundColor: c.grapeSoft, borderColor: '#C9B5FF' }]}>
          <Mystery />
        </View>
      </View>
    );
  }

  if (node.state === 'current') {
    return (
      <View accessibilityLabel={`Current: ${node.label}`} style={[styles.abs, { left: x - 6, top: y - 22, alignItems: 'center', gap: 6 }]}>
        <View style={[styles.here, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.hereText, { color: c.accent }]}>YOU ARE HERE</Text>
        </View>
        <View style={[styles.halo, { backgroundColor: '#CFEFDB' }]}>
          <View style={[styles.node, styles.nodeBig, { backgroundColor: c.accent, borderBottomColor: c.accentDeep }]}>
            {node.kind === 'chest' ? <Chest /> : <Icon.feet size={34} color="#FFFFFF" />}
          </View>
        </View>
      </View>
    );
  }

  const done = node.state === 'done';
  return (
    <View accessibilityLabel={`${done ? 'Done' : 'Locked'}: ${node.label}`} style={[styles.abs, { left: x, top: y }]}>
      <View
        style={[
          styles.node,
          node.kind === 'chest' && { borderRadius: 22 },
          done ? { backgroundColor: c.gold, borderBottomColor: '#E0A000' } : { backgroundColor: lockedFace, borderBottomColor: lockedEdge },
        ]}
      >
        {done ? (
          <Icon.check size={30} color="#5C4300" width={3.2} />
        ) : node.kind === 'chest' ? (
          <Chest />
        ) : (
          <Icon.lock size={26} color={c.faint} width={2.6} />
        )}
      </View>
    </View>
  );
}

export default function GrowthPathScreen() {
  const c = useColors();
  const phase = useDayPhase();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [pet, setPet] = useState<Pet | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { pet: fresh } = await api<{ pet: Pet | null }>('/pet');
      if (fresh) setPet(fresh);
    } catch {
      const cached = await cachedSync();
      if (cached?.pet) setPet((p) => p ?? cached.pet);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cachedSync().then((s) => s?.pet && setPet((p) => p ?? s.pet));
      void load();
    }, [load]),
  );

  if (!pet) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <Muted>Finding your path…</Muted>
      </View>
    );
  }

  const ch = chapterFor(pet);
  // Scale the 390-wide design to the screen, keeping stops inside the gutters.
  const k = Math.min(1.15, (width - 36) / 354);
  const fx = (x: number) => 18 + (x - 18) * k;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 110 }}
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
        <View style={[styles.banner, { backgroundColor: c.accent, borderBottomColor: c.accentDeep }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.chapter, { color: '#CFF2DC' }]}>
              Chapter {ch.chapter} · {ch.chapterName}
            </Text>
            <Text style={[styles.bannerTitle, { color: c.onAccent }]}>{ch.title}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chapter guide"
            onPress={() => {
              haptic.tap();
              Alert.alert(
                `Chapter ${ch.chapter} · ${ch.chapterName}`,
                `Every step you walk helps ${pet.name} grow. Reach each stop on the path to open the next one. The chest holds a surprise, and the last stop is ${pet.name}'s next form.`,
              );
            }}
            style={styles.guide}
          >
            <Icon.book size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={{ height: FIELD_H * Math.max(1, k * 0.95), marginTop: 22 }}>
          {ch.nodes.map((n, i) => (
            <Stop key={i} node={n} x={fx(SPOTS[i].x)} y={SPOTS[i].y * Math.max(1, k * 0.95)} />
          ))}
          <View pointerEvents="box-none" style={{ position: 'absolute', right: 8, top: 330 }}>
            <PetView look={lookNow(pet, phase)} size={150} onPet={() => {}} />
          </View>
        </View>
      </ScrollView>

      {ch.current ? (
        <View style={[styles.next, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.nextTitle, { color: c.ink }]}>
              Next: {ch.current.kind === 'steps' ? `${ch.current.at.toLocaleString('en')} steps` : ch.current.label}
            </Text>
            <Bar value={ch.legProgress} height={12} track={c.accentSoft} />
          </View>
          <Text style={[styles.left, { color: c.ink }]}>{ch.left.toLocaleString('en')} left</Text>
        </View>
      ) : (
        <View style={[styles.next, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.nextTitle, { color: c.ink, flex: 1 }]}>{pet.name} finished the path. Start a new egg any time.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  banner: { marginHorizontal: 18, borderRadius: 22, borderBottomWidth: 5, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  chapter: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  bannerTitle: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, includeFontPadding: false },
  guide: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: '#2EA862', backgroundColor: '#0F7A3E', alignItems: 'center', justifyContent: 'center' },
  node: { width: 72, height: 72, borderRadius: 36, borderBottomWidth: 6, alignItems: 'center', justifyContent: 'center' },
  nodeBig: { width: 84, height: 84, borderRadius: 42 },
  halo: { padding: 8, borderRadius: 60 },
  here: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2 },
  hereText: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  final: { width: 96, height: 80, borderRadius: 26, borderWidth: 3, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  next: { position: 'absolute', left: 18, right: 18, bottom: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextTitle: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  left: { fontFamily: fonts.display, fontSize: 16, includeFontPadding: false },
});
