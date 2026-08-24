import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GOLF_FACILITY_MAP_DEFAULT_LIMIT,
  GOLF_FACILITY_MAP_MAX_LIMIT,
  GOLF_FACILITY_SEARCH_DEFAULT_LIMIT,
  LOCALDATA_GOLF_VENUE_PROVIDER,
  type ActivateGolfFacilityVenueResponse,
  type GolfFacilityBoundsResponse,
  type GolfFacilityMapDto,
  type GolfFacilitySearchResponse,
} from '@jjoin/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureFoundation } from '../../foundation/ensure-foundation';

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

const MAP_SELECT = {
  id: true,
  displayName: true,
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
   * Viewport markers: active + screen-join-eligible + VALID coords only.
   * Side-effect free (no Venue writes).
   */
  async listInBounds(input: {
    north: number;
    south: number;
    east: number;
    west: number;
    limit?: number;
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

    const rows = await this.prisma.golfFacility.findMany({
      where: {
        isActive: true,
        isScreenJoinEligible: true,
        coordinateStatus: 'VALID',
        latitude: { gte: south, lte: north },
        longitude: { gte: west, lte: east },
      },
      select: MAP_SELECT,
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    const truncated = rows.length > limit;
    const items = (truncated ? rows.slice(0, limit) : rows).map((r) =>
      this.toMapDto(r, { requireSelectable: true }),
    );

    return { items, truncated, limit };
  }

  /**
   * Text eligible (CONFIRMED/join-eligible) facilities by name/address region.
   * May include MISSING coords (selectable=false). No Venue side effects.
   */
  async search(input: {
    q: string;
    limit?: number;
    cursor?: string;
  }): Promise<GolfFacilitySearchResponse> {
    const q = input.q.trim();
    if (q.length < 1) {
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

    const limit = clampLimit(input.limit, GOLF_FACILITY_SEARCH_DEFAULT_LIMIT, 50);
    const cursorId = input.cursor?.trim() || undefined;

    const rows = await this.prisma.golfFacility.findMany({
      where: {
        isActive: true,
        isScreenJoinEligible: true,
        // Eligible set is CONFIRMED screen joins; keep explicit for safety.
        screenStatus: 'CONFIRMED',
        OR: [
          { displayName: { contains: q, mode: 'insensitive' } },
          { sourceName: { contains: q, mode: 'insensitive' } },
          { roadAddress: { contains: q, mode: 'insensitive' } },
          { lotAddress: { contains: q, mode: 'insensitive' } },
          { sido: { contains: q, mode: 'insensitive' } },
          { sigungu: { contains: q, mode: 'insensitive' } },
        ],
        ...(cursorId ? { id: { gt: cursorId } } : {}),
      },
      select: MAP_SELECT,
      orderBy: [{ id: 'asc' }],
      take: limit + 1,
    });

    const page = rows.slice(0, limit);
    const nextCursor = rows.length > limit ? page[page.length - 1]?.id ?? null : null;

    return {
      items: page.map((r) => this.toMapDto(r)),
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
    return this.toMapDto(row);
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

    if (
      !facility.isActive ||
      !facility.isScreenJoinEligible ||
      facility.sportType !== 'GOLF'
    ) {
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
    opts?: { requireSelectable?: boolean },
  ): GolfFacilityMapDto {
    const hasValidCoords =
      row.coordinateStatus === 'VALID' &&
      row.latitude != null &&
      row.longitude != null;
    const selectable = hasValidCoords && row.isScreenJoinEligible;

    if (opts?.requireSelectable && !selectable) {
      // Bounds path should never hit this; guard anyway.
    }

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
    };
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
