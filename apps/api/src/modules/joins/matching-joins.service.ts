import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  JoinStatus,
  type CreateStoreMatchingJoinRequest,
  type JoinDetailDto,
  type JoinListItemDto,
  type StoreMatchingCompleteRequest,
} from '@jjoin/types';
import {
  SCREEN_GOLF_DURATION_RULE,
  assertRecruitClosesBeforeStart,
  assertValidMinimumPlayers,
  canAffordMatchingJoinCreate,
  computeMatchingJoinCoinRequirement,
  computeMatchingPlannedPlayerCount,
  countMatchingRosterByGender,
  emptyMatchingDeadlineBatchSummary,
  evaluateMatchingDeadline,
  estimateEndAt,
  resolveMatchingRewardDisposition,
  isRewardEligibleMatchingGender,
  isRewardTransferRequired,
  settlementRefundIdempotencyKey,
  settlementRowIdempotencyKey,
  settlementTransferIdempotencyKey,
  type MatchingDeadlineBatchSummary,
} from '@jjoin/domain';
import { createStoreMatchingJoinSchema, storeMatchingCompleteSchema } from '@jjoin/validation';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureFoundation } from '../../foundation/ensure-foundation';
import {
  CoinLedgerService,
  InsufficientBalanceError,
} from '../wallet/coin-ledger.service';
import { GolfFacilitiesService } from '../golf-facilities/golf-facilities.service';
import { UserAccountService } from '../users/user-account.service';
import { mockUserStore } from '../../mock/mock-user.store';
import { CoinPolicyDisabledError } from '../../coin/dev-coin-policy';
import { JoinsService } from './joins.service';
import { JoinEngagementNotifyService } from '../engagement/join-engagement-notify.service';
import { JoinChatService } from '../join-loop/join-chat.service';
import { UrgentVacancyService } from '../join-loop/urgent-vacancy.service';
import { JoinWaitlistService } from './join-waitlist.service';

const MATCHING_OPEN_STATUSES: JoinStatus[] = [JoinStatus.OPEN, JoinStatus.FULL];

@Injectable()
export class MatchingJoinsService {
  private readonly logger = new Logger(MatchingJoinsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: CoinLedgerService,
    private readonly golfFacilities: GolfFacilitiesService,
    private readonly accounts: UserAccountService,
    @Inject(forwardRef(() => JoinsService))
    private readonly joins: JoinsService,
    @Inject(forwardRef(() => JoinEngagementNotifyService))
    private readonly engagementNotify: JoinEngagementNotifyService,
    @Inject(forwardRef(() => JoinChatService))
    private readonly joinChat: JoinChatService,
    @Inject(forwardRef(() => UrgentVacancyService))
    private readonly urgentVacancy: UrgentVacancyService,
    @Inject(forwardRef(() => JoinWaitlistService))
    private readonly waitlist: JoinWaitlistService,
  ) {}

  async create(hostUserId: string, raw: CreateStoreMatchingJoinRequest): Promise<JoinDetailDto> {
    await this.accounts.assertIdentityVerified(hostUserId, 'CREATE_JOIN');
    const parsed = createStoreMatchingJoinSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException('invalid_store_matching_join');
    }
    const input = parsed.data;

    const startAt = new Date(input.startAt);
    const recruitClosesAt = new Date(input.recruitClosesAt);
    if (Number.isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
      throw new BadRequestException('start_at_must_be_future');
    }
    if (Number.isNaN(recruitClosesAt.getTime())) {
      throw new BadRequestException('invalid_recruit_closes_at');
    }
    try {
      assertRecruitClosesBeforeStart(recruitClosesAt, startAt);
      const planned = computeMatchingPlannedPlayerCount(input);
      assertValidMinimumPlayers(input.minimumPlayers, planned);
    } catch {
      throw new BadRequestException('invalid_matching_schedule');
    }

