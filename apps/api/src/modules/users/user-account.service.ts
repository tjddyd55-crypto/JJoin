import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IdentityStatus,
  SCREEN_GOLF_CODE,
  SocialProvider,
  SportSkillLevel,
  type MeDto,
  type PublicUserProfileDto,
} from '@jjoin/types';
import { calculateParticipationTrust, computeAttendanceReliability, computePlayerReputation } from '@jjoin/domain';
import { profileEditSchema, profileSetupSchema, termsConsentSchema } from '@jjoin/validation';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { TERMS_VERSION } from '../../auth/consent-policy';
import {
  buildMeFromUser,
  buildPublicProfileFromUser,
  CONSENT_FIELD_MAP,
  type UserWithRelations,
} from '../../auth/user-me.mapper';
import { resolveIdentityProviderMode } from '../../auth/social-auth-mode';
import { ensureFoundation } from '../../foundation/ensure-foundation';
import { MockIdentityAdapter } from '../../providers/mock.adapters';
import { MockMediaAdapter } from '../../providers/mock.adapters';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { PremiumService } from '../payments/premium.service';

const USER_INCLUDE = {
  profile: true,
  socialAccounts: true,
  sportProfiles: { include: { sport: true } },
  wallets: true,
  identityVerifications: { orderBy: { createdAt: 'desc' as const }, take: 1 },
  consents: true,
} satisfies Prisma.UserInclude;

