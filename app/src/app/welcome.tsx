import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PetView } from '@/components/PetView';
import { ServerSetting } from '@/components/ServerSetting';
import { Button, colors, Muted } from '@/components/ui';

export default function Welcome() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center', gap: 12, marginTop: 40 }}>
        <PetView look={{ stage: 'egg', form: null, traits: null, mood: 'neutral', equipped: [], stageProgress: 0.6 }} size={220} />
        <Text style={{ fontSize: 34, fontWeight: '900', color: colors.ink }}>Step Pet</Text>
        <Muted style={{ textAlign: 'center', fontSize: 16 }}>
          Walk to hatch your egg. Your pet grows with every step, and how you walk decides what it becomes. No two pets are alike.
        </Muted>
      </View>
      <View style={{ gap: 12 }}>
        <Button label="Get started" onPress={() => router.push('/register')} />
        <Button label="I already have an account" kind="secondary" onPress={() => router.push('/login')} />
        <ServerSetting />
      </View>
    </SafeAreaView>
  );
}
