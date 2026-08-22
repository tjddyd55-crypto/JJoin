import { login, getAccessToken } from '@react-native-seoul/kakao-login';
import { SocialLoginCancelledError, SocialLoginUnavailableError } from '../social-auth-errors';
import { kakaoLoginAppKey } from '../social-auth-config';

export async function obtainKakaoAccessToken(): Promise<string> {
  if (!kakaoLoginAppKey()) {
    throw new SocialLoginUnavailableError('KAKAO', 'missing_login_app_key');
  }

  try {
    const existing = await getAccessToken();
    if (existing?.accessToken) {
      return existing.accessToken;
    }

    const result = await login();
    if (!result?.accessToken) {
      throw new SocialLoginUnavailableError('KAKAO', 'empty_access_token');
    }
    return result.accessToken;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel/i.test(msg) || msg.includes('KakaoSDK') && msg.includes('cancel')) {
      throw new SocialLoginCancelledError('KAKAO');
    }
    if (msg.includes('invalid_key_hash') || msg.includes('misconfigured')) {
      throw new SocialLoginUnavailableError('KAKAO', 'invalid_key_hash');
    }
    throw e;
  }
}
