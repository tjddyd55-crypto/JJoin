import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { SocialAuthProvider, VerifiedSocialProfile } from '../ports';
import { isMockSocialCredential } from '../../auth/social-auth-mode';
import { createProviderMockAdapter } from './mock-social.provider';

@Injectable()
export class GoogleSocialAuthProvider implements SocialAuthProvider {
  readonly name = 'GOOGLE' as const;
  private readonly mock = createProviderMockAdapter('GOOGLE');
  private readonly clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();

  async verifyCredential(credential: string): Promise<VerifiedSocialProfile> {
    if (isMockSocialCredential(credential)) {
      return this.mock.verifyCredential(credential);
    }
    const idToken = credential.trim();
    if (!idToken) throw new UnauthorizedException('invalid_google_token');

    const url = new URL('https://oauth2.googleapis.com/tokeninfo');
    url.searchParams.set('id_token', idToken);
    const res = await fetch(url.toString());
    if (!res.ok) throw new UnauthorizedException('google_token_invalid');

    const payload = (await res.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
      aud?: string;
      iss?: string;
      email_verified?: string;
    };
    if (!payload.sub) throw new UnauthorizedException('google_token_invalid');

    // Fail closed: real Google tokens require server audience configuration.
    if (!this.clientId) {
      throw new UnauthorizedException('google_oauth_client_id_unconfigured');
    }
    if (payload.aud !== this.clientId) {
      throw new UnauthorizedException('google_token_audience_mismatch');
    }

    const allowedIssuers = new Set([
      'https://accounts.google.com',
      'accounts.google.com',
    ]);
    if (payload.iss && !allowedIssuers.has(payload.iss)) {
      throw new UnauthorizedException('google_token_issuer_mismatch');
    }

    return {
      subject: payload.sub,
      email: payload.email,
      nickname: payload.name,
      avatarUrl: payload.picture,
    };
  }
}
