import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { resolveNaverLoginCredentials } from '../../auth/naver-oauth.config';

type NaverTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: string;
  error?: string;
  error_description?: string;
};

/** Exchange Naver authorization code for access token (server-side only). */
export async function exchangeNaverAuthorizationCode(input: {
  code: string;
  state: string;
  redirectUri: string;
}): Promise<string> {
  const code = input.code.trim();
  const state = input.state.trim();
  const redirectUri = input.redirectUri.trim();
  if (!code || !state || !redirectUri) {
    throw new BadRequestException('naver_oauth_invalid_request');
  }

  const { clientId, clientSecret } = resolveNaverLoginCredentials();
  if (!clientId || !clientSecret) {
    throw new UnauthorizedException('naver_oauth_not_configured');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
    state,
  });

  const res = await fetch('https://nid.naver.com/oauth2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const json = (await res.json()) as NaverTokenResponse;
  if (!res.ok || json.error || !json.access_token) {
    throw new UnauthorizedException('naver_oauth_exchange_failed');
  }

  return json.access_token;
}
