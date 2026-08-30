import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JoinStatus,
  ParticipantRole,
  RewardStatus,
  DisputeStatus,
  type JoinSettlementSummaryDto,
  type SettlementIssueRequest,
  type SettlementParticipantDto,
} from '@jjoin/types';
import {
  canAutoPayReward,
  canHostPayReward,
  computeAutoPayAt,
  formatCountdownMs,
  isSettlementWindowOpen,
  isTerminalRewardStatus,
  settlementRefundIdempotencyKey,
  settlementRowIdempotencyKey,
  settlementTransferIdempotencyKey,
  chatHideAfterFrom,
  chatPurgeAfterFrom,
} from '@jjoin/domain';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CoinLedgerService } from '../wallet/coin-ledger.service';
import { SystemSettlementClock, type SettlementClock, isSettlementQaAllowed } from '../../settlement/settlement-clock';
import { DisputeService } from '../dispute/dispute.service';
import { mockUserStore } from '../../mock/mock-user.store';
import { NotificationEventService } from '../notifications/notification-event.service';
import { NotificationType } from '@prisma/client';

const SETTLING_ELIGIBLE: JoinStatus[] = [
  JoinStatus.OPEN,
  JoinStatus.FULL,
  JoinStatus.CONFIRMED,
  JoinStatus.IN_PROGRESS,
  JoinStatus.SETTLING,
];

