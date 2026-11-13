import { router } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MeadowBackdrop } from '@/components/Doodles';
import { PetView } from '@/components/PetView';
import { ServerSetting } from '@/components/ServerSetting';
import { Button, Muted, Text, useColors } from '@/components/ui';
import { DEMO_TOKEN, demoUser } from '@/lib/demo';
import { useSession } from '@/lib/session';

export default function Welcome() {
  const colors = useColors();
  const { signIn } = useSession();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MeadowBackdrop height={230} sky />
      <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <PetView look={{ stage: 'egg', form: null, traits: null, mood: 'neutral', equipped: [], stageProgress: 0.6 }} size={220} />
          <Text style={{ fontSize: 44, fontWeight: '900', color: colors.ink }}>Step Pet</Text>
          <Muted style={{ textAlign: 'center', fontSize: 16 }}>
            Walk to hatch your egg. Your pet grows with every step, and how you walk decides what it becomes. No two pets are alike.
          </Muted>
        </View>
        <View style={{ gap: 12 }}>
          <Button label="Get started" onPress={() => router.push('/register')} />
          <Button label="I already have an account" kind="secondary" onPress={() => router.push('/login')} />
          {__DEV__ && (
            <Button
              label="Try the demo (no server)"
              kind="secondary"
              onPress={async () => {
                await signIn(DEMO_TOKEN, demoUser);
                router.replace('/(tabs)');
              }}
            />
          )}
          <ServerSetting />
        </View>
      </SafeAreaView>
    </View>
  );
}
