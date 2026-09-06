import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
} from '@prisma/client';
import {
  SCREEN_GOLF_DURATION_RULE,
  WAITLIST_OFFER_TTL_MINUTES,
  canAcceptWaitlistOffer,
  canDirectJoinGenderSlot,
  canDirectJoinGeneralCapacity,
  canJoinWaitlistForGender,
  canJoinWaitlistGeneral,
  computeWaitlistOfferExpiresAt,
  computeWaitlistPosition,
  countAvailablePromotionSlots,
  countOccupiedJoinSlots,
  isBlockingWaitlistReapplyStatus,
  isJoinWaitlistJoinable,
  isWaitlistActiveStatus,
  nextJoinStatusAfterRoster,
  selectNextWaitlistOffers,
  computeConfirmedPlayerCount,
  type MatchingGender,
  type WaitlistParticipantRow,
  estimateEndAt,
} from '@jjoin/domain';
import type { JoinDetailDto, JoinWaitlistResponse } from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';
import { UserAccountService } from '../users/user-account.service';
import { NotificationEventService } from '../notifications/notification-event.service';
import { SettlementService } from '../settlement/settlement.service';
import { JoinsService } from './joins.service';
import { MatchingJoinsService } from './matching-joins.service';
import { JoinChatService } from '../join-loop/join-chat.service';

type JoinWithParticipants = {
  id: string;
  hostUserId: string;
  joinKind: string;
  status: string;
  plannedPlayerCount: number;
  confirmedPlayerCount: number;
  startAt: Date;
  scheduledEndAt: Date;
  recruitClosesAt: Date | null;
  targetMaleCount: number | null;
  targetFemaleCount: number | null;
  rewardPerParticipant: Prisma.Decimal;
  coinAssetId: string;
  participants: Array<{
    id: string;
    userId: string;
    role: string;
    participationStatus: string;
    appliedAt: Date;
    offeredAt: Date | null;
    offerExpiresAt: Date | null;
    user: { profile: { gender: string | null; nickname: string | null } | null };
  }>;
};

const ACTIVE_PARTICIPANT_STATUSES = [
  'APPLIED',
  'APPROVED',
  'CONFIRMED',
] as const;

