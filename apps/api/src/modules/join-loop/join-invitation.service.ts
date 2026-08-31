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
  JOIN_INVITE_MAX_BATCH,
  SCREEN_GOLF_DURATION_RULE,
  computeConfirmedPlayerCount,
  estimateEndAt,
  isJoinCapacityJoinable,
  joinInvitationNotificationEventKey,
  nextJoinStatusAfterRoster,
} from '@jjoin/domain';
import type {
  CreateJoinInvitationsRequest,
  JoinDetailDto,
  JoinInvitationDto,
} from '@jjoin/types';
import { NotificationType, Prisma, ProductEventType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEventService } from '../notifications/notification-event.service';
import { ProductEventsService } from '../analytics/product-events.service';
import { JoinsService } from '../joins/joins.service';
import { SettlementService } from '../settlement/settlement.service';
import { JoinChatService } from './join-chat.service';
import { UrgentVacancyService } from './urgent-vacancy.service';

@Injectable()
export class JoinInvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationEventService,
    private readonly analytics: ProductEventsService,
    private readonly settlement: SettlementService,
    @Inject(forwardRef(() => JoinsService))
    private readonly joins: JoinsService,
    @Inject(forwardRef(() => JoinChatService))
    private readonly chat: JoinChatService,
    @Inject(forwardRef(() => UrgentVacancyService))
    private readonly urgent: UrgentVacancyService,
  ) {}

  async createInvitations(
    joinId: string,
    hostUserId: string,
    body: CreateJoinInvitationsRequest,
  ): Promise<JoinInvitationDto[]> {
    const ids = Array.isArray(body?.inviteeUserIds)
      ? [...new Set(body.inviteeUserIds.filter((id) => typeof id === 'string' && id.trim()))]
      : [];
    if (ids.length === 0) {
      throw new BadRequestException('invitee_user_ids_required');
    }
    if (ids.length > JOIN_INVITE_MAX_BATCH) {
      throw new BadRequestException('invite_batch_too_large');
    }

    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: {
        participants: true,
        invitations: { where: { status: 'PENDING' } },
        venue: true,
        host: { include: { profile: true } },
      },
    });
    if (!join) throw new NotFoundException('join_not_found');
    if (join.hostUserId !== hostUserId) {
      throw new ForbiddenException('not_join_host');
    }
    if (
      !isJoinCapacityJoinable({
        status: join.status,
        currentParticipants: join.confirmedPlayerCount,
        maxParticipants: join.plannedPlayerCount,
      })
    ) {
      throw new BadRequestException('join_not_joinable');
    }

    const participantUserIds = new Set(
      join.participants
        .filter((p) => p.participationStatus !== 'CANCELLED')
        .map((p) => p.userId),
    );
    const pendingInvitees = new Set(join.invitations.map((i) => i.inviteeUserId));

    const created: JoinInvitationDto[] = [];
    for (const inviteeUserId of ids) {
      if (inviteeUserId === hostUserId) continue;
      if (participantUserIds.has(inviteeUserId)) continue;
      if (pendingInvitees.has(inviteeUserId)) continue;

      try {
        const row = await this.prisma.joinInvitation.create({
          data: {
            joinId,
            inviterUserId: hostUserId,
            inviteeUserId,
            status: 'PENDING',
          },
          include: {
            invitee: { include: { profile: true } },
            inviter: { include: { profile: true } },
          },
        });

        await this.notifications.enqueueSafe({
          userId: inviteeUserId,
          type: NotificationType.JOIN_INVITATION,
          title: '조인 초대',
          body: `${join.host.profile?.nickname ?? '호스트'}님이 ${join.venue.name} 조인에 초대했습니다.`,
          data: {
            type: NotificationType.JOIN_INVITATION,
            joinId,
            invitationId: row.id,
          },
          eventKey: joinInvitationNotificationEventKey(inviteeUserId, row.id),
        });
        void this.analytics.trackOne({
          eventType: ProductEventType.JOIN_INVITATION_SENT,
          userId: hostUserId,
          joinId,
          source: 'api',
          metadata: { invitationId: row.id, inviteeUserId },
        });

        created.push(this.toDto(row, join.venue.name, join.startAt));
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          continue;
        }
        throw e;
      }
    }

    return created;
  }

  async accept(
    joinId: string,
    invitationId: string,
    userId: string,
  ): Promise<JoinDetailDto> {
    const invitation = await this.prisma.joinInvitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.joinId !== joinId) {
      throw new NotFoundException('invitation_not_found');
    }
    if (invitation.inviteeUserId !== userId) {
      throw new ForbiddenException('not_invitation_invitee');
    }
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('invitation_not_pending');
    }

    await this.prisma.$transaction(async (tx) => {
      const join = await tx.join.findUnique({
        where: { id: joinId },
        include: { participants: true },
      });
      if (!join) throw new NotFoundException('join_not_found');
      if (
        !isJoinCapacityJoinable({
          status: join.status,
          currentParticipants: join.confirmedPlayerCount,
          maxParticipants: join.plannedPlayerCount,
        })
      ) {
        throw new BadRequestException('join_not_joinable');
      }

      const existing = join.participants.find((p) => p.userId === userId);
      if (existing && existing.participationStatus !== 'CANCELLED') {
        throw new ConflictException('already_participant');
      }

      let participantId: string;
      if (existing) {
        const updated = await tx.joinParticipant.update({
          where: { id: existing.id },
          data: {
            participationStatus: 'APPROVED',
            approvedAt: new Date(),
            cancelledAt: null,
            attendanceIntent: 'PENDING',
            attendanceIntentAt: null,
          },
        });
        participantId = updated.id;
      } else {
        const created = await tx.joinParticipant.create({
          data: {
            joinId,
            userId,
            role: 'PARTICIPANT',
            participationStatus: 'APPROVED',
            approvedAt: new Date(),
          },
        });
        participantId = created.id;
      }

      const statuses = [
        ...join.participants
          .filter((p) => p.userId !== userId)
          .map((p) => p.participationStatus),
        'APPROVED',
      ];
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

      await this.settlement.ensureSettlementOnApprove(tx, {
        joinId,
        participantId,
        scheduledEndAt,
        rewardPerParticipant: join.rewardPerParticipant,
        coinAssetId: join.coinAssetId,
      });

      await tx.joinInvitation.update({
        where: { id: invitationId },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });
    });

    await this.chat.ensureRoomForJoin(joinId);
    await this.chat.onMemberJoined(joinId, userId);
    await this.urgent.clearIfNeeded(joinId);

    void this.analytics.trackOne({
      eventType: ProductEventType.JOIN_INVITATION_ACCEPTED,
      userId,
      joinId,
      source: 'api',
      metadata: { invitationId },
    });

    return this.joins.getDetail(joinId, userId);
  }

  async decline(
    joinId: string,
    invitationId: string,
    userId: string,
  ): Promise<JoinInvitationDto> {
    const invitation = await this.prisma.joinInvitation.findUnique({
      where: { id: invitationId },
      include: {
        inviter: { include: { profile: true } },
        invitee: { include: { profile: true } },
        join: { select: { venue: { select: { name: true } }, startAt: true } },
      },
    });
    if (!invitation || invitation.joinId !== joinId) {
      throw new NotFoundException('invitation_not_found');
    }
    if (invitation.inviteeUserId !== userId) {
      throw new ForbiddenException('not_invitation_invitee');
    }
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('invitation_not_pending');
    }

    const updated = await this.prisma.joinInvitation.update({
      where: { id: invitationId },
      data: { status: 'DECLINED', respondedAt: new Date() },
      include: {
        inviter: { include: { profile: true } },
        invitee: { include: { profile: true } },
      },
    });

    return this.toDto(updated, invitation.join.venue.name, invitation.join.startAt);
  }

  async listMine(userId: string): Promise<JoinInvitationDto[]> {
    const rows = await this.prisma.joinInvitation.findMany({
      where: { inviteeUserId: userId },
      include: {
        inviter: { include: { profile: true } },
        invitee: { include: { profile: true } },
        join: { select: { venue: { select: { name: true } }, startAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return rows.map((r) => this.toDto(r, r.join.venue.name, r.join.startAt));
  }

  private toDto(
    row: {
      id: string;
      joinId: string;
      status: string;
      inviterUserId: string;
      inviteeUserId: string;
      createdAt: Date;
      respondedAt: Date | null;
      inviter?: { profile: { nickname: string } | null } | null;
      invitee?: { profile: { nickname: string } | null } | null;
    },
    venueName?: string,
    startAt?: Date,
  ): JoinInvitationDto {
    return {
      invitationId: row.id,
      joinId: row.joinId,
      status: row.status as JoinInvitationDto['status'],
      inviterUserId: row.inviterUserId,
      inviterNickname: row.inviter?.profile?.nickname ?? '호스트',
      inviteeUserId: row.inviteeUserId,
      inviteeNickname: row.invitee?.profile?.nickname,
      venueName,
      startAt: startAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      respondedAt: row.respondedAt?.toISOString() ?? null,
    };
  }
}
