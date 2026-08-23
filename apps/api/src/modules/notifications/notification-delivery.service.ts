import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationOutboxStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NOTIFICATION_DELIVERY_PROVIDER,
  type NotificationDeliveryProvider,
  type PushMessage,
} from './providers/notification-delivery.provider';

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [30_000, 120_000, 600_000, 1_800_000, 3_600_000];

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_DELIVERY_PROVIDER)
    private readonly provider: NotificationDeliveryProvider,
  ) {}

  kick(): void {
    void this.deliverPending(30).catch((e) => {
      const msg = e instanceof Error ? e.message : 'deliver_failed';
      this.logger.warn(`notification_deliver_kick_failed err=${msg}`);
    });
  }

  async deliverPending(limit = 50): Promise<{ processed: number; sent: number; failed: number }> {
    if (this.running) return { processed: 0, sent: 0, failed: 0 };
    this.running = true;
    let processed = 0;
    let sent = 0;
    let failed = 0;
    try {
      const now = new Date();
      const rows = await this.prisma.notificationOutbox.findMany({
        where: {
          status: NotificationOutboxStatus.PENDING,
          nextAttemptAt: { lte: now },
        },
        orderBy: { nextAttemptAt: 'asc' },
        take: limit,
        include: {
          notification: {
            include: {
              user: {
                select: {
                  id: true,
                  pushNotificationsEnabled: true,
                  pushDevices: {
                    where: { active: true },
                    select: { id: true, pushToken: true },
                  },
                },
              },
            },
          },
        },
      });

      for (const row of rows) {
        processed += 1;
        const outcome = await this.deliverOne(row);
        if (outcome === 'sent') sent += 1;
        else if (outcome === 'failed') failed += 1;
      }
    } finally {
      this.running = false;
    }
    return { processed, sent, failed };
  }

  private async deliverOne(row: {
    id: string;
    attemptCount: number;
    notification: {
      id: string;
      type: string;
      title: string;
      body: string;
      data: unknown;
      userId: string;
      user: {
        pushNotificationsEnabled: boolean;
        pushDevices: Array<{ id: string; pushToken: string }>;
      };
    };
  }): Promise<'sent' | 'failed' | 'deferred'> {
    const { notification } = row;
    const devices = notification.user.pushNotificationsEnabled
      ? notification.user.pushDevices
      : [];

    if (devices.length === 0) {
      await this.prisma.notificationOutbox.update({
        where: { id: row.id },
        data: {
          status: NotificationOutboxStatus.SENT,
          sentAt: new Date(),
          lastError: 'no_active_devices_or_push_disabled',
          attemptCount: { increment: 1 },
        },
      });
      return 'sent';
    }

    const data =
      typeof notification.data === 'object' && notification.data !== null
        ? (notification.data as Record<string, unknown>)
        : {};

    const messages: PushMessage[] = devices.map((d) => ({
      to: d.pushToken,
      title: notification.title,
      body: notification.body,
      data: {
        ...data,
        notificationId: notification.id,
        type: notification.type,
      },
      channelId: 'jjoin-general',
    }));

    const results = await this.provider.sendPush(messages);
    let anyOk = false;
    let lastError: string | null = null;

    for (const result of results) {
      if (result.ok) {
        anyOk = true;
        continue;
      }
      lastError = result.errorCode ?? result.errorMessage ?? 'push_failed';
      if (result.invalidateToken) {
        await this.prisma.pushDevice.updateMany({
          where: { pushToken: result.token, active: true },
          data: { active: false },
        });
        this.logger.log(`push_device_deactivated code=${result.errorCode}`);
      }
    }

    const nextAttempt = row.attemptCount + 1;
    if (anyOk) {
      await this.prisma.notificationOutbox.update({
        where: { id: row.id },
        data: {
          status: NotificationOutboxStatus.SENT,
          sentAt: new Date(),
          attemptCount: nextAttempt,
          lastError: null,
        },
      });
      this.logger.log(
        `notification_push_sent type=${notification.type} user=${notification.userId.slice(0, 8)}`,
      );
      return 'sent';
    }

    if (nextAttempt >= MAX_ATTEMPTS) {
      await this.prisma.notificationOutbox.update({
        where: { id: row.id },
        data: {
          status: NotificationOutboxStatus.FAILED,
          attemptCount: nextAttempt,
          lastError: lastError?.slice(0, 300) ?? 'max_attempts',
        },
      });
      return 'failed';
    }

    const delay = BACKOFF_MS[Math.min(nextAttempt - 1, BACKOFF_MS.length - 1)]!;
    await this.prisma.notificationOutbox.update({
      where: { id: row.id },
      data: {
        status: NotificationOutboxStatus.PENDING,
        attemptCount: nextAttempt,
        lastError: lastError?.slice(0, 300) ?? 'retry',
        nextAttemptAt: new Date(Date.now() + delay),
      },
    });
    return 'deferred';
  }
}
