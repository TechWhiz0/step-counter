import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useSession } from '@/lib/session';
import { palettes } from '@/lib/theme';

export default function Index() {
  const { status, user } = useSession();
  if (status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: palettes.day.desk }} />
    );
  }
  if (status !== 'signedIn') return <Redirect href="/welcome" />;
  // Admin accounts only ever see the admin screens.
  return <Redirect href={user?.role === 'admin' ? '/admin' : '/(tabs)'} />;
}
