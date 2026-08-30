import { SocialProvider } from '@jjoin/types';

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
  if (process.env.APP_VARIANT === 'development') {
    return trimEnv(process.env.EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY_DEV);
  }
  return trimEnv(process.env.EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY);
}

export function naverLoginConfig() {
  const isDev = process.env.APP_VARIANT === 'development';
  return {
    consumerKey: trimEnv(process.env.EXPO_PUBLIC_NAVER_LOGIN_CLIENT_ID),
    consumerSecret: trimEnv(process.env.EXPO_PUBLIC_NAVER_LOGIN_CLIENT_SECRET),
    appName: isDev ? 'JJOINZONE DEV' : 'JJOINZONE',
    serviceUrlScheme:
      trimEnv(process.env.EXPO_PUBLIC_NAVER_LOGIN_URL_SCHEME) || 'jjoinnaverlogin',
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
export function useMockSocialAuthFlow(): boolean {
  return trimEnv(process.env.EXPO_PUBLIC_USE_MOCK_SOCIAL_AUTH) === 'true';
}
