import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { PushPlatform } from '@jjoin/types';
import type { ApiClient } from '@jjoin/api-client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ANDROID_CHANNEL_ID = 'jjoin-general';

let cachedExpoPushToken: string | null = null;
let lastRegisteredToken: string | null = null;

export function getCachedExpoPushToken(): string | null {
  return cachedExpoPushToken;
}

export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'JJOIN 알림',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0A6B56',
  });
}

/**
 * Soft permission request — call after onboarding / when user opens Notifications.
 * Never block Join/Apply if denied.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;
  await ensureAndroidNotificationChannel();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (current.status === 'denied' && !current.canAskAgain) return false;

  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function getExpoPushTokenSafe(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
      ?.projectId;
  if (!projectId) {
    console.warn('[push] EAS projectId missing — skip Expo push token');
    return null;
  }
  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    cachedExpoPushToken = token.data;
    return token.data;
  } catch (e) {
    console.warn('[push] getExpoPushToken failed', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function registerPushDeviceWithServer(api: ApiClient): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;
  const pushToken = await getExpoPushTokenSafe();
  if (!pushToken) return false;
  if (lastRegisteredToken === pushToken) return true;

  await api.registerPushDevice({
    pushToken,
    platform: Platform.OS === 'ios' ? PushPlatform.IOS : PushPlatform.ANDROID,
    deviceId: null,
  });
  lastRegisteredToken = pushToken;
  return true;
}

export async function deactivateCurrentPushDevice(api: ApiClient): Promise<void> {
  const token = cachedExpoPushToken ?? lastRegisteredToken;
  if (!token) return;
  try {
    await api.deactivateCurrentPushDevice(token);
  } catch {
    // logout must proceed even if deactivate fails
  }
  lastRegisteredToken = null;
}

export type PushRouteTarget =
  | { kind: 'join'; joinId: string }
  | { kind: 'notifications' }
  | { kind: 'none' };

/** Allowlisted deep-link mapping — never open arbitrary URLs from payload. */
export function resolvePushRoute(data: Record<string, unknown> | undefined): PushRouteTarget {
  if (!data) return { kind: 'none' };
  const joinId = typeof data.joinId === 'string' ? data.joinId : undefined;
  if (joinId && /^[0-9a-f-]{36}$/i.test(joinId)) {
    return { kind: 'join', joinId };
  }
  return { kind: 'notifications' };
}
