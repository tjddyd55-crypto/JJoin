/** User cancelled provider OAuth — no server call, no error toast. */
export class SocialLoginCancelledError extends Error {
  readonly code = 'SOCIAL_LOGIN_CANCELLED';

  constructor(provider: string) {
    super(`social_login_cancelled:${provider}`);
    this.name = 'SocialLoginCancelledError';
  }
}

export class SocialLoginUnavailableError extends Error {
  readonly code = 'SOCIAL_LOGIN_UNAVAILABLE';

  constructor(provider: string, reason: string) {
    super(`social_login_unavailable:${provider}:${reason}`);
    this.name = 'SocialLoginUnavailableError';
  }
}
