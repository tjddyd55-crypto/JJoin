import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Opaque signed session token — survives Railway redeploy without in-memory Map.
 * Format: jjoin.<base64url payload>.<base64url hmac>
 */
export function issueSessionToken(userId: string): string {
  const secret = process.env.JWT_SECRET ?? 'dev-only-change-me';
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, iat: Date.now() }),
    'utf8',
  ).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `jjoin.${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'jjoin') return null;
  const [, payload, sig] = parts;
  const secret = process.env.JWT_SECRET ?? 'dev-only-change-me';
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
    };
    return typeof json.sub === 'string' ? json.sub : null;
  } catch {
    return null;
  }
}
