import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  canBypassJoinHostLimit,
  exceedsJoinHostLimit,
  extendPremiumExpiry,
  isPremiumActive,
  NORMAL_USER_ACTIVE_HOST_JOIN_LIMIT,
  premiumRemainingDays,
} from '@jjoin/domain';
import type { PremiumStatusDto } from '@jjoin/types';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ACTIVE_HOST_JOIN_STATUSES = ['OPEN', 'FULL', 'CONFIRMED', 'IN_PROGRESS'] as const;

@Injectable()
export class PremiumService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string): Promise<PremiumStatusDto> {
    const row = await this.prisma.premiumMembership.findUnique({ where: { userId } });
    const now = new Date();
    if (!row) {
      return {
        active: false,
        startedAt: null,
        expiresAt: null,
        remainingDays: null,
      };
    }
    const active = isPremiumActive(row.expiresAt, now);
    return {
      active,
      startedAt: row.startedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      remainingDays: premiumRemainingDays(row.expiresAt, now),
    };
  }

  async assertCanCreateJoin(userId: string): Promise<void> {
    const bypass = await this.canBypassHostLimit(userId);
    if (bypass) return;

    const activeCount = await this.countActiveHostedJoins(userId);
    if (exceedsJoinHostLimit(activeCount, NORMAL_USER_ACTIVE_HOST_JOIN_LIMIT)) {
      throw new ForbiddenException({
        code: 'JOIN_HOST_LIMIT',
        message:
          '일반 회원은 동시에 운영 중인 조인 생성 수에 제한이 있습니다. 프리미엄 회원은 제한 없이 조인을 만들 수 있습니다.',
        limit: NORMAL_USER_ACTIVE_HOST_JOIN_LIMIT,
        activeHostedCount: activeCount,
      });
    }
  }

  async canBypassHostLimit(userId: string): Promise<boolean> {
    const [premiumActive, storeOwner] = await Promise.all([
      this.isUserPremiumActive(userId),
      this.hasActiveStoreOwnership(userId),
    ]);
    return canBypassJoinHostLimit({
      isPremiumActive: premiumActive,
      hasActiveStoreOwnership: storeOwner,
    });
  }

  async isUserPremiumActive(userId: string): Promise<boolean> {
    const row = await this.prisma.premiumMembership.findUnique({
      where: { userId },
      select: { expiresAt: true },
    });
    return isPremiumActive(row?.expiresAt, new Date());
  }

  private async hasActiveStoreOwnership(userId: string): Promise<boolean> {
    const row = await this.prisma.storeOwnership.findFirst({
      where: { userId, status: 'ACTIVE' },
      select: { id: true },
    });
    return Boolean(row);
  }

  private async countActiveHostedJoins(userId: string): Promise<number> {
    return this.prisma.join.count({
      where: {
        hostUserId: userId,
        status: { in: [...ACTIVE_HOST_JOIN_STATUSES] },
      },
    });
  }

  async activateOrExtendInTransaction(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      paymentId: string;
      premiumDays: number;
    },
  ): Promise<{ expiresAt: Date; startedAt: Date; extended: boolean }> {
    const now = new Date();
    const days = Math.max(1, Math.floor(input.premiumDays));
    const existing = await tx.premiumMembership.findUnique({ where: { userId: input.userId } });
    const expiresAt = extendPremiumExpiry(existing?.expiresAt, days, now);
    const wasActive = existing ? isPremiumActive(existing.expiresAt, now) : false;
    const startedAt = wasActive ? existing!.startedAt : now;

    if (existing) {
      await tx.premiumMembership.update({
        where: { userId: input.userId },
        data: {
          status: 'ACTIVE',
          startedAt,
          expiresAt,
          lastPaymentId: input.paymentId,
        },
      });
    } else {
      await tx.premiumMembership.create({
        data: {
          userId: input.userId,
          status: 'ACTIVE',
          startedAt: now,
          expiresAt,
          lastPaymentId: input.paymentId,
        },
      });
    }

    return { expiresAt, startedAt: wasActive ? startedAt : now, extended: wasActive };
  }
}
