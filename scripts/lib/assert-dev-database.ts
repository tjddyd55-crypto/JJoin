/**
 * DEV-only gate for additive migrate / FIELD import.
 * Production URL or Railway production env always aborts.
 */
export function assertDevDatabase(tag = '[DEV-FIELD-GOLF]'): void {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) throw new Error(`${tag} DATABASE_URL required`);
  const railwayEnv = (
    process.env.RAILWAY_ENVIRONMENT_NAME ??
    process.env.RAILWAY_ENVIRONMENT ??
    ''
  ).toLowerCase();
  const appVariant = (process.env.JJOIN_APP_VARIANT ?? process.env.APP_ENV ?? '').toLowerCase();
  const looksProdUrl =
    /production|prod-/i.test(url) ||
    /api-production/i.test(url) ||
    url.includes('postgres-production');
  if (looksProdUrl || railwayEnv === 'production' || appVariant === 'production') {
    throw new Error(
      `${tag} production_forbidden railwayEnv=${railwayEnv} appVariant=${appVariant}`,
    );
  }
}

export function resolveFieldOdcloudServiceKey(): string {
  // Live DEV probe: query serviceKey = DATA_GO_KR_SERVICE_KEY. Header-only auth 401s.
  const key =
    process.env.DATA_GO_KR_SERVICE_KEY?.trim() ||
    process.env.ODCLOUD_SERVICE_KEY?.trim() ||
    '';
  if (!key) {
    throw new Error('DATA_GO_KR_SERVICE_KEY or ODCLOUD_SERVICE_KEY missing');
  }
  return key;
}
