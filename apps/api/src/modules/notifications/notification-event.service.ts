import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import {
  JOIN_CREATED_RATE_LIMIT,
  NOTIFICATION_METRIC_NAMES,
  buildNotificationContent,
  buildNotificationEventKey,
  incrementNotificationCounter,
  shouldRateLimitJoinCreated,
  type NotificationContentContext,
} from '@jjoin/domain';
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

export type EnqueueTypedNotificationInput = {
  userId: string;
  type: NotificationType;
  context?: NotificationContentContext;
  data: Record<string, unknown>;
  targetEntityId: string;
  messageId?: string;
  eventKey?: string;
  actorUserId?: string;
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
      if (input.type === NotificationType.JOIN_CREATED) {
        const limited = await this.isJoinCreatedRateLimited(input.userId);
        if (limited) {
          incrementNotificationCounter(NOTIFICATION_METRIC_NAMES.joinCreatedRateLimited);
          return;
        }
      }
      const result = await this.enqueue(input);
      incrementNotificationCounter(
        result.created
          ? NOTIFICATION_METRIC_NAMES.enqueued
          : NOTIFICATION_METRIC_NAMES.enqueueDeduped,
      );
      this.delivery.kick();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'enqueue_failed';
      this.logger.warn(`notification_enqueue_failed type=${input.type} err=${msg}`);
    }
  }

  /** Typed entry: formatter + idempotency + block check. Never throws. */
  async enqueueTypedSafe(input: EnqueueTypedNotificationInput): Promise<void> {
    try {
      if (input.actorUserId && (await this.isBlockedEitherWay(input.actorUserId, input.userId))) {
        return;
      }
      const copy = buildNotificationContent(input.type, input.context);
      const eventKey =
        input.eventKey ??
        buildNotificationEventKey({
          type: input.type,
          recipientUserId: input.userId,
          targetEntityId: input.targetEntityId,
          messageId: input.messageId,
        });
      await this.enqueueSafe({
        userId: input.userId,
        type: input.type,
        title: copy.title,
        body: copy.body,
        data: { type: input.type, ...input.data },
        eventKey,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'enqueue_typed_failed';
      this.logger.warn(`notification_enqueue_typed_failed type=${input.type} err=${msg}`);
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

  private async isJoinCreatedRateLimited(userId: string): Promise<boolean> {
    const since = new Date(Date.now() - JOIN_CREATED_RATE_LIMIT.windowMinutes * 60_000);
    const recentCount = await this.prisma.appNotification.count({
      where: {
        userId,
        type: NotificationType.JOIN_CREATED,
        createdAt: { gte: since },
      },
    });
    return shouldRateLimitJoinCreated(recentCount, JOIN_CREATED_RATE_LIMIT.maxPerRecipient);
  }

  private async isBlockedEitherWay(userA: string, userB: string): Promise<boolean> {
    const row = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerUserId: userA, blockedUserId: userB },
          { blockerUserId: userB, blockedUserId: userA },
        ],
      },
      select: { id: true },
    });
    return Boolean(row);
  }
}
