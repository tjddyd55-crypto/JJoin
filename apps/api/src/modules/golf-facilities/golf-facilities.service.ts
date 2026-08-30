import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEFAULT_NEARBY_RADIUS_METERS,
  emptyFacilityJoinActivity,
  DISCOVERY_JOIN_STATUSES,
  isOngoingJoin,
  isTodayValidJoin,
  isValidOnSelectedDate,
  aggregateFacilityJoinActivity,
  aggregateFacilityJoinActivityForDate,
  compareJoinDiscoveryPriority,
  isJoinCapacityJoinable,
  localDayKey,
} from '@jjoin/domain';
import {
  GOLF_FACILITY_MAP_DEFAULT_LIMIT,
  GOLF_FACILITY_MAP_MAX_LIMIT,
  GOLF_FACILITY_SEARCH_DEFAULT_LIMIT,
  LOCALDATA_GOLF_VENUE_PROVIDER,
  JoinStatus,
  type ActivateGolfFacilityVenueResponse,
  type ExploreJoinPreviewDto,
  type GolfFacilityBoundsResponse,
  type GolfFacilityMapDto,
  type GolfFacilitySearchResponse,
  type JoinDiscoveryRegionMode,
} from '@jjoin/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureFoundation } from '../../foundation/ensure-foundation';
import { haversineMeters } from '../presence/privacy-location';
import {
  buildGolfFacilitySearchWhere,
  golfFacilitySearchTake,
  refineGolfFacilitySearchRows,
} from './golf-facility-search-query';

type VenueMeta = {
  status?: 'ACTIVE' | 'UNAVAILABLE';
  activatedAt?: string;
  activatedByUserId?: string;
  activationSource?: 'GOLF_FACILITY';
  golfFacilityId?: string;
};

type FacilityRow = {
  id: string;
  displayName: string;
  facilityType: string;
  screenStatus: string;
  hasScreenGolf: string;
  primaryBrand: string;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  roadAddress: string | null;
  lotAddress: string | null;
  sido: string | null;
  sigungu: string | null;
  phone: string | null;
  coordinateStatus: string;
  isScreenJoinEligible: boolean;
};

type FacilityActivity = {
  todayJoinCount: number;
  todayJoinableCount: number;
  urgentJoinCount: number;
  ongoingJoinCount: number;
  openJoinCount: number;
  hasTodayJoin: boolean;
  hasOngoingJoin: boolean;
  selectedDateJoinCount: number;
  hasSelectedDateJoin: boolean;
  previews: ExploreJoinPreviewDto[];
};

const MAP_SELECT = {
  id: true,
  displayName: true,
  sourceName: true,
  facilityType: true,
  screenStatus: true,
  hasScreenGolf: true,
  primaryBrand: true,
  latitude: true,
  longitude: true,
  roadAddress: true,
  lotAddress: true,
  sido: true,
  sigungu: true,
  phone: true,
  coordinateStatus: true,
  isScreenJoinEligible: true,
} as const;

/**
 * GolfFacility master helpers + lazy Venue activation.
 * Map/search GETs never create Venue. Join continues to use Venue.id.
 * Kakao Venue activation remains in VenuesService.
 */
