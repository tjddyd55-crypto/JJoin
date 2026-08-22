import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminDisputeDetailDto,
  AdminDisputeListItemDto,
  AdminDisputeListResponse,
  AdminResolveDisputeRequest,
  DisputeResolution,
  DisputeStatus,
  JoinStatus,
  RewardStatus,
} from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';
import { SettlementService } from '../settlement/settlement.service';

@Injectable()
export class AdminDisputeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settlement: SettlementService,
  ) {}

  async listDisputes(query: {
    status?: DisputeStatus;
    cursor?: string;
    limit?: number;
  }): Promise<AdminDisputeListResponse> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
    const where = query.status ? { status: query.status as never } : {};

    const rows = await this.prisma.disputeCase.findMany({
      where,
      orderBy: [{ openedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        settlement: true,
        participant: { include: { user: { include: { profile: true } } } },
        join: {
          include: {
            venue: true,
            host: { include: { profile: true } },
          },
        },
      },
    });

    const page = rows.slice(0, limit);
    const nextCursor = rows.length > limit ? rows[limit].id : null;

    const items: AdminDisputeListItemDto[] = page.map((d) => ({
      disputeId: d.id,
      joinId: d.joinId,
      venueName: d.join.venue.name,
      scheduledEndAt: d.join.scheduledEndAt.toISOString(),
      hostNickname: d.join.host.profile?.nickname ?? '방장',
      participantNickname: d.participant.user.profile?.nickname ?? '참가자',
      rewardAmount: String(d.settlement.amount),
      reasonType: d.reasonType,
      status: d.status as DisputeStatus,
      openedAt: d.openedAt.toISOString(),
    }));

    return { items, nextCursor };
  }

  async getDispute(disputeId: string): Promise<AdminDisputeDetailDto> {
    const d = await this.prisma.disputeCase.findUnique({
      where: { id: disputeId },
      include: {
        join: { include: { venue: true, host: { include: { profile: true } } } },
        participant: { include: { user: { include: { profile: true } } } },
        settlement: { include: { hold: true } },
      },
    });
    if (!d) throw new NotFoundException('dispute_not_found');

    return {
      disputeId: d.id,
      joinId: d.joinId,
      joinStatus: d.join.status as JoinStatus,
      venueName: d.join.venue.name,
      scheduledEndAt: d.join.scheduledEndAt.toISOString(),
      hostNickname: d.join.host.profile?.nickname ?? '방장',
      participantNickname: d.participant.user.profile?.nickname ?? '참가자',
      rewardAmount: String(d.settlement.amount),
      rewardStatus: d.settlement.rewardStatus as RewardStatus,
      holdStatus: d.settlement.hold?.status ?? null,
      reasonType: d.reasonType,
      status: d.status as DisputeStatus,
      resolution: d.resolution as DisputeResolution | null,
      hostStatement: d.hostStatement,
      participantStatement: d.participantStatement,
      adminNote: d.adminNote,
      openedAt: d.openedAt.toISOString(),
      underReviewAt: d.underReviewAt?.toISOString() ?? null,
      participantStatementAt: d.participantStatementAt?.toISOString() ?? null,
      resolvedAt: d.resolvedAt?.toISOString() ?? null,
    };
  }

  async resolveDispute(
    disputeId: string,
    adminUserId: string,
    body: AdminResolveDisputeRequest,
  ) {
    if (body.adminNote && body.adminNote.length > 1000) {
      throw new BadRequestException('admin_note_too_long');
    }
    if (body.resolution !== 'PAY_PARTICIPANT' && body.resolution !== 'REFUND_HOST') {
      throw new BadRequestException('invalid_resolution');
    }
    return this.settlement.adminResolveDispute(
      disputeId,
      adminUserId,
      body.resolution,
      body.adminNote,
    );
  }
}
