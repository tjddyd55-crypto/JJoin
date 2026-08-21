import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { SessionProvider, useSession } from '../src/session/SessionContext';
import { AuthAppState } from '@jjoin/types';
import { AppText, ScreenContainer } from '@jjoin/design-system';
import { t } from '@jjoin/i18n';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function AuthGateBootstrap({ children }: { children: React.ReactNode }) {
  const { appState, bootstrapping } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (bootstrapping) return;
    const parts = segments as unknown as string[];
    const root = parts[0] ?? '';
    const authScreen = parts[1] ?? '';
    const inAuth = root === 'auth';

    if (appState === AuthAppState.UNAUTHENTICATED) {
      if (!inAuth || authScreen !== 'login') {
        router.replace('/auth/login');
      }
      return;
    }

    if (appState === AuthAppState.AUTHENTICATED_NEEDS_TERMS) {
      if (authScreen !== 'terms') router.replace('/auth/terms');
      return;
    }

    if (appState === AuthAppState.AUTHENTICATED_PROFILE_INCOMPLETE) {
      const allowed = ['profile-setup', 'profile-photo', 'identity', 'gate', 'terms'];
      if (!inAuth || !allowed.includes(authScreen)) {
        router.replace('/auth/profile-setup');
      }
      return;
    }

    if (
      (appState === AuthAppState.READY ||
        appState === AuthAppState.AUTHENTICATED_IDENTITY_UNVERIFIED) &&
      inAuth &&
      authScreen === 'login'
    ) {
      router.replace('/(tabs)');
    }
  }, [appState, bootstrapping, segments, router]);

  if (bootstrapping || appState === AuthAppState.BOOTSTRAPPING) {
    return (
      <ScreenContainer>
        <AppText>{t('common.loading')}</AppText>
      </ScreenContainer>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SessionProvider>
        <AuthGateBootstrap>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="my" />
            <Stack.Screen name="join/[joinId]" />
            <Stack.Screen name="user/[userId]" />
          </Stack>
        </AuthGateBootstrap>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
