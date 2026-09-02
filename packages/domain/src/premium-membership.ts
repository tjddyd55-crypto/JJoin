/** Premium membership SSOT — server-time authority. */

export const PREMIUM_PASS_DEFAULT_DAYS = 30;

/** Normal users (non-premium, non-store-owner) active hosted join cap. */
export const NORMAL_USER_ACTIVE_HOST_JOIN_LIMIT = 1;

export type PremiumMembershipSnapshot = {
  status: string;
  startedAt: Date | string;
  expiresAt: Date | string;
};

export function isPremiumActive(
  expiresAt: Date | string | null | undefined,
  now = new Date(),
): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > now.getTime();
}

export function premiumRemainingDays(
  expiresAt: Date | string | null | undefined,
  now = new Date(),
): number | null {
  if (!isPremiumActive(expiresAt, now)) return null;
  const ms = new Date(expiresAt!).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function extendPremiumExpiry(
  currentExpiresAt: Date | string | null | undefined,
  premiumDays: number,
  now = new Date(),
): Date {
  const days = Math.max(1, Math.floor(premiumDays));
  const current = currentExpiresAt ? new Date(currentExpiresAt) : null;
  const base =
    current && current.getTime() > now.getTime() ? current : new Date(now.getTime());
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

export function canBypassJoinHostLimit(input: {
  isPremiumActive: boolean;
  hasActiveStoreOwnership: boolean;
}): boolean {
  return input.isPremiumActive || input.hasActiveStoreOwnership;
}

export function exceedsJoinHostLimit(activeHostedCount: number, limit: number): boolean {
  return activeHostedCount >= limit;
}

export function maskSecretKey(secretKey: string): string {
  const trimmed = secretKey.trim();
  if (trimmed.length <= 8) return '********';
  return `${trimmed.slice(0, 8)}${'*'.repeat(Math.min(12, trimmed.length - 8))}${trimmed.slice(-4)}`;
}
