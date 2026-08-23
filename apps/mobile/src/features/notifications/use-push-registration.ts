import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { AuthAppState } from '@jjoin/types';
import { getApiClient } from '../../lib/api';
import { getSecureSessionStore, useSession } from '../../session/SessionContext';
import {
  deactivateCurrentPushDevice,
  registerPushDeviceWithServer,
  resolvePushRoute,
} from './push-registration';

/**
 * Registers Expo push token after session is ready (not on first cold splash).
 * Handles notification tap → allowlisted join route.
 */
export function usePushRegistration() {
  const { appState, me } = useSession();
  const router = useRouter();
  const registeredForUser = useRef<string | null>(null);
  const api = getApiClient(getSecureSessionStore());
  const userId = me?.userId;

  useEffect(() => {
    if (
      appState !== AuthAppState.READY &&
      appState !== AuthAppState.AUTHENTICATED_IDENTITY_UNVERIFIED
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
        // permission denied / missing projectId — app remains usable
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, appState, userId]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const target = resolvePushRoute(data);
      if (target.kind === 'join') {
        router.push(`/join/${target.joinId}`);
      } else if (target.kind === 'notifications') {
        router.push('/my/notifications');
      }
    });
    return () => sub.remove();
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
