import { isProductionAppVariant } from '../config/app-variant';

export type SocialAuthMode = 'mock' | 'real' | 'hybrid' | 'disabled';

export function resolveSocialAuthMode(): SocialAuthMode {
  const raw = (process.env.SOCIAL_AUTH_MODE ?? 'mock').trim().toLowerCase();
  if (raw === 'real') return 'real';
  if (raw === 'hybrid') return 'hybrid';
  if (raw === 'disabled') return 'disabled';
  return 'mock';
}

export function isMockSocialCredential(credential: string): boolean {
  return credential.startsWith('mock:');
}

/**
 * mock: credentials are development-only.
 * Production variant rejects them even when SOCIAL_AUTH_MODE=hybrid.
 */
export function isSocialMockCredentialAllowed(): boolean {
  if (isProductionAppVariant()) return false;
  const mode = resolveSocialAuthMode();
  return mode === 'mock' || mode === 'hybrid';
}

export function resolveIdentityProviderMode(): 'mock' | 'real' {
  const raw = (process.env.IDENTITY_PROVIDER ?? 'mock').trim().toLowerCase();
  return raw === 'real' ? 'real' : 'mock';
}