@Injectable()
export class JoinWaitlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: UserAccountService,
    private readonly notifications: NotificationEventService,
    private readonly settlement: SettlementService,
    @Inject(forwardRef(() => JoinsService))
    private readonly joins: JoinsService,
    @Inject(forwardRef(() => MatchingJoinsService))
    private readonly matchingJoins: MatchingJoinsService,
    @Inject(forwardRef(() => JoinChatService))
    private readonly joinChat: JoinChatService,
  ) {}

  async joinWaitlist(joinId: string, userId: string): Promise<JoinDetailDto> {
    await this.accounts.assertIdentityVerified(userId, 'APPLY_JOIN');

    const applicant = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    const applicantGender = (applicant?.profile?.gender ?? null) as MatchingGender | null;

    await this.prisma.$transaction(async (tx) => {
      await this.lockJoinRow(tx, joinId);
      const join = await this.loadJoin(tx, joinId);
      this.assertWaitlistJoinable(join, userId);

      const useGender =
        join.joinKind === 'STORE_MATCHING' &&
        ((join.targetMaleCount ?? 0) > 0 || (join.targetFemaleCount ?? 0) > 0);

      if (useGender && !applicantGender) {
        throw new BadRequestException({
          code: 'GENDER_REQUIRED',
          message: '대기 신청하려면 프로필에서 성별을 설정해주세요.',
        });
      }

      const rosterParticipants = this.toRosterRows(join.participants);
      const capacityRows = this.toCapacityRows(join.participants);
      const canDirect = useGender
        ? canDirectJoinGenderSlot({
            applicantGender: applicantGender!,
            targetMaleCount: join.targetMaleCount ?? 0,
            targetFemaleCount: join.targetFemaleCount ?? 0,
            participants: rosterParticipants,
          })
        : canDirectJoinGeneralCapacity({
            plannedPlayerCount: join.plannedPlayerCount,
            participants: capacityRows,
          });

      if (canDirect) {
        throw new BadRequestException({
          code: 'WAITLIST_NOT_NEEDED',
          message: '자리가 있어 일반 참가가 가능합니다.',
        });
      }

      const waitlistAllowed = useGender
        ? canJoinWaitlistForGender({
            applicantGender: applicantGender!,
            targetMaleCount: join.targetMaleCount ?? 0,
            targetFemaleCount: join.targetFemaleCount ?? 0,
            plannedPlayerCount: join.plannedPlayerCount,
            participants: rosterParticipants,
          })
        : canJoinWaitlistGeneral({
            plannedPlayerCount: join.plannedPlayerCount,
            participants: capacityRows,
          });

      if (!waitlistAllowed) {
        throw new BadRequestException('waitlist_not_available');
      }

      const existing = join.participants.find((p) => p.userId === userId);
      if (existing) {
        if (isBlockingWaitlistReapplyStatus(existing.participationStatus)) {
          throw new ConflictException('already_waitlisted');
        }
        if (
          (ACTIVE_PARTICIPANT_STATUSES as readonly string[]).includes(
            existing.participationStatus,
          )
        ) {
          throw new ConflictException('already_participant');
        }
      }

      const now = new Date();
      if (existing) {
        await tx.joinParticipant.update({
          where: { id: existing.id },
          data: {
            participationStatus: 'WAITLISTED',
            appliedAt: now,
            approvedAt: null,
            confirmedAt: null,
            cancelledAt: null,
            offeredAt: null,
            offerExpiresAt: null,
          },
        });
      } else {
        try {
          await tx.joinParticipant.create({
            data: {
              joinId,
              userId,
              role: 'PARTICIPANT',
              participationStatus: 'WAITLISTED',
              appliedAt: now,
            },
          });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            throw new ConflictException('already_waitlisted');
          }
          throw e;
        }
      }
    });

    return this.joins.getDetail(joinId, userId);
  }

  async cancelWaitlist(joinId: string, userId: string): Promise<JoinDetailDto> {
    let shouldPromote = false;

    await this.prisma.$transaction(async (tx) => {
      await this.lockJoinRow(tx, joinId);
      const join = await this.loadJoin(tx, joinId);
      const mine = join.participants.find((p) => p.userId === userId);
      if (!mine) throw new NotFoundException('waitlist_not_found');
      if (mine.role === 'HOST') throw new ForbiddenException('host_cannot_cancel_waitlist');
      if (!isWaitlistActiveStatus(mine.participationStatus)) {
        throw new BadRequestException('not_on_waitlist');
      }

      const wasOffered = mine.participationStatus === 'OFFERED';
      await tx.joinParticipant.update({
        where: { id: mine.id },
        data: {
          participationStatus: 'CANCELLED',
          cancelledAt: new Date(),
          offeredAt: null,
          offerExpiresAt: null,
        },
      });
      shouldPromote = wasOffered;
    });

    if (shouldPromote) {
      await this.processWaitlistForJoin(joinId);
    }

    return this.joins.getDetail(joinId, userId);
  }

  async acceptWaitlistOffer(joinId: string, userId: string): Promise<JoinDetailDto> {
    await this.accounts.assertIdentityVerified(userId, 'APPLY_JOIN');

    const promotedUserId = userId;

    await this.prisma.$transaction(async (tx) => {
      await this.lockJoinRow(tx, joinId);
      const join = await this.loadJoin(tx, joinId);
      const mine = join.participants.find((p) => p.userId === userId);
      if (!mine) throw new NotFoundException('waitlist_not_found');
      if (mine.participationStatus !== 'OFFERED') {
        if (
          mine.participationStatus === 'APPROVED' ||
          mine.participationStatus === 'CONFIRMED'
        ) {
          return;
        }
        throw new BadRequestException('no_active_offer');
      }

      const now = new Date();
      const acceptCheck = canAcceptWaitlistOffer({
        status: mine.participationStatus,
        offerExpiresAt: mine.offerExpiresAt,
        joinStatus: join.status,
        recruitClosesAt: join.recruitClosesAt,
        now,
      });
      if (!acceptCheck.ok) {
        throw new BadRequestException(acceptCheck.reason);
      }

      const useGender =
        join.joinKind === 'STORE_MATCHING' &&
        ((join.targetMaleCount ?? 0) > 0 || (join.targetFemaleCount ?? 0) > 0);

      const projectedParticipants = join.participants.map((p) =>
        p.id === mine.id ? { ...p, participationStatus: 'APPROVED' } : p,
      );
      const rosterRows = useGender
        ? this.toRosterRows(projectedParticipants)
        : this.toCapacityRows(projectedParticipants);

      if (useGender) {
        if (mine.participationStatus !== 'OFFERED') {
          const gender = (mine.user.profile?.gender ?? null) as MatchingGender | null;
          if (
            !gender ||
            !canDirectJoinGenderSlot({
              applicantGender: gender,
              targetMaleCount: join.targetMaleCount ?? 0,
              targetFemaleCount: join.targetFemaleCount ?? 0,
              participants: rosterRows,
            })
          ) {
            throw new ConflictException('seat_no_longer_available');
          }
        }
      } else if (mine.participationStatus === 'OFFERED') {
        const afterOccupied = countOccupiedJoinSlots(this.toCapacityRows(projectedParticipants));
        if (afterOccupied > join.plannedPlayerCount) {
          throw new ConflictException('seat_no_longer_available');
        }
      } else if (
        !canDirectJoinGeneralCapacity({
          plannedPlayerCount: join.plannedPlayerCount,
          participants: rosterRows,
        })
      ) {
        throw new ConflictException('seat_no_longer_available');
      }

      const nowIso = now;
      if (join.joinKind === 'STORE_MATCHING') {
        const promoted = await tx.joinParticipant.updateMany({
          where: {
            id: mine.id,
            participationStatus: 'OFFERED',
            offerExpiresAt: { gt: now },
          },
          data: {
            participationStatus: 'APPROVED',
            approvedAt: nowIso,
            confirmedAt: nowIso,
            offeredAt: null,
            offerExpiresAt: null,
            cancelledAt: null,
          },
        });
        if (promoted.count !== 1) {
          throw new ConflictException('seat_no_longer_available');
        }

        const rosterCount = this.matchingJoins.countMatchingParticipants(
          join.participants
            .filter((p) => p.role !== 'HOST')
            .map((p) => ({
              role: p.role,
              participationStatus: p.id === mine.id ? 'APPROVED' : p.participationStatus,
            })),
        );

        const scheduledEndAt = estimateEndAt({
          startAt: join.startAt,
          playerCount: Math.max(rosterCount, 1),
          rule: SCREEN_GOLF_DURATION_RULE,
        });
        const nextStatus = nextJoinStatusAfterRoster({
          currentStatus: join.status,
          confirmedPlayerCount: rosterCount,
          plannedPlayerCount: join.plannedPlayerCount,
        });

        await tx.join.update({
          where: { id: joinId },
          data: {
            confirmedPlayerCount: rosterCount,
            scheduledEndAt,
            status: nextStatus as never,
          },
        });

        await this.settlement.ensureSettlementOnApprove(tx, {
          joinId,
          participantId: mine.id,
          scheduledEndAt,
          rewardPerParticipant: join.rewardPerParticipant,
          coinAssetId: join.coinAssetId,
        });

        const settlement = await tx.rewardSettlement.findUnique({
          where: { joinParticipantId: mine.id },
        });
        if (settlement?.rewardStatus === 'NOT_ELIGIBLE') {
          await tx.rewardSettlement.update({
            where: { id: settlement.id },
            data: {
              rewardStatus: 'HELD',
              heldAt: nowIso,
              refundedAt: null,
              settlementAvailableAt: scheduledEndAt,
            },
          });
        }
      } else {
        const occupied = countOccupiedJoinSlots(this.toCapacityRows(projectedParticipants));
        if (occupied > join.plannedPlayerCount) {
          throw new ConflictException('seat_no_longer_available');
        }

        const promoted = await tx.joinParticipant.updateMany({
          where: {
            id: mine.id,
            participationStatus: 'OFFERED',
            offerExpiresAt: { gt: now },
          },
          data: {
            participationStatus: 'APPROVED',
            approvedAt: nowIso,
            offeredAt: null,
            offerExpiresAt: null,
            cancelledAt: null,
          },
        });
        if (promoted.count !== 1) {
          throw new ConflictException('seat_no_longer_available');
        }

        const confirmed = computeConfirmedPlayerCount(
          projectedParticipants.map((p) => p.participationStatus),
        );

        const scheduledEndAt = estimateEndAt({
          startAt: join.startAt,
          playerCount: Math.max(confirmed, 1),
          rule: SCREEN_GOLF_DURATION_RULE,
        });
        const nextStatus = nextJoinStatusAfterRoster({
          currentStatus: join.status,
          confirmedPlayerCount: confirmed,
          plannedPlayerCount: join.plannedPlayerCount,
        });

        await tx.join.update({
          where: { id: joinId },
          data: {
            confirmedPlayerCount: confirmed,
            scheduledEndAt,
            status: nextStatus as never,
          },
        });

        await this.settlement.ensureSettlementOnApprove(tx, {
          joinId,
          participantId: mine.id,
          scheduledEndAt,
          rewardPerParticipant: join.rewardPerParticipant,
          coinAssetId: join.coinAssetId,
        });
      }
    });

    await this.notifications.enqueueSafe({
      userId: promotedUserId,
      type: NotificationType.WAITLIST_PROMOTED,
      title: '참가 확정',
      body: '대기열 참가가 확정되었습니다.',
      data: {
        type: NotificationType.WAITLIST_PROMOTED,
        joinId,
      },
      eventKey: `join:${joinId}:waitlist:${promotedUserId}:promoted`,
    });

    void this.joinChat.ensureRoomForJoin(joinId).then(() =>
      this.joinChat.onMemberJoined(joinId, promotedUserId),
    );

    return this.joins.getDetail(joinId, userId);
  }

  async listForHost(joinId: string, hostUserId: string): Promise<JoinWaitlistResponse> {
    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: {
        participants: {
          where: {
            participationStatus: { in: ['WAITLISTED', 'OFFERED'] },
          },
          include: { user: { include: { profile: true } } },
          orderBy: { appliedAt: 'asc' },
        },
      },
    });
    if (!join) throw new NotFoundException('join_not_found');
    if (join.hostUserId !== hostUserId) {
      throw new ForbiddenException('not_join_host');
    }

    const waitRows: WaitlistParticipantRow[] = join.participants.map((p) => ({
      participantId: p.id,
      userId: p.userId,
      participationStatus: p.participationStatus,
      appliedAt: p.appliedAt,
      gender: (p.user.profile?.gender ?? null) as MatchingGender | null,
    }));

    const items = join.participants.map((p) => ({
      participantId: p.id,
      userId: p.userId,
      nickname: p.user.profile?.nickname ?? '참가자',
      participationStatus: p.participationStatus as never,
      waitlistPosition:
        p.participationStatus === 'WAITLISTED'
          ? computeWaitlistPosition(waitRows, p.id) ?? 0
          : computeWaitlistPosition(
              waitRows.filter((w) => w.participationStatus === 'WAITLISTED'),
              p.id,
            ) ?? 0,
      appliedAt: p.appliedAt.toISOString(),
      offeredAt: p.offeredAt?.toISOString() ?? null,
      offerExpiresAt: p.offerExpiresAt?.toISOString() ?? null,
      gender: (p.user.profile?.gender as JoinWaitlistResponse['items'][0]['gender']) ?? null,
    }));

    return { items, total: items.length };
  }

  /** SSOT — offer next waitlisted users after seat release or offer expiry/cancel. */
  async processWaitlistForJoin(joinId: string): Promise<string[]> {
    const offeredUserIds: string[] = [];
    const pendingOfferNotifications: Array<{
      userId: string;
      participantId: string;
      offeredAt: Date;
    }> = [];
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await this.lockJoinRow(tx, joinId);
      const join = await this.loadJoin(tx, joinId);
      if (!isJoinWaitlistJoinable({
        status: join.status,
        recruitClosesAt: join.recruitClosesAt,
        now,
      })) {
        return;
      }

      const useGender =
        join.joinKind === 'STORE_MATCHING' &&
        ((join.targetMaleCount ?? 0) > 0 || (join.targetFemaleCount ?? 0) > 0);

      const waitlisted: WaitlistParticipantRow[] = join.participants
        .filter((p) => p.role !== 'HOST')
        .map((p) => ({
          participantId: p.id,
          userId: p.userId,
          participationStatus: p.participationStatus,
          appliedAt: p.appliedAt,
          gender: (p.user.profile?.gender ?? null) as MatchingGender | null,
        }));

      const rosterRows = useGender
        ? this.toRosterRows(join.participants)
        : this.toCapacityRows(join.participants);
      const maxOffers = countAvailablePromotionSlots({
        plannedPlayerCount: join.plannedPlayerCount,
        participants: rosterRows,
        targetMaleCount: join.targetMaleCount ?? 0,
        targetFemaleCount: join.targetFemaleCount ?? 0,
        useGenderSlots: useGender,
      });

      if (maxOffers <= 0) return;

      const toOffer = selectNextWaitlistOffers({
        waitlisted,
        participants: rosterRows,
        plannedPlayerCount: join.plannedPlayerCount,
        targetMaleCount: join.targetMaleCount ?? 0,
        targetFemaleCount: join.targetFemaleCount ?? 0,
        useGenderSlots: useGender,
        maxOffers,
      });

      for (const candidate of toOffer) {
        const offeredAt = now;
        const offerExpiresAt = computeWaitlistOfferExpiresAt(offeredAt);
        const updated = await tx.joinParticipant.updateMany({
          where: {
            id: candidate.participantId,
            participationStatus: 'WAITLISTED',
          },
          data: {
            participationStatus: 'OFFERED',
            offeredAt,
            offerExpiresAt,
          },
        });
        if (updated.count === 1) {
          offeredUserIds.push(candidate.userId);
          pendingOfferNotifications.push({
            userId: candidate.userId,
            participantId: candidate.participantId,
            offeredAt,
          });
        }
      }
    });

    for (const pending of pendingOfferNotifications) {
      await this.notifications.enqueueSafe({
        userId: pending.userId,
        type: NotificationType.WAITLIST_OFFERED,
        title: '자리가 났어요',
        body: `${WAITLIST_OFFER_TTL_MINUTES}분 안에 참가를 확정해 주세요.`,
        data: {
          type: NotificationType.WAITLIST_OFFERED,
          joinId,
        },
        eventKey: `join:${joinId}:waitlist-offer:${pending.participantId}:${pending.offeredAt.getTime()}`,
      });
    }

    return offeredUserIds;
  }

  /** DEV/mock QA — set OFFERED participant offerExpiresAt to the past (worker E2E). */
  async qaExpireWaitlistOffer(
    joinId: string,
    actorUserId: string,
    targetUserId?: string,
  ): Promise<{ ok: true; participantId: string }> {
    const join = await this.loadJoin(this.prisma, joinId);
    const targetId = targetUserId ?? actorUserId;
    const target = join.participants.find((p) => p.userId === targetId);
    if (!target) throw new NotFoundException('waitlist_not_found');
    if (target.participationStatus !== 'OFFERED') {
      throw new BadRequestException('no_active_offer');
    }
    const isHost = join.hostUserId === actorUserId;
    if (!isHost && actorUserId !== targetId) {
      throw new ForbiddenException('forbidden');
    }

    const expiredAt = new Date(Date.now() - 60_000);
    await this.prisma.joinParticipant.update({
      where: { id: target.id },
      data: { offerExpiresAt: expiredAt },
    });
    return { ok: true, participantId: target.id };
  }

  async processExpiredOffers(limit = 50): Promise<{
    expiredCount: number;
    promotedJoinIds: string[];
  }> {
    const now = new Date();
    const expired = await this.prisma.joinParticipant.findMany({
      where: {
        participationStatus: 'OFFERED',
        offerExpiresAt: { lte: now },
      },
      take: limit,
      orderBy: { offerExpiresAt: 'asc' },
      select: { id: true, joinId: true },
    });

    const joinIds = new Set<string>();
    let expiredCount = 0;

    for (const row of expired) {
      const updated = await this.prisma.joinParticipant.updateMany({
        where: {
          id: row.id,
          participationStatus: 'OFFERED',
          offerExpiresAt: { lte: now },
        },
        data: {
          participationStatus: 'WAITLIST_EXPIRED',
          offeredAt: null,
          offerExpiresAt: null,
        },
      });
      if (updated.count === 1) {
        expiredCount += 1;
        joinIds.add(row.joinId);
      }
    }

    const promotedJoinIds: string[] = [];
    for (const joinId of joinIds) {
      await this.processWaitlistForJoin(joinId);
      promotedJoinIds.push(joinId);
    }

    return { expiredCount, promotedJoinIds };
  }

  async terminalizeForJoinCancel(joinId: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.joinParticipant.updateMany({
      where: {
        joinId,
        participationStatus: { in: ['WAITLISTED', 'OFFERED'] },
      },
      data: {
        participationStatus: 'CANCELLED',
        cancelledAt: new Date(),
        offeredAt: null,
        offerExpiresAt: null,
      },
    });
  }

  computeWaitlistExtras(
    join: JoinWithParticipants,
    _viewerUserId: string | null,
    isHost: boolean,
  ): { waitlistAvailable: boolean; waitlistCount: number | null } {
    const now = new Date();
    const rosterRows = this.toCapacityRows(join.participants);
    const joinable = isJoinWaitlistJoinable({
      status: join.status,
      recruitClosesAt: join.recruitClosesAt,
      now,
    });

    const generalFull = !canDirectJoinGeneralCapacity({
      plannedPlayerCount: join.plannedPlayerCount,
      participants: rosterRows,
    });

    const waitlistAvailable =
      joinable &&
      generalFull &&
      (join.status === 'FULL' || generalFull);

    const waitlistCount = isHost
      ? join.participants.filter((p) =>
          p.role !== 'HOST' && isWaitlistActiveStatus(p.participationStatus),
        ).length
      : null;

    return { waitlistAvailable, waitlistCount };
  }

  enrichParticipantWaitlistPosition(
    participants: Array<{ id: string; participationStatus: string; appliedAt: Date }>,
    participantId: string,
    status: string,
  ): number | null {
    if (status !== 'WAITLISTED') return null;
    const waitRows: WaitlistParticipantRow[] = participants
      .filter((p) => p.participationStatus === 'WAITLISTED')
      .map((p) => ({
        participantId: p.id,
        userId: '',
        participationStatus: p.participationStatus,
        appliedAt: p.appliedAt,
      }));
    return computeWaitlistPosition(waitRows, participantId);
  }

  private assertWaitlistJoinable(join: JoinWithParticipants, userId: string): void {
    if (join.hostUserId === userId) {
      throw new ForbiddenException('host_cannot_waitlist');
    }
    const now = new Date();
    if (!isJoinWaitlistJoinable({
      status: join.status,
      recruitClosesAt: join.recruitClosesAt,
      now,
    })) {
      throw new BadRequestException('join_not_joinable');
    }
    if (join.joinKind === 'STORE_MATCHING' && !this.matchingJoins.isStoreMatchingJoinable(join)) {
      throw new BadRequestException('join_not_joinable');
    }
  }

  /** Serialize join capacity mutations (direct join vs waitlist accept). */
  async lockJoinRowForCapacity(tx: Prisma.TransactionClient, joinId: string): Promise<void> {
    await this.lockJoinRow(tx, joinId);
  }

  private async lockJoinRow(tx: Prisma.TransactionClient, joinId: string): Promise<void> {
    await tx.$queryRaw`
      SELECT id FROM joins WHERE id = CAST(${joinId} AS uuid) FOR UPDATE
    `;
  }

  private async loadJoin(
    tx: Prisma.TransactionClient,
    joinId: string,
  ): Promise<JoinWithParticipants> {
    const join = await tx.join.findUnique({
      where: { id: joinId },
      include: {
        participants: {
          include: { user: { include: { profile: true } } },
        },
      },
    });
    if (!join) throw new NotFoundException('join_not_found');
    return join;
  }

  private toCapacityRows(
    participants: JoinWithParticipants['participants'],
  ): Array<{ role: string; participationStatus: string; gender?: MatchingGender | null }> {
    return participants.map((p) => ({
      role: p.role,
      participationStatus: p.participationStatus,
      gender: (p.user.profile?.gender ?? null) as MatchingGender | null,
    }));
  }

  private toRosterRows(
    participants: JoinWithParticipants['participants'],
  ): Array<{ role: string; participationStatus: string; gender?: MatchingGender | null }> {
    return participants
      .filter((p) => p.role !== 'HOST')
      .map((p) => ({
        role: p.role,
        participationStatus: p.participationStatus,
        gender: (p.user.profile?.gender ?? null) as MatchingGender | null,
      }));
  }
}
