import { timingSafeEqual } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

/**
 * Compare cron secrets without leaking length via early string !==.
 * Returns false when either side is empty.
 */
export function matchesCronSecret(
  provided: string | undefined | null,
  expected: string | undefined | null,
): boolean {
  const a = (provided ?? '').trim();
  const b = (expected ?? '').trim();
  if (!a || !b) return false;
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Prefer `x-settlement-cron-secret`, else `Authorization: Bearer <secret>`. */
export function extractCronSecret(headers: {
  'x-settlement-cron-secret'?: string;
  authorization?: string;
}): string | undefined {
  const header = headers['x-settlement-cron-secret']?.trim();
  if (header) return header;
  const auth = headers.authorization?.trim();
  if (!auth) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return match?.[1]?.trim() || undefined;
}

/** Require a configured cron secret — never allow public batch execution when unset. */
export function assertCronAuthorized(
  provided: string | undefined,
  expectedSecrets: Array<string | undefined | null>,
): void {
  const expected = expectedSecrets.map((s) => (s ?? '').trim()).find(Boolean);
  if (!expected) {
    throw new UnauthorizedException('cron_secret_not_configured');
  }
  if (!matchesCronSecret(provided, expected)) {
    throw new UnauthorizedException('cron_forbidden');
  }
}
