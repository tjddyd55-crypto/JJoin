import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDeliveryService } from './notification-delivery.service';

export type EnqueueNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  eventKey: string;
};

/**
 * Business modules only enqueue. Push delivery is eventual and never rolls back callers.
 */
@Injectable()
export class NotificationEventService {
  private readonly logger = new Logger(NotificationEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: NotificationDeliveryService,
  ) {}

  /** After business COMMIT. Never throws to callers. */
  async enqueueSafe(input: EnqueueNotificationInput): Promise<void> {
    try {
      await this.enqueue(input);
      this.delivery.kick();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'enqueue_failed';
      this.logger.warn(`notification_enqueue_failed type=${input.type} err=${msg}`);
    }
  }

  async enqueue(input: EnqueueNotificationInput): Promise<{ created: boolean; id: string }> {
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const notification = await tx.appNotification.create({
          data: {
            userId: input.userId,
            type: input.type,
            title: input.title,
            body: input.body,
            data: input.data as Prisma.InputJsonValue,
            eventKey: input.eventKey,
          },
        });
        await tx.notificationOutbox.create({
          data: { notificationId: notification.id },
        });
        return notification;
      });
      return { created: true, id: row.id };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const existing = await this.prisma.appNotification.findUnique({
          where: { eventKey: input.eventKey },
        });
        if (existing) return { created: false, id: existing.id };
      }
      throw e;
    }
  }
}
