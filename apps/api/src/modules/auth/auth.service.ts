import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  MockAuthPersona,
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
import { PrismaService } from '../../prisma/prisma.service';
import { loadMeFromDb, signInDevPersona } from '../../auth/dev-persona';
import { issueSessionToken, verifySessionToken } from '../../auth/session-token';

@Injectable()
export class AuthService {
  constructor(
    private readonly kakao: MockKakaoAuthAdapter,
    private readonly naver: MockNaverAuthAdapter,
    private readonly google: MockGoogleAuthAdapter,
    private readonly presence: PresenceService,
    private readonly prisma: PrismaService,
  ) {}

  ping() {
    return { module: 'auth', status: 'mock' };
  }

  async mockSignIn(body: SocialSignInRequest) {
    const provider = body.provider;
    const adapter =
      provider === SocialProvider.KAKAO
        ? this.kakao
        : provider === SocialProvider.NAVER
          ? this.naver
          : this.google;

    await adapter.exchangeCode(`mock_code_${provider}`);

    if (body.persona) {
      if (!Object.values(MockAuthPersona).includes(body.persona)) {
        throw new BadRequestException('invalid_persona');
      }
      return signInDevPersona(this.prisma, provider, body.persona);
    }

    const scenario = body.scenario ?? MockAuthScenario.NEW_USER;
    const result = mockUserStore.signIn(provider, scenario);
    const signed = issueSessionToken(result.session.userId);
    mockUserStore.bindToken(signed, result.session.userId);
    return {
      ...result,
      session: { ...result.session, accessToken: signed },
    };
  }

  async getSession(token: string | undefined) {
    let userId = mockUserStore.getUserIdByToken(token);
    if (!userId) {
      userId = verifySessionToken(token);
      if (userId && token) mockUserStore.bindToken(token, userId);
    }
    if (!userId) throw new UnauthorizedException('unauthorized');

    let me = mockUserStore.getMe(userId);
    if (!me) {
      try {
        me = await loadMeFromDb(this.prisma, userId);
        mockUserStore.hydrateFromMe(userId, me, SocialProvider.KAKAO);
      } catch {
        throw new UnauthorizedException('unauthorized');
      }
    }
    return { userId, me };
  }

  async logout(token: string | undefined) {
    if (!token) throw new BadRequestException('missing_token');
    const userId =
      mockUserStore.getUserIdByToken(token) ?? verifySessionToken(token);
    if (userId) await this.presence.hideOnLogout(userId);
    mockUserStore.logout(token);
    return { ok: true };
  }
}
