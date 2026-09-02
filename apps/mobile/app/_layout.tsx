import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import { SessionProvider, useSession } from '../src/session/SessionContext';
import { AuthAppState } from '@jjoin/types';
import {
  ScreenFrame,
  Text,
  ThemeProvider,
  clubMinimalTheme,
  useTheme,
} from '@jjoin/design-system';
import { resolveOnboardingStep } from '@jjoin/domain';
import { t } from '@jjoin/i18n';
import { isInternalToolsEnabled } from '../src/lib/internal-tools';
import { PushRegistrationHost } from '../src/features/notifications/PushRegistrationHost';

if (__DEV__) {
  console.log('[BOOT 01] module _layout loaded');
}

export { ErrorBoundary } from './RootErrorBoundary';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

/**
 * Eager mount (no React.lazy): Expo async-require/Activity can remount lazy children
 * without SessionProvider context and crash useSession. Push work stays deferred in
 * usePushRegistration effects, so shell boot is not blocked by native push modules.
 */
function PushBootstrap() {
  return <PushRegistrationHost />;
}

function AuthGateBootstrap({ children }: { children: React.ReactNode }) {
  const { appState, bootstrapping, me } = useSession();
  const segments = useSegments();
  const router = useRouter();

  if (__DEV__) {
    console.log('[BOOT 06] AuthGateBootstrap render', {
      appState,
      bootstrapping,
      segmentRoot: (segments as unknown as string[])[0] ?? '',
    });
  }

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
      if (authScreen !== 'terms' && authScreen !== 'legal') {
        router.replace('/auth/terms');
      }
      return;
    }

    if (appState === AuthAppState.AUTHENTICATED_PROFILE_INCOMPLETE) {
      const nextStep = me ? resolveOnboardingStep(me) : 'PROFILE_SETUP';
      const nextRoute = onboardingRouteForStep(nextStep);
      const expectedScreen = screenNameFromAuthRoute(nextRoute);
      const expectedIndex = expectedScreen
        ? ONBOARDING_SCREENS.indexOf(expectedScreen)
        : -1;
      const currentIndex = ONBOARDING_SCREENS.includes(
        authScreen as (typeof ONBOARDING_SCREENS)[number],
      )
        ? ONBOARDING_SCREENS.indexOf(authScreen as (typeof ONBOARDING_SCREENS)[number])
        : -1;
      const isAuxAuth =
        authScreen === 'gate' || authScreen === 'identity' || authScreen === 'legal';
      // Allow current or later steps (active forward nav); force resume from next incomplete step.
      const onTrack =
        isAuxAuth ||
        (currentIndex >= 0 && expectedIndex >= 0 && currentIndex >= expectedIndex);
      if (!inAuth || !onTrack) {
        router.replace(nextRoute);
      }
      return;
    }

    if (
      appState === AuthAppState.READY ||
      appState === AuthAppState.AUTHENTICATED_IDENTITY_UNVERIFIED
    ) {
      // Deferred identity + shared legal docs must stay reachable while browsing.
      const allowedWhenReady = ['gate', 'identity', 'legal'];
      if (inAuth && !allowedWhenReady.includes(authScreen)) {
        router.replace('/(tabs)');
      }
    }
  }, [appState, bootstrapping, segments, router, me]);

  if (bootstrapping || appState === AuthAppState.BOOTSTRAPPING) {
    return <SplashBootstrapScreen />;
  }

  return <>{children}</>;
}

const ONBOARDING_SCREENS = ['profile-setup', 'profile-photo', 'location'] as const;

function onboardingRouteForStep(
  step: ReturnType<typeof resolveOnboardingStep>,
): '/auth/profile-setup' | '/auth/profile-photo' | '/auth/location' | '/(tabs)' {
  if (step === 'PROFILE_PHOTO') return '/auth/profile-photo';
  if (step === 'LOCATION') return '/auth/location';
  if (step === 'HOME') return '/(tabs)';
  return '/auth/profile-setup';
}

function screenNameFromAuthRoute(
  route: string,
): (typeof ONBOARDING_SCREENS)[number] | null {
  if (route === '/auth/profile-photo') return 'profile-photo';
  if (route === '/auth/location') return 'location';
  if (route === '/auth/profile-setup') return 'profile-setup';
  return null;
}

function SplashBootstrapScreen() {
  const theme = useTheme();

  return (
    <ScreenFrame>
      <View style={styles.splash}>
        <Text variant="display" style={{ color: theme.colors.action.primary }}>
          {t('app.name')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('common.loading')}
        </Text>
      </View>
    </ScreenFrame>
  );
}

export default function RootLayout() {
  if (__DEV__) {
    console.log('[BOOT 02] RootLayout render');
    console.log('[BOOT 03] Gesture root render');
    console.log('[BOOT 04] ThemeProvider render');
    console.log('[BOOT 05] SessionProvider render');
    console.log('[BOOT 07] Stack render');
  }

  return (
    <GestureHandlerRootView
      style={[styles.root, { backgroundColor: clubMinimalTheme.colors.app.background }]}
    >
      <ThemeProvider theme={clubMinimalTheme}>
        <SessionProvider>
          <AuthGateBootstrap>
            <PushBootstrap />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: clubMinimalTheme.colors.app.background,
                },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="my" />
              <Stack.Screen name="join/[joinId]" options={{ headerShown: false }} />
              <Stack.Screen name="user/[userId]" />
              {isInternalToolsEnabled() ? (
                <Stack.Screen name="dev" options={{ headerShown: false }} />
              ) : null}
            </Stack>
          </AuthGateBootstrap>
        </SessionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
});
