import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClubEventStatus,
  ClubMembershipStatus,
} from '@jjoin/types';
import { computeRemainingEventCapacity, countAttendanceResponses, isClubStaff } from '@jjoin/domain';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type ClubJoinLinkInput = {
  clubId?: string | null;
  clubEventId?: string | null;
  plannedPlayerCount: number;
};

@Injectable()
export class ClubJoinLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanLinkJoin(hostUserId: string, input: ClubJoinLinkInput) {
    if (!input.clubId && !input.clubEventId) return null;
    if (!input.clubId || !input.clubEventId) {
      throw new BadRequestException('club_link_requires_both_ids');
    }

    const membership = await this.prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId: input.clubId, userId: hostUserId } },
    });
    if (!membership || membership.status !== ClubMembershipStatus.ACTIVE) {
      throw new ForbiddenException('club_staff_required');
    }
    if (!isClubStaff({ role: membership.role, status: membership.status })) {
      throw new ForbiddenException('club_staff_required');
    }

    const event = await this.prisma.clubEvent.findFirst({
      where: { id: input.clubEventId, clubId: input.clubId },
      include: {
        attendances: { select: { response: true } },
        linkedJoin: { select: { id: true, status: true } },
      },
    });
    if (!event) throw new NotFoundException('club_event_not_found');
    if ([ClubEventStatus.CANCELLED, ClubEventStatus.COMPLETED].includes(event.status as ClubEventStatus)) {
      throw new BadRequestException('club_event_not_linkable');
    }

    const existing = event.linkedJoin;
    if (existing && !['CANCELLED', 'COMPLETED'].includes(existing.status)) {
      throw new ConflictException('club_event_urgent_join_exists');
    }

    const counts = countAttendanceResponses(event.attendances);
    const remaining = computeRemainingEventCapacity(event.capacity, counts.attending) ?? 0;
    if (remaining <= 0) throw new BadRequestException('no_remaining_seats');

    const urgentSeats = Math.min(remaining, Math.max(input.plannedPlayerCount - 1, 1));

    return { clubId: input.clubId, clubEventId: input.clubEventId, urgentSeats, eventTitle: event.title };
  }

  async attachJoinToClubEvent(
    tx: Prisma.TransactionClient,
    joinId: string,
    clubId: string,
    clubEventId: string,
    urgentSeats: number,
  ) {
    await tx.join.update({
      where: { id: joinId },
      data: {
        clubId,
        clubEventId,
        isUrgent: true,
        urgentSeats,
        urgentUntil: null,
      },
    });
  }

  async countExternalParticipants(clubEventId: string): Promise<number> {
    const join = await this.prisma.join.findFirst({
      where: { clubEventId, status: { in: ['OPEN', 'FULL', 'CONFIRMED', 'IN_PROGRESS'] } },
      include: {
        participants: {
          where: { participationStatus: { in: ['APPROVED', 'CONFIRMED', 'COMPLETED'] } },
          select: { userId: true },
        },
      },
    });
    if (!join) return 0;

    const memberIds = await this.prisma.clubMembership.findMany({
      where: {
        clubId: join.clubId ?? undefined,
        status: ClubMembershipStatus.ACTIVE,
      },
      select: { userId: true },
    });
    const memberSet = new Set(memberIds.map((m) => m.userId));
    return join.participants.filter((p) => !memberSet.has(p.userId)).length;
  }
}
