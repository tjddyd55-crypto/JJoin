import {
  AgeBand,
  Gender,
  MockAuthPersona,
  MockAuthScenario,
  SocialProvider,
  SportSkillLevel,
  type MeDto,
  type SocialSignInResponse,
} from '@jjoin/types';
import { resolveOnboardingStep } from '@jjoin/domain';
import type { PrismaClient } from '@prisma/client';
import { ensureFoundation } from '../foundation/ensure-foundation';
import { issueSessionToken } from './session-token';
import { mockUserStore } from '../mock/mock-user.store';
import { CoinLedgerService } from '../modules/wallet/coin-ledger.service';
import { isDevCoinFundingAllowed } from '../coin/dev-coin-policy';
import type { PrismaService } from '../prisma/prisma.service';
import { buildMeFromUser } from './user-me.mapper';
import { TERMS_VERSION, REQUIRED_CONSENT_TYPES } from './consent-policy';

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
  [MockAuthPersona.DEV_ADMIN]: {
    persona: MockAuthPersona.DEV_ADMIN,
    providerSubject: 'dev-persona-admin',
    nickname: '운영관리자',
    gender: Gender.MALE,
    ageBand: AgeBand.THIRTIES,
    regionLabel: '거제',
    skillLevel: SportSkillLevel.INTERMEDIATE,
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
    await seedDevPersonaConsents(prisma, userId);
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

  await seedDevPersonaConsents(prisma, userId);

  if (isDevCoinFundingAllowed()) {
    // Idempotent TEST ONLY top-up — not a production grant endpoint.
    const ledger = new CoinLedgerService(prisma as PrismaService);
    await ledger.ensureDevFundingTarget(userId, fixture.persona);
  }

  const fundedMe = await loadMeFromDb(prisma, userId);
  mockUserStore.hydrateFromMe(userId, fundedMe, provider);

  const accessToken = issueSessionToken(userId);
  mockUserStore.bindToken(accessToken, userId);

  return {
    session: {
      accessToken,
      userId,
      scenario: MockAuthScenario.RETURNING_USER,
    },
    me: fundedMe,
    nextStep: resolveOnboardingStep(fundedMe),
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
      consents: true,
    },
  });

  const participationCount = await prisma.joinParticipant.count({
    where: { userId, participationStatus: { in: ['APPROVED', 'CONFIRMED', 'COMPLETED'] } },
  });

  return buildMeFromUser(user, participationCount);
}

async function seedDevPersonaConsents(prisma: PrismaClient, userId: string): Promise<void> {
  for (const type of REQUIRED_CONSENT_TYPES) {
    await prisma.userConsent.upsert({
      where: {
        userId_type_version: { userId, type, version: TERMS_VERSION },
      },
      create: { userId, type, version: TERMS_VERSION, agreed: true },
      update: { agreed: true },
    });
  }
  await prisma.userConsent.upsert({
    where: {
      userId_type_version: { userId, type: 'AVATAR_SKIPPED', version: TERMS_VERSION },
    },
    create: { userId, type: 'AVATAR_SKIPPED', version: TERMS_VERSION, agreed: true },
    update: { agreed: true },
  });
}

export { PERSONAS };
