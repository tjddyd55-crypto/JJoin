import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DisputeStatus,
  IdentityStatus,
  JoinStatus,
  SocialProvider,
  type AdminAuditEventDto,
  type AdminDashboardDto,
  type AdminJoinDetailDto,
  type AdminJoinListItemDto,
  type AdminMemberDetailDto,
  type AdminMemberListItemDto,
  type AdminPageResult,
  type AdminVenueDetailDto,
  type AdminVenueListItemDto,
} from '@jjoin/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminCoinSupplyService } from './admin-coin-supply.service';
import { MembershipService } from '../membership/membership.service';

function dec(v: Prisma.Decimal | number | string | null | undefined): string {
  if (v == null) return '0';
  return String(v);
}

function startOfTodayUtcPlus9(): Date {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  return new Date(Date.UTC(y, m, d) - 9 * 60 * 60 * 1000);
}

@Injectable()
export class AdminOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coinSupply: AdminCoinSupplyService,
    private readonly membership: MembershipService,
  ) {}

  async getDashboard(): Promise<AdminDashboardDto> {
    const today = startOfTodayUtcPlus9();
    const [
      totalMembers,
      todaySignups,
      activeJoins,
      todayCreatedJoins,
      openDisputes,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.join.count({
        where: { status: { in: [JoinStatus.OPEN, JoinStatus.FULL] as never[] } },
      }),
      this.prisma.join.count({ where: { createdAt: { gte: today } } }),
      this.prisma.disputeCase.count({
        where: {
          status: {
            in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] as never[],
          },
        },
      }),
    ]);

    let totalIssued: string | null = null;
    let currentSupply: string | null = null;
    let totalAvailable: string | null = null;
    let totalHeld: string | null = null;
    let coinIdentityOk: boolean | null = null;
    try {
      const supply = await this.coinSupply.getDashboard({ excludeDevSeed: false });
      totalIssued = supply.kpi.totalIssued;
      currentSupply = supply.kpi.currentSupply;
      totalAvailable = supply.kpi.totalAvailable;
      totalHeld = supply.kpi.totalHeld;
      coinIdentityOk = supply.kpi.identityOk;
    } catch {
      // Coin books unavailable — surface nulls, never fake numbers.
    }

    return {
      totalMembers,
      todaySignups,
      activeJoins,
      todayCreatedJoins,
      openDisputes,
      totalIssued,
      currentSupply,
      totalAvailable,
      totalHeld,
      coinIdentityOk,
    };
  }

  async listMembers(query: {
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminPageResult<AdminMemberListItemDto>> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 50);
    const q = query.q?.trim();

    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { id: q },
            { profile: { nickname: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          profile: true,
          socialAccounts: { select: { provider: true } },
          wallets: true,
        },
      }),
    ]);

    const itemsBase = rows.map((u) => {
      const available = u.wallets.reduce((s, w) => s + Number(w.availableBalance), 0);
      const held = u.wallets.reduce((s, w) => s + Number(w.heldBalance), 0);
      const providers = [
        ...new Set(u.socialAccounts.map((a) => a.provider as SocialProvider)),
      ];
      return {
        userId: u.id,
        nickname: u.profile?.nickname ?? null,
        createdAt: u.createdAt.toISOString(),
        accountStatus: u.status,
        identityStatus: u.identityStatus as IdentityStatus,
        socialProviders: providers,
        availableCoin: String(available),
        heldCoin: String(held),
      };
    });

    const membershipMap = await this.membership.resolvePlanCodesForUsers(
      itemsBase.map((i) => i.userId),
    );

    const items: AdminMemberListItemDto[] = itemsBase.map((i) => {
      const m = membershipMap.get(i.userId);
      return {
        ...i,
        membershipPlanCode: m?.planCode ?? 'FREE',
        membershipCancelAtPeriodEnd: m?.cancelAtPeriodEnd ?? false,
      };
    });

    return { items, page, pageSize, total };
  }

  async getMember(userId: string): Promise<AdminMemberDetailDto> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        socialAccounts: {
          select: { provider: true, linkedAt: true },
          orderBy: { linkedAt: 'asc' },
        },
        wallets: true,
        _count: {
          select: { hostedJoins: true, participations: true },
        },
      },
    });
    if (!u) throw new NotFoundException('member_not_found');

    const available = u.wallets.reduce((s, w) => s + Number(w.availableBalance), 0);
    const held = u.wallets.reduce((s, w) => s + Number(w.heldBalance), 0);

    return {
      userId: u.id,
      nickname: u.profile?.nickname ?? null,
      regionLabel: u.profile?.regionLabel ?? null,
      bio: u.profile?.bio ?? null,
      gender: u.profile?.gender ?? null,
      ageBand: u.profile?.ageBand ?? null,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      accountStatus: u.status,
      identityStatus: u.identityStatus as IdentityStatus,
      socialLinks: u.socialAccounts.map((a) => ({
        provider: a.provider as SocialProvider,
        linkedAt: a.linkedAt.toISOString(),
      })),
      availableCoin: String(available),
      heldCoin: String(held),
      hostedJoinCount: u._count.hostedJoins,
      participatedJoinCount: u._count.participations,
      membership: await this.membership.getUserMembershipDto(userId),
    };
  }

  async listJoins(query: {
    q?: string;
    status?: JoinStatus;
    page?: number;
    pageSize?: number;
  }): Promise<AdminPageResult<AdminJoinListItemDto>> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 50);
    const q = query.q?.trim();

    const where: Prisma.JoinWhereInput = {
      ...(query.status ? { status: query.status as never } : {}),
      ...(q
        ? {
            OR: [
              { id: q },
              { venue: { name: { contains: q, mode: 'insensitive' } } },
              { host: { profile: { nickname: { contains: q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.join.count({ where }),
      this.prisma.join.findMany({
        where,
        orderBy: { startAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          venue: true,
          host: { include: { profile: true } },
          disputes: {
            where: {
              status: {
                in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] as never[],
              },
            },
            select: { id: true },
          },
        },
      }),
    ]);

    const items: AdminJoinListItemDto[] = rows.map((j) => ({
      joinId: j.id,
      venueName: j.venue.name,
      hostNickname: j.host.profile?.nickname ?? null,
      hostUserId: j.hostUserId,
      startAt: j.startAt.toISOString(),
      status: j.status as JoinStatus,
      plannedPlayerCount: j.plannedPlayerCount,
      confirmedPlayerCount: j.confirmedPlayerCount,
      rewardPerParticipant: dec(j.rewardPerParticipant),
      rewardHoldTotalAmount: dec(j.rewardHoldTotalAmount),
      roomCreationFeeAmount: dec(j.roomCreationFeeAmount),
      openDisputeCount: j.disputes.length,
    }));

    return { items, page, pageSize, total };
  }

  async getJoin(joinId: string): Promise<AdminJoinDetailDto> {
    const j = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: {
        venue: true,
        host: { include: { profile: true } },
        participants: {
          include: {
            user: { include: { profile: true } },
            settlement: true,
          },
          orderBy: { appliedAt: 'asc' },
        },
        holds: true,
        disputes: { orderBy: { openedAt: 'desc' } },
      },
    });
    if (!j) throw new NotFoundException('join_not_found');

    return {
      joinId: j.id,
      title: j.title,
      description: j.description,
      status: j.status as JoinStatus,
      startAt: j.startAt.toISOString(),
      scheduledEndAt: j.scheduledEndAt.toISOString(),
      plannedPlayerCount: j.plannedPlayerCount,
      confirmedPlayerCount: j.confirmedPlayerCount,
      rewardPerParticipant: dec(j.rewardPerParticipant),
      rewardHoldTotalAmount: dec(j.rewardHoldTotalAmount),
      roomCreationFeeAmount: dec(j.roomCreationFeeAmount),
      venue: {
        venueId: j.venue.id,
        name: j.venue.name,
        address: j.venue.address,
        provider: j.venue.provider,
      },
      host: {
        userId: j.hostUserId,
        nickname: j.host.profile?.nickname ?? null,
      },
      participants: j.participants.map((p) => ({
        participantId: p.id,
        userId: p.userId,
        nickname: p.user.profile?.nickname ?? null,
        role: p.role,
        participationStatus: p.participationStatus,
        rewardStatus: p.settlement?.rewardStatus ?? null,
        rewardAmount: p.settlement ? dec(p.settlement.amount) : null,
      })),
      holds: j.holds.map((h) => ({
        holdId: h.id,
        status: h.status,
        amount: dec(h.amount),
      })),
      disputes: j.disputes.map((d) => ({
        disputeId: d.id,
        status: d.status as DisputeStatus,
        reasonType: d.reasonType,
        openedAt: d.openedAt.toISOString(),
      })),
    };
  }

  async listVenues(query: {
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminPageResult<AdminVenueListItemDto>> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 50);
    const q = query.q?.trim();

    const where: Prisma.VenueWhereInput = q
      ? {
          OR: [
            { id: q },
            { name: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
            { providerPlaceId: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, rows] = await Promise.all([
      this.prisma.venue.count({ where }),
      this.prisma.venue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { joins: true } },
          joins: {
            where: { status: { in: [JoinStatus.OPEN, JoinStatus.FULL] as never[] } },
            select: { id: true },
          },
        },
      }),
    ]);

    const items: AdminVenueListItemDto[] = rows.map((v) => ({
      venueId: v.id,
      name: v.name,
      provider: v.provider,
      providerPlaceId: v.providerPlaceId,
      address: v.address,
      region: v.region,
      latitude: dec(v.latitude),
      longitude: dec(v.longitude),
      joinCount: v._count.joins,
      openJoinCount: v.joins.length,
      createdAt: v.createdAt.toISOString(),
    }));

    return { items, page, pageSize, total };
  }

  async getVenue(venueId: string): Promise<AdminVenueDetailDto> {
    const v = await this.prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        _count: { select: { joins: true } },
        joins: {
          orderBy: { startAt: 'desc' },
          take: 20,
          include: { host: { include: { profile: true } } },
        },
      },
    });
    if (!v) throw new NotFoundException('venue_not_found');

    const openJoinCount = v.joins.filter(
      (j) => j.status === JoinStatus.OPEN || j.status === JoinStatus.FULL,
    ).length;

    return {
      venueId: v.id,
      name: v.name,
      provider: v.provider,
      providerPlaceId: v.providerPlaceId,
      address: v.address,
      roadAddress: v.roadAddress,
      phone: v.phone,
      region: v.region,
      latitude: dec(v.latitude),
      longitude: dec(v.longitude),
      golfFacilityId: v.golfFacilityId,
      joinCount: v._count.joins,
      openJoinCount,
      createdAt: v.createdAt.toISOString(),
      recentJoins: v.joins.map((j) => ({
        joinId: j.id,
        status: j.status as JoinStatus,
        startAt: j.startAt.toISOString(),
        hostNickname: j.host.profile?.nickname ?? null,
      })),
    };
  }

  async listAuditEvents(query: {
    limit?: number;
  }): Promise<{ items: AdminAuditEventDto[] }> {
    const limit = Math.min(Math.max(query.limit ?? 40, 1), 100);

    const [issuances, resolutions, membershipAudits] = await Promise.all([
      this.prisma.coinIssuance.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: { include: { profile: true } },
          createdBy: { include: { profile: true } },
        },
      }),
      this.prisma.disputeCase.findMany({
        where: { resolvedAt: { not: null } },
        orderBy: { resolvedAt: 'desc' },
        take: limit,
        include: {
          resolvedByAdmin: { include: { profile: true } },
        },
      }),
      this.prisma.subscriptionAuditEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          actor: { include: { profile: true } },
          subscription: {
            include: {
              user: { include: { profile: true } },
              plan: true,
            },
          },
        },
      }),
    ]);

    const coinEvents: AdminAuditEventDto[] = issuances.map((i) => ({
      eventId: `coin:${i.id}`,
      kind: 'COIN_ISSUANCE',
      at: i.createdAt.toISOString(),
      actorUserId: i.createdByUserId,
      actorLabel: i.createdBy?.profile?.nickname ?? i.createdByUserId ?? 'system',
      summary: `Coin ${i.issuanceType} ${dec(i.amount)} → ${i.user.profile?.nickname ?? i.userId}`,
      targetType: 'CoinIssuance',
      targetId: i.id,
      reason: i.reason,
    }));

    const disputeEvents: AdminAuditEventDto[] = resolutions.map((d) => ({
      eventId: `dispute:${d.id}`,
      kind: 'DISPUTE_RESOLUTION',
      at: (d.resolvedAt ?? d.updatedAt).toISOString(),
      actorUserId: d.resolvedByAdminUserId,
      actorLabel:
        d.resolvedByAdmin?.profile?.nickname ??
        d.resolvedByAdminUserId ??
        'admin',
      summary: `Dispute ${d.resolution ?? 'RESOLVED'} (${d.reasonType})`,
      targetType: 'DisputeCase',
      targetId: d.id,
      reason: d.adminNote,
    }));

    const membershipEvents: AdminAuditEventDto[] = membershipAudits.map((e) => ({
      eventId: `membership:${e.id}`,
      kind: 'MEMBERSHIP',
      at: e.createdAt.toISOString(),
      actorUserId: e.actorUserId,
      actorLabel: e.actor?.profile?.nickname ?? e.actorUserId ?? 'system',
      summary: `${e.action} · ${e.subscription.plan.code} → ${e.subscription.user.profile?.nickname ?? e.subscription.userId}`,
      targetType: 'Subscription',
      targetId: e.subscriptionId,
      reason: e.reason,
    }));

    const items = [...coinEvents, ...disputeEvents, ...membershipEvents]
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, limit);

    return { items };
  }
}
