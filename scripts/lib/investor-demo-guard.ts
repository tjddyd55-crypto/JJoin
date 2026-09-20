/**
 * Fail-closed DEV gate for investor/demo seed + reset.
 * Production signals always abort. Ambiguous environments abort.
 *
 * Railway Development often sets NODE_ENV=production; that alone is not
 * enough to refuse when railwayEnvironment/appVariant is explicitly development.
 */

export const INVESTOR_DEMO_TAG = '[INVESTOR-DEMO]';

export type DemoEnvSnapshot = {
  nodeEnv: string;
  railwayEnvironment: string;
  railwayEnvironmentName: string;
  appVariant: string;
  databaseUrl: string;
};

const PRODUCTION_TOKENS = new Set(['production', 'prod']);

function normalize(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function readDemoEnv(env: NodeJS.ProcessEnv = process.env): DemoEnvSnapshot {
  return {
    nodeEnv: normalize(env.NODE_ENV),
    railwayEnvironment: normalize(env.RAILWAY_ENVIRONMENT),
    railwayEnvironmentName: normalize(env.RAILWAY_ENVIRONMENT_NAME),
    appVariant: normalize(env.JJOIN_APP_VARIANT || env.APP_ENV),
    databaseUrl: env.DATABASE_URL ?? '',
  };
}

export function looksLikeProductionDatabaseUrl(url: string): boolean {
  if (!url) return false;
  return (
    /production|prod-/i.test(url) ||
    /api-production/i.test(url) ||
    url.includes('postgres-production')
  );
}

export function looksLikeLocalDatabaseUrl(url: string): boolean {
  if (!url) return false;
  return /localhost|127\.0\.0\.1|:5432\b/.test(url) && !looksLikeProductionDatabaseUrl(url);
}

function isProductionToken(value: string): boolean {
  return PRODUCTION_TOKENS.has(value);
}

function isDevelopmentToken(value: string): boolean {
  return value === 'development' || value === 'dev';
}

export function describeDemoEnv(snapshot: DemoEnvSnapshot): string {
  return [
    `nodeEnv=${snapshot.nodeEnv || '(empty)'}`,
    `railwayEnvironment=${snapshot.railwayEnvironment || '(empty)'}`,
    `railwayEnvironmentName=${snapshot.railwayEnvironmentName || '(empty)'}`,
    `appVariant=${snapshot.appVariant || '(empty)'}`,
    `dbLooksProd=${looksLikeProductionDatabaseUrl(snapshot.databaseUrl)}`,
  ].join(' ');
}

export function resolveInvestorDemoBlockReason(snapshot: DemoEnvSnapshot): string | null {
  const railway = snapshot.railwayEnvironmentName || snapshot.railwayEnvironment;
  if (isProductionToken(railway)) {
    return `${INVESTOR_DEMO_TAG} production_forbidden railwayEnvironment=${railway}`;
  }
  if (isProductionToken(snapshot.appVariant)) {
    return `${INVESTOR_DEMO_TAG} production_forbidden appVariant=${snapshot.appVariant}`;
  }
  if (looksLikeProductionDatabaseUrl(snapshot.databaseUrl)) {
    return `${INVESTOR_DEMO_TAG} production_forbidden database_url`;
  }

  const explicitDev =
    isDevelopmentToken(snapshot.appVariant) || isDevelopmentToken(railway);
  if (explicitDev) return null;

  if (isProductionToken(snapshot.nodeEnv)) {
    return `${INVESTOR_DEMO_TAG} production_forbidden nodeEnv=production (no explicit development variant)`;
  }

  if (looksLikeLocalDatabaseUrl(snapshot.databaseUrl) && snapshot.nodeEnv !== 'production') {
    return null;
  }

  return `${INVESTOR_DEMO_TAG} production_forbidden ambiguous_environment ${describeDemoEnv(snapshot)}`;
}

/** Throws when the environment is production or not explicitly DEV. */
export function assertInvestorDemoAllowed(env: NodeJS.ProcessEnv = process.env): DemoEnvSnapshot {
  const snapshot = readDemoEnv(env);
  const reason = resolveInvestorDemoBlockReason(snapshot);
  if (reason) throw new Error(reason);
  return snapshot;
}
