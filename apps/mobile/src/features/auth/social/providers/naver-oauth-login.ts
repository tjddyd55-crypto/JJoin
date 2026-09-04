import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { SocialLoginCancelledError, SocialLoginUnavailableError } from '../social-auth-errors';
import { naverLoginPublicConfig } from '../social-auth-config';

WebBrowser.maybeCompleteAuthSession();

function randomOAuthState(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Naver OAuth authorization code via in-app browser — no client secret on device. */
export async function obtainNaverAuthorizationCode(): Promise<{
  code: string;
  state: string;
  redirectUri: string;
}> {
  const cfg = naverLoginPublicConfig();
  if (!cfg.clientId) {
    throw new SocialLoginUnavailableError('NAVER', 'missing_client_id');
  }

  const state = randomOAuthState();
  const redirectUri = `${cfg.serviceUrlScheme}://oauth`;
  const authUrl =
    `https://nid.naver.com/oauth2.0/authorize?response_type=code` +
    `&client_id=${encodeURIComponent(cfg.clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new SocialLoginCancelledError('NAVER');
  }
  if (result.type !== 'success' || !result.url) {
    throw new SocialLoginUnavailableError('NAVER', 'oauth_session_failed');
  }

  const parsed = Linking.parse(result.url);
  const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : '';
  const returnedState =
    typeof parsed.queryParams?.state === 'string' ? parsed.queryParams.state : '';
  if (!code || returnedState !== state) {
    throw new SocialLoginUnavailableError('NAVER', 'invalid_oauth_response');
  }

  return { code, state, redirectUri };
}
