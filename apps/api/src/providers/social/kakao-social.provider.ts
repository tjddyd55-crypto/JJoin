import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { SocialAuthProvider, VerifiedSocialProfile } from '../ports';
import { isMockSocialCredential } from '../../auth/social-auth-mode';
import { createProviderMockAdapter } from './mock-social.provider';

@Injectable()
export class KakaoSocialAuthProvider implements SocialAuthProvider {
  readonly name = 'KAKAO' as const;
  private readonly mock = createProviderMockAdapter('KAKAO');

  async verifyCredential(credential: string): Promise<VerifiedSocialProfile> {
    if (isMockSocialCredential(credential)) {
      return this.mock.verifyCredential(credential);
    }
    const accessToken = credential.trim();
    if (!accessToken) throw new UnauthorizedException('invalid_kakao_token');

    const tokenInfoRes = await fetch('https://kapi.kakao.com/v1/user/access_token_info', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!tokenInfoRes.ok) {
      throw new UnauthorizedException('kakao_token_invalid');
    }
    const tokenInfo = (await tokenInfoRes.json()) as { id?: number };
    if (!tokenInfo.id) throw new UnauthorizedException('kakao_token_invalid');

    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      return { subject: String(tokenInfo.id) };
    }
    const user = (await userRes.json()) as {
      id: number;
      kakao_account?: { email?: string; profile?: { nickname?: string; profile_image_url?: string } };
    };
    return {
      subject: String(user.id),
      email: user.kakao_account?.email,
      nickname: user.kakao_account?.profile?.nickname,
      avatarUrl: user.kakao_account?.profile?.profile_image_url,
    };
  }
}