    const ownership = await this.prisma.storeOwnership.findFirst({
      where: {
        id: input.storeOwnershipId,
        userId: hostUserId,
        status: 'ACTIVE',
      },
      include: { golfFacility: true },
    });
    if (!ownership) {
      throw new ForbiddenException({
        code: 'STORE_OWNERSHIP_REQUIRED',
        message: '활성 매장 소유권이 필요합니다.',
      });
    }

    const clientIdempotencyKey = input.idempotencyKey?.trim();
    if (clientIdempotencyKey) {
      const existingHold = await this.prisma.coinTransaction.findUnique({
        where: { idempotencyKey: `store-join:${clientIdempotencyKey}:reward-hold` },
      });
      if (existingHold?.refType === 'JOIN' && existingHold.refId) {
        return this.joins.getDetail(existingHold.refId, hostUserId);
      }
    }

    const requirement = computeMatchingJoinCoinRequirement({
      targetMaleCount: input.targetMaleCount,
      targetFemaleCount: input.targetFemaleCount,
      matchingRewardTarget: input.matchingRewardTarget,
      rewardPerParticipant: input.rewardPerParticipant,
      roomCreationFee: '0',
    });

    const { sport, coinAsset } = await ensureFoundation(this.prisma);
    let venueId = ownership.venueId;
    if (!venueId) {
      const activated = await this.golfFacilities.activateVenue(
        hostUserId,
        ownership.golfFacilityId,
      );
      venueId = activated.venueId;
      await this.prisma.storeOwnership.update({
        where: { id: ownership.id },
        data: { venueId },
      });
    }

