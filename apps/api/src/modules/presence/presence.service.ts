import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  AgeBand,
  PresenceVisibility,
  SportSkillLevel,
  type PresenceDurationOption,
  type PrivatePresenceDto,
  type PublicNearbyUserDto,
  type UpsertPresenceRequest,
} from '@jjoin/types';
import { mapGenderDisplay } from '@jjoin/domain';
import { PrismaService } from '../../prisma/prisma.service';
import { getPresencePrivacySecret, presenceConfig } from './presence.config';
import {
  presencePrivacyEpoch,
  resolveAvailableUntil,
} from './presence-duration';
import {
  haversineMeters,
  roundApproxDistanceMeters,
  toPrivacyDisplayPoint,
} from './privacy-location';
import { PRESENCE_STORE, type PresenceStore } from './presence.store';

@Injectable()
export class PresenceService {
  constructor(
    @Inject(PRESENCE_STORE) private readonly store: PresenceStore,
    private readonly prisma: PrismaService,
  ) {}

  async getMine(userId: string): Promise<PrivatePresenceDto> {
    const row = await this.store.get(userId);
    if (!row) {
      return {
        visibility: PresenceVisibility.HIDDEN,
        availableUntil: null,
        accuracyMeters: null,
        lastLocationAt: null,
        hasLocation: false,
      };
    }
    const expired =
      row.visibility === PresenceVisibility.AVAILABLE &&
      row.availableUntil != null &&
      row.availableUntil.getTime() <= Date.now();
    return {
      visibility: expired ? PresenceVisibility.HIDDEN : row.visibility,
      availableUntil: row.availableUntil?.toISOString() ?? null,
      accuracyMeters: row.accuracyMeters,
      lastLocationAt: row.lastLocationAt.toISOString(),
      hasLocation: true,
    };
  }

  async upsert(userId: string, body: UpsertPresenceRequest): Promise<PrivatePresenceDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { identityStatus: true },
    });
    if (!user || user.identityStatus !== 'VERIFIED') {
      throw new BadRequestException({
        code: 'IDENTITY_REQUIRED',
        message: '조인 활동을 위해 본인확인이 필요합니다.',
      });
    }
    this.assertCoordinate(body.latitude, body.longitude);
    if (body.accuracyMeters != null && !(body.accuracyMeters >= 0)) {
      throw new BadRequestException('invalid_accuracy');
    }
    let availableUntil: Date;
    try {
      availableUntil = resolveAvailableUntil(body.duration, new Date(), presenceConfig.defaultTimeZone);
    } catch {
      throw new BadRequestException('invalid_duration');
    }

    const now = new Date();
    await this.store.upsert({
      userId,
      visibility: PresenceVisibility.AVAILABLE,
      availableUntil,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracyMeters: body.accuracyMeters ?? null,
      lastLocationAt: now,
      updatedAt: now,
    });
    return this.getMine(userId);
  }

  async hide(userId: string): Promise<PrivatePresenceDto> {
    await this.store.hide(userId);
    return this.getMine(userId);
  }

  /** Safe default on logout: stop appearing nearby. */
  async hideOnLogout(userId: string) {
    await this.store.hide(userId);
  }

  /**
   * Public nearby users for Explore map.
   * Exact GPS never leaves this method — only privacy display points.
   */
  async listNearbyPublic(input: {
    centerLat: number;
    centerLng: number;
    viewerUserId?: string;
  }): Promise<PublicNearbyUserDto[]> {
    const candidates = await this.store.findNearbyCandidates({
      centerLat: input.centerLat,
      centerLng: input.centerLng,
      radiusMeters: presenceConfig.nearbyRadiusMeters,
      freshnessMinutes: presenceConfig.freshnessMinutes,
      viewerUserId: input.viewerUserId,
      limit: presenceConfig.nearbyLimit,
    });

    const within = candidates
      .map((p) => ({
        presence: p,
        distance: haversineMeters(
          input.centerLat,
          input.centerLng,
          p.latitude,
          p.longitude,
        ),
      }))
      .filter((x) => x.distance <= presenceConfig.nearbyRadiusMeters)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, presenceConfig.nearbyLimit);

    if (within.length === 0) return [];

    const userIds = within.map((x) => x.presence.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, status: 'ACTIVE' },
      include: {
        profile: true,
        sportProfiles: { include: { sport: true } },
      },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    const result: PublicNearbyUserDto[] = [];
    for (const { presence, distance } of within) {
      const user = byId.get(presence.userId);
      if (!user || !presence.availableUntil) continue;
      const epoch = presencePrivacyEpoch(presence);
      const display = toPrivacyDisplayPoint({
        userId: presence.userId,
        latitude: presence.latitude,
        longitude: presence.longitude,
        privacyEpoch: epoch,
        privacySecret: getPresencePrivacySecret(),
        jitterMinMeters: presenceConfig.privacyJitterMinMeters,
        jitterMaxMeters: presenceConfig.privacyJitterMaxMeters,
        gridDegrees: presenceConfig.privacyGridDegrees,
      });
      const skill =
        user.sportProfiles.find((s) => s.sport.code === 'SCREEN_GOLF')?.skillLevel ??
        user.sportProfiles[0]?.skillLevel ??
        null;
      result.push({
        userId: user.id,
        nickname: user.profile?.nickname ?? '조인러',
        avatarUrl: null as string | null,
        verifiedBadge: user.identityStatus === 'VERIFIED',
        ageBand: (user.profile?.ageBand as AgeBand | null) ?? null,
        genderDisplay: mapGenderDisplay(user.profile?.gender),
        skillLevel: (skill as SportSkillLevel | null) ?? null,
        approxDistanceMeters: roundApproxDistanceMeters(distance),
        displayLat: display.displayLat,
        displayLng: display.displayLng,
        regionLabel: user.profile?.regionLabel ?? null,
        availableUntil: presence.availableUntil.toISOString(),
      });
    }
    return result;
  }

  private assertCoordinate(lat: number, lng: number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('invalid_coordinate');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestException('invalid_coordinate');
    }
  }
}

export type { PresenceDurationOption };
