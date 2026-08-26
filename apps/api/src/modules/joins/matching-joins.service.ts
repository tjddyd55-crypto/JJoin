import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
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
  evaluateMatchingDeadline,
  estimateEndAt,
  isRewardEligibleMatchingGender,
  settlementRefundIdempotencyKey,
  settlementRowIdempotencyKey,
  settlementTransferIdempotencyKey,
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

const MATCHING_OPEN_STATUSES: JoinStatus[] = [JoinStatus.OPEN, JoinStatus.FULL];

@Injectable()
export class MatchingJoinsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: CoinLedgerService,
    private readonly golfFacilities: GolfFacilitiesService,
    private readonly accounts: UserAccountService,
    @Inject(forwardRef(() => JoinsService))
    private readonly joins: JoinsService,
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

    return this.joins.getDetail(joinId, hostUserId);
  }

  async mine(hostUserId: string): Promise<JoinListItemDto[]> {
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

      for (const participant of join.participants) {
        if (participant.role === 'HOST') continue;

        const attended = attendanceMap.get(participant.id) ?? false;
        const gender = participant.user.profile?.gender ?? null;
        const rewardTarget = join.matchingRewardTarget ?? 'ALL';
        const rewardAmount = String(join.rewardPerParticipant);

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
              amount: new Prisma.Decimal(rewardAmount),
              rewardStatus: 'HELD',
              holdId: hold?.id ?? null,
              settlementAvailableAt: join.scheduledEndAt,
              autoPayAt: join.scheduledEndAt,
              heldAt: now,
              idempotencyKey: settlementRowIdempotencyKey(participant.id),
            },
          });
        }

        if (
          settlement.rewardStatus === 'PAID' ||
          settlement.rewardStatus === 'AUTO_PAID' ||
          settlement.rewardStatus === 'REFUNDED'
        ) {
          continue;
        }

        if (
          attended &&
          isRewardEligibleMatchingGender(gender, rewardTarget as 'FEMALE' | 'MALE' | 'ALL')
        ) {
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
        } else {
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
          await tx.rewardSettlement.update({
            where: { id: settlement.id },
            data: {
              rewardStatus: 'REFUNDED',
              refundedAt: now,
            },
          });
          await tx.joinParticipant.update({
            where: { id: participant.id },
            data: {
              participationStatus: attended ? 'COMPLETED' : 'NO_SHOW',
            },
          });
        }
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
    });

    const join = await this.prisma.join.findUniqueOrThrow({ where: { id: joinId } });
    const wallet = await this.ledger.getOrCreateWallet(hostUserId, join.coinAssetId);
    mockUserStore.syncWalletBalances(
      hostUserId,
      String(wallet.availableBalance),
      String(wallet.heldBalance),
    );

    return this.joins.getDetail(joinId, hostUserId);
  }

  async ensureMatchingDeadline(joinId: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const join = await tx.join.findUnique({
        where: { id: joinId },
        include: { participants: true },
      });
      if (!join || join.joinKind !== 'STORE_MATCHING') return;
      if (!join.recruitClosesAt || join.minimumPlayers == null) return;

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

      if (outcome.action === 'noop') return;

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
        await tx.join.update({
          where: { id: joinId },
          data: { status: 'CANCELLED', cancelledAt: now },
        });
        return;
      }

      const scheduledEndAt = estimateEndAt({
        startAt: join.startAt,
        playerCount: Math.max(rosterCount, 1),
        rule: SCREEN_GOLF_DURATION_RULE,
      });
      await tx.join.update({
        where: { id: joinId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: now,
          confirmedPlayerCount: rosterCount,
          scheduledEndAt,
        },
      });
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
