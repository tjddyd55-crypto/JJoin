import { SocialProvider, type MockAuthPersona } from '@jjoin/types';

/** DEV personas are keyed under KAKAO in hybrid mode; persona-only callers omit provider. */
export function resolveMockSignInProvider(body: {
  provider?: SocialProvider;
  persona?: MockAuthPersona;
}): SocialProvider | undefined {
  return body.provider ?? (body.persona ? SocialProvider.KAKAO : undefined);
}
