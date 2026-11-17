import { router } from 'expo-router';
import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, type RefreshControlProps } from 'react-native';
import { dialog } from './Dialog';
import { DeskScreen, Meta, T, useColors } from './paper';
import { useSession } from '@/lib/session';

// How many flagged walkers wait for review, shared by the admin tab bar and screens.
export const ReviewCount = createContext<{ count: number; reload: () => void }>({ count: 0, reload: () => {} });
export const useReviewCount = () => useContext(ReviewCount);

// The admin chrome: "STEP PET · ADMIN" on the desk, a sign-out on the right, then the paper.
export function AdminFrame({
  title,
  children,
  refreshControl,
  scroll = true,
}: {
  title: string;
  children: ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  scroll?: boolean;
}) {
  const c = useColors();
  const { signOut } = useSession();
  return (
    <DeskScreen
      left="STEP PET · ADMIN"
      scroll={scroll}
      refreshControl={refreshControl}
      right={
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          style={{ minHeight: 44, justifyContent: 'center' }}
          onPress={() =>
            dialog('Sign out of admin?', 'You can sign back in any time.', [
              { text: 'Stay', style: 'cancel' },
              {
                text: 'Sign out',
                onPress: async () => {
                  await signOut();
                  router.replace('/welcome');
                },
              },
            ])
          }
        >
          <Meta color={c.deskText}>Sign out</Meta>
        </Pressable>
      }
    >
      <T v="display" style={{ marginHorizontal: 28, marginTop: 24, fontSize: 32 }}>
        {title}
      </T>
      {children}
    </DeskScreen>
  );
}
