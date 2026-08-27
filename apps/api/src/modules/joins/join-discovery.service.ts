import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  ADMIN_SIDO_GROUPS,
  DEFAULT_NEARBY_RADIUS_METERS,
  DISCOVERY_JOIN_STATUSES,
  addCalendarDays,
  aggregateWeeklyDayCounts,
  buildWeekStrip,
  compareDiscoverJoinOrder,
  findAdminDistrict,
  formatMatchingRecruitmentLabel,
  kstDayBoundsUtc,
  localDayKey,
  partitionDiscoverJoins,
  resolveDiscoverCanJoin,
  sundayOfWeek,
} from '@jjoin/domain';
import type {
  AdminDistrictCatalogResponse,
  DiscoverJoinCardDto,
  DiscoverJoinsResponse,
  DiscoverWeeklyCountsResponse,
  JoinDiscoveryJoinability,
  JoinDiscoveryRegionMode,
  JoinDiscoverySort,
  JoinStatus,
  MatchingJoinExtras,
  JoinKind,
} from '@jjoin/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { haversineMeters } from '../presence/privacy-location';

export type DiscoverJoinsQuery = {
  date?: string;
  regionMode?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  sido?: string;
  sigungu?: string;
  sort?: string;
  joinability?: string;
};

export type DiscoverWeeklyCountsQuery = {
  weekStart?: string;
  date?: string;
  regionMode?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  sido?: string;
  sigungu?: string;
};

type DiscoveryJoinRow = {
  id: string;
  status: string;
  joinKind: string;
  startAt: Date;
  scheduledEndAt: Date;
  recruitClosesAt: Date | null;
  minimumPlayers: number | null;
  targetMaleCount: number | null;
  targetFemaleCount: number | null;
  matchingRewardTarget: string | null;
  plannedPlayerCount: number;
  confirmedPlayerCount: number;
  rewardPerParticipant: Prisma.Decimal;
  hostUserId: string;
  venue: {
    id: string;
    name: string;
    region: string | null;
    latitude: Prisma.Decimal;
    longitude: Prisma.Decimal;
    golfFacility: {
      id: string;
      sido: string | null;
      sigungu: string | null;
    } | null;
  };
  host: { profile: { nickname: string } | null };
  participants: Array<{
    userId: string;
    role: string;
    participationStatus: string;
    user?: { profile: { gender: string | null } | null };
  }>;
};

