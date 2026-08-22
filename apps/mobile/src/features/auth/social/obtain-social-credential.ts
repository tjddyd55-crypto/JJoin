/**
 * Obtain provider credential for POST /auth/social/exchange.
 * Returns Kakao/Naver access token or Google ID token — never provider subject.
 */
import { SocialProvider } from '@jjoin/types';
import { isProviderConfigured } from './social-auth-config';
import { SocialLoginUnavailableError } from './social-auth-errors';
import { obtainKakaoAccessToken } from './providers/kakao-native-login';
import { obtainNaverAccessToken } from './providers/naver-native-login';
import { obtainGoogleIdToken } from './providers/google-native-login';

export async function obtainSocialCredential(provider: SocialProvider): Promise<string> {
  if (!isProviderConfigured(provider)) {
    throw new SocialLoginUnavailableError(provider, 'provider_not_configured');
  }

  switch (provider) {
    case SocialProvider.KAKAO:
      return obtainKakaoAccessToken();
    case SocialProvider.NAVER:
      return obtainNaverAccessToken();
    case SocialProvider.GOOGLE:
      return obtainGoogleIdToken();
    default:
      throw new SocialLoginUnavailableError(String(provider), 'unsupported');
  }
}
