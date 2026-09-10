import { resolveSocialAuthMode } from '../auth/social-auth-mode';
import { isProductionAppVariant, resolveApiAppVariant } from './app-variant';

/** Known sample / leftover secrets — never acceptable on a production variant. */
const JWT_SECRET_PLACEHOLDERS = new Set([
  'dev-only-change-me',
  'replace-me',
]);

export function resolveJwtSecret(): string | undefined {
  const raw = process.env.JWT_SECRET?.trim();
  return raw ? raw : undefined;
}

export function isJwtSecretPlaceholder(secret: string): boolean {
  return JWT_SECRET_PLACEHOLDERS.has(secret.trim().toLowerCase());
}

/** All environments must set JWT_SECRET — there is no in-code fallback. */
export function assertJwtSecretConfigured(): string {
  const secret = resolveJwtSecret();
  if (!secret) {
    throw new Error('JWT_SECRET_REQUIRED');
  }
  return secret;
}

export function parseCorsOrigins(raw = process.env.CORS_ORIGINS): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * CORS origin option for Nest enableCors.
 * Production never reflects the request origin (never `true`).
 */
export function resolveCorsOriginConfig(): string[] | true {
  const origins = parseCorsOrigins();
  if (isProductionAppVariant()) {
    if (origins.length === 0) {
      throw new Error('CORS_ORIGINS_REQUIRED_IN_PRODUCTION');
    }
    return origins;
  }
  return origins.length > 0 ? origins : true;
}

/**
 * Startup fail-closed — mirrors validateIdentityVerificationBypassOnBoot.
 * Production cannot boot with a missing/placeholder JWT, empty CORS, or SOCIAL_AUTH_MODE=mock.
 */
export function assertProductionFailClosedOnBoot(): void {
  const secret = assertJwtSecretConfigured();
  if (resolveApiAppVariant() !== 'production') return;

  if (isJwtSecretPlaceholder(secret)) {
    throw new Error('JWT_SECRET_PLACEHOLDER_NOT_ALLOWED_IN_PRODUCTION');
  }
  if (parseCorsOrigins().length === 0) {
    throw new Error('CORS_ORIGINS_REQUIRED_IN_PRODUCTION');
  }
  if (resolveSocialAuthMode() === 'mock') {
    throw new Error('SOCIAL_AUTH_MODE_MOCK_NOT_ALLOWED_IN_PRODUCTION');
  }
}
