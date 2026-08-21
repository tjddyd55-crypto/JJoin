import { useRouter } from 'expo-router';
import { useSession } from '../../../session/SessionContext';
import { AuthAppState } from '@jjoin/types';

/** Maps auth app state → onboarding / main route. */
export function useAuthNavigation() {
  const { appState } = useSession();
  const router = useRouter();

  function goByAppState(state: AuthAppState = appState) {
    switch (state) {
      case AuthAppState.UNAUTHENTICATED:
      case AuthAppState.BOOTSTRAPPING:
        router.replace('/auth/login');
        break;
      case AuthAppState.AUTHENTICATED_NEEDS_TERMS:
        router.replace('/auth/terms');
        break;
      case AuthAppState.AUTHENTICATED_PROFILE_INCOMPLETE:
        router.replace('/auth/profile-setup');
        break;
      case AuthAppState.AUTHENTICATED_IDENTITY_UNVERIFIED:
      case AuthAppState.READY:
        router.replace('/(tabs)');
        break;
    }
  }

  return { goByAppState };
}
