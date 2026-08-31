import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { notificationPreferenceSchema } from '@jjoin/validation';
import type {
  AppNotificationDto,
  NotificationDataDto,
  NotificationListResponse,
  NotificationPreferenceDto,
  NotificationType,
} from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationPreferenceStore } from './notification-preference.store';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly preferences: NotificationPreferenceStore,
  ) {}

  async list(
    userId: string,
    opts: { cursor?: string; limit?: number } = {},
  ): Promise<NotificationListResponse> {
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
    const rows = await this.prisma.appNotification.findMany({
      where: {
        userId,
        ...(opts.cursor ? { createdAt: { lt: new Date(opts.cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const unreadCount = await this.prisma.appNotification.count({
      where: { userId, readAt: null },
    });

    return {
      items: page.map((r) => this.toDto(r)),
      nextCursor: hasMore ? page[page.length - 1]!.createdAt.toISOString() : null,
      unreadCount,
    };
  }

  async unreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.prisma.appNotification.count({
      where: { userId, readAt: null },
    });
    return { unreadCount };
  }

  async markRead(userId: string, notificationId: string): Promise<AppNotificationDto> {
    const row = await this.prisma.appNotification.findUnique({
      where: { id: notificationId },
    });
    if (!row) throw new NotFoundException('notification_not_found');
    if (row.userId !== userId) throw new ForbiddenException('notification_forbidden');
    if (row.readAt) return this.toDto(row);

    const updated = await this.prisma.appNotification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
    return this.toDto(updated);
  }

  async markAllRead(userId: string): Promise<{ ok: boolean; count: number }> {
    const result = await this.prisma.appNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true, count: result.count };
  }

  async getPreference(userId: string): Promise<NotificationPreferenceDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushNotificationsEnabled: true },
    });
    if (!user) throw new NotFoundException('user_not_found');
    const granular = await this.preferences.getOrCreate(userId);
    return {
      pushEnabled: user.pushNotificationsEnabled,
      ...granular,
    };
  }

  async setPreference(userId: string, raw: unknown): Promise<NotificationPreferenceDto> {
    const parsed = notificationPreferenceSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_preference');

    const { pushEnabled, ...granularPatch } = parsed.data;
    const granularKeys = [
      'joinAlertsEnabled',
      'followedStoreEnabled',
      'urgentJoinEnabled',
      'invitationEnabled',
      'attendanceReminderEnabled',
      'bookmarkUpdatesEnabled',
    ] as const;
    const patch: Partial<Record<(typeof granularKeys)[number], boolean>> = {};
    for (const key of granularKeys) {
      if (granularPatch[key] !== undefined) patch[key] = granularPatch[key];
    }

    if (pushEnabled !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { pushNotificationsEnabled: pushEnabled },
      });
    }
    if (Object.keys(patch).length > 0) {
      await this.preferences.update(userId, patch);
    }

    return this.getPreference(userId);
  }

  private toDto(row: {
    id: string;
    type: string;
    title: string;
    body: string;
    data: unknown;
    readAt: Date | null;
    createdAt: Date;
  }): AppNotificationDto {
    const data =
      typeof row.data === 'object' && row.data !== null
        ? (row.data as NotificationDataDto)
        : { type: row.type as NotificationType };
    return {
      id: row.id,
      type: row.type as NotificationType,
      title: row.title,
      body: row.body,
      data,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
