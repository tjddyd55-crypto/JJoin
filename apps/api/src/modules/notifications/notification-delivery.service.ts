import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationOutboxStatus } from '@prisma/client';
import {
  NOTIFICATION_METRIC_NAMES,
  NOTIFICATION_OUTBOX_BACKOFF_MS,
  NOTIFICATION_OUTBOX_MAX_ATTEMPTS,
  NOTIFICATION_OUTBOX_STALE_PROCESSING_MS,
  buildAndroidCollapseKey,
  incrementNotificationCounter,
  shouldDeliverPushForType,
} from '@jjoin/domain';
import { resolveApiAppVariantDb } from '../../config/app-variant';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationPreferenceStore } from './notification-preference.store';
import {
  NOTIFICATION_DELIVERY_PROVIDER,
  type NotificationDeliveryProvider,
  type PushMessage,
} from './providers/notification-delivery.provider';

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly preferences: NotificationPreferenceStore,
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
      await this.reclaimStaleProcessing();
      const rows = await this.loadDueRows(limit);
      for (const row of rows) {
        const claimed = await this.claimRow(row.id);
        if (!claimed) continue;
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

  private async reclaimStaleProcessing(): Promise<void> {
    const staleBefore = new Date(Date.now() - NOTIFICATION_OUTBOX_STALE_PROCESSING_MS);
    await this.prisma.notificationOutbox.updateMany({
      where: {
        status: NotificationOutboxStatus.PROCESSING,
        updatedAt: { lte: staleBefore },
      },
      data: { status: NotificationOutboxStatus.RETRY },
    });
  }

  private async loadDueRows(limit: number) {
    const now = new Date();
    const apiVariant = resolveApiAppVariantDb();
    return this.prisma.notificationOutbox.findMany({
      where: {
        status: { in: [NotificationOutboxStatus.PENDING, NotificationOutboxStatus.RETRY] },
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
                  where: { active: true, appVariant: apiVariant },
                  select: { id: true, pushToken: true },
                },
              },
            },
          },
        },
      },
    });
  }

  private async claimRow(id: string): Promise<boolean> {
    const claimed = await this.prisma.notificationOutbox.updateMany({
      where: {
        id,
        status: { in: [NotificationOutboxStatus.PENDING, NotificationOutboxStatus.RETRY] },
      },
      data: { status: NotificationOutboxStatus.PROCESSING },
    });
    return claimed.count === 1;
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
    const prefs = await this.preferences.getOrCreate(notification.userId);
    const pushAllowed = shouldDeliverPushForType(
      notification.type,
      prefs,
      notification.user.pushNotificationsEnabled,
    );
    const devices = pushAllowed ? notification.user.pushDevices : [];

    if (devices.length === 0) {
      incrementNotificationCounter(NOTIFICATION_METRIC_NAMES.pushSkippedPreference);
      await this.markSent(row.id, row.attemptCount + 1, pushAllowed ? 'no_active_devices' : 'push_skipped_by_preference');
      return 'sent';
    }

    const data = this.asRecord(notification.data);
    const collapseId = buildAndroidCollapseKey(
      notification.type,
      String(data.conversationId ?? data.joinId ?? data.clubId ?? notification.id),
    );
    const messages: PushMessage[] = devices.map((d) => ({
      to: d.pushToken,
      title: notification.title,
      body: notification.body,
      data: { ...data, notificationId: notification.id, type: notification.type },
      channelId: 'jjoin-general',
      collapseId,
      tag: collapseId,
    }));

    const results = await this.provider.sendPush(messages);
    return this.persistSendResults(row, results);
  }

  private async persistSendResults(
    row: { id: string; attemptCount: number; notification: { type: string; userId: string } },
    results: Array<{ ok: boolean; errorCode?: string; errorMessage?: string; invalidateToken?: boolean; token: string }>,
  ): Promise<'sent' | 'failed' | 'deferred'> {
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
      incrementNotificationCounter(NOTIFICATION_METRIC_NAMES.pushSent);
      await this.markSent(row.id, nextAttempt, null);
      this.logger.log(
        `notification_push_sent type=${row.notification.type} user=${row.notification.userId.slice(0, 8)}`,
      );
      return 'sent';
    }
    if (nextAttempt >= NOTIFICATION_OUTBOX_MAX_ATTEMPTS) {
      incrementNotificationCounter(NOTIFICATION_METRIC_NAMES.pushFailedTerminal);
      await this.prisma.notificationOutbox.update({
        where: { id: row.id },
        data: {
          status: NotificationOutboxStatus.FAILED_TERMINAL,
          attemptCount: nextAttempt,
          lastError: lastError?.slice(0, 300) ?? 'max_attempts',
        },
      });
      return 'failed';
    }
    incrementNotificationCounter(NOTIFICATION_METRIC_NAMES.pushRetry);
    const delay = NOTIFICATION_OUTBOX_BACKOFF_MS[Math.min(nextAttempt - 1, NOTIFICATION_OUTBOX_BACKOFF_MS.length - 1)]!;
    await this.prisma.notificationOutbox.update({
      where: { id: row.id },
      data: {
        status: NotificationOutboxStatus.RETRY,
        attemptCount: nextAttempt,
        lastError: lastError?.slice(0, 300) ?? 'retry',
        nextAttemptAt: new Date(Date.now() + delay),
      },
    });
    return 'deferred';
  }

  private async markSent(id: string, attemptCount: number, lastError: string | null): Promise<void> {
    await this.prisma.notificationOutbox.update({
      where: { id },
      data: {
        status: NotificationOutboxStatus.SENT,
        sentAt: new Date(),
        attemptCount,
        lastError,
      },
    });
  }

  private asRecord(data: unknown): Record<string, unknown> {
    if (typeof data === 'object' && data !== null) return data as Record<string, unknown>;
    return {};
  }
}
