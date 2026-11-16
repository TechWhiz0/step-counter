import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useColors } from '@/components/ui';
import { useSession } from '@/lib/session';

export default function Index() {
  const colors = useColors();
  const { status, user } = useSession();
  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (status !== 'signedIn') return <Redirect href="/welcome" />;
  // Admin accounts only ever see the admin screens.
  return <Redirect href={user?.role === 'admin' ? '/admin' : '/(tabs)'} />;
}
