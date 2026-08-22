import {
  AgeBand,
  IdentityStatus,
  MockAuthScenario,
  SocialLinkStatus,
  SocialProvider,
  SportSkillLevel,
  type MeDto,
  type PublicUserProfileDto,
  type SocialSignInResponse,
} from '@jjoin/types';
import { mapGenderDisplay, resolveOnboardingStep } from '@jjoin/domain';
import { randomUUID } from 'crypto';

type StoredUser = {
  userId: string;
  scenario: MockAuthScenario;
  termsAccepted: boolean;
  identityStatus: IdentityStatus;
  identityProvider: string | null;
  verifiedAt: string | null;
  nickname: string | null;
  gender: string | null;
  ageBand: AgeBand | null;
  regionLabel: string | null;
  bio: string | null;
  avatarUrl: string | null;
  skillLevel: SportSkillLevel | null;
  participationCount: number;
  connectedProvider: SocialProvider;
  availableCoin: string;
  heldCoin: string;
};

/** In-memory store for Phase 3A mock vertical slice (no Postgres required). */
export class MockUserStore {
  private users = new Map<string, StoredUser>();
  private tokens = new Map<string, string>();
  private identitySessions = new Map<string, { userId: string; status: 'STARTED' | 'CANCELLED' }>();

  reset() {
    this.users.clear();
    this.tokens.clear();
    this.identitySessions.clear();
  }

  signIn(provider: SocialProvider, scenario: MockAuthScenario): SocialSignInResponse {
    const user =
      scenario === MockAuthScenario.RETURNING_USER
        ? this.createReturning(provider)
        : this.createNew(provider);

    this.users.set(user.userId, user);
    const accessToken = `mock_${randomUUID()}`;
    this.tokens.set(accessToken, user.userId);

    const me = this.toMe(user);
    return {
      session: {
        accessToken,
        userId: user.userId,
        scenario,
      },
      me,
      nextStep: resolveOnboardingStep(me),
    };
  }

  getUserIdByToken(token: string | undefined): string | null {
    if (!token) return null;
    const fromMap = this.tokens.get(token);
    if (fromMap) return fromMap;
    // Signed tokens verified by AuthService / MockAuthGuard via verifySessionToken
    return null;
  }

  bindToken(token: string, userId: string) {
    this.tokens.set(token, userId);
  }

  /** Mirror a DB-backed MeDto into memory so existing /me routes keep working. */
  hydrateFromMe(userId: string, me: MeDto, provider: SocialProvider) {
    const profile = me.publicProfile;
    this.users.set(userId, {
      userId,
      scenario: MockAuthScenario.RETURNING_USER,
      termsAccepted: me.authAppHints.termsAccepted,
      identityStatus: me.identity.verificationStatus,
      identityProvider: me.identity.provider,
      verifiedAt: me.identity.verifiedAt,
      nickname: profile?.nickname ?? null,
      gender: profile?.genderDisplay === '남성' ? 'MALE' : profile?.genderDisplay === '여성' ? 'FEMALE' : null,
      ageBand: profile?.ageBand ?? null,
      regionLabel: profile?.regionLabel ?? null,
      bio: profile?.bio ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      skillLevel: profile?.sportProfiles[0]?.skillLevel ?? null,
      participationCount: profile?.participationCount ?? 0,
      connectedProvider: provider,
      availableCoin: me.walletSummary.availableCoin,
      heldCoin: me.walletSummary.heldCoin,
    });
  }

  syncWalletBalances(userId: string, availableCoin: string, heldCoin: string) {
    const user = this.users.get(userId);
    if (!user) return;
    user.availableCoin = availableCoin;
    user.heldCoin = heldCoin;
  }

  logout(token: string) {
    this.tokens.delete(token);
  }

  getMe(userId: string): MeDto | null {
    const user = this.users.get(userId);
    return user ? this.toMe(user) : null;
  }

  acceptTerms(userId: string) {
    const user = this.require(userId);
    user.termsAccepted = true;
    return this.toMe(user);
  }

  startIdentity(userId: string) {
    const sessionId = randomUUID();
    this.identitySessions.set(sessionId, { userId, status: 'STARTED' });
    const user = this.require(userId);
    user.identityStatus = IdentityStatus.PENDING;
    return { sessionId };
  }

  confirmIdentity(sessionId: string, outcome: 'success' | 'fail') {
    const session = this.identitySessions.get(sessionId);
    if (!session || session.status !== 'STARTED') {
      throw new Error('invalid_identity_session');
    }
    const user = this.require(session.userId);
    if (outcome === 'success') {
      user.identityStatus = IdentityStatus.VERIFIED;
      user.identityProvider = 'MOCK_IDENTITY';
      user.verifiedAt = new Date().toISOString();
    } else {
      user.identityStatus = IdentityStatus.FAILED;
      user.verifiedAt = null;
    }
    this.identitySessions.delete(sessionId);
    return this.toMe(user);
  }

