import * as FileSystem from 'expo-file-system/legacy';
import type { AppLaunchConfigDto } from '@jjoin/types';
import { APP_LAUNCH_DURATION_DEFAULT_MS } from '@jjoin/domain';
import { getApiClient } from '../../lib/api';
import { getSecureSessionStore } from '../../session/SessionContext';
import { isDevelopmentVariant } from '../../lib/app-variant';

const CACHE_DIR = `${FileSystem.cacheDirectory ?? ''}app-launch/`;
const META_PATH = `${CACHE_DIR}launch-meta.json`;

export type CachedAppLaunch = {
  enabled: boolean;
  displayDurationMs: number;
  updatedAt: string;
  /** Local file URI for cached hero image. */
  imageUri: string | null;
};

const embeddedFallback = require('../../../assets/images/dev-entry-launch.png');

export function readEmbeddedLaunchImageSource(): number {
  return embeddedFallback;
}

/** Last known config + image — safe for cold start before network. */
export async function loadCachedAppLaunch(): Promise<CachedAppLaunch> {
  try {
    const raw = await FileSystem.readAsStringAsync(META_PATH);
    const meta = JSON.parse(raw) as CachedAppLaunch;
    if (meta.imageUri) {
      const info = await FileSystem.getInfoAsync(meta.imageUri);
      if (!info.exists) meta.imageUri = null;
    }
    return meta;
  } catch {
    return {
      enabled: isDevelopmentVariant(),
      displayDurationMs: APP_LAUNCH_DURATION_DEFAULT_MS,
      updatedAt: '',
      imageUri: null,
    };
  }
}

export async function refreshAppLaunchCacheInBackground(): Promise<void> {
  if (!isDevelopmentVariant()) return;
  try {
    const api = getApiClient(getSecureSessionStore());
    const config: AppLaunchConfigDto = await api.getAppLaunchConfig();
    await persistLaunchConfig(config);
  } catch {
    // keep last cache
  }
}

async function persistLaunchConfig(config: AppLaunchConfigDto): Promise<void> {
  await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true }).catch(() => undefined);
  let imageUri: string | null = null;
  if (config.imageUrl) {
    const target = `${CACHE_DIR}hero-${hashUpdatedAt(config.updatedAt)}.jpg`;
    try {
      const result = await FileSystem.downloadAsync(config.imageUrl, target);
      imageUri = result.uri;
    } catch {
      imageUri = null;
    }
  }
  const payload: CachedAppLaunch = {
    enabled: config.enabled,
    displayDurationMs: config.displayDurationMs,
    updatedAt: config.updatedAt,
    imageUri,
  };
  await FileSystem.writeAsStringAsync(META_PATH, JSON.stringify(payload));
}

function hashUpdatedAt(updatedAt: string): string {
  return updatedAt.replace(/[^\d]/g, '').slice(0, 14) || 'default';
}
