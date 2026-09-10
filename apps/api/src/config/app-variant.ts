import { appVariantToDb, normalizeAppVariant, type AppVariantName } from '@jjoin/domain';

/**
 * API deployment variant — must match mobile appVariant on push token registration.
 * Set JJOIN_APP_VARIANT=development on Railway Development.
 */
export function resolveApiAppVariant(): AppVariantName {
  const explicit = process.env.JJOIN_APP_VARIANT?.trim();
  if (explicit) return normalizeAppVariant(explicit);

  const railway = process.env.RAILWAY_ENVIRONMENT?.trim().toLowerCase();
  if (railway === 'development') return 'development';

  return 'production';
}

export function resolveApiAppVariantDb(): 'DEVELOPMENT' | 'PRODUCTION' {
  return appVariantToDb(resolveApiAppVariant());
}

/** Production deployment — Railway production or explicit JJOIN_APP_VARIANT=production. */
export function isProductionAppVariant(): boolean {
  return resolveApiAppVariant() === 'production';
}

/**
 * Development-only unsafe paths (mock login, DEV persona admin, TEST coin, QA clock).
 * Production variant is never allowed, even if SOCIAL_AUTH_MODE is hybrid/mock.
 */
export function isDevelopmentUnsafePathAllowed(): boolean {
  return resolveApiAppVariant() === 'development';
}
