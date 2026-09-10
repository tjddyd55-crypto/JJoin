import { createHmac, timingSafeEqual } from 'crypto';
import { assertJwtSecretConfigured, resolveJwtSecret } from '../config/production-guards';

/** Signed session lifetime. Expired tokens are rejected on verify. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function isSignedSessionToken(token: string): boolean {
  return token.startsWith('jjoin.');
}

/**
 * Opaque signed session token — survives Railway redeploy without in-memory Map.
 * Format: jjoin.<base64url payload>.<base64url hmac>
 */
export function issueSessionToken(userId: string, nowMs = Date.now()): string {
  const secret = assertJwtSecretConfigured();
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, iat: nowMs, exp: nowMs + SESSION_TTL_MS }),
    'utf8',
  ).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `jjoin.${payload}.${sig}`;
}

export function verifySessionToken(
  token: string | undefined,
  nowMs = Date.now(),
): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'jjoin') return null;
  const [, payload, sig] = parts;
  const secret = resolveJwtSecret();
  if (!secret) return null;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      exp?: number;
    };
    if (typeof json.sub !== 'string') return null;
    if (typeof json.exp !== 'number' || !Number.isFinite(json.exp)) return null;
    if (nowMs >= json.exp) return null;
    return json.sub;
  } catch {
    return null;
  }
}
