import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthAppState } from '@jjoin/types';
import { getApiClient } from '../../lib/api';
import { getSecureSessionStore, useSessionOptional } from '../../session/SessionContext';
import {
  addNotificationResponseListener,
  configureNotificationHandler,
  deactivateCurrentPushDevice,
  registerPushDeviceWithServer,
  resolvePushRoute,
} from './push-registration';

/**
 * Registers Expo push token after session is ready (not on first cold splash).
 * Never fatal: missing native module / projectId / FCM / permission → skip only.
 * Uses optional session read so a mis-mounted host cannot crash the app shell.
 */
export function usePushRegistration() {
  const session = useSessionOptional();
  const router = useRouter();
  const registeredForUser = useRef<string | null>(null);
  const api = getApiClient(getSecureSessionStore());
  const appState = session?.appState;
  const userId = session?.me?.userId;

  useEffect(() => {
    void configureNotificationHandler();
  }, []);

  useEffect(() => {
    if (
      !appState ||
      (appState !== AuthAppState.READY &&
        appState !== AuthAppState.AUTHENTICATED_IDENTITY_UNVERIFIED)
    ) {
      return;
    }
    if (!userId) return;
    if (registeredForUser.current === userId) return;

    let cancelled = false;
    void (async () => {
      try {
        const ok = await registerPushDeviceWithServer(api);
        if (!cancelled && ok) registeredForUser.current = userId;
      } catch {
        // permission denied / missing projectId / native missing — app remains usable
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, appState, userId]);

  useEffect(() => {
    let remove: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const sub = await addNotificationResponseListener((data) => {
        const target = resolvePushRoute(data);
        if (target.kind === 'join') {
          router.push(`/join/${target.joinId}`);
        } else if (target.kind === 'golf-friends') {
          router.push('/my/golf-friends');
        } else if (target.kind === 'user') {
          router.push(`/user/${target.userId}`);
        } else if (target.kind === 'notifications') {
          router.push('/my/notifications');
        }
      });
      if (cancelled) {
        sub?.remove();
        return;
      }
      remove = sub?.remove;
    })();
    return () => {
      cancelled = true;
      remove?.();
    };
  }, [router]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && userId) {
        void registerPushDeviceWithServer(api).catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [api, userId]);

  const onLogoutDeactivate = useCallback(async () => {
    await deactivateCurrentPushDevice(api);
    registeredForUser.current = null;
  }, [api]);

  return { onLogoutDeactivate };
}
