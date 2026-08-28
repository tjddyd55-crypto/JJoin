import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, PrismaClient, Subscription, SubscriptionStatus } from '@prisma/client';
import {
  JOIN_OPTION_MEMBERSHIP_SNAPSHOT,
  MEMBERSHIP_PLAN_FREE,
  MEMBERSHIP_PLAN_PREMIUM,
  buildJoinMembershipSnapshot,
  pickSubscriptionForResolution,
  resolveMembershipFromSubscription,
  type MembershipPlanCode,
  type ResolvedMembership,
  type SubscriptionResolutionInput,
  type SubscriptionStatusCode,
} from '@jjoin/domain';
import type {
  AdminActivateSubscriptionRequest,
  AdminActivateSubscriptionResponse,
  AdminSubscriptionAuditEventDto,
  AdminSubscriptionDetailDto,
  AdminSubscriptionListItemDto,
  AdminUserMembershipDetailDto,
  MembershipPlanDto,
  UserMembershipDto,
} from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';

type SubWithPlan = Subscription & {
  plan: {
    code: string;
    entitlements: Array<{ entitlementCode: string }>;
  };
  user?: { profile: { nickname: string | null } | null } | null;
};

const planInclude = { entitlements: true } as const;
const subListInclude = {
  plan: { include: planInclude },
  user: { include: { profile: true } },
} as const;

function toResolutionInput(row: SubWithPlan): SubscriptionResolutionInput {
  return {
    id: row.id,
    planCode: row.plan.code,
    status: row.status as SubscriptionStatusCode,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    planEntitlements: row.plan.entitlements.map((e) => e.entitlementCode),
  };
}

export function toUserMembershipDto(resolved: ResolvedMembership): UserMembershipDto {
  return {
    planCode: resolved.effectivePlanCode,
    status: resolved.subscriptionStatus,
    currentPeriodStart: resolved.currentPeriodStart,
    currentPeriodEnd: resolved.currentPeriodEnd,
    cancelAtPeriodEnd: resolved.cancelAtPeriodEnd,
    entitlements: [...resolved.entitlements],
    subscriptionId: resolved.subscriptionId,
  };
}

function effectivePlanForRow(row: SubWithPlan, now: Date): MembershipPlanCode {
  return resolveMembershipFromSubscription(toResolutionInput(row), now).effectivePlanCode;
}

