import { SocialProvider } from '@jjoin/types';

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

/** Kakao Login Native App Key — NOT Map key, NOT REST key. */
export function kakaoLoginAppKey(): string {
  return env('EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY');
}

export function naverLoginConfig() {
  return {
    consumerKey: env('EXPO_PUBLIC_NAVER_LOGIN_CLIENT_ID'),
    consumerSecret: env('EXPO_PUBLIC_NAVER_LOGIN_CLIENT_SECRET'),
    appName: 'JJOIN',
    serviceUrlScheme: env('EXPO_PUBLIC_NAVER_LOGIN_URL_SCHEME') || 'jjoinnaverlogin',
  };
}

export function googleWebClientId(): string {
  return env('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
}

export function isProviderConfigured(provider: SocialProvider): boolean {
  switch (provider) {
    case SocialProvider.KAKAO:
      return Boolean(kakaoLoginAppKey());
    case SocialProvider.NAVER:
      return Boolean(naverLoginConfig().consumerKey && naverLoginConfig().consumerSecret);
    case SocialProvider.GOOGLE:
      return Boolean(googleWebClientId());
    default:
      return false;
  }
}

/** Dev regression only — forces mock-sign-in instead of native OAuth. */
export function useMockSocialAuthFlow(): boolean {
  return env('EXPO_PUBLIC_USE_MOCK_SOCIAL_AUTH') === 'true';
}
