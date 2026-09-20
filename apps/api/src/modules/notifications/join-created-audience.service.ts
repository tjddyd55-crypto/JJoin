import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import {
  JOIN_CREATED_AUDIENCE_BATCH_SIZE,
  NOTIFICATION_METRIC_NAMES,
  boundingBoxForRadiusKm,
  collectPaginatedAudienceIds,
  incrementNotificationCounter,
  isBlockedEitherWay,
  isWithinScreenRadius,
  listSidoSpellings,
  matchesFieldNotificationRegions,
  normalizeSido,
  parseFieldRegionsJson,
  parseHomeRegion,
  resolveEffectiveFieldNotificationRegions,
  shouldExcludeHost,
  type ScreenNotificationRadiusMode,
} from '@jjoin/domain';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEventService } from './notification-event.service';

type JoinCreatedContext = {
  joinId: string;
  hostUserId: string;
  venueType: 'SCREEN' | 'FIELD';
  venueName: string;
  latitude: number;
  longitude: number;
  sido: string | null;
  sigungu: string | null;
};

type SameAdminAudienceRow = {
  userId: string;
  user: { profile: { regionLabel: string | null; regionCode: string | null } | null };
};

type FieldAutoAudienceRow = {
  id: string;
  profile: { regionLabel: string | null; regionCode: string | null } | null;
  joinRegionPreferences: Array<{ sido: string; sigungu: string }>;
  notificationPreference: { fieldRegions: unknown; fieldRegionMode: string } | null;
};

type FieldCustomAudienceRow = { user_id: string };

@Injectable()
export class JoinCreatedAudienceService {
  private readonly logger = new Logger(JoinCreatedAudienceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationEventService,
  ) {}

