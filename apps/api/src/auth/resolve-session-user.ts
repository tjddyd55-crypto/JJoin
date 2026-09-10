import { mockUserStore } from '../mock/mock-user.store';
import { isSignedSessionToken, verifySessionToken } from './session-token';

/**
 * Resolve the authenticated user for a Bearer token.
 * Signed `jjoin.` sessions are verified on every call (expiry included).
 * In-memory mock tokens stay cache-only.
 */
export function resolveAuthenticatedUserId(
  token: string | undefined,
  nowMs = Date.now(),
): string | null {
  if (!token) return null;
  if (isSignedSessionToken(token)) {
    const userId = verifySessionToken(token, nowMs);
    if (userId) mockUserStore.bindToken(token, userId);
    else mockUserStore.logout(token);
    return userId;
  }
  return mockUserStore.getUserIdByToken(token);
}