  cancelIdentity(sessionId: string) {
    const session = this.identitySessions.get(sessionId);
    if (!session) throw new Error('invalid_identity_session');
    session.status = 'CANCELLED';
    const user = this.require(session.userId);
    if (user.identityStatus === IdentityStatus.PENDING) {
      user.identityStatus = IdentityStatus.UNVERIFIED;
    }
    return this.toMe(user);
  }

  updateProfile(
    userId: string,
    input: {
      nickname?: string;
      gender?: string;
      ageBand?: AgeBand;
      regionLabel?: string;
      bio?: string;
      skillLevel?: SportSkillLevel;
      avatarUrl?: string | null;
    },
  ) {
    const user = this.require(userId);
    if (input.nickname !== undefined) user.nickname = input.nickname;
    if (input.gender !== undefined) user.gender = input.gender;
    if (input.ageBand !== undefined) user.ageBand = input.ageBand;
    if (input.regionLabel !== undefined) user.regionLabel = input.regionLabel;
    if (input.bio !== undefined) user.bio = input.bio;
    if (input.skillLevel !== undefined) user.skillLevel = input.skillLevel;
    if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
    return this.toMe(user);
  }

  setAvatarMock(userId: string, localUriOrNull: string | null) {
    const user = this.require(userId);
    user.avatarUrl = localUriOrNull ?? `mock://avatar/${userId}`;
    return this.toMe(user);
  }

  getPublicProfile(userId: string): PublicUserProfileDto | null {
    const user = this.users.get(userId);
    return user ? this.toPublic(user) : null;
  }

  private createNew(provider: SocialProvider): StoredUser {
    return {
      userId: randomUUID(),
      scenario: MockAuthScenario.NEW_USER,
      termsAccepted: false,
      identityStatus: IdentityStatus.UNVERIFIED,
      identityProvider: null,
      verifiedAt: null,
      nickname: null,
      gender: null,
      ageBand: null,
      regionLabel: null,
      bio: null,
      avatarUrl: null,
      skillLevel: null,
      participationCount: 0,
      connectedProvider: provider,
      availableCoin: '0',
      heldCoin: '0',
    };
  }

  private createReturning(provider: SocialProvider): StoredUser {
    return {
      userId: randomUUID(),
      scenario: MockAuthScenario.RETURNING_USER,
      termsAccepted: true,
      identityStatus: IdentityStatus.VERIFIED,
      identityProvider: 'MOCK_IDENTITY',
      verifiedAt: new Date().toISOString(),
      nickname: '거제스윙',
      gender: 'MALE',
      ageBand: AgeBand.THIRTIES,
      regionLabel: '거제',
      bio: '출장 중 스크린골프 같이 칠 분!',
      avatarUrl: null,
      skillLevel: SportSkillLevel.INTERMEDIATE,
      participationCount: 12,
      connectedProvider: provider,
      availableCoin: '120',
      heldCoin: '40',
    };
  }

  private require(userId: string): StoredUser {
    const user = this.users.get(userId);
    if (!user) throw new Error('user_not_found');
    return user;
  }

  private toPublic(user: StoredUser): PublicUserProfileDto {
    return {
      id: user.userId,
      nickname: user.nickname ?? '닉네임미설정',
      avatarUrl: user.avatarUrl,
      verifiedBadge: user.identityStatus === IdentityStatus.VERIFIED,
      genderDisplay: mapGenderDisplay(user.gender),
      ageBand: user.ageBand,
      regionLabel: user.regionLabel,
      bio: user.bio,
      sportProfiles: user.skillLevel
        ? [{ sportCode: 'SCREEN_GOLF', skillLevel: user.skillLevel }]
        : [],
      participationCount: user.participationCount,
    };
  }

  private toMe(user: StoredUser): MeDto {
    const profileComplete = Boolean(user.nickname && user.regionLabel && user.skillLevel);
    return {
      userId: user.userId,
      authAppHints: {
        termsAccepted: user.termsAccepted,
        profileComplete,
        hasAvatar: Boolean(user.avatarUrl),
        locationOnboardingComplete: user.termsAccepted,
      },
      publicProfile: profileComplete ? this.toPublic(user) : null,
      identity: {
        verificationStatus: user.identityStatus,
        verifiedAt: user.verifiedAt,
        provider: user.identityProvider,
      },
      socialLinks: [
        SocialProvider.KAKAO,
        SocialProvider.NAVER,
        SocialProvider.GOOGLE,
      ].map((p) => ({
        provider: p,
        status:
          p === user.connectedProvider
            ? SocialLinkStatus.CONNECTED
            : SocialLinkStatus.NOT_CONNECTED,
      })),
      walletSummary: {
        assetCode: 'JJOIN',
        availableCoin: user.availableCoin,
        heldCoin: user.heldCoin,
        totalCoin: String(Number(user.availableCoin) + Number(user.heldCoin)),
        recentTransactions: [],
      },
    };
  }
}

export const mockUserStore = new MockUserStore();
