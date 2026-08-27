import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AuthAppState,
  MockAuthPersona,
  MockAuthScenario,
  SocialProvider,
  type MeDto,
  type PendingActionIntent,
} from '@jjoin/types';
import { obtainSocialCredential } from '../features/auth/social/obtain-social-credential';
import { obtainKakaoAccessToken } from '../features/auth/social/providers/kakao-native-login';
import { useMockSocialAuthFlow } from '../features/auth/social/social-auth-config';
import {
  SocialLoginCancelledError,
  SocialLoginUnavailableError,
} from '../features/auth/social/social-auth-errors';
import { pendingActionRoute, resolveAuthAppState } from '@jjoin/domain';
import { getApiClient } from '../lib/api';
import { isInternalToolsEnabled } from '../lib/internal-tools';
import { createExpoSecureSessionStore } from './expo-secure-session-store';
import {
  consumePendingAction,
  getPendingAction,
  setPendingAction,
} from './pending-action';
import type { SecureSessionStore } from './secure-session-store';

type SessionContextValue = {
  appState: AuthAppState;
  me: MeDto | null;
  bootstrapping: boolean;
  error: string | null;
  mockScenario: MockAuthScenario;
  setMockScenario: (s: MockAuthScenario) => void;
  mockPersona: MockAuthPersona | null;
  setMockPersona: (p: MockAuthPersona | null) => void;
  signInWithSocialProvider: (provider: SocialProvider) => Promise<string>;
  refreshMe: () => Promise<void>;
  acceptTerms: (body: unknown) => Promise<void>;
  startIdentity: () => Promise<string>;
  confirmIdentity: (sessionId: string, outcome?: 'success' | 'fail') => Promise<void>;
  cancelIdentity: (sessionId: string) => Promise<void>;
  setupProfile: (body: unknown) => Promise<void>;
  setAvatar: (body: { localUri?: string | null; skip?: boolean }) => Promise<void>;
  editProfile: (body: unknown) => Promise<void>;
  completeLocationOnboarding: () => Promise<void>;
  logout: () => Promise<void>;
  requestGatedAction: (intent: PendingActionIntent) => {
    allowed: boolean;
    returnTo?: string;
  };
  completeGateAndReturn: () => string;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const store: SecureSessionStore = createExpoSecureSessionStore();

/** Shared SecureStore-backed session for feature modules (Explore, etc.). */
export function getSecureSessionStore(): SecureSessionStore {
  return store;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [appState, setAppState] = useState(AuthAppState.BOOTSTRAPPING);
  const [me, setMe] = useState<MeDto | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mockScenario, setMockScenario] = useState(MockAuthScenario.NEW_USER);
  const [mockPersona, setMockPersona] = useState<MockAuthPersona | null>(null);
  const api = useMemo(() => getApiClient(store), []);

  const applyMe = useCallback(async (next: MeDto | null, hasSession: boolean) => {
    setMe(next);
    setAppState(resolveAuthAppState(next, hasSession));
  }, []);

  const bootstrap = useCallback(async () => {
    setBootstrapping(true);
    setError(null);
    try {
      const token = await store.getToken();
      if (!token) {
        await applyMe(null, false);
        return;
      }
      const session = await api.getSession();
      await applyMe(session.me, true);
    } catch {
      await store.clearToken();
      await applyMe(null, false);
    } finally {
      setBootstrapping(false);
    }
  }, [api, applyMe]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const signInWithSocialProvider = useCallback(
    async (provider: SocialProvider) => {
      setError(null);
      try {
        let res;
        if (mockPersona && isInternalToolsEnabled()) {
          res = await api.mockSocialSignIn({
            provider,
            persona: mockPersona,
          });
        } else if (isInternalToolsEnabled() && useMockSocialAuthFlow()) {
          res = await api.mockSocialSignIn({
            provider,
            scenario: mockScenario,
          });
        } else {
          const credential = await obtainSocialCredential(provider);
          try {
            res = await api.socialExchange({ provider, credential });
          } catch (exchangeError) {
            const exchangeMsg =
              exchangeError instanceof Error ? exchangeError.message : String(exchangeError);
            if (
              provider === SocialProvider.KAKAO &&
              exchangeMsg.includes('kakao_token_invalid')
            ) {
              const freshCredential = await obtainKakaoAccessToken({ forceInteractive: true });
              res = await api.socialExchange({ provider, credential: freshCredential });
            } else {
              throw exchangeError;
            }
          }
        }
        await store.setToken(res.session.accessToken);
        await applyMe(res.me, true);
        return res.nextStep;
      } catch (e) {
        if (e instanceof SocialLoginCancelledError) {
          throw e;
        }
        if (e instanceof SocialLoginUnavailableError) {
          setError('provider_not_configured');
          throw e;
        }
        const message = e instanceof Error ? e.message : 'login_failed';
        if (__DEV__) {
          console.warn('[session.signIn]', {
            provider,
            kind: message.startsWith('api_error:')
              ? 'HTTP'
              : message.startsWith('network_error:')
                ? 'NETWORK'
                : 'OTHER',
            detail: message.slice(0, 180),
          });
        }
        setError('login_failed');
        throw e;
      }
    },
    [api, applyMe, mockPersona, mockScenario],
  );

  const refreshMe = useCallback(async () => {
    const next = await api.getMe();
    await applyMe(next, true);
  }, [api, applyMe]);

  const acceptTerms = useCallback(
    async (body: unknown) => {
      const next = await api.acceptTerms(body);
      await applyMe(next, true);
    },
    [api, applyMe],
  );

  const startIdentity = useCallback(async () => {
    const { sessionId } = await api.startIdentity();
    await refreshMe();
    return sessionId;
  }, [api, refreshMe]);

  const confirmIdentity = useCallback(
    async (sessionId: string, outcome: 'success' | 'fail' = 'success') => {
      const next = await api.confirmIdentity({ sessionId, outcome });
      await applyMe(next, true);
    },
    [api, applyMe],
  );

  const cancelIdentity = useCallback(
    async (sessionId: string) => {
      const next = await api.cancelIdentity({ sessionId });
      await applyMe(next, true);
    },
    [api, applyMe],
  );

  const setupProfile = useCallback(
    async (body: unknown) => {
      const next = await api.setupProfile(body);
      await applyMe(next, true);
    },
    [api, applyMe],
  );

  const setAvatar = useCallback(
    async (body: { localUri?: string | null; skip?: boolean }) => {
      const next = await api.setAvatar(body);
      await applyMe(next, true);
    },
    [api, applyMe],
  );

  const editProfile = useCallback(
    async (body: unknown) => {
      const next = await api.editProfile(body);
      await applyMe(next, true);
    },
    [api, applyMe],
  );

  const completeLocationOnboarding = useCallback(async () => {
    const next = await api.completeLocationOnboarding();
    await applyMe(next, true);
  }, [api, applyMe]);

  const logout = useCallback(async () => {
    try {
      const { deactivateCurrentPushDevice } = await import(
        '../features/notifications/push-registration'
      );
      await deactivateCurrentPushDevice(api);
    } catch {
      // push deactivate is best-effort
    }
    try {
      await api.logout();
    } catch {
      // ignore network errors on logout
    }
    await store.clearToken();
    setPendingAction(null);
    await applyMe(null, false);
  }, [api, applyMe]);

  const requestGatedAction = useCallback(
    (intent: PendingActionIntent) => {
      const identity = me?.identity.verificationStatus;
      if (identity === 'VERIFIED') {
        return { allowed: true as const };
      }
      setPendingAction(intent);
      return { allowed: false as const, returnTo: '/auth/gate' };
    },
    [me],
  );

  const completeGateAndReturn = useCallback(() => {
    const intent = consumePendingAction() ?? getPendingAction();
    if (!intent) return '/(tabs)';
    return pendingActionRoute(intent);
  }, []);

  const value: SessionContextValue = {
    appState,
    me,
    bootstrapping,
    error,
    mockScenario,
    setMockScenario,
    mockPersona,
    setMockPersona,
    signInWithSocialProvider,
    refreshMe,
    acceptTerms,
    startIdentity,
    confirmIdentity,
    cancelIdentity,
    setupProfile,
    setAvatar,
    editProfile,
    completeLocationOnboarding,
    logout,
    requestGatedAction,
    completeGateAndReturn,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