    const joinId = randomUUID();
    const idemBase = clientIdempotencyKey ?? joinId;
    const scheduledEndAt = estimateEndAt({
      startAt,
      playerCount: Math.max(requirement.plannedPlayerCount, 1),
      rule: SCREEN_GOLF_DURATION_RULE,
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        const wallet = await this.ledger.getOrCreateWallet(hostUserId, coinAsset.id, tx);
        const locked = await this.ledger.lockWallet(tx, wallet.id);
        const available = String(locked.availableBalance);
        if (!canAffordMatchingJoinCreate(available, requirement.totalRequiredCoin)) {
          throw new InsufficientBalanceError();
        }

        const recurringOccurrenceDate = input.recurringOccurrenceDate
          ? new Date(`${input.recurringOccurrenceDate}T00:00:00.000Z`)
          : undefined;

        await tx.join.create({
          data: {
            id: joinId,
            sportId: sport.id,
            venueId,
            hostUserId,
            title: input.title ?? null,
            description: input.description ?? null,
            status: 'OPEN',
            joinMethod: 'OPEN',
            joinKind: 'STORE_MATCHING',
            startAt,
            scheduledEndAt,
            recruitClosesAt,
            plannedPlayerCount: requirement.plannedPlayerCount,
            minimumPlayers: input.minimumPlayers,
            targetMaleCount: input.targetMaleCount,
            targetFemaleCount: input.targetFemaleCount,
            matchingRewardTarget: input.matchingRewardTarget,
            storeOwnershipId: ownership.id,
            ...(input.recurringScheduleId
              ? { recurringScheduleId: input.recurringScheduleId }
              : {}),
            ...(recurringOccurrenceDate
              ? { recurringOccurrenceDate }
              : {}),
            confirmedPlayerCount: 0,
            rewardPerParticipant: new Prisma.Decimal(requirement.rewardPerParticipant),
            coinAssetId: coinAsset.id,
            roomCreationFeeAmount: new Prisma.Decimal(requirement.roomCreationFee),
            rewardHoldTotalAmount: new Prisma.Decimal(requirement.rewardHoldTotal),
            participants: {
              create: {
                userId: hostUserId,
                role: 'HOST',
                participationStatus: 'APPROVED',
                approvedAt: new Date(),
              },
            },
            ...(clientIdempotencyKey
              ? {
                  options: {
                    create: {
                      optionKey: 'client_idempotency_key',
                      optionValueJson: { key: clientIdempotencyKey },
                    },
                  },
                }
              : {}),
          },
        });

        await this.ledger.applyJoinRewardHold(tx, {
          walletId: wallet.id,
          coinAssetId: coinAsset.id,
          amount: requirement.rewardHoldTotal,
          joinId,
          idempotencyKey: `store-join:${idemBase}:reward-hold`,
        });
      });
    } catch (e) {
      if (e instanceof CoinPolicyDisabledError) {
        throw new ServiceUnavailableException({
          code: e.code,
          message: '코인 정책이 아직 적용되지 않았습니다.',
        });
      }
      if (e instanceof InsufficientBalanceError) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_BALANCE',
          message: '보유 코인이 부족합니다.',
        });
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        if (clientIdempotencyKey) {
          const hold = await this.prisma.coinTransaction.findUnique({
            where: { idempotencyKey: `store-join:${clientIdempotencyKey}:reward-hold` },
          });
          if (hold?.refId) return this.joins.getDetail(hold.refId, hostUserId);
        }
        throw new ConflictException('store_join_create_conflict');
      }
      throw e;
    }

    const updated = await this.ledger.getOrCreateWallet(hostUserId, coinAsset.id);
    mockUserStore.syncWalletBalances(
      hostUserId,
      String(updated.availableBalance),
      String(updated.heldBalance),
    );

    await this.joins.ensureShareSlug(joinId);
    void this.engagementNotify.notifyNewJoinableJoin(joinId);

    return this.joins.getDetail(joinId, hostUserId);
  }

  async mine(hostUserId: string): Promise<JoinListItemDto[]> {
    await this.reconcileDueMatchingDeadlines(20);
    const rows = await this.prisma.join.findMany({
      where: { hostUserId, joinKind: 'STORE_MATCHING' },
      include: {
        venue: true,
        host: { include: { profile: true } },
        participants: { include: { user: { include: { profile: true } } } },
      },
      orderBy: { startAt: 'desc' },
    });
    return rows.map((j) => this.joins.toListItemPublic(j, hostUserId));
  }

  async cancel(joinId: string, hostUserId: string): Promise<JoinDetailDto> {
    await this.prisma.$transaction(async (tx) => {
      const join = await tx.join.findUnique({ where: { id: joinId } });
      if (!join) throw new NotFoundException('join_not_found');
      if (join.hostUserId !== hostUserId) {
        throw new ForbiddenException('not_join_host');
      }
      if (join.joinKind !== 'STORE_MATCHING') {
        throw new BadRequestException('not_store_matching_join');
      }
      if (join.status === 'CANCELLED' || join.status === 'COMPLETED') {
        return;
      }

      const hostWallet = await this.ledger.getOrCreateWallet(hostUserId, join.coinAssetId, tx);
      await this.ledger.refundRemainingJoinHold(tx, {
        hostWalletId: hostWallet.id,
        coinAssetId: join.coinAssetId,
        joinId,
        idempotencyKey: `store-join:${joinId}:cancel-hold-refund`,
      });

      await tx.joinParticipant.updateMany({
        where: {
          joinId,
          role: 'PARTICIPANT',
          participationStatus: { in: ['APPLIED', 'APPROVED', 'CONFIRMED'] },
        },
        data: { participationStatus: 'CANCELLED', cancelledAt: new Date() },
      });

      await this.waitlist.terminalizeForJoinCancel(joinId, tx);

      await tx.join.update({
        where: { id: joinId },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
    });

    const join = await this.prisma.join.findUniqueOrThrow({ where: { id: joinId } });
    const wallet = await this.ledger.getOrCreateWallet(hostUserId, join.coinAssetId);
    mockUserStore.syncWalletBalances(
      hostUserId,
      String(wallet.availableBalance),
      String(wallet.heldBalance),
    );

    void this.engagementNotify.notifyBookmarkJoinEvent(joinId, 'cancelled');
    void this.joinChat.onJoinTerminal(joinId, 'CANCELLED');

    return this.joins.getDetail(joinId, hostUserId);
  }

  async complete(
    joinId: string,
    hostUserId: string,
    raw: StoreMatchingCompleteRequest,
  ): Promise<JoinDetailDto> {
    const parsed = storeMatchingCompleteSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException('invalid_matching_complete');
    }

    await this.prisma.$transaction(async (tx) => {
      const join = await tx.join.findUnique({
        where: { id: joinId },
        include: {
          participants: {
            include: {
              settlement: true,
              user: { include: { profile: true } },
            },
          },
        },
      });
      if (!join) throw new NotFoundException('join_not_found');
      if (join.hostUserId !== hostUserId) {
        throw new ForbiddenException('not_join_host');
      }
      if (join.joinKind !== 'STORE_MATCHING') {
        throw new BadRequestException('not_store_matching_join');
      }
      if (join.status === 'COMPLETED') {
        return;
      }
      if (join.status === 'CANCELLED') {
        throw new BadRequestException('join_cancelled');
      }

      const now = new Date();
      const attendanceMap = new Map(parsed.data.attendance.map((a) => [a.participantId, a.attended]));
      const hostWallet = await this.ledger.getOrCreateWallet(hostUserId, join.coinAssetId, tx);

      for (const participant of join.participants) {
        if (participant.role === 'HOST') continue;
        if (!attendanceMap.has(participant.id)) {
          throw new BadRequestException({
            code: 'ATTENDANCE_INCOMPLETE',
            message: '모든 참가자 출석 정보가 필요합니다.',
          });
        }
      }

      const nonHost = join.participants.filter((p) => p.role !== 'HOST');
      const ensureSettlement = async (participant: (typeof nonHost)[number]) => {
        let settlement = participant.settlement;
        if (!settlement) {
          const hold = await tx.coinHold.findFirst({
            where: { joinId, status: { in: ['OPEN', 'PARTIALLY_RELEASED'] } },
          });
          settlement = await tx.rewardSettlement.create({
            data: {
              joinId,
              joinParticipantId: participant.id,
              coinAssetId: join.coinAssetId,
              amount: new Prisma.Decimal(String(join.rewardPerParticipant)),
              rewardStatus: 'HELD',
              holdId: hold?.id ?? null,
              settlementAvailableAt: join.scheduledEndAt,
              autoPayAt: join.scheduledEndAt,
              heldAt: now,
              idempotencyKey: settlementRowIdempotencyKey(participant.id),
            },
          });
          participant.settlement = settlement;
        }
        return settlement;
      };

      // Pass 1: pay attended + gender-eligible first so HOLD is not drained by ineligible refunds.
      for (const participant of nonHost) {
        const attended = attendanceMap.get(participant.id) ?? false;
        const gender = participant.user.profile?.gender ?? null;
        const rewardTarget = (join.matchingRewardTarget ?? 'ALL') as 'FEMALE' | 'MALE' | 'ALL';
        const rewardAmount = String(join.rewardPerParticipant);
        const settlement = await ensureSettlement(participant);

        if (
          settlement.rewardStatus === 'PAID' ||
          settlement.rewardStatus === 'AUTO_PAID' ||
          settlement.rewardStatus === 'REFUNDED' ||
          settlement.rewardStatus === 'NOT_ELIGIBLE'
        ) {
          continue;
        }

        if (
          resolveMatchingRewardDisposition({
            attended,
            gender,
            matchingRewardTarget: rewardTarget,
          }) !== 'PAY'
        ) {
          continue;
        }

        if (!isRewardTransferRequired(rewardAmount)) {
          await tx.rewardSettlement.update({
            where: { id: settlement.id },
            data: { rewardStatus: 'PAID', paidAt: now },
          });
          await tx.joinParticipant.update({
            where: { id: participant.id },
            data: {
              participationStatus: 'COMPLETED',
              confirmedAt: participant.confirmedAt ?? now,
            },
          });
          continue;
        }

        const participantWallet = await this.ledger.getOrCreateWallet(
          participant.userId,
          join.coinAssetId,
          tx,
        );
        await this.ledger.applyRewardTransfer(tx, {
          hostWalletId: hostWallet.id,
          participantWalletId: participantWallet.id,
          participantUserId: participant.userId,
          coinAssetId: join.coinAssetId,
          amount: rewardAmount,
          settlementId: settlement.id,
          joinId,
          idempotencyKey: settlementTransferIdempotencyKey(settlement.id),
        });
        if (settlement.holdId) {
          await this.ledger.refreshCoinHoldStatus(tx, settlement.holdId);
        }
        await tx.rewardSettlement.update({
          where: { id: settlement.id },
          data: { rewardStatus: 'PAID', paidAt: now },
        });
        await tx.joinParticipant.update({
          where: { id: participant.id },
          data: { participationStatus: 'COMPLETED', confirmedAt: participant.confirmedAt ?? now },
        });
      }

      // Pass 2: non-pay — only hold-backed slots (eligible gender) move ledger on NO_SHOW/etc.
      for (const participant of nonHost) {
        const attended = attendanceMap.get(participant.id) ?? false;
        const gender = participant.user.profile?.gender ?? null;
        const rewardTarget = (join.matchingRewardTarget ?? 'ALL') as 'FEMALE' | 'MALE' | 'ALL';
        const rewardAmount = String(join.rewardPerParticipant);
        const settlement = await ensureSettlement(participant);

        if (
          settlement.rewardStatus === 'PAID' ||
          settlement.rewardStatus === 'AUTO_PAID' ||
          settlement.rewardStatus === 'REFUNDED' ||
          settlement.rewardStatus === 'NOT_ELIGIBLE'
        ) {
          continue;
        }

        if (
          resolveMatchingRewardDisposition({
            attended,
            gender,
            matchingRewardTarget: rewardTarget,
          }) === 'PAY'
        ) {
          continue;
        }

        const holdBacked = isRewardEligibleMatchingGender(gender, rewardTarget);
        if (holdBacked) {
          if (isRewardTransferRequired(rewardAmount)) {
            await this.ledger.applyRewardRefund(tx, {
              hostWalletId: hostWallet.id,
              coinAssetId: join.coinAssetId,
              amount: rewardAmount,
              settlementId: settlement.id,
              joinId,
              idempotencyKey: settlementRefundIdempotencyKey(settlement.id),
            });
            if (settlement.holdId) {
              await this.ledger.refreshCoinHoldStatus(tx, settlement.holdId);
            }
          }
          await tx.rewardSettlement.update({
            where: { id: settlement.id },
            data: { rewardStatus: 'REFUNDED', refundedAt: now },
          });
        } else {
          // Gender outside reward target was never included in JOIN HOLD pool.
          await tx.rewardSettlement.update({
            where: { id: settlement.id },
            data: { rewardStatus: 'NOT_ELIGIBLE', refundedAt: null },
          });
        }

        await tx.joinParticipant.update({
          where: { id: participant.id },
          data: {
            participationStatus: attended ? 'COMPLETED' : 'NO_SHOW',
          },
        });
      }

      await this.ledger.refundRemainingJoinHold(tx, {
        hostWalletId: hostWallet.id,
        coinAssetId: join.coinAssetId,
        joinId,
        idempotencyKey: `store-join:${joinId}:complete-hold-refund`,
      });

      await tx.join.update({
        where: { id: joinId },
        data: { status: 'COMPLETED' },
      });

      await tx.joinParticipant.updateMany({
        where: {
          joinId,
          role: 'HOST',
          participationStatus: { in: ['APPROVED', 'CONFIRMED'] },
        },
        data: { participationStatus: 'COMPLETED' },
      });
    });

    const join = await this.prisma.join.findUniqueOrThrow({ where: { id: joinId } });
    const wallet = await this.ledger.getOrCreateWallet(hostUserId, join.coinAssetId);
    mockUserStore.syncWalletBalances(
      hostUserId,
      String(wallet.availableBalance),
      String(wallet.heldBalance),
    );

    void this.joinChat.onJoinTerminal(joinId, 'COMPLETED');

    return this.joins.getDetail(joinId, hostUserId);
  }

  async reconcileDueMatchingDeadlines(
    limit = 50,
  ): Promise<MatchingDeadlineBatchSummary & { processed: number; joinIds: string[] }> {
    const started = Date.now();
    const now = new Date();
    const due = await this.prisma.join.findMany({
      where: {
        joinKind: 'STORE_MATCHING',
        status: { in: ['OPEN', 'FULL'] },
        recruitClosesAt: { lte: now },
      },
      select: { id: true },
      take: Math.max(1, Math.min(limit, 200)),
      orderBy: { recruitClosesAt: 'asc' },
    });

    const summary = emptyMatchingDeadlineBatchSummary();
    summary.scannedCount = due.length;
    const joinIds: string[] = [];

    for (const row of due) {
      try {
        const outcome = await this.ensureMatchingDeadline(row.id);
        joinIds.push(row.id);
        if (outcome === 'confirmed') {
          summary.confirmedCount += 1;
          void this.joinChat.ensureRoomForJoin(row.id);
        } else if (outcome === 'cancelled') {
          summary.cancelledCount += 1;
          void this.joinChat.onJoinTerminal(row.id, 'CANCELLED');
        } else {
          summary.skippedCount += 1;
        }
      } catch (err) {
        summary.errorCount += 1;
        this.logger.warn(
          `matchingDeadlineBatch join_error joinId=${row.id} message=${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
      }
    }

    summary.durationMs = Date.now() - started;
    this.logger.log(
      `matchingDeadlineBatch ${JSON.stringify({
        scannedCount: summary.scannedCount,
        confirmedCount: summary.confirmedCount,
        cancelledCount: summary.cancelledCount,
        skippedCount: summary.skippedCount,
        errorCount: summary.errorCount,
        durationMs: summary.durationMs,
      })}`,
    );

    return {
      ...summary,
      processed: summary.confirmedCount + summary.cancelledCount,
      joinIds,
    };
  }

  async leaveAsParticipant(joinId: string, userId: string): Promise<JoinDetailDto> {
    await this.prisma.$transaction(async (tx) => {
      const join = await tx.join.findUnique({
        where: { id: joinId },
        include: {
          participants: {
            include: { settlement: true, user: { include: { profile: true } } },
          },
        },
      });
      if (!join) throw new NotFoundException('join_not_found');
      if (join.joinKind !== 'STORE_MATCHING') {
        throw new BadRequestException('not_store_matching_join');
      }
      if (!this.isStoreMatchingJoinable(join)) {
        throw new BadRequestException('recruitment_closed');
      }
      const mine = join.participants.find((p) => p.userId === userId && p.role !== 'HOST');
      if (!mine) throw new NotFoundException('participation_not_found');
      if (mine.participationStatus === 'CANCELLED') return;

      // Slot returns immediately. JOIN-level HOLD stays pooled until cancel/complete/deadline.
      // Do NOT mark REFUNDED here — that status means coins already moved via ledger refund
      // and would under-refund remaining hold on deadline cancel.
      if (
        mine.settlement &&
        (mine.settlement.rewardStatus === 'HELD' ||
          mine.settlement.rewardStatus === 'PENDING_CONFIRMATION')
      ) {
        await tx.rewardSettlement.update({
          where: { id: mine.settlement.id },
          data: { rewardStatus: 'NOT_ELIGIBLE', refundedAt: null },
        });
      }

      await tx.joinParticipant.update({
        where: { id: mine.id },
        data: { participationStatus: 'CANCELLED', cancelledAt: new Date() },
      });

      const remaining = join.participants.filter(
        (p) =>
          p.id !== mine.id &&
          p.role !== 'HOST' &&
          (p.participationStatus === 'APPROVED' || p.participationStatus === 'CONFIRMED'),
      );
      const rosterCount = remaining.length;
      const scheduledEndAt = estimateEndAt({
        startAt: join.startAt,
        playerCount: Math.max(rosterCount, 1),
        rule: SCREEN_GOLF_DURATION_RULE,
      });
      await tx.join.update({
        where: { id: joinId },
        data: {
          confirmedPlayerCount: rosterCount,
          scheduledEndAt,
          status: rosterCount >= join.plannedPlayerCount ? 'FULL' : 'OPEN',
        },
      });
    });

    void this.joinChat.removeMember(joinId, userId);
    void this.urgentVacancy.clearIfNeeded(joinId);
    void this.waitlist.processWaitlistForJoin(joinId);

    return this.joins.getDetail(joinId, userId);
  }

  /**
   * Idempotent deadline reconcile for one join.
   * Concurrent workers are safe via status-gated updateMany + ledger idempotency keys.
   */
  async ensureMatchingDeadline(
    joinId: string,
  ): Promise<'confirmed' | 'cancelled' | 'skipped'> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const join = await tx.join.findUnique({
        where: { id: joinId },
        include: { participants: true },
      });
      if (!join || join.joinKind !== 'STORE_MATCHING') return 'skipped';
      if (!join.recruitClosesAt || join.minimumPlayers == null) return 'skipped';

      const alreadyClosed = ['CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(join.status);
      const rosterCount = this.countMatchingParticipants(join.participants);

      const outcome = evaluateMatchingDeadline({
        now,
        recruitClosesAt: join.recruitClosesAt,
        confirmedPlayerCount: rosterCount,
        minimumPlayers: join.minimumPlayers,
        plannedPlayerCount: join.plannedPlayerCount,
        alreadyClosed,
      });

      if (outcome.action === 'noop') return 'skipped';

      const hostWallet = await this.ledger.getOrCreateWallet(
        join.hostUserId,
        join.coinAssetId,
        tx,
      );

      if (outcome.action === 'cancel') {
        await this.ledger.refundRemainingJoinHold(tx, {
          hostWalletId: hostWallet.id,
          coinAssetId: join.coinAssetId,
          joinId,
          idempotencyKey: `store-join:${joinId}:deadline-cancel-refund`,
        });
        await tx.joinParticipant.updateMany({
          where: {
            joinId,
            role: 'PARTICIPANT',
            participationStatus: { in: ['APPLIED', 'APPROVED', 'CONFIRMED'] },
          },
          data: { participationStatus: 'CANCELLED', cancelledAt: now },
        });
        await this.waitlist.terminalizeForJoinCancel(joinId, tx);
        const cancelled = await tx.join.updateMany({
          where: { id: joinId, status: { in: ['OPEN', 'FULL'] } },
          data: { status: 'CANCELLED', cancelledAt: now },
        });
        return cancelled.count > 0 ? 'cancelled' : 'skipped';
      }

      const scheduledEndAt = estimateEndAt({
        startAt: join.startAt,
        playerCount: Math.max(rosterCount, 1),
        rule: SCREEN_GOLF_DURATION_RULE,
      });
      const confirmed = await tx.join.updateMany({
        where: { id: joinId, status: { in: ['OPEN', 'FULL'] } },
        data: {
          status: 'CONFIRMED',
          confirmedAt: now,
          confirmedPlayerCount: rosterCount,
          scheduledEndAt,
        },
      });
      return confirmed.count > 0 ? 'confirmed' : 'skipped';
    });
  }

  countMatchingParticipants(
    participants: Array<{ role: string; participationStatus: string }>,
  ): number {
    return participants.filter(
      (p) =>
        p.role !== 'HOST' &&
        (p.participationStatus === 'APPROVED' || p.participationStatus === 'CONFIRMED'),
    ).length;
  }

  matchingGenderCounts(
    participants: Array<{
      role: string;
      participationStatus: string;
      user: { profile: { gender: string | null } | null };
    }>,
  ) {
    const genders = participants
      .filter(
        (p) =>
          p.role !== 'HOST' &&
          (p.participationStatus === 'APPROVED' || p.participationStatus === 'CONFIRMED'),
      )
      .map((p) => p.user.profile?.gender ?? null);
    return countMatchingRosterByGender(genders);
  }

  isStoreMatchingJoinable(join: { status: string; recruitClosesAt: Date | null }): boolean {
    if (!MATCHING_OPEN_STATUSES.includes(join.status as JoinStatus)) return false;
    if (join.recruitClosesAt && join.recruitClosesAt.getTime() <= Date.now()) return false;
    return true;
  }
}
