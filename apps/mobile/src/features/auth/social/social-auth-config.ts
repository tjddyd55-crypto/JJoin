import { SocialProvider } from '@jjoin/types';
import { resolveAppVariant, isDevelopmentVariant } from '../../../lib/app-variant';
import { identityFor } from '../../../../app-variant-identity.cjs';

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

/**
 * Naver Login — official SDK (Android package + iOS URL scheme).
 * Client secret is required by NAVER SDK initialize(); supply via EAS env only.
 */
export function naverLoginConfig() {
  const variant = resolveAppVariant();
  const identity = identityFor(variant);
  const isDev = variant === 'development';
  return {
    consumerKey: trimEnv(process.env.EXPO_PUBLIC_NAVER_LOGIN_CLIENT_ID),
    consumerSecret: trimEnv(process.env.EXPO_PUBLIC_NAVER_LOGIN_CLIENT_SECRET),
    appName: isDev ? '쪼인존 DEV' : '쪼인존',
    /** iOS Naver SDK return URL scheme — defaults to app variant deep-link scheme. */
    serviceUrlSchemeIOS:
      trimEnv(process.env.EXPO_PUBLIC_NAVER_LOGIN_URL_SCHEME) || identity.scheme,
  };
}

export function googleWebClientId(): string {
  return trimEnv(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
}

export function isProviderConfigured(provider: SocialProvider): boolean {
  switch (provider) {
    case SocialProvider.KAKAO:
      return Boolean(kakaoLoginAppKey());
    case SocialProvider.NAVER: {
      const cfg = naverLoginConfig();
      return Boolean(cfg.consumerKey && cfg.consumerSecret);
    }
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
