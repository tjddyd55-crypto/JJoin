import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { notificationPreferenceSchema } from '@jjoin/validation';
import {
  isKnownFieldNotificationRegion,
  parseFieldRegionsJson,
  resolveEffectiveFieldNotificationRegions,
} from '@jjoin/domain';
import type {
  AppNotificationDto,
  FieldNotificationRegionDto,
  NotificationDataDto,
  NotificationListResponse,
  NotificationPreferenceDto,
  NotificationType,
} from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationPreferenceStore,
  type StoredNotificationPreference,
} from './notification-preference.store';

const BOOLEAN_PREF_KEYS = [
  'joinAlertsEnabled',
  'followedStoreEnabled',
  'urgentJoinEnabled',
  'invitationEnabled',
  'attendanceReminderEnabled',
  'bookmarkUpdatesEnabled',
  'profileMatchEnabled',
  'joinCreatedEnabled',
] as const;

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
      select: {
        pushNotificationsEnabled: true,
        profile: { select: { regionLabel: true, regionCode: true } },
        joinRegionPreferences: { select: { sido: true, sigungu: true } },
      },
    });
    if (!user) throw new NotFoundException('user_not_found');
    const granular = await this.preferences.getOrCreate(userId);
    return this.toPreferenceDto(user.pushNotificationsEnabled, granular, {
      regionLabel: user.profile?.regionLabel,
      regionCode: user.profile?.regionCode,
      activityRegions: user.joinRegionPreferences,
    });
  }

  async setPreference(userId: string, raw: unknown): Promise<NotificationPreferenceDto> {
    if (raw && typeof raw === 'object' && 'userId' in raw) {
      throw new BadRequestException('invalid_preference');
    }
    const parsed = notificationPreferenceSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_preference');

    const data = parsed.data;
    const current = await this.preferences.getOrCreate(userId);
    const home = await this.loadHomeContext(userId);
    const nextPatch = this.buildPreferencePatch(data, current, home);
    if (data.pushEnabled === undefined && Object.keys(nextPatch).length === 0) {
      throw new BadRequestException('invalid_preference');
    }

    if (data.pushEnabled !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { pushNotificationsEnabled: data.pushEnabled },
      });
    }
    if (Object.keys(nextPatch).length > 0) {
      await this.preferences.update(userId, nextPatch);
    }
    return this.getPreference(userId);
  }

  private buildPreferencePatch(
    data: ReturnType<typeof notificationPreferenceSchema.parse>,
    current: StoredNotificationPreference,
    home: {
      regionLabel?: string | null;
      regionCode?: string | null;
      activityRegions: Array<{ sido: string; sigungu: string }>;
    },
  ): Partial<StoredNotificationPreference> {
    const patch: Partial<StoredNotificationPreference> = {};
    for (const key of BOOLEAN_PREF_KEYS) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    if (data.screenRadiusMode) patch.screenRadiusMode = data.screenRadiusMode;
    if (data.fieldRegionsResetToAuto) {
      patch.fieldRegionMode = 'AUTO';
      patch.fieldRegions = [];
      return patch;
    }
    if (data.fieldRegionMode === 'AUTO') {
      patch.fieldRegionMode = 'AUTO';
      patch.fieldRegions = [];
    }
    if (data.fieldRegionMode === 'CUSTOM') {
      patch.fieldRegionMode = 'CUSTOM';
      patch.fieldRegions = this.resolveCustomRegions(data.fieldRegions, current, home);
    } else if (data.fieldRegions && current.fieldRegionMode === 'CUSTOM') {
      patch.fieldRegions = this.resolveCustomRegions(data.fieldRegions, current, home);
    }
    return patch;
  }

  private resolveCustomRegions(
    incoming: Array<{ province: string; cityCounty?: string | null }> | undefined,
    current: StoredNotificationPreference,
    home: {
      regionLabel?: string | null;
      regionCode?: string | null;
      activityRegions: Array<{ sido: string; sigungu: string }>;
    },
  ) {
    const raw = incoming ?? current.fieldRegions;
    const regions = parseFieldRegionsJson(raw).length
      ? parseFieldRegionsJson(raw)
      : resolveEffectiveFieldNotificationRegions({
          mode: 'AUTO',
          customRegions: [],
          homeRegion: home,
          activityRegions: home.activityRegions,
        });
    if (regions.some((region) => !isKnownFieldNotificationRegion(region))) {
      throw new BadRequestException('invalid_field_regions');
    }
    return regions;
  }

  private async loadHomeContext(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        profile: { select: { regionLabel: true, regionCode: true } },
        joinRegionPreferences: { select: { sido: true, sigungu: true } },
      },
    });
    return {
      regionLabel: user?.profile?.regionLabel,
      regionCode: user?.profile?.regionCode,
      activityRegions: user?.joinRegionPreferences ?? [],
    };
  }

  private toPreferenceDto(
    pushEnabled: boolean,
    granular: StoredNotificationPreference,
    home: {
      regionLabel?: string | null;
      regionCode?: string | null;
      activityRegions: Array<{ sido: string; sigungu: string }>;
    },
  ): NotificationPreferenceDto {
    const resolvedFieldRegions = resolveEffectiveFieldNotificationRegions({
      mode: granular.fieldRegionMode,
      customRegions: granular.fieldRegions,
      homeRegion: home,
      activityRegions: home.activityRegions,
    }) as FieldNotificationRegionDto[];
    return {
      pushEnabled,
      joinAlertsEnabled: granular.joinAlertsEnabled,
      followedStoreEnabled: granular.followedStoreEnabled,
      urgentJoinEnabled: granular.urgentJoinEnabled,
      invitationEnabled: granular.invitationEnabled,
      attendanceReminderEnabled: granular.attendanceReminderEnabled,
      bookmarkUpdatesEnabled: granular.bookmarkUpdatesEnabled,
      profileMatchEnabled: granular.profileMatchEnabled,
      joinCreatedEnabled: granular.joinCreatedEnabled,
      screenRadiusMode: granular.screenRadiusMode,
      fieldRegionMode: granular.fieldRegionMode,
      fieldRegions: granular.fieldRegions as FieldNotificationRegionDto[],
      resolvedFieldRegions,
    };
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