@Injectable()
export class GolfFacilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  ping() {
    return { module: 'golf-facilities', status: 'ready', activation: true, map: true };
  }

  /**
   * Viewport markers: active + VALID coords (all types including UNKNOWN).
   * Classification / isScreenJoinEligible is metadata only — never filters map.
   * Side-effect free (no Venue writes).
   */
  async listInBounds(input: {
    north: number;
    south: number;
    east: number;
    west: number;
    limit?: number;
    date?: string;
    regionMode?: JoinDiscoveryRegionMode;
    sido?: string;
    sigungu?: string;
    lat?: number;
    lng?: number;
    radiusMeters?: number;
  }): Promise<GolfFacilityBoundsResponse> {
    const north = input.north;
    const south = input.south;
    const east = input.east;
    const west = input.west;
    if (
      ![north, south, east, west].every((n) => Number.isFinite(n)) ||
      south > north ||
      west > east
    ) {
      throw new BadRequestException({
        code: 'INVALID_BOUNDS',
        message: '지도 조회 범위가 올바르지 않습니다.',
      });
    }

    const limit = clampLimit(
      input.limit,
      GOLF_FACILITY_MAP_DEFAULT_LIMIT,
      GOLF_FACILITY_MAP_MAX_LIMIT,
    );

    const now = new Date();
    const dateKey = input.date?.trim() || localDayKey(now);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw new BadRequestException({
        code: 'INVALID_DATE',
        message: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)',
      });
    }

    const districtWhere =
      input.regionMode === 'DISTRICT' && input.sido && input.sigungu
        ? { sido: input.sido, sigungu: input.sigungu }
        : {};

    let rows = await this.prisma.golfFacility.findMany({
      where: {
        isActive: true,
        coordinateStatus: 'VALID',
        latitude: { gte: south, lte: north },
        longitude: { gte: west, lte: east },
        ...districtWhere,
      },
      select: MAP_SELECT,
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    if (
      input.regionMode === 'NEARBY' &&
      input.lat != null &&
      input.lng != null &&
      Number.isFinite(input.lat) &&
      Number.isFinite(input.lng)
    ) {
      const radius =
        input.radiusMeters != null && Number.isFinite(input.radiusMeters)
          ? Math.max(1, Math.floor(input.radiusMeters))
          : DEFAULT_NEARBY_RADIUS_METERS;
      rows = rows.filter((r) => {
        if (r.latitude == null || r.longitude == null) return false;
        return (
          haversineMeters(
            input.lat!,
            input.lng!,
            Number(r.latitude),
            Number(r.longitude),
          ) <= radius
        );
      });
    }

    const truncated = rows.length > limit;
    const page = truncated ? rows.slice(0, limit) : rows;
    const activityByFacility = await this.joinActivityByGolfFacilityIds(
      page.map((r) => r.id),
      dateKey,
    );
    const items = page.map((r) => this.toMapDto(r, activityByFacility.get(r.id)));

    return { items, truncated, limit };
  }

  /**
   * Search active facilities by name/address region (all types including UNKNOWN).
   * May include MISSING coords (selectable=false). No Venue side effects.
   *
   * Filters (screen/region/text) are applied in the DB where clause first;
   * never take a nationwide prefix then filter in memory.
   */
  async search(input: {
    q?: string;
    sido?: string;
    sigungu?: string;
    screenOnly?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<GolfFacilitySearchResponse> {
    const q = (input.q ?? '').trim();
    const sido = input.sido?.trim();
    const sigungu = input.sigungu?.trim();
    const hasDistrict = Boolean(sido && sigungu);

    if (q.length < 1 && !hasDistrict) {
      throw new BadRequestException({
        code: 'INVALID_SEARCH_QUERY',
        message: '검색어를 입력해 주세요.',
      });
    }
    if (q.length > 80) {
      throw new BadRequestException({
        code: 'INVALID_SEARCH_QUERY',
        message: '검색어가 너무 깁니다.',
      });
    }

    const limit = clampLimit(input.limit, GOLF_FACILITY_SEARCH_DEFAULT_LIMIT, 100);
    const cursorId = input.cursor?.trim() || undefined;
    const where = buildGolfFacilitySearchWhere({
      q: q || undefined,
      sido,
      sigungu,
      screenOnly: input.screenOnly,
      cursorId,
    });

    const rows = await this.prisma.golfFacility.findMany({
      where,
      select: MAP_SELECT,
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
      take: golfFacilitySearchTake(limit, hasDistrict),
    });

    const { page, nextCursor } = refineGolfFacilitySearchRows(rows, {
      sido,
      sigungu,
      limit,
    });
    const activityByFacility = await this.joinActivityByGolfFacilityIds(
      page.map((r) => r.id),
    );

    return {
      items: page.map((r) => this.toMapDto(r, activityByFacility.get(r.id))),
      nextCursor,
      limit,
    };
  }

  async getById(id: string): Promise<GolfFacilityMapDto> {
    const row = await this.prisma.golfFacility.findUnique({
      where: { id },
      select: MAP_SELECT,
    });
    if (!row) {
      throw new NotFoundException({
        code: 'FACILITY_NOT_FOUND',
        message: '골프 시설을 찾을 수 없습니다.',
      });
    }
    const activityByFacility = await this.joinActivityByGolfFacilityIds([row.id]);
    return this.toMapDto(row, activityByFacility.get(row.id));
  }

  /**
   * Lazy-activate a LOCALDATA Venue from GolfFacility for Join use.
   * Idempotent on (provider, providerPlaceId) and golfFacilityId unique.
   * Does not auto-sync GolfFacility field changes onto existing Venue.
   */
  async activateVenue(
    userId: string,
    golfFacilityId: string,
  ): Promise<ActivateGolfFacilityVenueResponse> {
    const facility = await this.prisma.golfFacility.findUnique({
      where: { id: golfFacilityId },
    });
    if (!facility) {
      throw new NotFoundException({
        code: 'FACILITY_NOT_FOUND',
        message: '골프 시설을 찾을 수 없습니다.',
      });
    }

    // All active public golf facilities may create Join (classification is metadata).
    if (!facility.isActive) {
      throw new BadRequestException({
        code: 'FACILITY_NOT_JOIN_ELIGIBLE',
        message: '조인 장소로 활성화할 수 없는 시설입니다.',
      });
    }

    if (
      facility.coordinateStatus !== 'VALID' ||
      facility.latitude == null ||
      facility.longitude == null
    ) {
      throw new BadRequestException({
        code: 'FACILITY_COORDINATE_REQUIRED',
        message: '좌표가 없어 조인 장소로 활성화할 수 없습니다.',
      });
    }

    const provider = LOCALDATA_GOLF_VENUE_PROVIDER;
    const providerPlaceId = facility.governmentSourceKey;

    const existing = await this.prisma.venue.findFirst({
      where: {
        OR: [
          { golfFacilityId: facility.id },
          { provider, providerPlaceId },
        ],
      },
    });
    if (existing) {
      return this.toActivateResponse(facility.id, existing, false);
    }

    const { sport } = await ensureFoundation(this.prisma);
    const address = facility.roadAddress || facility.lotAddress || null;
    const metadata: VenueMeta = {
      status: 'ACTIVE',
      activatedAt: new Date().toISOString(),
      activatedByUserId: userId,
      activationSource: 'GOLF_FACILITY',
      golfFacilityId: facility.id,
    };

    try {
      const created = await this.prisma.venue.create({
        data: {
          sportId: sport.id,
          provider,
          providerPlaceId,
          golfFacilityId: facility.id,
          // Service display values (override-aware), not raw source*
          name: facility.displayName,
          address,
          roadAddress: facility.roadAddress,
          phone: facility.phone,
          latitude: facility.latitude,
          longitude: facility.longitude,
          region: facility.sido,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
      return this.toActivateResponse(facility.id, created, true);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const raced = await this.prisma.venue.findFirst({
          where: {
            OR: [
              { golfFacilityId: facility.id },
              { provider, providerPlaceId },
            ],
          },
        });
        if (raced) return this.toActivateResponse(facility.id, raced, false);
        throw new ConflictException({
          code: 'VENUE_CONFLICT',
          message: '장소 활성화 중 충돌이 발생했습니다. 다시 시도해 주세요.',
        });
      }
      throw e;
    }
  }

  private toMapDto(
    row: FacilityRow,
    activity?: FacilityActivity,
  ): GolfFacilityMapDto {
    const hasValidCoords =
      row.coordinateStatus === 'VALID' &&
      row.latitude != null &&
      row.longitude != null;
    // Classification is metadata only — Join/select requires active + VALID coords.
    const selectable = hasValidCoords;
    const joinActivity = activity ?? {
      ...emptyFacilityJoinActivity(),
      todayJoinableCount: 0,
      urgentJoinCount: 0,
      selectedDateJoinCount: 0,
      hasSelectedDateJoin: false,
      previews: [] as ExploreJoinPreviewDto[],
    };

    return {
      id: row.id,
      displayName: row.displayName,
      facilityType: row.facilityType,
      screenStatus: row.screenStatus,
      hasScreenGolf: row.hasScreenGolf,
      primaryBrand: row.primaryBrand,
      latitude: row.latitude == null ? null : Number(row.latitude),
      longitude: row.longitude == null ? null : Number(row.longitude),
      roadAddress: row.roadAddress,
      sido: row.sido,
      sigungu: row.sigungu,
      phone: row.phone,
      coordinateStatus: row.coordinateStatus,
      selectable,
      isScreenJoinEligible: row.isScreenJoinEligible,
      todayJoinCount: joinActivity.todayJoinCount,
      todayJoinableCount: joinActivity.todayJoinableCount,
      urgentJoinCount: joinActivity.urgentJoinCount,
      ongoingJoinCount: joinActivity.ongoingJoinCount,
      openJoinCount: joinActivity.openJoinCount,
      hasTodayJoin: joinActivity.hasTodayJoin,
      hasOngoingJoin: joinActivity.hasOngoingJoin,
      selectedDateJoinCount: joinActivity.selectedDateJoinCount,
      hasSelectedDateJoin: joinActivity.hasSelectedDateJoin,
      ...(joinActivity.openJoinCount > 0
        ? { joinPreviews: joinActivity.previews }
        : {}),
    };
  }

  /**
   * Aggregate joins for GolfFacility markers in one query (no N+1).
   * When `dateKey` is provided, uses selected-date validity; otherwise today-only.
   */
  private async joinActivityByGolfFacilityIds(
    golfFacilityIds: string[],
    dateKey?: string,
  ): Promise<Map<string, FacilityActivity>> {
    const empty = (): FacilityActivity => ({
      ...emptyFacilityJoinActivity(),
      todayJoinableCount: 0,
      urgentJoinCount: 0,
      selectedDateJoinCount: 0,
      hasSelectedDateJoin: false,
      previews: [],
    });
    const result = new Map<string, FacilityActivity>();
    for (const id of golfFacilityIds) {
      result.set(id, empty());
    }
    if (golfFacilityIds.length === 0) return result;

    const venues = await this.prisma.venue.findMany({
      where: { golfFacilityId: { in: golfFacilityIds } },
      select: { id: true, golfFacilityId: true },
    });
    if (venues.length === 0) return result;

    const venueToFacility = new Map<string, string>();
    for (const v of venues) {
      if (v.golfFacilityId) venueToFacility.set(v.id, v.golfFacilityId);
    }

    const now = new Date();
    const todayKey = localDayKey(now);
    const resolvedDateKey = dateKey ?? todayKey;
    const joins = await this.prisma.join.findMany({
      where: {
        venueId: { in: [...venueToFacility.keys()] },
        status: { in: [...DISCOVERY_JOIN_STATUSES] },
        scheduledEndAt: { gt: now },
      },
      select: {
        id: true,
        venueId: true,
        status: true,
        startAt: true,
        scheduledEndAt: true,
        confirmedPlayerCount: true,
        plannedPlayerCount: true,
        rewardPerParticipant: true,
        isUrgent: true,
        host: { select: { profile: { select: { nickname: true } } } },
      },
      orderBy: { startAt: 'asc' },
    });

    const byFacility = new Map<string, ExploreJoinPreviewDto[]>();
    const todayJoinableByFacility = new Map<string, number>();
    const urgentJoinByFacility = new Map<string, number>();
    for (const join of joins) {
      const facilityId = venueToFacility.get(join.venueId);
      if (!facilityId) continue;

      const dayKey = localDayKey(join.startAt);
      const joinableToday =
        dayKey === todayKey &&
        isJoinCapacityJoinable({
          status: join.status,
          currentParticipants: join.confirmedPlayerCount,
          maxParticipants: join.plannedPlayerCount,
        });
      if (joinableToday) {
        todayJoinableByFacility.set(
          facilityId,
          (todayJoinableByFacility.get(facilityId) ?? 0) + 1,
        );
        if (join.isUrgent) {
          urgentJoinByFacility.set(
            facilityId,
            (urgentJoinByFacility.get(facilityId) ?? 0) + 1,
          );
        }
      }

      const onSelectedDate = isValidOnSelectedDate({
        status: join.status,
        startAt: join.startAt,
        scheduledEndAt: join.scheduledEndAt,
        now,
        dateKey: resolvedDateKey,
      });
      const ongoing =
        resolvedDateKey === todayKey &&
        isOngoingJoin({
          status: join.status,
          startAt: join.startAt,
          scheduledEndAt: join.scheduledEndAt,
          now,
        });

      // Backward-compatible path when date omitted: keep today-only preview inclusion.
      const includePreview = dateKey
        ? onSelectedDate || ongoing
        : ongoing ||
          isTodayValidJoin({
            status: join.status,
            startAt: join.startAt,
            scheduledEndAt: join.scheduledEndAt,
            now,
          });

      if (!includePreview) continue;

      const list = byFacility.get(facilityId) ?? [];
      list.push({
        joinId: join.id,
        status: join.status as JoinStatus,
        startAt: join.startAt.toISOString(),
        scheduledEndAt: join.scheduledEndAt.toISOString(),
        currentParticipants: join.confirmedPlayerCount,
        maxParticipants: join.plannedPlayerCount,
        rewardCoin: String(join.rewardPerParticipant),
        hostNickname: join.host.profile?.nickname ?? '호스트',
        hostVerified: true,
        isUrgent: join.isUrgent ?? false,
      });
      byFacility.set(facilityId, list);
    }

    for (const facilityId of golfFacilityIds) {
      const todayJoinableCount = todayJoinableByFacility.get(facilityId) ?? 0;
      const urgentJoinCount = urgentJoinByFacility.get(facilityId) ?? 0;
      const previews = byFacility.get(facilityId);
      if (!previews) {
        result.set(facilityId, {
          ...empty(),
          todayJoinableCount,
          urgentJoinCount,
        });
        continue;
      }
      previews.sort((a, b) => compareJoinDiscoveryPriority(a, b, now));
      if (dateKey) {
        const agg = aggregateFacilityJoinActivityForDate(
          previews,
          resolvedDateKey,
          now,
        );
        result.set(facilityId, { ...agg, todayJoinableCount, urgentJoinCount, previews });
      } else {
        const agg = aggregateFacilityJoinActivity(previews, now);
        result.set(facilityId, {
          ...agg,
          todayJoinableCount,
          urgentJoinCount,
          selectedDateJoinCount: agg.todayJoinCount,
          hasSelectedDateJoin: agg.hasTodayJoin,
          previews,
        });
      }
    }
    return result;
  }

  private toActivateResponse(
    golfFacilityId: string,
    venue: { id: string; provider: string; providerPlaceId: string; name: string },
    created: boolean,
  ): ActivateGolfFacilityVenueResponse {
    return {
      golfFacilityId,
      venueId: venue.id,
      provider: venue.provider,
      providerPlaceId: venue.providerPlaceId,
      name: venue.name,
      activated: true,
      reused: !created,
      created,
    };
  }
}

function clampLimit(
  value: number | undefined,
  fallback: number,
  max: number,
): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  const n = Math.floor(value);
  if (n < 1) return fallback;
  return Math.min(n, max);
}