@Injectable()
export class SettlementService {
  private readonly clock: SettlementClock;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: CoinLedgerService,
    private readonly disputes: DisputeService,
    private readonly notifications: NotificationEventService,
  ) {
    // Fail-closed: standalone cron must wire DisputeService — never auto-pay without dispute guard.
    if (!disputes || typeof disputes.countOpenDisputesForJoin !== 'function') {
      throw new Error(
        'SettlementService requires DisputeService with countOpenDisputesForJoin',
      );
    }
    if (!notifications || typeof notifications.enqueueSafe !== 'function') {
      throw new Error('SettlementService requires NotificationEventService with enqueueSafe');
    }
    this.clock = new SystemSettlementClock();
  }

  ping() {
    return {
      module: 'settlement',
      status: 'ready',
      participantLevel: true,
      autoPay: 'RUNNER',
    };
  }

  /** Create settlement row when participant is approved — idempotent, host excluded. */
  async ensureSettlementOnApprove(
    tx: Prisma.TransactionClient,
    params: {
      joinId: string;
      participantId: string;
      scheduledEndAt: Date;
      rewardPerParticipant: Prisma.Decimal;
      coinAssetId: string;
    },
  ) {
    const participant = await tx.joinParticipant.findUniqueOrThrow({
      where: { id: params.participantId },
    });
    if (participant.role === 'HOST') return null;

    const existing = await tx.rewardSettlement.findUnique({
      where: { joinParticipantId: params.participantId },
    });
    if (existing) return existing;

    const hold = await tx.coinHold.findFirst({
      where: { joinId: params.joinId, status: { in: ['OPEN', 'PARTIALLY_RELEASED'] } },
      orderBy: { createdAt: 'asc' },
    });

    const autoPayAt = computeAutoPayAt(params.scheduledEndAt);
    const idempotencyKey = settlementRowIdempotencyKey(params.participantId);

    return tx.rewardSettlement.create({
      data: {
        joinId: params.joinId,
        joinParticipantId: params.participantId,
        coinAssetId: params.coinAssetId,
        amount: params.rewardPerParticipant,
        rewardStatus: 'HELD',
        holdId: hold?.id ?? null,
        settlementAvailableAt: params.scheduledEndAt,
        autoPayAt,
        heldAt: new Date(),
        idempotencyKey,
      },
    });
  }

  async refreshJoinSettlementState(joinId: string): Promise<void> {
    const now = this.clock.now();
    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: {
        participants: { include: { settlement: true } },
      },
    });
    if (!join || join.status === 'CANCELLED') return;

    const openedSettlementIds: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      const open = isSettlementWindowOpen(join.scheduledEndAt, now);

      if (open && SETTLING_ELIGIBLE.includes(join.status as JoinStatus)) {
        await tx.join.update({
          where: { id: joinId },
          data: { status: 'SETTLING' },
        });
      }

      for (const p of join.participants) {
        if (p.role === 'HOST' || !p.settlement) continue;
        if (p.settlement.rewardStatus !== 'HELD') continue;
        if (open) {
          await tx.rewardSettlement.update({
            where: { id: p.settlement.id },
            data: { rewardStatus: 'PENDING_CONFIRMATION' },
          });
          openedSettlementIds.push(p.settlement.id);
        }
      }

      await this.tryCompleteJoin(tx, joinId);
    });

    for (const settlementId of openedSettlementIds) {
      await this.notifications.enqueueSafe({
        userId: join.hostUserId,
        type: NotificationType.SETTLEMENT_CONFIRMATION_REQUIRED,
        title: '정산 확인',
        body: '참가자 보상을 확인해 주세요.',
        data: {
          type: NotificationType.SETTLEMENT_CONFIRMATION_REQUIRED,
          joinId,
          settlementId,
        },
        eventKey: `settlement:${settlementId}:confirmation_required`,
      });
    }
  }

  async getJoinSettlements(
    joinId: string,
    viewerUserId: string,
  ): Promise<JoinSettlementSummaryDto> {
    await this.refreshJoinSettlementState(joinId);

    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: {
        participants: {
          include: {
            settlement: { include: { dispute: true } },
            user: { include: { profile: true } },
          },
        },
      },
    });
    if (!join) throw new NotFoundException('join_not_found');

    const isHost = join.hostUserId === viewerUserId;
    const isParticipant = join.participants.some((p) => p.userId === viewerUserId);
    if (!isHost && !isParticipant) {
      throw new ForbiddenException('settlement_forbidden');
    }

    const now = this.clock.now();
    const settlementOpen = isSettlementWindowOpen(join.scheduledEndAt, now);

    const settlements: SettlementParticipantDto[] = join.participants
      .filter((p) => p.role !== 'HOST' && p.settlement)
      .map((p) => {
        const s = p.settlement!;
        const rewardStatus = s.rewardStatus as RewardStatus;
        const disputeDto = s.dispute
          ? this.disputes.toParticipantDto(
              {
                id: s.dispute.id,
                joinId: s.dispute.joinId,
                status: s.dispute.status as DisputeStatus,
                reasonType: s.dispute.reasonType,
                resolution: s.dispute.resolution as import('@jjoin/types').DisputeResolution | null,
                hostStatement: s.dispute.hostStatement,
                participantStatement: s.dispute.participantStatement,
                openedAt: s.dispute.openedAt,
                resolvedAt: s.dispute.resolvedAt,
                settlement: { amount: s.amount, rewardStatus: s.rewardStatus },
                participant: { userId: p.userId },
              },
              viewerUserId,
            )
          : null;
        return {
          settlementId: s.id,
          participantId: p.id,
          userId: p.userId,
          nickname: p.user.profile?.nickname ?? '참가자',
          role: p.role as ParticipantRole,
          participationStatus: p.participationStatus as never,
          rewardAmount: String(s.amount),
          rewardStatus,
          settlementAvailableAt: s.settlementAvailableAt.toISOString(),
          autoPayAt: s.autoPayAt.toISOString(),
          autoPayCountdownMs: formatCountdownMs(s.autoPayAt, now),
          canHostPay: isHost
            ? canHostPayReward({
                now,
                scheduledEndAt: join.scheduledEndAt,
                rewardStatus: s.rewardStatus,
                joinStatus: join.status,
              })
            : false,
          paidAt: s.paidAt?.toISOString() ?? null,
          refundedAt: s.refundedAt?.toISOString() ?? null,
          disputedAt: s.disputedAt?.toISOString() ?? null,
          dispute: disputeDto,
        };
      });

    return {
      joinId,
      joinStatus: join.status as JoinStatus,
      scheduledEndAt: join.scheduledEndAt.toISOString(),
      settlementOpen,
      settlements,
    };
  }

  async payParticipant(
    joinId: string,
    participantId: string,
    hostUserId: string,
    mode: 'MANUAL' | 'AUTO',
  ) {
    await this.refreshJoinSettlementState(joinId);
    const now = this.clock.now();

    const result = await this.prisma.$transaction(async (tx) => {
      const join = await tx.join.findUnique({
        where: { id: joinId },
        include: {
          participants: { include: { settlement: true } },
          holds: true,
        },
      });
      if (!join) throw new NotFoundException('join_not_found');
      if (join.hostUserId !== hostUserId && mode === 'MANUAL') {
        throw new ForbiddenException('not_join_host');
      }
      if (join.status === 'CANCELLED') {
        throw new BadRequestException('join_cancelled');
      }

      const participant = join.participants.find((p) => p.id === participantId);
      if (!participant?.settlement) {
        throw new NotFoundException('settlement_not_found');
      }
      const settlement = participant.settlement;

      if (settlement.rewardStatus === 'PAID' || settlement.rewardStatus === 'AUTO_PAID') {
        return settlement;
      }

      if (mode === 'MANUAL') {
        if (
          !canHostPayReward({
            now,
            scheduledEndAt: join.scheduledEndAt,
            rewardStatus: settlement.rewardStatus,
            joinStatus: join.status,
          })
        ) {
          throw new BadRequestException('settlement_not_payable');
        }
      } else if (
        !canAutoPayReward({
          now,
          autoPayAt: settlement.autoPayAt,
          rewardStatus: settlement.rewardStatus,
        })
      ) {
        return null;
      }

      const amount = String(settlement.amount);
      const hostWallet = await this.ledger.getOrCreateWallet(join.hostUserId, join.coinAssetId, tx);
      const participantWallet = await this.ledger.getOrCreateWallet(
        participant.userId,
        join.coinAssetId,
        tx,
      );

      const transferKey = settlementTransferIdempotencyKey(settlement.id);
      const { participantTx } = await this.ledger.applyRewardTransfer(tx, {
        hostWalletId: hostWallet.id,
        participantWalletId: participantWallet.id,
        participantUserId: participant.userId,
        coinAssetId: join.coinAssetId,
        amount,
        settlementId: settlement.id,
        joinId,
        idempotencyKey: transferKey,
      });

      if (settlement.holdId) {
        await this.ledger.refreshCoinHoldStatus(tx, settlement.holdId);
      }

      const nextRewardStatus = mode === 'AUTO' ? 'AUTO_PAID' : 'PAID';
      const claimed = await tx.rewardSettlement.updateMany({
        where: { id: settlement.id, rewardStatus: 'PENDING_CONFIRMATION' },
        data: {
          rewardStatus: nextRewardStatus,
          paidAt: now,
          paidTxId: participantTx.id,
        },
      });

      if (claimed.count === 0) {
        return tx.rewardSettlement.findUniqueOrThrow({ where: { id: settlement.id } });
      }

      await tx.joinParticipant.update({
        where: { id: participant.id },
        data: { participationStatus: 'COMPLETED' },
      });

      mockUserStore.syncWalletBalances(
        join.hostUserId,
        String(
          (
            await tx.wallet.findUniqueOrThrow({ where: { id: hostWallet.id } })
          ).availableBalance,
        ),
        String(
          (
            await tx.wallet.findUniqueOrThrow({ where: { id: hostWallet.id } })
          ).heldBalance,
        ),
      );
      mockUserStore.syncWalletBalances(
        participant.userId,
        String(
          (
            await tx.wallet.findUniqueOrThrow({ where: { id: participantWallet.id } })
          ).availableBalance,
        ),
        String(
          (
            await tx.wallet.findUniqueOrThrow({ where: { id: participantWallet.id } })
          ).heldBalance,
        ),
      );

      await this.tryCompleteJoin(tx, joinId);
      return tx.rewardSettlement.findUniqueOrThrow({ where: { id: settlement.id } });
    });

    if (!result) return { ok: false, skipped: true };

    if (result.rewardStatus === 'PAID' || result.rewardStatus === 'AUTO_PAID') {
      const participant = await this.prisma.joinParticipant.findFirst({
        where: { settlement: { id: result.id } },
        select: { userId: true },
      });
      if (participant) {
        const isAuto = mode === 'AUTO' || result.rewardStatus === 'AUTO_PAID';
        await this.notifications.enqueueSafe({
          userId: participant.userId,
          type: isAuto
            ? NotificationType.REWARD_AUTO_PAID
            : NotificationType.REWARD_PAID,
          title: isAuto ? '자동 보상 지급' : '보상 지급',
          body: isAuto
            ? '참가 보상이 자동 지급되었습니다.'
            : '참가 보상이 지급되었습니다.',
          data: {
            type: isAuto
              ? NotificationType.REWARD_AUTO_PAID
              : NotificationType.REWARD_PAID,
            joinId,
            settlementId: result.id,
            rewardAmount: String(result.amount),
          },
          eventKey: `settlement:${result.id}:reward_paid`,
        });
      }
    }

    return { ok: true, settlementId: result.id, rewardStatus: result.rewardStatus };
  }

  async payAllEligible(joinId: string, hostUserId: string) {
    const summary = await this.getJoinSettlements(joinId, hostUserId);
    const eligible = summary.settlements.filter((s) => s.canHostPay);
    const results = [];
    for (const s of eligible) {
      results.push(await this.payParticipant(joinId, s.participantId, hostUserId, 'MANUAL'));
    }
    return { count: results.filter((r) => r.ok).length, results };
  }

  async reportIssue(
    joinId: string,
    participantId: string,
    hostUserId: string,
    body: SettlementIssueRequest,
  ) {
    await this.refreshJoinSettlementState(joinId);
    const now = this.clock.now();

    const result = await this.prisma.$transaction(async (tx) => {
      const join = await tx.join.findUnique({
        where: { id: joinId },
        include: { participants: { include: { settlement: true } } },
      });
      if (!join) throw new NotFoundException('join_not_found');
      if (join.hostUserId !== hostUserId) throw new ForbiddenException('not_join_host');
      if (!isSettlementWindowOpen(join.scheduledEndAt, now)) {
        throw new BadRequestException('settlement_not_open');
      }

      const participant = join.participants.find((p) => p.id === participantId);
      if (!participant?.settlement) throw new NotFoundException('settlement_not_found');
      const settlement = participant.settlement;

      if (isTerminalRewardStatus(settlement.rewardStatus)) {
        return { ok: true as const, alreadyTerminal: true as const, participantUserId: participant.userId };
      }

      switch (body.issueType) {
        case 'NO_SHOW':
          return {
            ...(await this.applyNoShow(tx, join, participant, settlement, now)),
            participantUserId: participant.userId,
          };
        case 'LEFT_EARLY':
          return {
            ...(await this.applyLeftEarly(
              tx,
              join,
              participant,
              settlement,
              now,
              body.statement,
            )),
            participantUserId: participant.userId,
          };
        case 'DISPUTE':
          return {
            ...(await this.applyDispute(
              tx,
              join,
              participant,
              settlement,
              now,
              body.statement,
            )),
            participantUserId: participant.userId,
          };
        default:
          throw new BadRequestException('invalid_issue_type');
      }
    });

    if (
      result &&
      'disputeId' in result &&
      result.disputeId &&
      !('alreadyTerminal' in result && result.alreadyTerminal)
    ) {
      await this.notifications.enqueueSafe({
        userId: result.participantUserId,
        type: NotificationType.DISPUTE_OPENED,
        title: '분쟁 접수',
        body: '조인 참여 상태 확인이 필요합니다.',
        data: {
          type: NotificationType.DISPUTE_OPENED,
          joinId,
          disputeId: result.disputeId,
        },
        eventKey: `dispute:${result.disputeId}:opened`,
      });
    }

    return result;
  }

  private async applyNoShow(
    tx: Prisma.TransactionClient,
    join: { id: string; hostUserId: string; coinAssetId: string },
    participant: { id: string; userId: string },
    settlement: {
      id: string;
      amount: Prisma.Decimal;
      holdId: string | null;
      rewardStatus: string;
    },
    now: Date,
  ) {
    if (settlement.rewardStatus === 'REFUNDED') {
      return { ok: true, rewardStatus: 'REFUNDED' };
    }

    await tx.joinParticipant.update({
      where: { id: participant.id },
      data: { participationStatus: 'NO_SHOW' },
    });

    const amount = String(settlement.amount);
    const hostWallet = await this.ledger.getOrCreateWallet(join.hostUserId, join.coinAssetId, tx);
    await this.ledger.applyRewardRefund(tx, {
      hostWalletId: hostWallet.id,
      coinAssetId: join.coinAssetId,
      amount,
      settlementId: settlement.id,
      joinId: join.id,
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
        disputedAt: now,
      },
    });

    await this.tryCompleteJoin(tx, join.id);
    return { ok: true, rewardStatus: 'REFUNDED' };
  }

  private async applyLeftEarly(
    tx: Prisma.TransactionClient,
    join: { id: string; hostUserId: string },
    participant: { id: string },
    settlement: { id: string; rewardStatus: string },
    now: Date,
    hostStatement?: string,
  ) {
    if (settlement.rewardStatus === 'DISPUTED') return { ok: true, rewardStatus: 'DISPUTED' };

    await tx.joinParticipant.update({
      where: { id: participant.id },
      data: { participationStatus: 'LEFT_EARLY' },
    });
    await tx.rewardSettlement.update({
      where: { id: settlement.id },
      data: {
        rewardStatus: 'DISPUTED',
        disputedAt: now,
      },
    });
    const dispute = await this.disputes.ensureDisputeCase(tx, {
      joinId: join.id,
      joinParticipantId: participant.id,
      settlementId: settlement.id,
      openedByUserId: join.hostUserId,
      reasonType: 'LEFT_EARLY',
      hostStatement: hostStatement?.trim() || null,
    });
    return { ok: true, rewardStatus: 'DISPUTED', disputeId: dispute.id };
  }

  private async applyDispute(
    tx: Prisma.TransactionClient,
    join: { id: string; hostUserId: string },
    participant: { id: string },
    settlement: { id: string; rewardStatus: string },
    now: Date,
    hostStatement?: string,
  ) {
    if (settlement.rewardStatus === 'DISPUTED') return { ok: true, rewardStatus: 'DISPUTED' };

    await tx.joinParticipant.update({
      where: { id: participant.id },
      data: { participationStatus: 'DISPUTED' },
    });
    await tx.rewardSettlement.update({
      where: { id: settlement.id },
      data: {
        rewardStatus: 'DISPUTED',
        disputedAt: now,
      },
    });
    const dispute = await this.disputes.ensureDisputeCase(tx, {
      joinId: join.id,
      joinParticipantId: participant.id,
      settlementId: settlement.id,
      openedByUserId: join.hostUserId,
      reasonType: 'DISPUTED',
      hostStatement: hostStatement?.trim() || null,
    });
    return { ok: true, rewardStatus: 'DISPUTED', disputeId: dispute.id };
  }

  async runAutoPayCron(secret?: string) {
    const expected = process.env.SETTLEMENT_CRON_SECRET;
    if (expected) {
      if (secret !== expected) throw new ForbiddenException('cron_forbidden');
    } else if (!isSettlementQaAllowed()) {
      throw new ForbiddenException('cron_forbidden');
    }
    return this.runAutoPayBatch();
  }

  async runAutoPayBatch(limit = Number(process.env.SETTLEMENT_AUTOPAY_BATCH_SIZE ?? 20)) {
    const now = this.clock.now();
    const due = await this.prisma.rewardSettlement.findMany({
      where: {
        rewardStatus: 'PENDING_CONFIRMATION',
        autoPayAt: { lte: now },
      },
      orderBy: { autoPayAt: 'asc' },
      take: limit,
      include: {
        participant: { include: { join: true } },
      },
    });

    let processed = 0;
    for (const row of due) {
      const join = row.participant.join;
      if (join.status === 'CANCELLED') continue;
      const result = await this.payParticipant(
        join.id,
        row.joinParticipantId,
        join.hostUserId,
        'AUTO',
      );
      if (result.ok) processed += 1;
    }
    return { scanned: due.length, processed, now: now.toISOString() };
  }

  /** DEV/mock QA — advance scheduledEndAt/autoPayAt for settlement E2E. */
  async qaAdvanceSettlementClock(joinId: string, hostUserId: string, mode: 'open' | 'autopay') {
    if (!isSettlementQaAllowed()) {
      throw new ForbiddenException('qa_settlement_forbidden');
    }
    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: { participants: { include: { settlement: true } } },
    });
    if (!join) throw new NotFoundException('join_not_found');
    if (join.hostUserId !== hostUserId) throw new ForbiddenException('not_join_host');

    const past = new Date(Date.now() - 60_000);
    const autoPast = new Date(Date.now() - 30_000);

    await this.prisma.$transaction(async (tx) => {
      await tx.join.update({
        where: { id: joinId },
        data: {
          scheduledEndAt: past,
          status: join.status === 'CANCELLED' ? join.status : 'SETTLING',
        },
      });
      for (const p of join.participants) {
        if (!p.settlement) continue;
        await tx.rewardSettlement.update({
          where: { id: p.settlement.id },
          data: {
            settlementAvailableAt: past,
            autoPayAt: mode === 'autopay' ? autoPast : p.settlement.autoPayAt,
            rewardStatus:
              p.settlement.rewardStatus === 'HELD' ? 'PENDING_CONFIRMATION' : p.settlement.rewardStatus,
          },
        });
      }
    });

    return { ok: true, mode };
  }

  async adminResolveDispute(
    disputeId: string,
    adminUserId: string,
    resolution: 'PAY_PARTICIPANT' | 'REFUND_HOST',
    adminNote?: string,
  ) {
    const now = this.clock.now();

    const result = await this.prisma.$transaction(async (tx) => {
      const dispute = await tx.disputeCase.findUnique({
        where: { id: disputeId },
        include: {
          settlement: true,
          participant: true,
          join: true,
        },
      });
      if (!dispute) throw new NotFoundException('dispute_not_found');
      if (dispute.status === 'RESOLVED') {
        return {
          ok: true as const,
          alreadyResolved: true as const,
          resolution: dispute.resolution,
          rewardStatus: dispute.settlement.rewardStatus,
          participantUserId: dispute.participant.userId,
          joinId: dispute.joinId,
        };
      }

      if (resolution === 'PAY_PARTICIPANT') {
        if (dispute.settlement.rewardStatus === 'REFUNDED') {
          throw new BadRequestException('settlement_already_refunded');
        }
        await this.executeAdminPay(tx, dispute, now);
      } else {
        if (
          dispute.settlement.rewardStatus === 'PAID' ||
          dispute.settlement.rewardStatus === 'AUTO_PAID'
        ) {
          throw new BadRequestException('settlement_already_paid');
        }
        await this.executeAdminRefund(tx, dispute, now);
      }

      await tx.disputeCase.update({
        where: { id: disputeId },
        data: {
          status: 'RESOLVED',
          resolution,
          resolvedByAdminUserId: adminUserId,
          resolvedAt: now,
          adminNote: adminNote?.trim() || null,
        },
      });

      await this.tryCompleteJoin(tx, dispute.joinId);
      const updated = await tx.rewardSettlement.findUniqueOrThrow({
        where: { id: dispute.settlementId },
      });
      return {
        ok: true as const,
        alreadyResolved: false as const,
        resolution,
        rewardStatus: updated.rewardStatus,
        participantUserId: dispute.participant.userId,
        joinId: dispute.joinId,
      };
    });

    if (result.ok && !result.alreadyResolved) {
      const paid = result.resolution === 'PAY_PARTICIPANT';
      await this.notifications.enqueueSafe({
        userId: result.participantUserId,
        type: NotificationType.DISPUTE_RESOLVED,
        title: paid ? '보상 지급 완료' : '분쟁 검토 완료',
        body: paid
          ? '보상 지급이 완료되었습니다.'
          : '조인 보상 검토가 완료되었습니다.',
        data: {
          type: NotificationType.DISPUTE_RESOLVED,
          joinId: result.joinId,
          disputeId,
        },
        eventKey: `dispute:${disputeId}:resolved`,
      });
    }

    return result;
  }

  private async executeAdminPay(
    tx: Prisma.TransactionClient,
    dispute: {
      settlement: {
        id: string;
        amount: Prisma.Decimal;
        rewardStatus: string;
        holdId: string | null;
      };
      participant: { id: string; userId: string };
      join: { id: string; hostUserId: string; coinAssetId: string };
    },
    now: Date,
  ) {
    const settlement = dispute.settlement;
    if (settlement.rewardStatus === 'PAID' || settlement.rewardStatus === 'AUTO_PAID') {
      return;
    }
    if (settlement.rewardStatus !== 'DISPUTED') {
      throw new BadRequestException('settlement_not_disputed');
    }

    const amount = String(settlement.amount);
    const hostWallet = await this.ledger.getOrCreateWallet(
      dispute.join.hostUserId,
      dispute.join.coinAssetId,
      tx,
    );
    const participantWallet = await this.ledger.getOrCreateWallet(
      dispute.participant.userId,
      dispute.join.coinAssetId,
      tx,
    );

    const { participantTx } = await this.ledger.applyRewardTransfer(tx, {
      hostWalletId: hostWallet.id,
      participantWalletId: participantWallet.id,
      participantUserId: dispute.participant.userId,
      coinAssetId: dispute.join.coinAssetId,
      amount,
      settlementId: settlement.id,
      joinId: dispute.join.id,
      idempotencyKey: settlementTransferIdempotencyKey(settlement.id),
    });

    if (settlement.holdId) {
      await this.ledger.refreshCoinHoldStatus(tx, settlement.holdId);
    }

    const claimed = await tx.rewardSettlement.updateMany({
      where: { id: settlement.id, rewardStatus: 'DISPUTED' },
      data: {
        rewardStatus: 'PAID',
        paidAt: now,
        paidTxId: participantTx.id,
      },
    });
    if (claimed.count === 0) {
      const current = await tx.rewardSettlement.findUniqueOrThrow({ where: { id: settlement.id } });
      if (current.rewardStatus !== 'PAID' && current.rewardStatus !== 'AUTO_PAID') {
        throw new BadRequestException('settlement_not_disputed');
      }
      return;
    }

    await tx.joinParticipant.update({
      where: { id: dispute.participant.id },
      data: { participationStatus: 'COMPLETED' },
    });

    mockUserStore.syncWalletBalances(
      dispute.join.hostUserId,
      String((await tx.wallet.findUniqueOrThrow({ where: { id: hostWallet.id } })).availableBalance),
      String((await tx.wallet.findUniqueOrThrow({ where: { id: hostWallet.id } })).heldBalance),
    );
    mockUserStore.syncWalletBalances(
      dispute.participant.userId,
      String(
        (await tx.wallet.findUniqueOrThrow({ where: { id: participantWallet.id } })).availableBalance,
      ),
      String(
        (await tx.wallet.findUniqueOrThrow({ where: { id: participantWallet.id } })).heldBalance,
      ),
    );
  }

  private async executeAdminRefund(
    tx: Prisma.TransactionClient,
    dispute: {
      settlement: {
        id: string;
        amount: Prisma.Decimal;
        rewardStatus: string;
        holdId: string | null;
      };
      join: { id: string; hostUserId: string; coinAssetId: string };
    },
    now: Date,
  ) {
    const settlement = dispute.settlement;
    if (settlement.rewardStatus === 'REFUNDED') return;
    if (settlement.rewardStatus !== 'DISPUTED') {
      throw new BadRequestException('settlement_not_disputed');
    }

    const amount = String(settlement.amount);
    const hostWallet = await this.ledger.getOrCreateWallet(
      dispute.join.hostUserId,
      dispute.join.coinAssetId,
      tx,
    );
    await this.ledger.applyRewardRefund(tx, {
      hostWalletId: hostWallet.id,
      coinAssetId: dispute.join.coinAssetId,
      amount,
      settlementId: settlement.id,
      joinId: dispute.join.id,
      idempotencyKey: settlementRefundIdempotencyKey(settlement.id),
    });

    if (settlement.holdId) {
      await this.ledger.refreshCoinHoldStatus(tx, settlement.holdId);
    }

    await tx.rewardSettlement.updateMany({
      where: { id: settlement.id, rewardStatus: 'DISPUTED' },
      data: {
        rewardStatus: 'REFUNDED',
        refundedAt: now,
      },
    });
  }

  private async tryCompleteJoin(tx: Prisma.TransactionClient, joinId: string) {
    const join = await tx.join.findUnique({
      where: { id: joinId },
      include: { participants: { include: { settlement: true } } },
    });
    if (!join || join.status === 'CANCELLED' || join.status === 'COMPLETED') return;

    // Never auto-complete while still recruiting — leave marks settlements
    // NOT_ELIGIBLE (terminal) but JOIN-level HOLD must stay until deadline/cancel/complete.
    if (join.joinKind === 'STORE_MATCHING') {
      if (!['CONFIRMED', 'IN_PROGRESS', 'SETTLING'].includes(join.status)) {
        return;
      }
    }

    const nonHost = join.participants.filter(
      (p) =>
        p.role !== 'HOST' &&
        ['APPROVED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(p.participationStatus),
    );
    if (nonHost.length === 0) return;

    const openDisputes = await this.disputes.countOpenDisputesForJoin(tx, joinId);
    if (openDisputes > 0) return;

    const allTerminal = nonHost.every(
      (p) => p.settlement && isTerminalRewardStatus(p.settlement.rewardStatus),
    );
    if (allTerminal) {
      const now = new Date();
      await tx.join.update({
        where: { id: joinId },
        data: { status: 'COMPLETED' },
      });
      await tx.joinChatRoom.updateMany({
        where: { joinId, status: { in: ['ACTIVE', 'READ_ONLY'] } },
        data: {
          status: 'READ_ONLY',
          hideAfter: chatHideAfterFrom(now),
          purgeAfter: chatPurgeAfterFrom(now),
        },
      });
    }
  }
}
