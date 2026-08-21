import { createApiClient, type ApiClient } from '@jjoin/api-client';
import type { SecureSessionStore } from '../session/secure-session-store';

const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

let client: ApiClient | null = null;

export function getApiClient(store: SecureSessionStore): ApiClient {
  if (!client) {
    client = createApiClient({
      baseUrl: DEFAULT_API_URL,
      getAccessToken: () => store.getToken(),
    });
  }
  return client;
}

export function getApiBaseUrl() {
  return DEFAULT_API_URL;
}
