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