  async notifyJoinCreated(joinId: string): Promise<void> {
    try {
      const ctx = await this.loadJoinContext(joinId);
      if (!ctx) return;
      const blocked = await this.loadHostBlocks(ctx.hostUserId);
      const recipients =
        ctx.venueType === 'FIELD'
          ? await this.collectFieldRecipients(ctx, blocked)
          : await this.collectScreenRecipients(ctx, blocked);
      incrementNotificationCounter(NOTIFICATION_METRIC_NAMES.joinCreatedAudience, recipients.length);
      for (const userId of recipients) {
        await this.notifications.enqueueTypedSafe({
          userId,
          type: NotificationType.JOIN_CREATED,
          targetEntityId: ctx.joinId,
          actorUserId: ctx.hostUserId,
          context: { venueName: ctx.venueName },
          data: { type: NotificationType.JOIN_CREATED, joinId: ctx.joinId, venueName: ctx.venueName },
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'join_created_audience_failed';
      this.logger.warn(`notifyJoinCreated failed joinId=${joinId} err=${msg}`);
    }
  }

  private async loadJoinContext(joinId: string): Promise<JoinCreatedContext | null> {
    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: {
        venue: {
          include: {
            golfFacility: { select: { sido: true, sigungu: true, displayName: true } },
            fieldGolfCourse: { select: { sido: true, sigungu: true } },
          },
        },
      },
    });
    if (!join) return null;
    const venue = join.venue;
    const sido = venue.fieldGolfCourse?.sido ?? venue.golfFacility?.sido ?? venue.region ?? null;
    const sigungu = venue.fieldGolfCourse?.sigungu ?? venue.golfFacility?.sigungu ?? null;
    return {
      joinId: join.id,
      hostUserId: join.hostUserId,
      venueType: venue.venueType === 'FIELD' ? 'FIELD' : 'SCREEN',
      venueName: venue.golfFacility?.displayName ?? venue.name,
      latitude: Number(venue.latitude),
      longitude: Number(venue.longitude),
      sido,
      sigungu,
    };
  }

  private async loadHostBlocks(hostUserId: string) {
    return this.prisma.userBlock.findMany({
      where: { OR: [{ blockerUserId: hostUserId }, { blockedUserId: hostUserId }] },
      select: { blockerUserId: true, blockedUserId: true },
    });
  }

  private eligible(userId: string, hostUserId: string, blocks: Array<{ blockerUserId: string; blockedUserId: string }>) {
    if (shouldExcludeHost(userId, hostUserId)) return false;
    return !isBlockedEitherWay(blocks, userId, hostUserId);
  }

  private async collectScreenRecipients(
    ctx: JoinCreatedContext,
    blocks: Array<{ blockerUserId: string; blockedUserId: string }>,
  ): Promise<string[]> {
    const radiusUsers = await this.collectScreenRadiusUsers(ctx, blocks);
    const adminUsers = await this.collectSameAdminRegionUsers(ctx, blocks);
    return [...new Set([...radiusUsers, ...adminUsers])];
  }

  private async collectScreenRadiusUsers(
    ctx: JoinCreatedContext,
    blocks: Array<{ blockerUserId: string; blockedUserId: string }>,
  ): Promise<string[]> {
    const box = boundingBoxForRadiusKm(
      { latitude: ctx.latitude, longitude: ctx.longitude },
      30,
    );
    const ids: string[] = [];
    let cursor: string | undefined;
    while (true) {
      const page = await this.prisma.userPresence.findMany({
        where: {
          userId: { not: ctx.hostUserId },
          latitude: { gte: box.minLat, lte: box.maxLat },
          longitude: { gte: box.minLng, lte: box.maxLng },
          user: {
            OR: [
              { notificationPreference: null },
              {
                notificationPreference: {
                  joinCreatedEnabled: true,
                  screenRadiusMode: { not: 'SAME_ADMIN_REGION' },
                },
              },
            ],
          },
        },
        orderBy: { userId: 'asc' },
        take: JOIN_CREATED_AUDIENCE_BATCH_SIZE,
        ...(cursor ? { cursor: { userId: cursor }, skip: 1 } : {}),
        select: {
          userId: true,
          latitude: true,
          longitude: true,
          user: {
            select: {
              notificationPreference: { select: { screenRadiusMode: true } },
              profile: { select: { regionLabel: true, regionCode: true } },
            },
          },
        },
      });
      for (const row of page) {
        if (!this.eligible(row.userId, ctx.hostUserId, blocks)) continue;
        const home = parseHomeRegion(row.user.profile);
        const mode = (row.user.notificationPreference?.screenRadiusMode ??
          'KM_15') as ScreenNotificationRadiusMode;
        const inside = isWithinScreenRadius({
          user: { latitude: Number(row.latitude), longitude: Number(row.longitude) },
          venue: { latitude: ctx.latitude, longitude: ctx.longitude },
          mode,
          userSido: home.sido,
          userSigungu: home.sigungu,
          venueSido: ctx.sido,
          venueSigungu: ctx.sigungu,
        });
        if (inside) ids.push(row.userId);
      }
      if (page.length < JOIN_CREATED_AUDIENCE_BATCH_SIZE) break;
      cursor = page[page.length - 1]!.userId;
    }
    return ids;
  }

  private async collectSameAdminRegionUsers(
    ctx: JoinCreatedContext,
    blocks: Array<{ blockerUserId: string; blockedUserId: string }>,
  ): Promise<string[]> {
    const spellings = listSidoSpellings(ctx.sido);
    if (spellings.length === 0) return [];
    return collectPaginatedAudienceIds<SameAdminAudienceRow>({
      pageSize: JOIN_CREATED_AUDIENCE_BATCH_SIZE,
      cursorOf: (row) => row.userId,
      idOf: (row) => row.userId,
      include: (row) => {
        if (!this.eligible(row.userId, ctx.hostUserId, blocks)) return false;
        const home = parseHomeRegion(row.user.profile);
        return isWithinScreenRadius({
          user: { latitude: 0, longitude: 0 },
          venue: { latitude: 0, longitude: 0 },
          mode: 'SAME_ADMIN_REGION',
          userSido: home.sido,
          userSigungu: home.sigungu,
          venueSido: ctx.sido,
          venueSigungu: ctx.sigungu,
        });
      },
      fetchPage: (cursor, take) =>
        this.prisma.notificationPreference.findMany({
          where: {
            joinCreatedEnabled: true,
            screenRadiusMode: 'SAME_ADMIN_REGION',
            userId: { not: ctx.hostUserId },
            user: {
              profile: {
                OR: spellings.map((sido) => ({ regionLabel: { contains: sido } })),
              },
            },
          },
          orderBy: { userId: 'asc' },
          take,
          ...(cursor ? { cursor: { userId: cursor }, skip: 1 } : {}),
          select: {
            userId: true,
            user: { select: { profile: { select: { regionLabel: true, regionCode: true } } } },
          },
        }),
    });
  }

  private async collectFieldRecipients(
    ctx: JoinCreatedContext,
    blocks: Array<{ blockerUserId: string; blockedUserId: string }>,
  ): Promise<string[]> {
    const autoUsers = await this.collectFieldAutoUsers(ctx, blocks);
    const customUsers = await this.collectFieldCustomUsers(ctx, blocks);
    return [...new Set([...autoUsers, ...customUsers])];
  }

  private async collectFieldAutoUsers(
    ctx: JoinCreatedContext,
    blocks: Array<{ blockerUserId: string; blockedUserId: string }>,
  ): Promise<string[]> {
    const spellings = listSidoSpellings(ctx.sido);
    if (spellings.length === 0) return [];
    return collectPaginatedAudienceIds<FieldAutoAudienceRow>({
      pageSize: JOIN_CREATED_AUDIENCE_BATCH_SIZE,
      cursorOf: (row) => row.id,
      idOf: (row) => row.id,
      include: (row) => this.fieldUserMatches(row, ctx, blocks),
      fetchPage: (cursor, take) =>
        this.prisma.user.findMany({
          where: {
            id: { not: ctx.hostUserId },
            OR: [
              { notificationPreference: null },
              { notificationPreference: { joinCreatedEnabled: true, fieldRegionMode: 'AUTO' } },
            ],
            AND: [
              {
                OR: [
                  { profile: { OR: spellings.map((sido) => ({ regionLabel: { contains: sido } })) } },
                  { joinRegionPreferences: { some: { sido: { in: spellings } } } },
                ],
              },
            ],
          },
          orderBy: { id: 'asc' },
          take,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: {
            id: true,
            profile: { select: { regionLabel: true, regionCode: true } },
            joinRegionPreferences: { select: { sido: true, sigungu: true } },
            notificationPreference: { select: { fieldRegions: true, fieldRegionMode: true } },
          },
        }),
    });
  }

  private async collectFieldCustomUsers(
    ctx: JoinCreatedContext,
    blocks: Array<{ blockerUserId: string; blockedUserId: string }>,
  ): Promise<string[]> {
    const province = normalizeSido(ctx.sido);
    if (!province) return [];
    const venue = { province, cityCounty: parseHomeRegion({ sido: ctx.sido, sigungu: ctx.sigungu }).sigungu };
    const cityMatch = JSON.stringify([{ province, cityCounty: venue.cityCounty }]);
    const provinceMatch = JSON.stringify([{ province, cityCounty: null }]);
    return collectPaginatedAudienceIds<FieldCustomAudienceRow>({
      pageSize: JOIN_CREATED_AUDIENCE_BATCH_SIZE,
      cursorOf: (row) => row.user_id,
      idOf: (row) => row.user_id,
      include: (row) => this.eligible(row.user_id, ctx.hostUserId, blocks),
      fetchPage: (cursor, take) =>
        cursor
          ? this.prisma.$queryRaw<Array<{ user_id: string }>>`
              SELECT user_id
              FROM notification_preferences
              WHERE join_created_enabled = true
                AND field_region_mode = 'CUSTOM'
                AND user_id <> ${ctx.hostUserId}::uuid
                AND user_id > ${cursor}::uuid
                AND (
                  field_regions @> ${cityMatch}::jsonb
                  OR field_regions @> ${provinceMatch}::jsonb
                )
              ORDER BY user_id ASC
              LIMIT ${take}
            `
          : this.prisma.$queryRaw<Array<{ user_id: string }>>`
              SELECT user_id
              FROM notification_preferences
              WHERE join_created_enabled = true
                AND field_region_mode = 'CUSTOM'
                AND user_id <> ${ctx.hostUserId}::uuid
                AND (
                  field_regions @> ${cityMatch}::jsonb
                  OR field_regions @> ${provinceMatch}::jsonb
                )
              ORDER BY user_id ASC
              LIMIT ${take}
            `,
    });
  }

  private fieldUserMatches(
    row: FieldAutoAudienceRow,
    ctx: JoinCreatedContext,
    blocks: Array<{ blockerUserId: string; blockedUserId: string }>,
  ): boolean {
    if (!this.eligible(row.id, ctx.hostUserId, blocks)) return false;
    const mode = row.notificationPreference?.fieldRegionMode === 'CUSTOM' ? 'CUSTOM' : 'AUTO';
    const regions = resolveEffectiveFieldNotificationRegions({
      mode,
      customRegions: parseFieldRegionsJson(row.notificationPreference?.fieldRegions),
      homeRegion: row.profile,
      activityRegions: row.joinRegionPreferences,
    });
    return matchesFieldNotificationRegions({
      venueSido: ctx.sido,
      venueSigungu: ctx.sigungu,
      regions,
    });
  }
}
