import * as SecureStore from 'expo-secure-store';
import type { SecureSessionStore } from './secure-session-store';

const TOKEN_KEY = 'jjoin.session.accessToken';

export function createExpoSecureSessionStore(): SecureSessionStore {
  return {
    async getToken() {
      try {
        return await SecureStore.getItemAsync(TOKEN_KEY);
      } catch {
        return null;
      }
    },
    async setToken(token: string) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    },
    async clearToken() {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    },
  };
}
