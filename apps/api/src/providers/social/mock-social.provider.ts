import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { SocialAuthProvider, VerifiedSocialProfile } from '../ports';
import { isMockSocialCredential } from '../../auth/social-auth-mode';

@Injectable()
export class MockSocialAuthAdapter implements SocialAuthProvider {
  readonly name = 'KAKAO' as const;

  async verifyCredential(credential: string): Promise<VerifiedSocialProfile> {
    if (!isMockSocialCredential(credential)) {
      throw new UnauthorizedException('invalid_mock_credential');
    }
    const parts = credential.split(':');
    if (parts.length < 3) {
      throw new UnauthorizedException('invalid_mock_credential');
    }
    const provider = parts[1]?.toUpperCase();
    const subject = parts.slice(2).join(':');
    if (!subject) throw new UnauthorizedException('invalid_mock_credential');
    return {
      subject: `mock-${provider?.toLowerCase()}-${subject}`,
      email: undefined,
      nickname: undefined,
    };
  }
}

export function createProviderMockAdapter(
  name: 'KAKAO' | 'NAVER' | 'GOOGLE',
): SocialAuthProvider {
  return {
    name,
    async verifyCredential(credential: string): Promise<VerifiedSocialProfile> {
      if (!isMockSocialCredential(credential)) {
        throw new UnauthorizedException('invalid_mock_credential');
      }
      const parts = credential.split(':');
      const subject = parts.slice(2).join(':') || parts[parts.length - 1];
      return { subject: `mock-${name.toLowerCase()}-${subject}` };
    },
  };
}
