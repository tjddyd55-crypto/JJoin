import { createApiClient, type ApiClient } from '@jjoin/api-client';
import type { SecureSessionStore } from '../session/secure-session-store';

function resolveApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:3000';
}

let client: ApiClient | null = null;
let clientBaseUrl: string | null = null;

export function getApiClient(store: SecureSessionStore): ApiClient {
  const baseUrl = resolveApiBaseUrl();
  if (!client || clientBaseUrl !== baseUrl) {
    if (__DEV__) {
      try {
        const host = new URL(baseUrl).host;
        console.warn('[api] baseHost=', host);
      } catch {
        console.warn('[api] baseUrl invalid');
      }
    }
    client = createApiClient({
      baseUrl,
      getAccessToken: () => store.getToken(),
    });
    clientBaseUrl = baseUrl;
  }
  return client;
}

export function getApiBaseUrl() {
  return resolveApiBaseUrl();
}
