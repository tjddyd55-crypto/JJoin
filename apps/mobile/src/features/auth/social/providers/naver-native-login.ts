import NaverLogin from '@react-native-seoul/naver-login';
import { SocialLoginCancelledError, SocialLoginUnavailableError } from '../social-auth-errors';
import { naverLoginConfig } from '../social-auth-config';

let initialized = false;

function ensureNaverInit() {
  if (initialized) return;
  const cfg = naverLoginConfig();
  if (!cfg.consumerKey || !cfg.consumerSecret) {
    throw new SocialLoginUnavailableError('NAVER', 'missing_client_credentials');
  }
  NaverLogin.initialize({
    appName: cfg.appName,
    consumerKey: cfg.consumerKey,
    consumerSecret: cfg.consumerSecret,
    serviceUrlSchemeIOS: cfg.serviceUrlScheme,
    disableNaverAppAuthIOS: false,
  });
  initialized = true;
}

export async function obtainNaverAccessToken(): Promise<string> {
  ensureNaverInit();
  try {
    const { failureResponse, successResponse } = await NaverLogin.login();
    if (failureResponse) {
      if (failureResponse.isCancel) {
        throw new SocialLoginCancelledError('NAVER');
      }
      throw new SocialLoginUnavailableError('NAVER', failureResponse.message ?? 'login_failed');
    }
    const token = successResponse?.accessToken;
    if (!token) {
      throw new SocialLoginUnavailableError('NAVER', 'empty_access_token');
    }
    return token;
  } catch (e) {
    if (e instanceof SocialLoginCancelledError || e instanceof SocialLoginUnavailableError) {
      throw e;
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel/i.test(msg)) throw new SocialLoginCancelledError('NAVER');
    throw e;
  }
}
