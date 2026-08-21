import {
  AgeBand,
  Gender,
  IdentityStatus,
  MockAuthPersona,
  MockAuthScenario,
  SocialLinkStatus,
  SocialProvider,
  SportSkillLevel,
  type MeDto,
  type PublicUserProfileDto,
  type SocialSignInResponse,
} from '@jjoin/types';
import { mapGenderDisplay, resolveOnboardingStep } from '@jjoin/domain';
import type { PrismaClient } from '@prisma/client';
import { ensureFoundation } from '../foundation/ensure-foundation';
import { issueSessionToken } from './session-token';
import { mockUserStore } from '../mock/mock-user.store';

type PersonaFixture = {
  persona: MockAuthPersona;
  providerSubject: string;
  nickname: string;
  gender: Gender;
  ageBand: AgeBand;
  regionLabel: string;
  skillLevel: SportSkillLevel;
};

const PERSONAS: Record<MockAuthPersona, PersonaFixture> = {
  [MockAuthPersona.DEV_A]: {
    persona: MockAuthPersona.DEV_A,
    providerSubject: 'dev-persona-a',
    nickname: '김진우',
    gender: Gender.MALE,
    ageBand: AgeBand.THIRTIES,
    regionLabel: '거제',
    skillLevel: SportSkillLevel.INTERMEDIATE,
  },
  [MockAuthPersona.DEV_B]: {
    persona: MockAuthPersona.DEV_B,
    providerSubject: 'dev-persona-b',
    nickname: '박민수',
    gender: Gender.MALE,
    ageBand: AgeBand.TWENTIES,
    regionLabel: '거제',
    skillLevel: SportSkillLevel.BEGINNER,
  },
};

/**
 * Upsert stable DEV_A / DEV_B users into PostgreSQL via SocialAccount unique.
 * Also mirrors into MockUserStore so existing /me routes keep working.
 */
export async function signInDevPersona(
  prisma: PrismaClient,
  provider: SocialProvider,
  persona: MockAuthPersona,
): Promise<SocialSignInResponse> {
  const fixture = PERSONAS[persona];
  await ensureFoundation(prisma);

  const existing = await prisma.socialAccount.findUnique({
    where: {
      provider_providerSubject: {
        provider,
        providerSubject: fixture.providerSubject,
      },
    },
    include: {
      user: {
        include: {
          profile: true,
          sportProfiles: { include: { sport: true } },
        },
      },
    },
  });

  let userId: string;

  if (existing) {
    userId = existing.userId;
    await prisma.socialAccount.update({
      where: { id: existing.id },
      data: { lastLoginAt: new Date() },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  } else {
    const sport = await prisma.sport.findUniqueOrThrow({
      where: { code: 'SCREEN_GOLF' },
    });
    const coin = await prisma.coinAsset.findUniqueOrThrow({ where: { code: 'JJOIN' } });

    const created = await prisma.user.create({
      data: {
        identityStatus: 'VERIFIED',
        lastLoginAt: new Date(),
        profile: {
          create: {
            nickname: fixture.nickname,
            gender: fixture.gender,
            ageBand: fixture.ageBand,
            regionLabel: fixture.regionLabel,
          },
        },
        socialAccounts: {
          create: {
            provider,
            providerSubject: fixture.providerSubject,
            lastLoginAt: new Date(),
          },
        },
        sportProfiles: {
          create: {
            sportId: sport.id,
            skillLevel: fixture.skillLevel,
          },
        },
        wallets: {
          create: {
            coinAssetId: coin.id,
            availableBalance: 0,
            heldBalance: 0,
          },
        },
        identityVerifications: {
          create: {
            provider: 'MOCK_IDENTITY',
            status: 'VERIFIED',
            verifiedAt: new Date(),
            verifiedNameMasked: fixture.nickname.slice(0, 1) + '**',
          },
        },
      },
    });
    userId = created.id;
  }

  const me = await loadMeFromDb(prisma, userId);
  mockUserStore.hydrateFromMe(userId, me, provider);

  const accessToken = issueSessionToken(userId);
  mockUserStore.bindToken(accessToken, userId);

  return {
    session: {
      accessToken,
      userId,
      scenario: MockAuthScenario.RETURNING_USER,
    },
    me,
    nextStep: resolveOnboardingStep(me),
  };
}

export async function loadMeFromDb(prisma: PrismaClient, userId: string): Promise<MeDto> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      profile: true,
      socialAccounts: true,
      sportProfiles: { include: { sport: true } },
      wallets: true,
      identityVerifications: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  const profile = user.profile;
  const publicProfile: PublicUserProfileDto | null = profile
    ? {
        id: user.id,
        nickname: profile.nickname,
        avatarUrl: null,
        verifiedBadge: user.identityStatus === IdentityStatus.VERIFIED,
        genderDisplay: profile.gender ? mapGenderDisplay(profile.gender as never) : null,
        ageBand: (profile.ageBand as AgeBand | null) ?? null,
        regionLabel: profile.regionLabel,
        bio: profile.bio,
        sportProfiles: user.sportProfiles.map((sp) => ({
          sportCode: sp.sport.code,
          skillLevel: sp.skillLevel as SportSkillLevel,
        })),
        participationCount: 0,
      }
    : null;

  const wallet = user.wallets[0];
  const latestIdentity = user.identityVerifications[0];

  return {
    userId: user.id,
    authAppHints: {
      termsAccepted: true,
      profileComplete: Boolean(profile?.nickname && profile.regionLabel),
      hasAvatar: Boolean(profile?.avatarAssetId),
    },
    publicProfile,
    identity: {
      verificationStatus: user.identityStatus as IdentityStatus,
      verifiedAt: latestIdentity?.verifiedAt?.toISOString() ?? null,
      provider: latestIdentity?.provider ?? null,
    },
    socialLinks: Object.values(SocialProvider).map((p) => ({
      provider: p,
      status: user.socialAccounts.some((s) => s.provider === p)
        ? SocialLinkStatus.CONNECTED
        : SocialLinkStatus.NOT_CONNECTED,
    })),
    walletSummary: {
      availableCoin: wallet ? String(wallet.availableBalance) : '0',
      heldCoin: wallet ? String(wallet.heldBalance) : '0',
      recentTransactions: [],
    },
  };
}

export { PERSONAS };
