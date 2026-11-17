import { Redirect, router } from 'expo-router';
import { View } from 'react-native';
import { Egg } from '@/components/Monster';
import { Button, DeskScreen, Footer, Meta, Rail, T, useColors } from '@/components/paper';
import { useSession } from '@/lib/session';

export default function Welcome() {
  const c = useColors();
  const { status } = useSession();
  if (status === 'signedIn') return <Redirect href="/" />;
  return (
    <DeskScreen
      left={<Meta color={c.deskText} style={{ flex: 1, textAlign: 'center', marginRight: 12, letterSpacing: 3 }}>Step Pet</Meta>}
      footer={
        <Footer>
          <Button label="Start walking" onPress={() => router.push('/register')} />
          <Button kind="link" label="I already have a pet · Sign in" onPress={() => router.push('/login')} />
        </Footer>
      }
    >
      <View style={{ paddingHorizontal: 32, paddingTop: 40, gap: 16 }}>
        <T v="display" style={{ fontSize: 38, lineHeight: 41 }}>
          A small companion{'\n'}for your walks.
        </T>
        <T color={c.inkSoft}>
          Walk, and an egg grows.{'\n'}When you walk shapes what it becomes.{'\n'}No two days are alike.
        </T>
      </View>
      <View style={{ alignItems: 'center', marginTop: 28 }}>
        <Egg size={132} />
      </View>
      <View style={{ marginTop: 22 }}>
        <Rail steps={0} goal={6000} />
        <T v="small" style={{ marginHorizontal: 32, marginTop: 4 }}>
          Begin here.
        </T>
      </View>
    </DeskScreen>
  );
}
