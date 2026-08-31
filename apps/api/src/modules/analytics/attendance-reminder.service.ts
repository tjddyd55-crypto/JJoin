import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import {
  attendanceReminderCopy,
  attendanceReminderEventKey,
  isJoinInAttendanceReminderWindow,
  type AttendanceReminderKind,
} from '@jjoin/domain';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEventService } from '../notifications/notification-event.service';
import { NotificationDeliveryService } from '../notifications/notification-delivery.service';

const REMINDER_KINDS: AttendanceReminderKind[] = ['24h', '3h'];

@Injectable()
export class AttendanceReminderService {
  private readonly logger = new Logger(AttendanceReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationEventService,
    private readonly delivery: NotificationDeliveryService,
  ) {}

  async runBatch(): Promise<{ scannedJoins: number; enqueued: number; skipped: number }> {
    const now = new Date();
    let scannedJoins = 0;
    let enqueued = 0;
    let skipped = 0;

    const joins = await this.prisma.join.findMany({
      where: {
        status: { in: ['OPEN', 'FULL', 'CONFIRMED', 'IN_PROGRESS'] },
        startAt: { gt: now },
        cancelledAt: null,
      },
      select: {
        id: true,
        startAt: true,
        venue: { select: { name: true } },
        participants: {
          select: {
            userId: true,
            role: true,
            participationStatus: true,
            attendanceIntent: true,
          },
        },
      },
      take: 500,
      orderBy: { startAt: 'asc' },
    });

    for (const join of joins) {
      scannedJoins += 1;
      const kinds = REMINDER_KINDS.filter((k) =>
        isJoinInAttendanceReminderWindow(join.startAt, now, k),
      );
      if (kinds.length === 0) continue;

      for (const participant of join.participants) {
        if (participant.role === 'HOST') continue;
        if (
          participant.participationStatus !== 'APPROVED' &&
          participant.participationStatus !== 'CONFIRMED'
        ) {
          skipped += 1;
          continue;
        }
        if (participant.attendanceIntent === 'DECLINED') {
          skipped += 1;
          continue;
        }

        for (const kind of kinds) {
          const copy = attendanceReminderCopy(
            kind,
            join.venue.name,
            participant.attendanceIntent,
          );
          const result = await this.notifications.enqueue({
            userId: participant.userId,
            type: NotificationType.JOIN_STARTING_SOON,
            title: copy.title,
            body: copy.body,
            data: {
              type: NotificationType.JOIN_STARTING_SOON,
              joinId: join.id,
              reminderKind: kind,
            },
            eventKey: attendanceReminderEventKey(kind, participant.userId, join.id),
          });
          if (result.created) enqueued += 1;
          else skipped += 1;
        }
      }
    }

    this.delivery.kick();
    this.logger.log(
      `attendance_reminder_batch scanned=${scannedJoins} enqueued=${enqueued} skipped=${skipped}`,
    );
    return { scannedJoins, enqueued, skipped };
  }
}