function toAdminListItem(row: SubWithPlan, now = new Date()): AdminSubscriptionListItemDto {
  return {
    subscriptionId: row.id,
    userId: row.userId,
    nickname: row.user?.profile?.nickname ?? null,
    planCode: row.plan.code,
    effectivePlanCode: effectivePlanForRow(row, now),
    status: row.status,
    source: row.source,
    provider: row.provider,
    startsAt: row.startsAt.toISOString(),
    currentPeriodStart: row.currentPeriodStart.toISOString(),
    currentPeriodEnd: row.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    referenceId: row.referenceId,
    reason: row.reason,
    createdByAdminUserId: row.createdByAdminUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Prisma-agnostic membership DTO loader (usable outside Nest DI). */
export async function loadUserMembershipDto(
  prisma: PrismaClient,
  userId: string,
  now = new Date(),
): Promise<UserMembershipDto> {
  const rows = await prisma.subscription.findMany({
    where: { userId },
    include: { plan: { include: planInclude } },
    orderBy: { currentPeriodEnd: 'desc' },
  });
  const picked = pickSubscriptionForResolution(rows.map(toResolutionInput), now);
  return toUserMembershipDto(resolveMembershipFromSubscription(picked, now));
}

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveUserMembership(userId: string, now = new Date()): Promise<ResolvedMembership> {
    await this.expireIfNeeded(userId, now);
    const rows = await this.prisma.subscription.findMany({
      where: { userId },
      include: { plan: { include: planInclude } },
      orderBy: { currentPeriodEnd: 'desc' },
    });
    const picked = pickSubscriptionForResolution(rows.map(toResolutionInput), now);
    return resolveMembershipFromSubscription(picked, now);
  }

  async getUserMembershipDto(userId: string, now = new Date()): Promise<UserMembershipDto> {
    return toUserMembershipDto(await this.resolveUserMembership(userId, now));
  }

  /** Batch resolve for member list pages. */
  async resolvePlanCodesForUsers(
    userIds: string[],
    now = new Date(),
  ): Promise<Map<string, { planCode: MembershipPlanCode; cancelAtPeriodEnd: boolean }>> {
    const result = new Map<string, { planCode: MembershipPlanCode; cancelAtPeriodEnd: boolean }>();
    for (const id of userIds) {
      result.set(id, { planCode: MEMBERSHIP_PLAN_FREE, cancelAtPeriodEnd: false });
    }
    if (userIds.length === 0) return result;

    const rows = await this.prisma.subscription.findMany({
      where: { userId: { in: userIds } },
      include: { plan: { include: planInclude } },
      orderBy: { currentPeriodEnd: 'desc' },
    });

    const byUser = new Map<string, SubWithPlan[]>();
    for (const row of rows) {
      const list = byUser.get(row.userId) ?? [];
      list.push(row);
      byUser.set(row.userId, list);
    }

    for (const [userId, subs] of byUser) {
      const picked = pickSubscriptionForResolution(subs.map(toResolutionInput), now);
      const resolved = resolveMembershipFromSubscription(picked, now);
      result.set(userId, {
        planCode: resolved.effectivePlanCode,
        cancelAtPeriodEnd:
          resolved.effectivePlanCode === MEMBERSHIP_PLAN_PREMIUM && resolved.cancelAtPeriodEnd,
      });
    }
    return result;
  }

  buildJoinOptionData(membership: ResolvedMembership, at: Date = new Date()) {
    return {
      optionKey: JOIN_OPTION_MEMBERSHIP_SNAPSHOT,
      optionValueJson: buildJoinMembershipSnapshot(membership, at),
    };
  }

  async listPlans(): Promise<MembershipPlanDto[]> {
    const plans = await this.prisma.membershipPlan.findMany({
      where: { isActive: true },
      include: { entitlements: true },
      orderBy: { code: 'asc' },
    });
    return plans.map((p) => ({
      id: p.id,
      code: p.code,
      nameKey: p.nameKey,
      isActive: p.isActive,
      entitlements: p.entitlements.map((e) => e.entitlementCode),
      priceAmount: p.priceAmount != null ? String(p.priceAmount) : null,
      currency: p.currency,
    }));
  }

  async listSubscriptions(params: {
    userId?: string;
    q?: string;
    status?: string;
    planCode?: string;
    effectivePremium?: boolean;
    cancelScheduled?: boolean;
    periodEndFrom?: string;
    periodEndTo?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: AdminSubscriptionListItemDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 200);
    const now = new Date();
    const q = params.q?.trim();

    const where: Prisma.SubscriptionWhereInput = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.status ? { status: params.status as SubscriptionStatus } : {}),
      ...(params.planCode ? { plan: { code: params.planCode } } : {}),
      ...(params.cancelScheduled === true ? { cancelAtPeriodEnd: true } : {}),
      ...(params.cancelScheduled === false ? { cancelAtPeriodEnd: false } : {}),
      ...(params.periodEndFrom || params.periodEndTo
        ? {
            currentPeriodEnd: {
              ...(params.periodEndFrom ? { gte: new Date(params.periodEndFrom) } : {}),
              ...(params.periodEndTo ? { lte: new Date(params.periodEndTo) } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { userId: q },
              { user: { profile: { nickname: { contains: q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    // effectivePremium requires resolver — fetch a wider window then filter.
    const needsEffectiveFilter = params.effectivePremium === true || params.effectivePremium === false;
    const fetchTake = needsEffectiveFilter ? Math.min(pageSize * 20, 500) : pageSize;
    const fetchSkip = needsEffectiveFilter ? 0 : (page - 1) * pageSize;

    const [rawTotal, rows] = await Promise.all([
      this.prisma.subscription.count({ where }),
      this.prisma.subscription.findMany({
        where,
        include: subListInclude,
        orderBy: { createdAt: 'desc' },
        skip: fetchSkip,
        take: fetchTake,
      }),
    ]);

    let mapped = rows.map((r) => toAdminListItem(r, now));
    if (params.effectivePremium === true) {
      mapped = mapped.filter((r) => r.effectivePlanCode === MEMBERSHIP_PLAN_PREMIUM);
    } else if (params.effectivePremium === false) {
      mapped = mapped.filter((r) => r.effectivePlanCode === MEMBERSHIP_PLAN_FREE);
    }

    const total = needsEffectiveFilter ? mapped.length : rawTotal;
    const items = needsEffectiveFilter
      ? mapped.slice((page - 1) * pageSize, page * pageSize)
      : mapped;

    return { items, total, page, pageSize };
  }

  async getAdminUserMembershipDetail(userId: string): Promise<AdminUserMembershipDetailDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'user_not_found' });

    const now = new Date();
    await this.expireIfNeeded(userId, now);

    const rows = await this.prisma.subscription.findMany({
      where: { userId },
      include: subListInclude,
      orderBy: { currentPeriodEnd: 'desc' },
    });
    const history = rows.map((r) => toAdminListItem(r, now));
    const effective = await this.getUserMembershipDto(userId, now);
    const active =
      history.find((h) => h.subscriptionId === effective.subscriptionId) ??
      history.find((h) => h.effectivePlanCode === MEMBERSHIP_PLAN_PREMIUM) ??
      null;

    const audits = await this.listAuditsForUser(userId);
    return { effective, subscription: active, history, audits };
  }

  async getSubscriptionDetail(subscriptionId: string): Promise<AdminSubscriptionDetailDto> {
    const row = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: subListInclude,
    });
    if (!row) throw new NotFoundException({ code: 'subscription_not_found' });

    const now = new Date();
    await this.expireIfNeeded(row.userId, now);
    const refreshed = await this.prisma.subscription.findUniqueOrThrow({
      where: { id: subscriptionId },
      include: subListInclude,
    });
    const subscription = toAdminListItem(refreshed, now);
    const effective = await this.getUserMembershipDto(row.userId, now);
    const entitlements = refreshed.plan.entitlements.map((e) => e.entitlementCode);
    const audits = await this.listAuditsForSubscription(subscriptionId);
    return { subscription, effective, entitlements, audits };
  }

  async activateSubscription(
    adminUserId: string,
    body: AdminActivateSubscriptionRequest,
  ): Promise<AdminActivateSubscriptionResponse> {
    const planCode = body.planCode ?? MEMBERSHIP_PLAN_PREMIUM;
    if (planCode !== MEMBERSHIP_PLAN_PREMIUM) {
      throw new BadRequestException({
        code: 'invalid_plan',
        message: 'Only PREMIUM can be activated via admin. FREE is the default without a row.',
      });
    }
    if (!body.reason?.trim()) {
      throw new BadRequestException({ code: 'reason_required' });
    }
    if (!body.referenceId?.trim()) {
      throw new BadRequestException({ code: 'reference_id_required' });
    }

    const periodDays = body.periodDays ?? 30;
    if (!Number.isInteger(periodDays) || periodDays < 1 || periodDays > 3660) {
      throw new BadRequestException({ code: 'invalid_period_days' });
    }

    const plan = await this.prisma.membershipPlan.findUnique({
      where: { code: planCode },
      include: { entitlements: true },
    });
    if (!plan || !plan.isActive) {
      throw new NotFoundException({ code: 'plan_not_found' });
    }

    const user = await this.prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) throw new NotFoundException({ code: 'user_not_found' });

    const source = body.source ?? 'ADMIN_TEST';
    if (source !== 'ADMIN_TEST' && source !== 'ADMIN_GRANT') {
      throw new BadRequestException({ code: 'invalid_source' });
    }

    const existing = await this.prisma.subscription.findUnique({
      where: {
        userId_referenceId: { userId: body.userId, referenceId: body.referenceId },
      },
      include: subListInclude,
    });
    if (existing) {
      const effective = await this.getUserMembershipDto(body.userId);
      return {
        subscription: toAdminListItem(existing),
        effective,
        alreadyExists: true,
      };
    }

    const now = new Date();
    await this.expireIfNeeded(body.userId, now);
    const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

    const created = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: {
          userId: body.userId,
          planId: plan.id,
          status: 'ACTIVE',
          source,
          startsAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          referenceId: body.referenceId,
          reason: body.reason.trim(),
          createdByAdminUserId: adminUserId,
        },
        include: subListInclude,
      });

      await tx.subscriptionAuditEvent.create({
        data: {
          subscriptionId: sub.id,
          action: 'ACTIVATED',
          actorUserId: adminUserId,
          reason: body.reason.trim(),
          metadata: {
            planCode,
            periodDays,
            source,
            referenceId: body.referenceId,
            entitlements: plan.entitlements.map((e) => e.entitlementCode),
            coinMint: false,
            previousPlan: MEMBERSHIP_PLAN_FREE,
            nextPlan: MEMBERSHIP_PLAN_PREMIUM,
          },
        },
      });

      return sub;
    });

    const effective = await this.getUserMembershipDto(body.userId);
    return {
      subscription: toAdminListItem(created),
      effective,
      alreadyExists: false,
    };
  }

  async scheduleCancel(
    subscriptionId: string,
    adminUserId: string,
    reason: string,
  ): Promise<AdminSubscriptionListItemDto> {
    if (!reason?.trim()) {
      throw new BadRequestException({ code: 'reason_required' });
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: subListInclude,
    });
    if (!sub) throw new NotFoundException({ code: 'subscription_not_found' });

    const now = new Date();
    if (sub.status === 'EXPIRED' || sub.currentPeriodEnd <= now) {
      throw new BadRequestException({ code: 'subscription_already_ended' });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'CANCELLED',
          cancelAtPeriodEnd: true,
          cancelledAt: now,
          reason: reason.trim(),
        },
        include: subListInclude,
      });
      await tx.subscriptionAuditEvent.create({
        data: {
          subscriptionId,
          action: 'CANCEL_SCHEDULED',
          actorUserId: adminUserId,
          reason: reason.trim(),
          metadata: {
            cancelAtPeriodEnd: true,
            currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
            previousStatus: sub.status,
            nextStatus: 'CANCELLED',
            effectivePlanUntilPeriodEnd: MEMBERSHIP_PLAN_PREMIUM,
          },
        },
      });
      return next;
    });

    return toAdminListItem(updated, now);
  }

  async expireIfNeeded(userId: string, now = new Date()): Promise<void> {
    const stale = await this.prisma.subscription.findMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'CANCELLED', 'PAST_DUE'] },
        currentPeriodEnd: { lte: now },
      },
    });
    if (stale.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      for (const row of stale) {
        await tx.subscription.update({
          where: { id: row.id },
          data: { status: 'EXPIRED', endedAt: now },
        });
        await tx.subscriptionAuditEvent.create({
          data: {
            subscriptionId: row.id,
            action: 'EXPIRED',
            actorUserId: null,
            reason: 'period_ended',
            metadata: {
              currentPeriodEnd: row.currentPeriodEnd.toISOString(),
              previousStatus: row.status,
              nextStatus: 'EXPIRED',
              nextPlan: MEMBERSHIP_PLAN_FREE,
            },
          },
        });
      }
    });
  }

  private async listAuditsForUser(userId: string): Promise<AdminSubscriptionAuditEventDto[]> {
    const rows = await this.prisma.subscriptionAuditEvent.findMany({
      where: { subscription: { userId } },
      include: {
        actor: { include: { profile: true } },
        subscription: { select: { userId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      eventId: r.id,
      subscriptionId: r.subscriptionId,
      userId: r.subscription.userId,
      action: r.action,
      actorUserId: r.actorUserId,
      actorLabel: r.actor?.profile?.nickname ?? r.actorUserId ?? 'system',
      reason: r.reason,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  private async listAuditsForSubscription(
    subscriptionId: string,
  ): Promise<AdminSubscriptionAuditEventDto[]> {
    const rows = await this.prisma.subscriptionAuditEvent.findMany({
      where: { subscriptionId },
      include: {
        actor: { include: { profile: true } },
        subscription: { select: { userId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      eventId: r.id,
      subscriptionId: r.subscriptionId,
      userId: r.subscription.userId,
      action: r.action,
      actorUserId: r.actorUserId,
      actorLabel: r.actor?.profile?.nickname ?? r.actorUserId ?? 'system',
      reason: r.reason,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
