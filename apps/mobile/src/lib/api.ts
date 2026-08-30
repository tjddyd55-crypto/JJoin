import Constants from 'expo-constants';
import { createApiClient, type ApiClient } from '@jjoin/api-client';
import type { SecureSessionStore } from '../session/secure-session-store';

/**
 * API base URL — SSOT order:
 * 1) EXPO_PUBLIC_API_URL (Metro/EAS inline)
 * 2) app.config extra.apiUrl (variant default)
 * 3) empty string (caller must not silently hit localhost)
 *
 * Localhost is no longer the silent default. Override explicitly when needed:
 * EXPO_PUBLIC_API_URL=http://127.0.0.1:3000
 */
function resolveApiBaseUrl(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
  if (fromEnv) return fromEnv;

  const fromExtra = (
    Constants.expoConfig?.extra as { apiUrl?: string } | undefined
  )?.apiUrl?.trim();
  if (fromExtra) return fromExtra;

  return '';
}

let client: ApiClient | null = null;
let clientBaseUrl: string | null = null;

export function getApiClient(store: SecureSessionStore): ApiClient {
  const baseUrl = resolveApiBaseUrl();
  if (!baseUrl) {
    console.warn(
      '[api] EXPO_PUBLIC_API_URL unset — set Development/Production API URL (localhost is not the default)',
    );
  }
  if (!client || clientBaseUrl !== baseUrl) {
    if (__DEV__) {
      try {
        const host = new URL(baseUrl).host;
        console.warn('[api] baseHost=', host);
      } catch {
        console.warn('[api] baseUrl invalid or empty');
      }
    }
    client = createApiClient({
      baseUrl: baseUrl || 'http://invalid.local',
      getAccessToken: () => store.getToken(),
    });
    clientBaseUrl = baseUrl;
  }
  return client;
}

export function getApiBaseUrl() {
  return resolveApiBaseUrl();
}
