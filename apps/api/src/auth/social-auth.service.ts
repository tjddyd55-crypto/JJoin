import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  MockAuthScenario,
  SocialProvider,
  type SocialExchangeRequest,
  type SocialSignInResponse,
} from '@jjoin/types';
import { issueSessionToken } from '../auth/session-token';
import { buildMeFromUser, resolveNextOnboardingStep } from '../auth/user-me.mapper';
import { loadUserMembershipDto } from '../modules/membership/membership.service';
import {
  isMockSocialCredential,
  resolveSocialAuthMode,
} from '../auth/social-auth-mode';
import { mockUserStore } from '../mock/mock-user.store';
import { KakaoSocialAuthProvider } from '../providers/social/kakao-social.provider';
import { NaverSocialAuthProvider } from '../providers/social/naver-social.provider';
import { GoogleSocialAuthProvider } from '../providers/social/google-social.provider';
import { PrismaService } from '../prisma/prisma.service';
import { UserAccountService } from '../modules/users/user-account.service';
import { WalletService } from '../modules/wallet/wallet.service';

@Injectable()
export class SocialAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserAccountService,
    private readonly wallet: WalletService,
    private readonly kakao: KakaoSocialAuthProvider,
    private readonly naver: NaverSocialAuthProvider,
    private readonly google: GoogleSocialAuthProvider,
  ) {}

  async exchange(body: SocialExchangeRequest): Promise<SocialSignInResponse> {
    const mode = resolveSocialAuthMode();
    if (mode === 'disabled') {
      throw new ForbiddenException('social_auth_disabled');
    }

    const provider = body.provider;
    const credential = body.credential?.trim();
    if (!credential) throw new BadRequestException('credential_required');

    if (mode === 'real' && isMockSocialCredential(credential)) {
      throw new UnauthorizedException('mock_credential_not_allowed');
    }
    if (mode === 'mock' && !isMockSocialCredential(credential)) {
      throw new UnauthorizedException('real_credential_not_allowed_in_mock_mode');
    }
    // hybrid: accepts mock credentials and real provider tokens

    const adapter =
      provider === SocialProvider.KAKAO
        ? this.kakao
        : provider === SocialProvider.NAVER
          ? this.naver
          : this.google;

    const verified = await adapter.verifyCredential(credential);

    let user = await this.prisma.user.findFirst({
      where: {
        socialAccounts: {
          some: { provider, providerSubject: verified.subject },
        },
      },
      include: {
        profile: true,
        socialAccounts: true,
        sportProfiles: { include: { sport: true } },
        wallets: true,
        identityVerifications: { orderBy: { createdAt: 'desc' }, take: 1 },
        consents: true,
      },
    });

    if (!user) {
      user = await this.users.createUserForSocialProvider({
        provider,
        subject: verified.subject,
        email: verified.email,
        nickname: verified.nickname,
        avatarUrl: verified.avatarUrl,
      });
    } else {
      await this.users.linkSocialLogin({
        userId: user.id,
        provider,
        email: verified.email,
      });
      user = await this.users.loadUser(user.id);
    }

    const participationCount = await this.prisma.joinParticipant.count({
      where: {
        userId: user.id,
        participationStatus: { in: ['APPROVED', 'CONFIRMED', 'COMPLETED'] },
      },
    });

    let me = buildMeFromUser(user, participationCount);
    const walletSummary = await this.wallet.getSummary(user.id);
    const membership = await loadUserMembershipDto(this.prisma, user.id);
    me = { ...me, walletSummary, membership };

    const accessToken = issueSessionToken(user.id);
    mockUserStore.hydrateFromMe(user.id, me, provider);
    mockUserStore.bindToken(accessToken, user.id);

    const nextStep = resolveNextOnboardingStep(me);

    return {
      session: {
        accessToken,
        userId: user.id,
        scenario: me.authAppHints.termsAccepted
          ? MockAuthScenario.RETURNING_USER
          : MockAuthScenario.NEW_USER,
      },
      me,
      nextStep: nextStep === 'HOME' ? 'HOME' : nextStep,
    };
  }
}
