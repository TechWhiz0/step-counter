import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons';
import { MonsterIcon } from '@/components/monsters';
import { ServerSetting } from '@/components/ServerSetting';
import { Button, fonts, IconTile, useColors } from '@/components/ui';

export default function Welcome() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const points = [
    { icon: <Icon.eggSticker size={22} />, bg: c.goldSoft, text: 'Pick an egg. It hatches from your steps' },
    { icon: <Icon.flame size={22} inner />, bg: c.goldSoft, text: 'Daily quests and streaks keep it happy' },
    { icon: <Icon.feet size={22} color={c.grape} />, bg: c.grapeSoft, text: 'Walk more to unlock rare monsters' },
  ];
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.kicker, { color: c.accentText }]}>Step Pet · Quest Meadow</Text>
      <View style={[styles.hero, { backgroundColor: c.accentSoft }]}>
        <View style={[styles.hill, { backgroundColor: c.hillNear }]} />
        <View style={styles.monsters}>
          <MonsterIcon species="mochi" size={92} />
          <MonsterIcon species="mossy" size={130} />
          <MonsterIcon species="pip" size={92} mood="neutral" />
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={[styles.title, { color: c.ink }]}>Every step is a quest.</Text>
        <Text style={[styles.lede, { color: c.muted }]}>Raise a little monster that grows from your walks. No two are the same.</Text>
      </View>
      <View style={{ gap: 10 }}>
        {points.map((p) => (
          <View key={p.text} style={styles.point}>
            <IconTile bg={p.bg}>{p.icon}</IconTile>
            <Text style={[styles.pointText, { color: c.ink }]}>{p.text}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexGrow: 1 }} />
      <View style={{ gap: 12 }}>
        <Button label="Start walking" onPress={() => router.push('/register')} />
        <Button label="I have an account" kind="secondary" onPress={() => router.push('/login')} />
        <ServerSetting />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, paddingHorizontal: 24, gap: 18 },
  kicker: { fontFamily: fonts.bodyHeavy, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  hero: { height: 190, borderRadius: 28, overflow: 'hidden', justifyContent: 'flex-end' },
  hill: { position: 'absolute', left: -40, right: -40, bottom: -70, height: 130, borderRadius: 999 },
  monsters: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4, paddingBottom: 8 },
  title: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42, includeFontPadding: false },
  lede: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointText: { flex: 1, fontFamily: fonts.bodyHeavy, fontSize: 15 },
});
