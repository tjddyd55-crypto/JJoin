import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SCREEN_GOLF_DURATION_RULE,
  computeConfirmedPlayerCount,
  estimateEndAt,
  nextJoinStatusAfterRoster,
} from '@jjoin/domain';
import type { JoinDetailDto, SetAttendanceIntentRequest } from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';
import { JoinsService } from '../joins/joins.service';
import { MatchingJoinsService } from '../joins/matching-joins.service';
import { JoinChatService } from './join-chat.service';

@Injectable()
export class AttendanceIntentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => JoinsService))
    private readonly joins: JoinsService,
    @Inject(forwardRef(() => MatchingJoinsService))
    private readonly matchingJoins: MatchingJoinsService,
    @Inject(forwardRef(() => JoinChatService))
    private readonly chat: JoinChatService,
  ) {}

  async setIntent(
    joinId: string,
    userId: string,
    body: SetAttendanceIntentRequest,
  ): Promise<JoinDetailDto> {
    const intent = body?.intent;
    if (intent !== 'CONFIRMED' && intent !== 'DECLINED') {
      throw new BadRequestException('invalid_attendance_intent');
    }

    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: { participants: true },
    });
    if (!join) throw new NotFoundException('join_not_found');

    const mine = join.participants.find((p) => p.userId === userId);
    if (!mine) throw new NotFoundException('participation_not_found');
    if (mine.role === 'HOST') {
      throw new BadRequestException('host_attendance_intent_not_required');
    }
    if (mine.participationStatus !== 'APPROVED' && mine.participationStatus !== 'CONFIRMED') {
      throw new ForbiddenException('attendance_intent_requires_approved');
    }

    if (intent === 'CONFIRMED') {
      await this.prisma.joinParticipant.update({
        where: { id: mine.id },
        data: {
          attendanceIntent: 'CONFIRMED',
          attendanceIntentAt: new Date(),
        },
      });
      return this.joins.getDetail(joinId, userId);
    }

    // DECLINED — leave / cancel participation
    if (join.joinKind === 'STORE_MATCHING') {
      await this.prisma.joinParticipant.update({
        where: { id: mine.id },
        data: {
          attendanceIntent: 'DECLINED',
          attendanceIntentAt: new Date(),
        },
      });
      const detail = await this.matchingJoins.leaveAsParticipant(joinId, userId);
      await this.chat.removeMember(joinId, userId);
      return detail;
    }

    await this.declineStandard(joinId, userId, mine.id);
    await this.chat.removeMember(joinId, userId);
    return this.joins.getDetail(joinId, userId);
  }

  private async declineStandard(
    joinId: string,
    userId: string,
    participantId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const join = await tx.join.findUnique({
        where: { id: joinId },
        include: { participants: true },
      });
      if (!join) throw new NotFoundException('join_not_found');

      const mine = join.participants.find((p) => p.id === participantId);
      if (!mine || mine.userId !== userId) {
        throw new NotFoundException('participation_not_found');
      }
      if (mine.participationStatus === 'CANCELLED') return;

      await tx.joinParticipant.update({
        where: { id: mine.id },
        data: {
          participationStatus: 'CANCELLED',
          cancelledAt: new Date(),
          attendanceIntent: 'DECLINED',
          attendanceIntentAt: new Date(),
        },
      });

      const statuses = join.participants.map((p) =>
        p.id === mine.id ? 'CANCELLED' : p.participationStatus,
      );
      const confirmed = computeConfirmedPlayerCount(statuses);
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
    });
  }
}
