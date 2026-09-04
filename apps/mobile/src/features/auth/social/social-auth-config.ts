import { SocialProvider } from '@jjoin/types';
import { isDevelopmentVariant } from '../../../lib/app-variant';

/**
 * Expo/Metro inlines only *static* `process.env.EXPO_PUBLIC_*` access.
 * Dynamic `process.env[name]` stays empty in release bundles and breaks
 * `isProviderConfigured` even when native plugins were built with keys.
 */
function trimEnv(value: string | undefined): string {
  return (value ?? '').trim();
}

/**
 * Kakao Login Native App Key — NOT Map key, NOT REST key.
 * APP_VARIANT=development → EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY_DEV only.
 * APP_VARIANT=production  → EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY only.
 * No cross-variant fallback.
 */
export function kakaoLoginAppKey(): string {
  if (isDevelopmentVariant()) {
    return trimEnv(process.env.EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY_DEV);
  }
  return trimEnv(process.env.EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY);
}

/** Public Naver Login config — client secret must never ship in the mobile bundle. */
export function naverLoginPublicConfig() {
  const isDev = isDevelopmentVariant();
  return {
    clientId: trimEnv(process.env.EXPO_PUBLIC_NAVER_LOGIN_CLIENT_ID),
    appName: isDev ? '쪼인존 DEV' : '쪼인존',
    serviceUrlScheme:
      trimEnv(process.env.EXPO_PUBLIC_NAVER_LOGIN_URL_SCHEME) || 'jjoinnaverlogin',
  };
}

/** @deprecated Use naverLoginPublicConfig — kept for import stability during migration. */
export function naverLoginConfig() {
  const cfg = naverLoginPublicConfig();
  return { ...cfg, consumerKey: cfg.clientId, consumerSecret: '' };
}

export function googleWebClientId(): string {
  return trimEnv(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
}

export function isProviderConfigured(provider: SocialProvider): boolean {
  switch (provider) {
    case SocialProvider.KAKAO:
      return Boolean(kakaoLoginAppKey());
    case SocialProvider.NAVER:
      return Boolean(naverLoginPublicConfig().clientId);
    case SocialProvider.GOOGLE:
      return Boolean(googleWebClientId());
    default:
      return false;
  }
}

/** Dev regression only — forces mock-sign-in instead of native OAuth. */
export function isMockSocialAuthFlowEnabled(): boolean {
  return trimEnv(process.env.EXPO_PUBLIC_USE_MOCK_SOCIAL_AUTH) === 'true';
}
