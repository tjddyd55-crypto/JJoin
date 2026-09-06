import {
  assertIdentityVerificationBypassAllowed,
  isIdentityVerificationBypassEnabled,
} from '@jjoin/domain';
import { resolveApiAppVariant } from './app-variant';

const EXPLICIT_BYPASS_ENV = 'IDENTITY_VERIFICATION_BYPASS';

/** API SSOT — development deployment bypasses identity gates; production never. */
export function canBypassIdentityVerification(): boolean {
  const appVariant = resolveApiAppVariant();
  if (appVariant === 'production') return false;
  return isIdentityVerificationBypassEnabled(appVariant);
}

/** Startup validation — production must not honor explicit bypass env. */
export function validateIdentityVerificationBypassOnBoot(): void {
  const appVariant = resolveApiAppVariant();
  const explicit =
    (process.env[EXPLICIT_BYPASS_ENV] ?? '').trim().toLowerCase() === 'true';
  assertIdentityVerificationBypassAllowed(appVariant, explicit);
}

export function identityVerificationBypassDiagnostic(): {
  appVariant: ReturnType<typeof resolveApiAppVariant>;
  bypassActive: boolean;
  explicitBypassEnv: boolean;
} {
  const appVariant = resolveApiAppVariant();
  const explicit =
    (process.env[EXPLICIT_BYPASS_ENV] ?? '').trim().toLowerCase() === 'true';
  return {
    appVariant,
    bypassActive: canBypassIdentityVerification(),
    explicitBypassEnv: explicit,
  };
}