type ResolvedRegion = {
  mode: JoinDiscoveryRegionMode;
  label: string;
  sido?: string;
  sigungu?: string;
  lat?: number;
  lng?: number;
  radiusMeters: number;
};

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class JoinDiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async discover(
    userId: string,
    query: DiscoverJoinsQuery,
  ): Promise<DiscoverJoinsResponse> {
    const now = new Date();
    const date = this.resolveDateKey(query.date, now);
    const sort = this.resolveSort(query.sort);
    const joinability = this.resolveJoinability(query.joinability);
    const region = this.resolveRegion(query);

    const { start: dayStart, end: dayEnd } = kstDayBoundsUtc(date);
    const rows = await this.findDiscoveryJoins({
      startAtGte: dayStart,
      startAtLt: dayEnd,
      now,
    });

    const discoverable = rows.filter((row) => this.isDiscoverable(row, now));
    const filtered = this.filterByRegion(discoverable, region);
    const cards = filtered
      .map((row) => this.toCard(row, userId, region, now))
      .filter((card) => (joinability === 'JOINABLE' ? card.canJoin : true))
      .sort((a, b) =>
        compareDiscoverJoinOrder(a, b, { sort, now }),
      );

    const { ongoing, upcoming } = partitionDiscoverJoins(cards, {
      dateKey: date,
      now,
    });

    return {
      date,
      regionMode: region.mode,
      regionLabel: region.label,
      sort,
      joinability,
      ongoing,
      upcoming,
      totalCount: cards.length,
    };
  }

  async weeklyCounts(
    userId: string,
    query: DiscoverWeeklyCountsQuery,
  ): Promise<DiscoverWeeklyCountsResponse> {
    void userId;
    const now = new Date();
    const weekStart = this.resolveWeekStart(query, now);
    const weekEnd = addCalendarDays(weekStart, 6);
    const region = this.resolveRegion(query);

    const { start: rangeStart } = kstDayBoundsUtc(weekStart);
    const { end: rangeEndExclusive } = kstDayBoundsUtc(weekEnd);

    const rows = await this.findDiscoveryJoins({
      startAtGte: rangeStart,
      startAtLt: rangeEndExclusive,
      now,
    });

    const discoverable = rows.filter((row) => this.isDiscoverable(row, now));
    const filtered = this.filterByRegion(discoverable, region);
    const weekDays = buildWeekStrip(weekStart, { now }).map((d) => d.date);
    const counts = aggregateWeeklyDayCounts(filtered, weekDays, { now });

    return {
      weekStart,
      weekEnd,
      regionMode: region.mode,
      regionLabel: region.label,
      days: weekDays.map((date) => ({ date, count: counts[date] ?? 0 })),
    };
  }

  districtCatalog(): AdminDistrictCatalogResponse {
    return {
      groups: ADMIN_SIDO_GROUPS.map((g) => ({
        sido: g.sido,
        label: g.label,
        districts: g.districts.map((d) => ({
          sido: d.sido,
          sigungu: d.sigungu,
          label: d.label,
        })),
      })),
    };
  }

  private async findDiscoveryJoins(input: {
    startAtGte: Date;
    startAtLt: Date;
    now: Date;
  }): Promise<DiscoveryJoinRow[]> {
    return this.prisma.join.findMany({
      where: {
        status: { in: [...DISCOVERY_JOIN_STATUSES] },
        startAt: { gte: input.startAtGte, lt: input.startAtLt },
        scheduledEndAt: { gt: input.now },
      },
      include: {
        venue: {
          include: {
            golfFacility: { select: { id: true, sido: true, sigungu: true } },
          },
        },
        host: { include: { profile: { select: { nickname: true } } } },
        participants: {
          select: {
            userId: true,
            role: true,
            participationStatus: true,
            user: { select: { profile: { select: { gender: true } } } },
          },
        },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  private filterByRegion(
    rows: DiscoveryJoinRow[],
    region: ResolvedRegion,
  ): DiscoveryJoinRow[] {
    if (region.mode === 'DISTRICT') {
      const sido = region.sido!;
      const sigungu = region.sigungu!;
      return rows.filter((row) => this.matchesDistrict(row, sido, sigungu));
    }

    const lat = region.lat!;
    const lng = region.lng!;
    const radius = region.radiusMeters;
    return rows.filter((row) => {
      const vLat = Number(row.venue.latitude);
      const vLng = Number(row.venue.longitude);
      if (!Number.isFinite(vLat) || !Number.isFinite(vLng)) return false;
      return haversineMeters(lat, lng, vLat, vLng) <= radius;
    });
  }

  private matchesDistrict(
    row: DiscoveryJoinRow,
    sido: string,
    sigungu: string,
  ): boolean {
    const gf = row.venue.golfFacility;
    if (gf) {
      return gf.sido === sido && gf.sigungu === sigungu;
    }
    const region = row.venue.region ?? '';
    return region.includes(sigungu) || region.includes(sido);
  }

  private isDiscoverable(row: DiscoveryJoinRow, now: Date): boolean {
    if (row.joinKind !== 'STORE_MATCHING') return true;
    if (!row.recruitClosesAt) return true;
    const recruiting = row.status === 'OPEN' || row.status === 'FULL' || row.status === 'DRAFT';
    if (!recruiting) return true;
    return row.recruitClosesAt.getTime() > now.getTime();
  }

  private buildMatchingExtrasForDiscovery(row: DiscoveryJoinRow): MatchingJoinExtras {
    if (row.joinKind !== 'STORE_MATCHING') return {};

    const maleTarget = row.targetMaleCount ?? 0;
    const femaleTarget = row.targetFemaleCount ?? 0;
    let confirmedMale = 0;
    let confirmedFemale = 0;

    for (const p of row.participants) {
      if (p.role === 'HOST') continue;
      if (p.participationStatus !== 'APPROVED' && p.participationStatus !== 'CONFIRMED') {
        continue;
      }
      const gender = p.user?.profile?.gender;
      if (gender === 'MALE') confirmedMale += 1;
      else if (gender === 'FEMALE') confirmedFemale += 1;
    }

    return {
      joinKind: JoinKind.STORE_MATCHING,
      recruitClosesAt: row.recruitClosesAt?.toISOString() ?? null,
      minimumPlayers: row.minimumPlayers ?? null,
      targetMaleCount: row.targetMaleCount ?? null,
      targetFemaleCount: row.targetFemaleCount ?? null,
      matchingRewardTarget:
        (row.matchingRewardTarget as MatchingJoinExtras['matchingRewardTarget']) ?? null,
      recruitmentLabel: formatMatchingRecruitmentLabel({
        targetMaleCount: maleTarget,
        targetFemaleCount: femaleTarget,
        confirmedMale,
        confirmedFemale,
      }),
      confirmedMaleCount: confirmedMale,
      confirmedFemaleCount: confirmedFemale,
    };
  }

  private toCard(
    row: DiscoveryJoinRow,
    userId: string,
    region: ResolvedRegion,
    now: Date,
  ): DiscoverJoinCardDto {
    const latitude = Number(row.venue.latitude);
    const longitude = Number(row.venue.longitude);
    let distanceMeters: number | null = null;
    if (
      region.lat != null &&
      region.lng != null &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      distanceMeters = haversineMeters(
        region.lat,
        region.lng,
        latitude,
        longitude,
      );
    }

    const isHost = row.hostUserId === userId;
    const isParticipant =
      !isHost && row.participants.some((p) => p.userId === userId);
    const canJoinResult = resolveDiscoverCanJoin({
      status: row.status,
      currentParticipants: row.confirmedPlayerCount,
      maxParticipants: row.plannedPlayerCount,
      isHost,
      isParticipant,
    });

    const matchingClosed =
      row.joinKind === 'STORE_MATCHING' &&
      row.recruitClosesAt != null &&
      row.recruitClosesAt.getTime() <= now.getTime();
    const canJoin = canJoinResult.canJoin && !matchingClosed;
    const canJoinState = matchingClosed ? 'UNAVAILABLE' : canJoinResult.state;
    const ctaLabel =
      canJoin && row.joinKind === 'STORE_MATCHING'
        ? '참가 신청'
        : canJoin
          ? canJoinResult.ctaLabel
          : null;

    const gf = row.venue.golfFacility;
    const availableSlots = Math.max(
      0,
      row.plannedPlayerCount - row.confirmedPlayerCount,
    );
    const matchingExtras = this.buildMatchingExtrasForDiscovery(row);

    return {
      joinId: row.id,
      status: row.status as JoinStatus,
      startAt: row.startAt.toISOString(),
      scheduledEndAt: row.scheduledEndAt.toISOString(),
      venueId: row.venue.id,
      venueName: row.venue.name,
      regionLabel: row.venue.region,
      sido: gf?.sido ?? null,
      sigungu: gf?.sigungu ?? null,
      latitude,
      longitude,
      distanceMeters,
      currentParticipants: row.confirmedPlayerCount,
      maxParticipants: row.plannedPlayerCount,
      availableSlots,
      rewardPerParticipant: String(row.rewardPerParticipant),
      hostNickname: row.host.profile?.nickname ?? '호스트',
      isHost,
      isParticipant,
      canJoin,
      canJoinState,
      ctaLabel,
      golfFacilityId: gf?.id ?? null,
      ...matchingExtras,
    };
  }

  private resolveDateKey(raw: string | undefined, now: Date): string {
    if (raw == null || raw === '') return localDayKey(now);
    if (!DATE_KEY_RE.test(raw)) {
      throw new BadRequestException({
        code: 'INVALID_DATE',
        message: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)',
      });
    }
    return raw;
  }

  private resolveWeekStart(
    query: DiscoverWeeklyCountsQuery,
    now: Date,
  ): string {
    if (query.weekStart) {
      if (!DATE_KEY_RE.test(query.weekStart)) {
        throw new BadRequestException({
          code: 'INVALID_WEEK_START',
          message: '주 시작일 형식이 올바르지 않습니다. (YYYY-MM-DD)',
        });
      }
      return sundayOfWeek(query.weekStart);
    }
    const anchor = this.resolveDateKey(query.date, now);
    return sundayOfWeek(anchor);
  }

  private resolveSort(raw: string | undefined): JoinDiscoverySort {
    if (raw == null || raw === '' || raw === 'TIME') return 'TIME';
    if (raw === 'DISTANCE') return 'DISTANCE';
    throw new BadRequestException({
      code: 'INVALID_SORT',
      message: '정렬 값이 올바르지 않습니다. (TIME | DISTANCE)',
    });
  }

  private resolveJoinability(
    raw: string | undefined,
  ): JoinDiscoveryJoinability {
    if (raw == null || raw === '' || raw === 'ALL') return 'ALL';
    if (raw === 'JOINABLE') return 'JOINABLE';
    throw new BadRequestException({
      code: 'INVALID_JOINABILITY',
      message: '참가 가능 필터가 올바르지 않습니다. (ALL | JOINABLE)',
    });
  }

  private resolveRegion(
    query: DiscoverJoinsQuery | DiscoverWeeklyCountsQuery,
  ): ResolvedRegion {
    const modeRaw = query.regionMode ?? 'NEARBY';
    if (modeRaw !== 'NEARBY' && modeRaw !== 'DISTRICT') {
      throw new BadRequestException({
        code: 'INVALID_REGION_MODE',
        message: '지역 모드가 올바르지 않습니다. (NEARBY | DISTRICT)',
      });
    }

    const radiusMeters =
      query.radiusMeters != null && Number.isFinite(query.radiusMeters)
        ? Math.max(1, Math.floor(query.radiusMeters))
        : DEFAULT_NEARBY_RADIUS_METERS;

    if (modeRaw === 'DISTRICT') {
      const sido = query.sido?.trim();
      const sigungu = query.sigungu?.trim();
      if (!sido || !sigungu) {
        throw new BadRequestException({
          code: 'DISTRICT_REQUIRED',
          message: '시·도와 시군구를 지정해 주세요.',
        });
      }
      const district = findAdminDistrict(sido, sigungu);
      const label = district?.label ?? sigungu;
      return {
        mode: 'DISTRICT',
        label,
        sido,
        sigungu,
        lat: Number.isFinite(query.lat) ? query.lat : undefined,
        lng: Number.isFinite(query.lng) ? query.lng : undefined,
        radiusMeters,
      };
    }

    if (
      query.lat == null ||
      query.lng == null ||
      !Number.isFinite(query.lat) ||
      !Number.isFinite(query.lng)
    ) {
      throw new BadRequestException({
        code: 'NEARBY_LOCATION_REQUIRED',
        message: '내 주변 검색에는 위도·경도가 필요합니다.',
      });
    }

    return {
      mode: 'NEARBY',
      label: '내 주변',
      lat: query.lat,
      lng: query.lng,
      radiusMeters,
    };
  }
}
