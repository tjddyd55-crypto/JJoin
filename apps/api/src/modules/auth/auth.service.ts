import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  MockAuthScenario,
  SocialProvider,
  type SocialSignInRequest,
} from '@jjoin/types';
import { mockUserStore } from '../../mock/mock-user.store';
import {
  MockGoogleAuthAdapter,
  MockKakaoAuthAdapter,
  MockNaverAuthAdapter,
} from '../../providers/mock.adapters';
import { PresenceService } from '../presence/presence.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly kakao: MockKakaoAuthAdapter,
    private readonly naver: MockNaverAuthAdapter,
    private readonly google: MockGoogleAuthAdapter,
    private readonly presence: PresenceService,
  ) {}

  ping() {
    return { module: 'auth', status: 'mock' };
  }

  async mockSignIn(body: SocialSignInRequest) {
    const provider = body.provider;
    const scenario = body.scenario ?? MockAuthScenario.NEW_USER;
    const adapter =
      provider === SocialProvider.KAKAO
        ? this.kakao
        : provider === SocialProvider.NAVER
          ? this.naver
          : this.google;

    await adapter.exchangeCode(`mock_code_${provider}`);
    return mockUserStore.signIn(provider, scenario);
  }

  getSession(token: string | undefined) {
    const userId = mockUserStore.getUserIdByToken(token);
    if (!userId) throw new UnauthorizedException('unauthorized');
    const me = mockUserStore.getMe(userId);
    if (!me) throw new UnauthorizedException('unauthorized');
    return { userId, me };
  }

  logout(token: string | undefined) {
    if (!token) throw new BadRequestException('missing_token');
    const userId = mockUserStore.getUserIdByToken(token);
    if (userId) this.presence.hideOnLogout(userId);
    mockUserStore.logout(token);
    return { ok: true };
  }
}
