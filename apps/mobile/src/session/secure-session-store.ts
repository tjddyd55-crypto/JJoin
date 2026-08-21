/** Secure session token storage port — never use web localStorage. */

export interface SecureSessionStore {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  clearToken(): Promise<void>;
}

const TOKEN_KEY = 'jjoin.session.accessToken';

export function createMemorySessionStore(): SecureSessionStore {
  let token: string | null = null;
  return {
    async getToken() {
      return token;
    },
    async setToken(value) {
      token = value;
    },
    async clearToken() {
      token = null;
    },
  };
}
