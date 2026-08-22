import { Injectable } from '@nestjs/common';
import type {
  IdentityVerificationProvider,
  MediaStorageProvider,
  SocialAuthProvider,
} from '../providers/ports';
import { randomUUID } from 'crypto';

@Injectable()
export class MockKakaoAuthAdapter implements SocialAuthProvider {
  readonly name = 'KAKAO' as const;
  async exchangeCode(code: string) {
    return { subject: `kakao_${code || randomUUID()}`, email: undefined };
  }
  async verifyCredential(credential: string) {
    return this.exchangeCode(credential);
  }
}

@Injectable()
export class MockNaverAuthAdapter implements SocialAuthProvider {
  readonly name = 'NAVER' as const;
  async exchangeCode(code: string) {
    return { subject: `naver_${code || randomUUID()}`, email: undefined };
  }
  async verifyCredential(credential: string) {
    return this.exchangeCode(credential);
  }
}

@Injectable()
export class MockGoogleAuthAdapter implements SocialAuthProvider {
  readonly name = 'GOOGLE' as const;
  async exchangeCode(code: string) {
    return { subject: `google_${code || randomUUID()}`, email: undefined };
  }
  async verifyCredential(credential: string) {
    return this.exchangeCode(credential);
  }
}

@Injectable()
export class MockIdentityAdapter implements IdentityVerificationProvider {
  async start(userId: string) {
    return { sessionId: `id_${userId}_${randomUUID()}` };
  }

  async confirm(sessionId: string) {
    if (sessionId.includes('fail')) {
      return { verified: false };
    }
    return { verified: true, ciHash: `mock_ci_${sessionId}` };
  }
}

@Injectable()
export class MockMediaAdapter implements MediaStorageProvider {
  async createUploadUrl(input: { userId: string; contentType: string }) {
    const assetKey = `mock/${input.userId}/${randomUUID()}`;
    return {
      uploadUrl: `mock://upload/${assetKey}?ct=${encodeURIComponent(input.contentType)}`,
      assetKey,
    };
  }
}
