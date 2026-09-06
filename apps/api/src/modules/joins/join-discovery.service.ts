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
  countMatchingGenderComposition,
  kstDayBoundsUtc,
  listRegionExploreNodes,
  listTopLevelSido,
  matchesRegionScope,
  normalizeSido,
  regionExploreHasChildren,
  resolveRegionScopeSigungu,
  localDayKey,
  partitionDiscoverJoins,
  resolveDiscoverCanJoin,
  resolveStoreMatchingDisplayStatus,
  storeMatchingDisplayStatusLabel,
  storeMatchingOwnerListPriority,
  buildStoreMatchingSecondaryLabel,
  canConfirmMatchingAttendance,
  canDirectJoinGeneralCapacity,
  computeMatchingRemainingSlots,
  isJoinWaitlistJoinable,
  sundayOfWeek,
} from '@jjoin/domain';
import {
  JoinKind,
  type AdminDistrictCatalogResponse,
  type DiscoverJoinCardDto,
  type DiscoverJoinsResponse,
  type DiscoverWeeklyCountsResponse,
  type DiscoverRegionSummaryResponse,
  type DiscoverFacilityJoinsResponse,
  type DiscoverFacilityJoinItemDto,
  type JoinDiscoveryJoinability,
  type JoinDiscoveryRegionMode,
  type JoinDiscoverySort,
  type JoinStatus,
  type MatchingJoinExtras,
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

export type DiscoverRegionSummaryQuery = {
  date?: string;
  joinability?: string;
  sido?: string;
  sigungu?: string;
};

export type DiscoverFacilityJoinsQuery = {
  date?: string;
  joinability?: string;
  regionMode?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  sido?: string;
  sigungu?: string;
  sort?: string;
};

type DiscoveryJoinRow = {
  id: string;
  title: string | null;
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
  confirmedAt: Date | null;
  cancelledAt: Date | null;
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
  host: {
    profile: {
      nickname: string;
      avatarAsset: { storageKey: string } | null;
    } | null;
  };
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

  async regionSummary(
    userId: string,
    query: DiscoverRegionSummaryQuery,
  ): Promise<DiscoverRegionSummaryResponse> {
    const now = new Date();
    const date = this.resolveDateKey(query.date, now);
    const joinability = this.resolveJoinability(query.joinability ?? 'JOINABLE');
    const cards = await this.loadJoinableCardsForDate(userId, date, now, joinability);

    const parentSido = query.sido?.trim();
    const parentSigungu = query.sigungu?.trim();

    if (!parentSido) {
      const items = listTopLevelSido().map(({ sido, label }) => ({
        sido,
        label,
        count: this.countCardsInSido(cards, sido),
        hasChildren: listRegionExploreNodes(sido).length > 0,
      }));
      return { date, joinability, items };
    }

    const canonicalSido = normalizeSido(parentSido) ?? parentSido;

    if (!parentSigungu) {
      const nodes = listRegionExploreNodes(canonicalSido);
      const items = nodes.map((node) => ({
        sido: node.sido,
        sigungu: node.sigungu,
        label: node.label,
        count: this.countCardsInScope(
          cards,
          node.sido,
          node.sigungu,
          node.hasChildren,
        ),
        hasChildren: node.hasChildren,
      }));
      return {
        date,
        joinability,
        parentSido: canonicalSido,
        items,
      };
    }

    if (regionExploreHasChildren(canonicalSido, parentSigungu)) {
      const nodes = listRegionExploreNodes(canonicalSido, parentSigungu);
      const items = nodes.map((node) => ({
        sido: node.sido,
        sigungu: node.sigungu,
        label: node.label,
        count: this.countCardsInScope(cards, node.sido, node.sigungu, false),
        hasChildren: false,
      }));
      return {
        date,
        joinability,
        parentSido: canonicalSido,
        parentSigungu,
        items,
      };
    }

    return {
      date,
      joinability,
      parentSido: canonicalSido,
      parentSigungu,
      items: [],
    };
  }

  async facilityJoins(
    userId: string,
    query: DiscoverFacilityJoinsQuery,
  ): Promise<DiscoverFacilityJoinsResponse> {
    const now = new Date();
    const date = this.resolveDateKey(query.date, now);
    const joinability = this.resolveJoinability(query.joinability ?? 'JOINABLE');
    const sort = this.resolveSort(query.sort);
    const region = this.resolveRegion({
      regionMode: query.regionMode,
      lat: query.lat,
      lng: query.lng,
      radiusMeters: query.radiusMeters,
      sido: query.sido,
      sigungu: query.sigungu,
    });

    const cards = await this.loadJoinableCardsForDate(userId, date, now, joinability);
    const scoped = this.filterCardsByResolvedRegion(cards, region);
    const sorted = [...scoped].sort((a, b) =>
      compareDiscoverJoinOrder(a, b, { sort, now }),
    );

    const byVenue = new Map<string, DiscoverJoinCardDto[]>();
    for (const card of sorted) {
      const list = byVenue.get(card.venueId) ?? [];
      list.push(card);
      byVenue.set(card.venueId, list);
    }

    const facilities: DiscoverFacilityJoinItemDto[] = [];
    for (const [, joins] of byVenue) {
      const first = joins[0]!;
      facilities.push({
        venueId: first.venueId,
        venueName: first.venueName,
        golfFacilityId: first.golfFacilityId,
        sido: first.sido,
        sigungu: first.sigungu,
        distanceMeters: first.distanceMeters,
        joinCount: joins.length,
        startTimes: joins.map((j) => j.startAt),
      });
    }

    if (sort === 'DISTANCE') {
      facilities.sort(
        (a, b) =>
          (a.distanceMeters ?? Number.POSITIVE_INFINITY) -
          (b.distanceMeters ?? Number.POSITIVE_INFINITY),
      );
    }

    return {
      date,
      regionLabel: region.label,
      totalJoinCount: sorted.length,
      facilities,
    };
  }

  private async loadJoinableCardsForDate(
    userId: string,
    date: string,
    now: Date,
    joinability: JoinDiscoveryJoinability,
  ): Promise<DiscoverJoinCardDto[]> {
    const { start: dayStart, end: dayEnd } = kstDayBoundsUtc(date);
    const rows = await this.findDiscoveryJoins({
      startAtGte: dayStart,
      startAtLt: dayEnd,
      now,
    });
    const discoverable = rows.filter((row) => this.isDiscoverable(row, now));
    const region: ResolvedRegion = {
      mode: 'NEARBY',
      label: '전국',
      radiusMeters: DEFAULT_NEARBY_RADIUS_METERS,
    };
    const cards = discoverable
      .map((row) => this.toCard(row, userId, region, now))
      .filter((card) => (joinability === 'JOINABLE' ? card.canJoin : true));
    return cards;
  }

  private countCardsInSido(
    cards: DiscoverJoinCardDto[],
    sido: string,
  ): number {
    return cards.filter((c) =>
      matchesRegionScope(c.sido, c.sigungu, sido),
    ).length;
  }

  private countCardsInScope(
    cards: DiscoverJoinCardDto[],
    sido: string,
    sigungu: string,
    includeChildScope: boolean,
  ): number {
    return cards.filter((c) => {
      if (!matchesRegionScope(c.sido, null, sido)) return false;
      if (!includeChildScope) {
        return matchesRegionScope(c.sido, c.sigungu, sido, sigungu);
      }
      const scope = resolveRegionScopeSigungu(sido, sigungu);
      return c.sigungu != null && scope.includes(c.sigungu);
    }).length;
  }

  private filterCardsByResolvedRegion(
    cards: DiscoverJoinCardDto[],
    region: ResolvedRegion,
  ): DiscoverJoinCardDto[] {
    if (region.mode === 'NEARBY') {
      const lat = region.lat!;
      const lng = region.lng!;
      const radius = region.radiusMeters;
      return cards.filter((c) => {
        if (
          c.latitude == null ||
          c.longitude == null ||
          !Number.isFinite(c.latitude) ||
          !Number.isFinite(c.longitude)
        ) {
          return false;
        }
        return haversineMeters(lat, lng, c.latitude, c.longitude) <= radius;
      });
    }
    const hasChildren =
      region.sido != null &&
      region.sigungu != null &&
      regionExploreHasChildren(region.sido, region.sigungu);
    return cards.filter((c) =>
      this.countCardsInScope([c], region.sido!, region.sigungu!, hasChildren) > 0,
    );
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
        host: {
          include: {
            profile: {
              select: {
                nickname: true,
                avatarAsset: { select: { storageKey: true } },
              },
            },
          },
        },
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
    const composition = countMatchingGenderComposition(
      row.participants.map((p) => ({
        role: p.role,
        participationStatus: p.participationStatus,
        gender: (p.user?.profile?.gender as 'MALE' | 'FEMALE' | null | undefined) ?? null,
      })),
    );
    const confirmedMale = composition.male;
    const confirmedFemale = composition.female;

    const now = new Date();
    const displayStatus = resolveStoreMatchingDisplayStatus({
      now,
      status: row.status,
      recruitClosesAt: row.recruitClosesAt,
      startAt: row.startAt,
      scheduledEndAt: row.scheduledEndAt,
      confirmedPlayerCount: row.confirmedPlayerCount,
      minimumPlayers: row.minimumPlayers,
      confirmedAt: row.confirmedAt,
      cancelledAt: row.cancelledAt,
    });
    const remainingSlots = computeMatchingRemainingSlots(
      row.plannedPlayerCount,
      row.confirmedPlayerCount,
    );
    const recruitmentLabel = formatMatchingRecruitmentLabel({
      targetMaleCount: maleTarget,
      targetFemaleCount: femaleTarget,
      confirmedMale,
      confirmedFemale,
    });

    return {
      joinKind: JoinKind.STORE_MATCHING,
      recruitClosesAt: row.recruitClosesAt?.toISOString() ?? null,
      minimumPlayers: row.minimumPlayers ?? null,
      targetMaleCount: row.targetMaleCount ?? null,
      targetFemaleCount: row.targetFemaleCount ?? null,
      matchingRewardTarget:
        (row.matchingRewardTarget as MatchingJoinExtras['matchingRewardTarget']) ?? null,
      recruitmentLabel,
      confirmedMaleCount: confirmedMale,
      confirmedFemaleCount: confirmedFemale,
      displayStatus,
      displayStatusLabel: storeMatchingDisplayStatusLabel(displayStatus, {
        audience: 'host',
        confirmedPlayerCount: row.confirmedPlayerCount,
      }),
      displaySubtitle: buildStoreMatchingSecondaryLabel({
        displayStatus,
        recruitmentLabel,
        remainingSlots,
        confirmedPlayerCount: row.confirmedPlayerCount,
        recruitClosesAt: row.recruitClosesAt,
        now,
      }),
      canConfirmAttendance: canConfirmMatchingAttendance({
        now,
        status: row.status,
        scheduledEndAt: row.scheduledEndAt,
      }),
      remainingSlots,
      ownerListPriority: storeMatchingOwnerListPriority(displayStatus),
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

    const capacityRows = row.participants.map((p) => ({
      role: p.role,
      participationStatus: p.participationStatus,
    }));
    const waitlistEligible =
      !isHost &&
      !isParticipant &&
      !matchingClosed &&
      isJoinWaitlistJoinable({
        status: row.status,
        recruitClosesAt: row.recruitClosesAt,
        now,
      }) &&
      !canDirectJoinGeneralCapacity({
        plannedPlayerCount: row.plannedPlayerCount,
        participants: capacityRows,
      });

    let canJoin = canJoinResult.canJoin && !matchingClosed;
    let canJoinState = matchingClosed ? 'UNAVAILABLE' : canJoinResult.state;
    let ctaLabel =
      canJoin && row.joinKind === 'STORE_MATCHING'
        ? '참가 신청'
        : canJoin
          ? canJoinResult.ctaLabel
          : null;

    if (!canJoin && waitlistEligible) {
      canJoin = true;
      canJoinState = 'FULL';
      ctaLabel = '대기 신청';
    }

    const gf = row.venue.golfFacility;
    const availableSlots = Math.max(
      0,
      row.plannedPlayerCount - row.confirmedPlayerCount,
    );
    const matchingExtras = this.buildMatchingExtrasForDiscovery(row);

    return {
      joinId: row.id,
      status: row.status as JoinStatus,
      title: row.title ?? null,
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
      hostAvatarUrl: row.host.profile?.avatarAsset?.storageKey ?? null,
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