@Injectable()
export class UserAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly premium: PremiumService,
    private readonly media: MockMediaAdapter,
    private readonly mockIdentity: MockIdentityAdapter,
  ) {}

  async loadUser(userId: string): Promise<UserWithRelations> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: USER_INCLUDE,
    });
    if (!user) throw new NotFoundException('user_not_found');
    return user;
  }

  async getMe(userId: string): Promise<MeDto> {
    const user = await this.loadUser(userId);
    const participationCount = await this.prisma.joinParticipant.count({
      where: { userId, participationStatus: { in: ['APPROVED', 'CONFIRMED', 'COMPLETED'] } },
    });
    const reliability = await this.loadAttendanceReliability(userId);
    const trust = await this.loadParticipationTrust(userId);
    const reputation = await this.loadPlayerReputation(userId);
    const me = buildMeFromUser(user, participationCount);
    const walletSummary = await this.wallet.getSummary(userId);
    const premiumStatus = await this.premium.getStatus(userId);
    return {
      ...me,
      walletSummary,
      premiumStatus,
      publicProfile: me.publicProfile
        ? {
            ...me.publicProfile,
            completedJoinCount: reliability.completedCount,
            noShowCount: reliability.noShowCount,
            attendanceRatePercent: reliability.attendanceRatePercent,
            participationTrustLabel: trust.labelText,
            averageRating: reputation.averageRating,
            averageRatingDisplay: reputation.averageRatingDisplay,
            reviewCount: reputation.reviewCount,
          }
        : null,
    };
  }

  private async loadParticipationTrust(userId: string) {
    const [reliability, cancelledCount, playedTogetherCount] = await Promise.all([
      this.loadAttendanceReliability(userId),
      this.prisma.joinParticipant.count({
        where: { userId, participationStatus: 'CANCELLED' },
      }),
      this.countDistinctPlayedTogether(userId),
    ]);
    const participationCount =
      reliability.completedCount + reliability.noShowCount + cancelledCount;
    const trust = calculateParticipationTrust({
      joinedCount: participationCount,
      attendedCount: reliability.completedCount,
      noShowCount: reliability.noShowCount,
      cancelledCount,
      playedTogetherCount,
    });
    return { ...trust, playedTogetherCount, cancelledCount, participationCount };
  }

  private async countDistinctPlayedTogether(userId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ c: bigint | number }>>`
      SELECT COUNT(DISTINCT jp_other.user_id)::int AS c
      FROM join_participants jp_me
      INNER JOIN joins j ON j.id = jp_me.join_id
      INNER JOIN join_participants jp_other
        ON jp_other.join_id = jp_me.join_id
       AND jp_other.user_id <> ${userId}::uuid
      WHERE jp_me.user_id = ${userId}::uuid
        AND j.status::text = 'COMPLETED'
        AND jp_me.participation_status::text = 'COMPLETED'
        AND jp_other.participation_status::text = 'COMPLETED'
    `;
    return Number(rows[0]?.c ?? 0);
  }

  private async loadAttendanceReliability(userId: string) {
    const [completedJoinCount, noShowCount] = await Promise.all([
      this.prisma.joinParticipant.count({
        where: { userId, participationStatus: 'COMPLETED' },
      }),
      this.prisma.joinParticipant.count({
        where: { userId, participationStatus: 'NO_SHOW' },
      }),
    ]);
    return computeAttendanceReliability({
      completedCount: completedJoinCount,
      noShowCount,
    });
  }

  private async loadPlayerReputation(userId: string) {
    const rows = await this.prisma.playerReview.findMany({
      where: { revieweeUserId: userId, visibility: 'VISIBLE' },
      select: { rating: true },
    });
    return computePlayerReputation(rows.map((r) => r.rating));
  }

  private async countPlayedTogether(viewerUserId: string, otherUserId: string): Promise<number> {
    if (!viewerUserId || viewerUserId === otherUserId) return 0;
    const rows = await this.prisma.$queryRaw<Array<{ c: bigint | number }>>`
      SELECT COUNT(*)::int AS c
      FROM join_participants jp_me
      INNER JOIN joins j ON j.id = jp_me.join_id
      INNER JOIN join_participants jp_other
        ON jp_other.join_id = jp_me.join_id
       AND jp_other.user_id = ${otherUserId}::uuid
      WHERE jp_me.user_id = ${viewerUserId}::uuid
        AND j.status::text = 'COMPLETED'
        AND jp_me.participation_status::text = 'COMPLETED'
        AND jp_other.participation_status::text = 'COMPLETED'
    `;
    return Number(rows[0]?.c ?? 0);
  }

  async acceptTerms(userId: string, body: unknown): Promise<MeDto> {
    const parsed = termsConsentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'terms_incomplete', issues: parsed.error.issues });
    }
    const data = parsed.data;

    await this.prisma.$transaction(async (tx) => {
      for (const [field, type] of Object.entries(CONSENT_FIELD_MAP)) {
        const value = data[field as keyof typeof data];
        if (field === 'marketing') {
          if (value === true) {
            await tx.userConsent.upsert({
              where: {
                userId_type_version: { userId, type, version: TERMS_VERSION },
              },
              create: { userId, type, version: TERMS_VERSION, agreed: true },
              update: { agreed: true, agreedAt: new Date() },
            });
          }
          continue;
        }
        if (value !== true) continue;
        await tx.userConsent.upsert({
          where: {
            userId_type_version: { userId, type, version: TERMS_VERSION },
          },
          create: { userId, type, version: TERMS_VERSION, agreed: true },
          update: { agreed: true, agreedAt: new Date() },
        });
      }
    });

    return this.getMe(userId);
  }

  async completeLocationOnboarding(userId: string): Promise<MeDto> {
    await this.prisma.userConsent.upsert({
      where: {
        userId_type_version: {
          userId,
          type: 'LOCATION',
          version: TERMS_VERSION,
        },
      },
      create: { userId, type: 'LOCATION', version: TERMS_VERSION, agreed: true },
      update: { agreed: true, agreedAt: new Date() },
    });
    return this.getMe(userId);
  }

  async setupProfile(userId: string, body: unknown): Promise<MeDto> {
    const parsed = profileSetupSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'profile_invalid', issues: parsed.error.issues });
    }
    const data = parsed.data;
    const sport = await this.prisma.sport.findUniqueOrThrow({
      where: { code: data.sportCode ?? SCREEN_GOLF_CODE },
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.userProfile.upsert({
          where: { userId },
          create: {
            userId,
            nickname: data.nickname,
            gender: data.gender,
            ageBand: data.ageBand,
            regionLabel: data.regionLabel,
            bio: data.bio || null,
          },
          update: {
            nickname: data.nickname,
            gender: data.gender,
            ageBand: data.ageBand,
            regionLabel: data.regionLabel,
            bio: data.bio || null,
          },
        });
        await tx.userSportProfile.upsert({
          where: { userId_sportId: { userId, sportId: sport.id } },
          create: {
            userId,
            sportId: sport.id,
            skillLevel: data.skillLevel,
          },
          update: { skillLevel: data.skillLevel },
        });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('nickname_taken');
      }
      throw e;
    }

    return this.getMe(userId);
  }

  async editProfile(userId: string, body: unknown): Promise<MeDto> {
    const parsed = profileEditSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'profile_invalid', issues: parsed.error.issues });
    }
    const data = parsed.data;
    const sport = await this.prisma.sport.findUniqueOrThrow({
      where: { code: data.sportCode ?? SCREEN_GOLF_CODE },
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.userProfile.findUnique({ where: { userId } });
        if (!existing) throw new NotFoundException('profile_not_found');
        await tx.userProfile.update({
          where: { userId },
          data: {
            nickname: data.nickname ?? existing.nickname,
            gender: data.gender ?? existing.gender,
            ageBand: data.ageBand ?? existing.ageBand,
            regionLabel: data.regionLabel ?? existing.regionLabel,
            bio: data.bio ?? existing.bio,
          },
        });
        if (data.skillLevel) {
          await tx.userSportProfile.upsert({
            where: { userId_sportId: { userId, sportId: sport.id } },
            create: { userId, sportId: sport.id, skillLevel: data.skillLevel },
            update: { skillLevel: data.skillLevel },
          });
        }
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('nickname_taken');
      }
      throw e;
    }

    return this.getMe(userId);
  }

  async setAvatar(
    userId: string,
    body: { localUri?: string | null; skip?: boolean; socialAvatarUrl?: string | null },
  ): Promise<MeDto> {
    if (body.skip) {
      await this.prisma.userConsent.upsert({
        where: {
          userId_type_version: {
            userId,
            type: 'AVATAR_SKIPPED',
            version: TERMS_VERSION,
          },
        },
        create: { userId, type: 'AVATAR_SKIPPED', version: TERMS_VERSION, agreed: true },
        update: { agreed: true },
      });
      return this.getMe(userId);
    }

    await this.media.createUploadUrl({ userId, contentType: 'image/jpeg' });
    const storageKey = body.socialAvatarUrl ?? body.localUri ?? `mock://avatar/${userId}`;

    await this.prisma.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.create({
        data: {
          ownerUserId: userId,
          kind: 'AVATAR',
          storageKey,
          mimeType: 'image/jpeg',
        },
      });
      await tx.userProfile.upsert({
        where: { userId },
        create: { userId, nickname: `user_${userId.slice(0, 8)}`, avatarAssetId: asset.id },
        update: { avatarAssetId: asset.id },
      });
    });

    return this.getMe(userId);
  }

  async getPublicProfile(
    userId: string,
    viewerUserId?: string | null,
  ): Promise<PublicUserProfileDto> {
    const user = await this.loadUser(userId);
    if (!user.profile) throw new NotFoundException('user_not_found');
    const participationCount = await this.prisma.joinParticipant.count({
      where: { userId, participationStatus: { in: ['APPROVED', 'CONFIRMED', 'COMPLETED'] } },
    });
    const reliability = await this.loadAttendanceReliability(userId);
    const trust = await this.loadParticipationTrust(userId);
    const reputation = await this.loadPlayerReputation(userId);
    const profile = buildPublicProfileFromUser(user, participationCount);
    const playedCountWithViewer =
      viewerUserId && viewerUserId !== userId
        ? await this.countPlayedTogether(viewerUserId, userId)
        : null;
    return {
      ...profile,
      completedJoinCount: reliability.completedCount,
      noShowCount: reliability.noShowCount,
      attendanceRatePercent: reliability.attendanceRatePercent,
      participationTrustLabel: trust.labelText,
      averageRating: reputation.averageRating,
      averageRatingDisplay: reputation.averageRatingDisplay,
      reviewCount: reputation.reviewCount,
      playedCountWithViewer,
    };
  }

  async assertIdentityVerified(userId: string, action: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { identityStatus: true },
    });
    if (!user) throw new NotFoundException('user_not_found');
    if (user.identityStatus !== IdentityStatus.VERIFIED) {
      throw new ForbiddenException({
        code: 'IDENTITY_REQUIRED',
        message: '조인 활동을 위해 본인확인이 필요합니다.',
        action,
      });
    }
  }

  async isDevPersonaUser(userId: string): Promise<boolean> {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        userId,
        providerSubject: { startsWith: 'dev-persona-' },
      },
    });
    return Boolean(account);
  }

  async startIdentity(userId: string): Promise<{ sessionId: string }> {
    await this.assertMockIdentityAllowed(userId);
    await this.mockIdentity.start(userId);

    const row = await this.prisma.identityVerification.create({
      data: {
        userId,
        provider: 'MOCK_IDENTITY',
        status: 'PENDING',
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { identityStatus: 'PENDING' },
    });

    return { sessionId: row.id };
  }

  async confirmIdentity(
    userId: string,
    sessionId: string,
    outcome: 'success' | 'fail' = 'success',
  ): Promise<MeDto> {
    await this.assertMockIdentityAllowed(userId);
    if (!sessionId) throw new BadRequestException('session_required');

    const row = await this.prisma.identityVerification.findFirst({
      where: { id: sessionId, userId },
    });
    if (!row || row.status !== 'PENDING') {
      throw new BadRequestException('invalid_identity_session');
    }

    const adapterResult = await this.mockIdentity.confirm(
      outcome === 'fail' ? `fail_${sessionId}` : sessionId,
    );

    if (!adapterResult.verified) {
      await this.prisma.$transaction([
        this.prisma.identityVerification.update({
          where: { id: sessionId },
          data: { status: 'FAILED' },
        }),
        this.prisma.user.update({
          where: { id: userId },
          data: { identityStatus: 'FAILED' },
        }),
      ]);
      return this.getMe(userId);
    }

    const ciHash = adapterResult.ciHash
      ? createHash('sha256').update(adapterResult.ciHash).digest('hex')
      : null;

    await this.prisma.$transaction([
      this.prisma.identityVerification.update({
        where: { id: sessionId },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
          ciHash,
          verifiedNameMasked: '본인**',
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { identityStatus: 'VERIFIED' },
      }),
    ]);

    return this.getMe(userId);
  }

  async cancelIdentity(userId: string, sessionId: string): Promise<MeDto> {
    const row = await this.prisma.identityVerification.findFirst({
      where: { id: sessionId, userId, status: 'PENDING' },
    });
    if (!row) throw new BadRequestException('invalid_identity_session');

    await this.prisma.$transaction([
      this.prisma.identityVerification.update({
        where: { id: sessionId },
        data: { status: 'FAILED' },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { identityStatus: 'UNVERIFIED' },
      }),
    ]);

    return this.getMe(userId);
  }

  getIdentityStatus(userId: string) {
    return this.loadUser(userId).then((u) => buildMeFromUser(u).identity);
  }

  async getIdentityCapability(userId: string) {
    const devPersona = await this.isDevPersonaUser(userId);
    const identityMode = resolveIdentityProviderMode();
    const socialMode = (process.env.SOCIAL_AUTH_MODE ?? 'mock').toLowerCase();

    if (identityMode === 'real') {
      return { status: 'REAL' as const, canStart: true, message: null };
    }
    if (devPersona || socialMode === 'mock') {
      return { status: 'MOCK' as const, canStart: true, message: null };
    }
    return {
      status: 'UNAVAILABLE' as const,
      canStart: false,
      message: '본인확인 서비스 준비 중입니다. 조회 기능은 계속 이용할 수 있습니다.',
    };
  }

  private async assertMockIdentityAllowed(userId: string): Promise<void> {
    if (resolveIdentityProviderMode() === 'real') {
      throw new ForbiddenException('identity_provider_not_configured');
    }
    const nodeEnv = (process.env.NODE_ENV ?? 'development').toLowerCase();
    if (nodeEnv === 'production') {
      const devPersona = await this.isDevPersonaUser(userId);
      const socialMode = (process.env.SOCIAL_AUTH_MODE ?? 'mock').toLowerCase();
      if (!devPersona && socialMode !== 'mock') {
        throw new ForbiddenException('mock_identity_not_allowed');
      }
    }
  }

  async createUserForSocialProvider(params: {
    provider: SocialProvider;
    subject: string;
    email?: string;
    nickname?: string;
    avatarUrl?: string;
  }): Promise<UserWithRelations> {
    const { coinAsset } = await ensureFoundation(this.prisma);
    const sport = await this.prisma.sport.findUniqueOrThrow({
      where: { code: SCREEN_GOLF_CODE },
    });

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          identityStatus: 'UNVERIFIED',
          wallets: {
            create: {
              coinAssetId: coinAsset.id,
              availableBalance: 0,
              heldBalance: 0,
            },
          },
          socialAccounts: {
            create: {
              provider: params.provider,
              providerSubject: params.subject,
              providerEmail: params.email ?? null,
              lastLoginAt: new Date(),
            },
          },
        },
        include: USER_INCLUDE,
      });

      // Always create a profile row so MY/publicProfile is never null after social signup.
      // Nickname may still be incomplete until PROFILE_SETUP (region/gender/age).
      const emailLocal = params.email?.split('@')[0]?.replace(/[^a-zA-Z0-9가-힣_]/g, '');
      const fallback = `${params.provider.toLowerCase()}_${params.subject.slice(0, 6)}`;
      const baseNick = (params.nickname?.trim() || emailLocal || fallback).slice(0, 15);
      const nick = `${baseNick}_${randomUUID().slice(0, 4)}`;
      await tx.userProfile.create({
        data: {
          userId: user.id,
          nickname: nick.slice(0, 20),
        },
      });

      await tx.userSportProfile.create({
        data: {
          userId: user.id,
          sportId: sport.id,
          skillLevel: SportSkillLevel.BEGINNER,
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: USER_INCLUDE,
      });
    });
  }

  async linkSocialLogin(params: {
    userId: string;
    provider: SocialProvider;
    email?: string;
  }): Promise<void> {
    await this.prisma.user.update({
      where: { id: params.userId },
      data: { lastLoginAt: new Date() },
    });
    await this.prisma.socialAccount.updateMany({
      where: { userId: params.userId, provider: params.provider },
      data: { lastLoginAt: new Date(), providerEmail: params.email ?? undefined },
    });
  }
}
