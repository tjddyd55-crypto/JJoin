import { IdentityStatus, type GatedActionType } from '@jjoin/types';
import type { AppVariantName } from './app-variant';

/** Development-only QA bypass — never true in production. */
export function isIdentityVerificationBypassEnabled(appVariant: AppVariantName): boolean {
  return appVariant === 'development';
}

/**
 * Fail-safe: explicit bypass flags/env must not activate in production.
 * Call at API startup when an env override exists.
 */
export function assertIdentityVerificationBypassAllowed(
  appVariant: AppVariantName,
  explicitBypassRequested = false,
): void {
  if (explicitBypassRequested && appVariant === 'production') {
    throw new Error('IDENTITY_VERIFICATION_BYPASS_NOT_ALLOWED_IN_PRODUCTION');
  }
}

/** Whether UI/API should block an action until identity is verified. */
export function requiresIdentityGate(
  identityStatus: IdentityStatus,
  action: GatedActionType,
  options?: { appVariant?: AppVariantName },
): boolean {
  void action;
  if (identityStatus === IdentityStatus.VERIFIED) return false;
  const appVariant = options?.appVariant ?? 'production';
  return !isIdentityVerificationBypassEnabled(appVariant);
}
