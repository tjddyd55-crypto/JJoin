import { SocialProvider, type MockAuthPersona } from '@jjoin/types';
import { isDevelopmentUnsafePathAllowed } from '../../config/app-variant';
import { resolveSocialAuthMode } from '../../auth/social-auth-mode';

/** DEV personas are keyed under KAKAO in hybrid mode; persona-only callers omit provider. */
export function resolveMockSignInProvider(body: {
  provider?: SocialProvider;
  persona?: MockAuthPersona;
}): SocialProvider | undefined {
  return body.provider ?? (body.persona ? SocialProvider.KAKAO : undefined);
}

/**
 * Mock sign-in is development-variant only.
 * Production never enables it, even if SOCIAL_AUTH_MODE is hybrid/mock.
 */
export function isMockSignInEnabled(): boolean {
  if (!isDevelopmentUnsafePathAllowed()) return false;
  const mode = resolveSocialAuthMode();
  return mode === 'mock' || mode === 'hybrid';
}
