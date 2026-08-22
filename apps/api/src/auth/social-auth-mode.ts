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

export function resolveIdentityProviderMode(): 'mock' | 'real' {
  const raw = (process.env.IDENTITY_PROVIDER ?? 'mock').trim().toLowerCase();
  return raw === 'real' ? 'real' : 'mock';
}
