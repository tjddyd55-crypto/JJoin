import { SocialProvider } from '@jjoin/types';
import { t, type MessageKey } from '@jjoin/i18n';
import {
  SocialLoginCancelledError,
  SocialLoginUnavailableError,
} from './social-auth-errors';

const PROVIDER_FAIL: Record<SocialProvider, MessageKey> = {
  [SocialProvider.KAKAO]: 'auth.login.fail.kakao',
  [SocialProvider.NAVER]: 'auth.login.fail.naver',
  [SocialProvider.GOOGLE]: 'auth.login.fail.google',
};

const PROVIDER_UNAVAILABLE: Record<SocialProvider, MessageKey> = {
  [SocialProvider.KAKAO]: 'auth.login.unavailable.kakao',
  [SocialProvider.NAVER]: 'auth.login.unavailable.naver',
  [SocialProvider.GOOGLE]: 'auth.login.unavailable.google',
};

/** User-facing login error — no tokens/secrets. */
export function messageForSocialLoginError(
  provider: SocialProvider,
  error: unknown,
): string | null {
  if (error instanceof SocialLoginCancelledError) {
    return null;
  }
  if (error instanceof SocialLoginUnavailableError) {
    if (error.message.includes('invalid_key_hash') || error.message.includes('misconfigured')) {
      return t(PROVIDER_UNAVAILABLE[provider]);
    }
    if (error.message.includes('provider_not_configured') || error.message.includes('missing_')) {
      return t(PROVIDER_UNAVAILABLE[provider]);
    }
    return t(PROVIDER_FAIL[provider]);
  }
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.startsWith('network_error:') || raw.includes('Network request failed')) {
    return t('auth.login.fail.network');
  }
  return t(PROVIDER_FAIL[provider]);
}

/** Safe stage/code for logs (never tokens). */
export function safeSocialLoginLog(provider: SocialProvider, error: unknown) {
  if (error instanceof SocialLoginUnavailableError) {
    return { provider, stage: 'obtain_credential', code: error.message.slice(0, 120) };
  }
  if (error instanceof Error) {
    const msg = error.message;
    const stage = msg.startsWith('api_error:')
      ? 'api_exchange'
      : msg.startsWith('network_error:')
        ? 'network'
        : 'unknown';
    return { provider, stage, code: msg.replace(/Bearer\s+\S+/gi, '[redacted]').slice(0, 120) };
  }
  return { provider, stage: 'unknown', code: 'non_error' };
}
