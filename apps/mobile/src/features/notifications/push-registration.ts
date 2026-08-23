import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { PushPlatform } from '@jjoin/types';
import type { ApiClient } from '@jjoin/api-client';

type NotificationsModule = typeof import('expo-notifications');
type DeviceModule = typeof import('expo-device');

const ANDROID_CHANNEL_ID = 'jjoin-general';

let cachedExpoPushToken: string | null = null;
let lastRegisteredToken: string | null = null;
let notificationsModule: NotificationsModule | null | undefined;
let deviceModule: DeviceModule | null | undefined;
let nativeUnavailableLogged = false;

async function loadDevice(): Promise<DeviceModule | null> {
  if (deviceModule !== undefined) return deviceModule;
  try {
    deviceModule = await import('expo-device');
    return deviceModule;
  } catch (e) {
    deviceModule = null;
    if (!nativeUnavailableLogged) {
      nativeUnavailableLogged = true;
      const msg = e instanceof Error ? e.message : 'unknown';
      console.warn('[push] expo-device native unavailable — skip push', msg.slice(0, 120));
    }
    return null;
  }
}

async function isPhysicalDevice(): Promise<boolean> {
  const Device = await loadDevice();
  return Boolean(Device?.isDevice);
}

/**
 * Lazy-load expo-notifications so a stale Dev Client (missing PushToken native module)
 * does not crash app bootstrap via top-level import.
 * Returns null when native module is absent — Join/Auth/Map must keep working.
 */
async function loadNotifications(): Promise<NotificationsModule | null> {
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    const mod = await import('expo-notifications');
    notificationsModule = mod;
    return mod;
  } catch (e) {
    notificationsModule = null;
    if (!nativeUnavailableLogged) {
      nativeUnavailableLogged = true;
      const msg = e instanceof Error ? e.message : 'unknown';
      console.warn('[push] expo-notifications native unavailable — skip push', msg.slice(0, 120));
    }
    return null;
  }
}

export function getCachedExpoPushToken(): string | null {
  return cachedExpoPushToken;
}

export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'JJOIN 알림',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0A6B56',
  });
}

/**
 * Soft permission request — never block Join/Apply if denied or push unavailable.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!(await isPhysicalDevice())) return false;
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  await ensureAndroidNotificationChannel();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (current.status === 'denied' && !current.canAskAgain) return false;

  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function getExpoPushTokenSafe(): Promise<string | null> {
  if (!(await isPhysicalDevice())) return null;
  const Notifications = await loadNotifications();
  if (!Notifications) return null;

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
  try {
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
  } catch (e) {
    console.warn(
      '[push] register skipped',
      e instanceof Error ? e.message.slice(0, 120) : 'error',
    );
    return false;
  }
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

export async function configureNotificationHandler(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function addNotificationResponseListener(
  listener: (data: Record<string, unknown>) => void,
): Promise<{ remove: () => void } | null> {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    listener(data);
  });
  return { remove: () => sub.remove() };
}

export type { PushRouteTarget } from './push-routing';
export { resolvePushRoute } from './push-routing';
