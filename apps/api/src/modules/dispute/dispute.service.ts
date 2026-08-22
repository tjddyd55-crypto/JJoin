import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DisputeReasonType } from '@prisma/client';
import { DisputeStatus, type DisputeResolution } from '@jjoin/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export const MAX_DISPUTE_STATEMENT_LENGTH = Number(
  process.env.DISPUTE_STATEMENT_MAX_LENGTH ?? 1000,
);

export function normalizeStatement(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) throw new BadRequestException('statement_required');
  if (trimmed.length > MAX_DISPUTE_STATEMENT_LENGTH) {
    throw new BadRequestException('statement_too_long');
  }
  return trimmed;
}

@Injectable()
export class DisputeService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDisputeCase(
    tx: Prisma.TransactionClient,
    params: {
      joinId: string;
      joinParticipantId: string;
      settlementId: string;
      openedByUserId: string;
      reasonType: DisputeReasonType;
      hostStatement?: string | null;
    },
  ) {
    const existing = await tx.disputeCase.findUnique({
      where: { settlementId: params.settlementId },
    });
    if (existing) return existing;

    return tx.disputeCase.create({
      data: {
        joinId: params.joinId,
        joinParticipantId: params.joinParticipantId,
        settlementId: params.settlementId,
        openedByUserId: params.openedByUserId,
        reasonType: params.reasonType,
        hostStatement: params.hostStatement?.trim() || null,
        status: 'OPEN',
      },
    });
  }

  async submitParticipantStatement(disputeId: string, userId: string, statement: string) {
    const text = normalizeStatement(statement);
    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.disputeCase.findUnique({
        where: { id: disputeId },
        include: { participant: true },
      });
      if (!dispute) throw new NotFoundException('dispute_not_found');
      if (dispute.participant.userId !== userId) {
        throw new ForbiddenException('dispute_forbidden');
      }
      if (dispute.status === 'RESOLVED') {
        throw new BadRequestException('dispute_already_resolved');
      }

      return tx.disputeCase.update({
        where: { id: disputeId },
        data: {
          participantStatement: text,
          participantStatementAt: new Date(),
          status: dispute.status === 'OPEN' ? 'UNDER_REVIEW' : dispute.status,
          underReviewAt: dispute.underReviewAt ?? new Date(),
        },
      });
    });
  }

  async getDisputeForUser(disputeId: string, userId: string) {
    const dispute = await this.prisma.disputeCase.findUnique({
      where: { id: disputeId },
      include: {
        participant: { include: { user: { include: { profile: true } } } },
        settlement: true,
        join: { include: { venue: true, host: { include: { profile: true } } } },
      },
    });
    if (!dispute) throw new NotFoundException('dispute_not_found');

    const isParticipant = dispute.participant.userId === userId;
    const isHost = dispute.join.hostUserId === userId;
    if (!isParticipant && !isHost) throw new ForbiddenException('dispute_forbidden');

    return this.toParticipantDto(dispute, userId);
  }

  toParticipantDto(
    dispute: {
      id: string;
      joinId: string;
      status: string;
      reasonType: string;
      resolution: string | DisputeResolution | null;
      hostStatement: string | null;
      participantStatement: string | null;
      openedAt: Date;
      resolvedAt: Date | null;
      settlement: { amount: Prisma.Decimal; rewardStatus: string };
      participant: { userId: string };
    },
    viewerUserId: string,
  ) {
    const isParticipant = dispute.participant.userId === viewerUserId;
    return {
      disputeId: dispute.id,
      joinId: dispute.joinId,
      status: dispute.status as DisputeStatus,
      reasonType: dispute.reasonType,
      resolution: dispute.resolution as DisputeResolution | null,
      rewardAmount: String(dispute.settlement.amount),
      rewardStatus: dispute.settlement.rewardStatus as import('@jjoin/types').RewardStatus,
      hostStatement: dispute.hostStatement,
      participantStatement: dispute.participantStatement,
      openedAt: dispute.openedAt.toISOString(),
      resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
      canSubmitStatement:
        isParticipant &&
        dispute.status !== 'RESOLVED' &&
        !dispute.participantStatement,
      userFacingMessage: this.userFacingMessage(dispute, isParticipant),
    };
  }

  userFacingMessage(
    dispute: { status: string; resolution: string | null; settlement: { rewardStatus: string } },
    isParticipant: boolean,
  ): string {
    if (dispute.status !== 'RESOLVED') {
      return isParticipant ? '문제 확인 중' : '관리자 확인 중';
    }
    if (dispute.resolution === 'PAY_PARTICIPANT') {
      return isParticipant ? '보상 지급 완료' : '참가자에게 보상 지급 완료';
    }
    if (dispute.resolution === 'REFUND_HOST') {
      return isParticipant
        ? '보상 지급 대상에서 제외되었습니다.'
        : '보상 코인 반환 완료';
    }
    if (dispute.settlement.rewardStatus === 'PAID' || dispute.settlement.rewardStatus === 'AUTO_PAID') {
      return '보상 지급 완료';
    }
    return '문제 확인 중';
  }

  async countOpenDisputesForJoin(tx: Prisma.TransactionClient, joinId: string) {
    return tx.disputeCase.count({
      where: { joinId, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
    });
  }
}
