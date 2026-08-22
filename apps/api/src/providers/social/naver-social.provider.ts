import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { SocialAuthProvider, VerifiedSocialProfile } from '../ports';
import { isMockSocialCredential } from '../../auth/social-auth-mode';
import { createProviderMockAdapter } from './mock-social.provider';

@Injectable()
export class NaverSocialAuthProvider implements SocialAuthProvider {
  readonly name = 'NAVER' as const;
  private readonly mock = createProviderMockAdapter('NAVER');

  async verifyCredential(credential: string): Promise<VerifiedSocialProfile> {
    if (isMockSocialCredential(credential)) {
      return this.mock.verifyCredential(credential);
    }
    const accessToken = credential.trim();
    if (!accessToken) throw new UnauthorizedException('invalid_naver_token');

    const res = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new UnauthorizedException('naver_token_invalid');

    const body = (await res.json()) as {
      resultcode?: string;
      response?: { id?: string; email?: string; nickname?: string; profile_image?: string };
    };
    if (body.resultcode !== '00' || !body.response?.id) {
      throw new UnauthorizedException('naver_token_invalid');
    }
    return {
      subject: body.response.id,
      email: body.response.email,
      nickname: body.response.nickname,
      avatarUrl: body.response.profile_image,
    };
  }
}
