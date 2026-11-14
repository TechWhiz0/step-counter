import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/lib/session';
import { useColors } from '@/components/ui';

// Admin screens. The server checks the role on every call; this only keeps non-admins from wandering in.
export default function AdminLayout() {
  const c = useColors();
  const { user } = useSession();
  if (user && user.role !== 'admin') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />;
}
