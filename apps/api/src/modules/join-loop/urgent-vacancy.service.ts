import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  canActivateUrgentVacancy,
  isJoinCapacityJoinable,
  localDayKey,
  shouldClearUrgent,
  urgentJoinNotificationEventKey,
} from '@jjoin/domain';
import type { ActivateUrgentVacancyRequest, JoinDetailDto } from '@jjoin/types';
import { NotificationType, ProductEventType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEventService } from '../notifications/notification-event.service';
import { ProductEventsService } from '../analytics/product-events.service';
import { JoinsService } from '../joins/joins.service';
import { forwardRef, Inject } from '@nestjs/common';

@Injectable()
export class UrgentVacancyService {
  private readonly logger = new Logger(UrgentVacancyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationEventService,
    private readonly analytics: ProductEventsService,
    @Inject(forwardRef(() => JoinsService))
    private readonly joins: JoinsService,
  ) {}

  async activate(
    joinId: string,
    hostUserId: string,
    body: ActivateUrgentVacancyRequest = {},
  ): Promise<JoinDetailDto> {
    const join = await this.prisma.join.findUnique({ where: { id: joinId } });
    if (!join) throw new NotFoundException('join_not_found');
    if (join.hostUserId !== hostUserId) {
      throw new ForbiddenException('not_join_host');
    }

    const now = new Date();
    if (
      !canActivateUrgentVacancy({
        status: join.status,
        startAt: join.startAt,
        plannedPlayerCount: join.plannedPlayerCount,
        confirmedPlayerCount: join.confirmedPlayerCount,
        now,
      })
    ) {
      throw new BadRequestException('urgent_vacancy_not_allowed');
    }

    const remaining = join.plannedPlayerCount - join.confirmedPlayerCount;
    const seats =
      body.seats != null && Number.isFinite(body.seats)
        ? Math.min(Math.max(1, Math.floor(body.seats)), remaining)
        : remaining;

    if (seats <= 0) {
      throw new BadRequestException('urgent_vacancy_no_seats');
    }

    await this.prisma.join.update({
      where: { id: joinId },
      data: {
        isUrgent: true,
        urgentSeats: seats,
        urgentUntil: join.startAt,
      },
    });

    void this.notifyUrgentOpened(joinId).catch((e) => {
      const msg = e instanceof Error ? e.message : 'notify_failed';
      this.logger.warn(`urgent notify failed joinId=${joinId} err=${msg}`);
    });

    return this.joins.getDetail(joinId, hostUserId);
  }

  async clear(joinId: string, hostUserId: string): Promise<JoinDetailDto> {
    const join = await this.prisma.join.findUnique({ where: { id: joinId } });
    if (!join) throw new NotFoundException('join_not_found');
    if (join.hostUserId !== hostUserId) {
      throw new ForbiddenException('not_join_host');
    }

    await this.prisma.join.update({
      where: { id: joinId },
      data: {
        isUrgent: false,
        urgentSeats: null,
        urgentUntil: null,
      },
    });

    return this.joins.getDetail(joinId, hostUserId);
  }

  /** Auto-clear when full / no longer urgent-eligible. Fire after apply/approve. */
  async clearIfNeeded(joinId: string): Promise<boolean> {
    const join = await this.prisma.join.findUnique({ where: { id: joinId } });
    if (!join || !join.isUrgent) return false;

    const now = new Date();
    if (
      !shouldClearUrgent({
        isUrgent: join.isUrgent,
        status: join.status,
        planned: join.plannedPlayerCount,
        confirmed: join.confirmedPlayerCount,
        startAt: join.startAt,
        now,
        urgentUntil: join.urgentUntil,
      })
    ) {
      return false;
    }

    await this.prisma.join.update({
      where: { id: joinId },
      data: {
        isUrgent: false,
        urgentSeats: null,
        urgentUntil: null,
      },
    });
    return true;
  }

  private async notifyUrgentOpened(joinId: string): Promise<void> {
    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: {
        venue: {
          include: {
            golfFacility: { select: { id: true, displayName: true } },
          },
        },
        participants: {
          where: {
            participationStatus: { in: ['APPROVED', 'CONFIRMED', 'COMPLETED'] },
          },
          select: { userId: true },
        },
      },
    });
    if (!join || !join.isUrgent) return;
    if (
      !isJoinCapacityJoinable({
        status: join.status,
        currentParticipants: join.confirmedPlayerCount,
        maxParticipants: join.plannedPlayerCount,
      })
    ) {
      return;
    }

    const venueName = join.venue.name;
    const facilityId = join.venue.golfFacilityId;
    const recipients = new Set<string>();

    // Condition alerts (today + joinable)
    const subscriptions = await this.prisma.joinAlertSubscription.findMany({
      where: { enabled: true },
    });
    const todayKey = localDayKey(join.startAt);
    for (const sub of subscriptions) {
      if (sub.userId === join.hostUserId) continue;
      if (sub.joinableOnly === false) continue;
      if (sub.dateMode === 'TODAY' && todayKey !== localDayKey(new Date())) continue;
      recipients.add(sub.userId);
    }

    if (facilityId) {
      const followers = await this.prisma.golfFacilityFollow.findMany({
        where: { golfFacilityId: facilityId },
        select: { userId: true },
      });
      for (const f of followers) {
        if (f.userId !== join.hostUserId) recipients.add(f.userId);
      }
    }

    // Played-together candidates: co-participants from COMPLETED joins with host
    const playedRows = await this.prisma.$queryRaw<Array<{ user_id: string }>>`
      SELECT DISTINCT jp.user_id
      FROM join_participants jp
      INNER JOIN joins j ON j.id = jp.join_id
      WHERE j.status = 'COMPLETED'
        AND jp.participation_status = 'COMPLETED'
        AND jp.user_id <> ${join.hostUserId}::uuid
        AND jp.join_id IN (
          SELECT jp2.join_id
          FROM join_participants jp2
          WHERE jp2.user_id = ${join.hostUserId}::uuid
            AND jp2.participation_status = 'COMPLETED'
        )
      LIMIT 200
    `;
    for (const row of playedRows) {
      recipients.add(row.user_id);
    }

    // Never notify current roster
    for (const p of join.participants) {
      recipients.delete(p.userId);
    }
    recipients.delete(join.hostUserId);

    for (const userId of recipients) {
      await this.notifications.enqueueSafe({
        userId,
        type: NotificationType.URGENT_JOIN_OPENED,
        title: '긴급 모집 오픈',
        body: `${venueName}에 급구 자리가 열렸습니다.`,
        data: {
          type: NotificationType.URGENT_JOIN_OPENED,
          joinId: join.id,
          venueName,
          golfFacilityId: facilityId,
        },
        eventKey: urgentJoinNotificationEventKey(userId, join.id),
      });
    }

    if (recipients.size > 0) {
      void this.analytics.trackOne({
        eventType: ProductEventType.URGENT_JOIN_OPENED,
        joinId: join.id,
        golfFacilityId: facilityId ?? undefined,
        source: 'api',
        metadata: { recipientCount: recipients.size },
      });
    }
  }
}
