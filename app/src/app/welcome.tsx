import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PetView } from '@/components/PetView';
import { ServerSetting } from '@/components/ServerSetting';
import { Sky } from '@/components/Sky';
import { Button, colors, radius, T } from '@/components/ui';

const POINTS = [
  { icon: '🥚', text: 'Hatches after your first 5,000 steps' },
  { icon: '🌗', text: 'When you walk shapes what it becomes' },
  { icon: '✦', text: 'Hidden golden steps hide surprises' },
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Sky style={[styles.sky, { paddingTop: insets.top + 24 }]}>
        <PetView look={{ stage: 'egg', form: null, traits: null, mood: 'neutral', equipped: [], stageProgress: 0.6 }} size={210} onPet={() => {}} />
      </Sky>
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={{ gap: 8 }}>
          <T v="hero">Step Pet</T>
          <T v="body" style={{ color: colors.muted }}>A pet that grows from your walks. No two are alike.</T>
        </View>
        <View style={{ gap: 10 }}>
          {POINTS.map((p) => (
            <View key={p.text} style={styles.point}>
              <View style={styles.pointIcon}>
                <T v="h3">{p.icon}</T>
              </View>
              <T v="bodyStrong" style={{ flex: 1, fontSize: 15 }}>{p.text}</T>
            </View>
          ))}
        </View>
        <View style={{ gap: 10 }}>
          <Button label="Get started" onPress={() => router.push('/register')} />
          <Button label="I already have an account" kind="ghost" onPress={() => router.push('/login')} />
          <ServerSetting />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sky: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  sheet: {
    backgroundColor: colors.bg,
    marginTop: -radius.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 22,
  },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
});
