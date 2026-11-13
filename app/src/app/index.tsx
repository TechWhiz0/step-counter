import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useColors } from '@/components/ui';
import { useSession } from '@/lib/session';

export default function Index() {
  const colors = useColors();
  const { status } = useSession();
  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return <Redirect href={status === 'signedIn' ? '/(tabs)' : '/welcome'} />;
}
