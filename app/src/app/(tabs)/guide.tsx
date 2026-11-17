import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { Monster } from '@/components/Monster';
import { ErrorText, Loading, PaperScreen, T, fmt, fonts, useColors } from '@/components/paper';
import { api } from '@/lib/api';
import type { MonsterEntry, MonstersResult } from '@/lib/types';

function unlockNote(m: MonsterEntry) {
  if (m.unlocked) return m.blurb;
  if (!m.enabled && m.unlock.kind === 'event') return `${m.unlock.event} only`;
  if (m.unlock.kind === 'steps') return `${fmt(m.unlock.steps)} steps`;
  if (m.unlock.kind === 'streak') return `${m.unlock.days}-day run`;
  return 'Coming soon';
}

function Cell({ m }: { m: MonsterEntry }) {
  const c = useColors();
  const showBar = !m.unlocked && m.progress > 0 && m.progress < 1;
  return (
    <View
      accessible
      accessibilityLabel={`${m.name}. ${m.unlocked ? (m.raised ? 'Raised.' : 'Can hatch.') : `Not met yet, unlocks at ${unlockNote(m)}.`}`}
      style={{ width: '33.33%', alignItems: 'center', gap: 5, paddingVertical: 8 }}
    >
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: m.unlocked ? c.paperRaised : '#E7E0D2',
          borderWidth: m.unlocked ? 1.5 : 0,
          borderColor: c.rule,
        }}
      >
        <Monster species={m.id} size={70} ghost={!m.unlocked} />
        {m.raised && (
          <View style={{ position: 'absolute', right: 0, bottom: 2, width: 22, height: 22, borderRadius: 11, borderWidth: 1.4, borderColor: c.sageSoft, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-10deg' }] }}>
            <T v="small" color={c.sageSoft} style={{ fontSize: 11, lineHeight: 13 }}>
              ✓
            </T>
          </View>
        )}
      </View>
      <T v="small" style={{ fontFamily: m.raised ? fonts.bodyBold : fonts.body, color: m.unlocked ? c.ink : c.muted }}>
        {m.name}
      </T>
      <T v="small" style={{ fontSize: 10, textAlign: 'center', paddingHorizontal: 4 }} numberOfLines={2}>
        {unlockNote(m)}
      </T>
      {showBar && (
        <View style={{ width: 56, height: 2, backgroundColor: c.rule, borderRadius: 1 }}>
          <View style={{ width: `${Math.round(m.progress * 100)}%`, height: 2, backgroundColor: c.accent, borderRadius: 1 }} />
        </View>
      )}
    </View>
  );
}

export default function Guide() {
  const c = useColors();
  const [data, setData] = useState<MonstersResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      setData(await api<MonstersResult>('/monsters'));
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
  const met = data?.monsters.filter((m) => m.unlocked).length ?? 0;
  return (
    <PaperScreen
      title="Field guide"
      right={data ? <T v="small">{`${met} of ${data.monsters.length} met`}</T> : null}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          tintColor={c.ink}
        />
      }
    >
      <View style={{ paddingHorizontal: 28, paddingTop: 18, gap: 10 }}>
        <T v="display">Who might hatch</T>
        <T color={c.inkSoft}>The more you walk, the more can come out of your next egg. Grey ones are still waiting.</T>
        <ErrorText message={error} />
      </View>
      {!data ? (
        error ? null : <Loading kind="grid" />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, marginTop: 14 }}>
          {data.monsters.map((m) => (
            <Cell key={m.id} m={m} />
          ))}
        </View>
      )}
    </PaperScreen>
  );
}
