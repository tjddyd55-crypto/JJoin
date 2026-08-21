import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JoinMethod,
  JoinStatus,
  ParticipantRole,
  ParticipationStatus,
  SCREEN_GOLF_CODE,
  type CreateJoinRequest,
  type ExploreJoinPreviewDto,
  type ExploreVenueDto,
  type JoinDetailDto,
  type JoinListItemDto,
  type JoinParticipantDto,
  type MyJoinsResponse,
  type PublicUserProfileDto,
} from '@jjoin/types';
import {
  SCREEN_GOLF_DURATION_RULE,
  assertPublicProfileHasNoPrivateFields,
  computeConfirmedPlayerCount,
  estimateEndAt,
  mapGenderDisplay,
  nextJoinStatusAfterRoster,
} from '@jjoin/domain';
import { createJoinSchema } from '@jjoin/validation';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureFoundation } from '../../foundation/ensure-foundation';
import { haversineMeters } from '../presence/privacy-location';

const ACTIVE_JOIN_STATUSES: JoinStatus[] = [JoinStatus.OPEN, JoinStatus.FULL];

@Injectable()
export class JoinsService {
  constructor(private readonly prisma: PrismaService) {}

  ping() {
    return { module: 'joins', status: 'ready', coinAccounting: 'COIN_ACCOUNTING_PENDING' };
  }

  async create(hostUserId: string, raw: CreateJoinRequest): Promise<JoinDetailDto> {
    const parsed = createJoinSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException('invalid_create_join');
    }
    const input = parsed.data;
    const startAt = new Date(input.startAt);
    if (Number.isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
      throw new BadRequestException('start_at_must_be_future');
    }

    const { sport, coinAsset } = await ensureFoundation(this.prisma);
    if (input.sportCode !== sport.code && input.sportCode !== SCREEN_GOLF_CODE) {
      throw new BadRequestException('unsupported_sport');
    }

    const reward = input.rewardPerParticipant ?? process.env.DEV_FIXTURE_REWARD_PER_PARTICIPANT ?? '0';
    const scheduledEndAt = estimateEndAt({
      startAt,
      playerCount: input.plannedPlayerCount,
      rule: SCREEN_GOLF_DURATION_RULE,
    });

    const joinId = await this.prisma.$transaction(async (tx) => {
      const venue = await tx.venue.upsert({
        where: {
          provider_providerPlaceId: {
            provider: input.venue.provider,
            providerPlaceId: input.venue.providerPlaceId,
          },
        },
        create: {
          sportId: sport.id,
          provider: input.venue.provider,
          providerPlaceId: input.venue.providerPlaceId,
          name: input.venue.name,
          address: input.venue.address ?? null,
          region: input.venue.regionLabel ?? null,
          latitude: input.venue.latitude,
          longitude: input.venue.longitude,
        },
        update: {
          name: input.venue.name,
          address: input.venue.address ?? null,
          region: input.venue.regionLabel ?? null,
          latitude: input.venue.latitude,
          longitude: input.venue.longitude,
        },
      });

      const join = await tx.join.create({
        data: {
          sportId: sport.id,
          venueId: venue.id,
          hostUserId,
          title: input.title ?? null,
          description: input.description ?? null,
          status: 'OPEN',
          joinMethod: input.joinMethod,
          startAt,
          scheduledEndAt,
          plannedPlayerCount: input.plannedPlayerCount,
          confirmedPlayerCount: 1,
          rewardPerParticipant: new Prisma.Decimal(reward),
          coinAssetId: coinAsset.id,
          // COIN_ACCOUNTING_PENDING — snapshots only, no ledger
          roomCreationFeeAmount: new Prisma.Decimal(0),
          rewardHoldTotalAmount: new Prisma.Decimal(0),
          participants: {
            create: {
              userId: hostUserId,
              role: 'HOST',
              participationStatus: 'APPROVED',
              approvedAt: new Date(),
              confirmedAt: new Date(),
            },
          },
        },
      });

      return join.id;
    });

    return this.getDetail(joinId, hostUserId);
  }

  async getDetail(joinId: string, viewerUserId?: string): Promise<JoinDetailDto> {
    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: {
        venue: true,
        sport: true,
        host: { include: { profile: true, sportProfiles: { include: { sport: true } } } },
        participants: {
          include: { user: { include: { profile: true } } },
          orderBy: { appliedAt: 'asc' },
        },
      },
    });
    if (!join) throw new NotFoundException('join_not_found');
    return this.toDetail(join, viewerUserId);
  }

  async myJoins(userId: string): Promise<MyJoinsResponse> {
    const [hostedRows, participatingRows] = await Promise.all([
      this.prisma.join.findMany({
        where: { hostUserId: userId },
        include: {
          venue: true,
          host: { include: { profile: true } },
          participants: true,
        },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.joinParticipant.findMany({
        where: { userId, role: 'PARTICIPANT' },
        include: {
          join: {
            include: {
              venue: true,
              host: { include: { profile: true } },
              participants: true,
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
      }),
    ]);

    return {
      hosted: hostedRows.map((j) => this.toListItem(j, userId)),
      participating: participatingRows.map((p) => this.toListItem(p.join, userId)),
    };
  }

  async apply(joinId: string, userId: string): Promise<JoinDetailDto> {
    await this.prisma.$transaction(async (tx) => {
      const join = await tx.join.findUnique({
        where: { id: joinId },
        include: { participants: true },
      });
      if (!join) throw new NotFoundException('join_not_found');
      if (join.hostUserId === userId) {
        throw new ForbiddenException('host_cannot_apply');
      }
      if (join.status === 'CANCELLED' || join.status === 'COMPLETED') {
        throw new BadRequestException('join_not_joinable');
      }
      if (join.status === 'FULL') {
        throw new BadRequestException('join_full');
      }
      if (!ACTIVE_JOIN_STATUSES.includes(join.status as JoinStatus) && join.status !== 'OPEN') {
        throw new BadRequestException('join_not_joinable');
      }

      const existing = join.participants.find((p) => p.userId === userId);
      if (existing) {
        throw new ConflictException('already_applied');
      }

      try {
        await tx.joinParticipant.create({
          data: {
            joinId,
            userId,
            role: 'PARTICIPANT',
            participationStatus: 'APPLIED',
          },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ConflictException('already_applied');
        }
        throw e;
      }
    });

    return this.getDetail(joinId, userId);
  }

  async approve(
    joinId: string,
    participantId: string,
    hostUserId: string,
  ): Promise<JoinDetailDto> {
    await this.prisma.$transaction(async (tx) => {
      const join = await tx.join.findUnique({
        where: { id: joinId },
        include: { participants: true },
      });
      if (!join) throw new NotFoundException('join_not_found');
      if (join.hostUserId !== hostUserId) {
        throw new ForbiddenException('not_join_host');
      }

      const participant = join.participants.find((p) => p.id === participantId);
      if (!participant) throw new NotFoundException('participant_not_found');
      if (participant.role === 'HOST') {
        throw new BadRequestException('cannot_approve_host');
      }
      if (participant.participationStatus === 'APPROVED' || participant.participationStatus === 'CONFIRMED') {
        return; // idempotent
      }
      if (participant.participationStatus !== 'APPLIED') {
        throw new BadRequestException('invalid_participant_status');
      }

      const confirmed = computeConfirmedPlayerCount(
        join.participants.map((p) =>
          p.id === participantId ? 'APPROVED' : p.participationStatus,
        ),
      );
      if (confirmed > join.plannedPlayerCount) {
        throw new BadRequestException('join_full');
      }

      await tx.joinParticipant.update({
        where: { id: participantId },
        data: {
          participationStatus: 'APPROVED',
          approvedAt: new Date(),
        },
      });

      const scheduledEndAt = estimateEndAt({
        startAt: join.startAt,
        playerCount: Math.max(confirmed, 1),
        rule: SCREEN_GOLF_DURATION_RULE,
      });
      const nextStatus = nextJoinStatusAfterRoster({
        currentStatus: join.status,
        confirmedPlayerCount: confirmed,
        plannedPlayerCount: join.plannedPlayerCount,
      });

      await tx.join.update({
        where: { id: joinId },
        data: {
          confirmedPlayerCount: confirmed,
          scheduledEndAt,
          status: nextStatus as never,
        },
      });
    });

    return this.getDetail(joinId, hostUserId);
  }

  /** Phase F “오늘 조인”: JJOIN venues that currently have open joins. */
  async listOpenJoinVenuesNear(input: {
    centerLat: number;
    centerLng: number;
  }): Promise<ExploreVenueDto[]> {
    const joins = await this.prisma.join.findMany({
      where: {
        status: { in: ['OPEN', 'FULL'] },
        startAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) },
      },
      include: {
        venue: true,
        host: { include: { profile: true } },
      },
      orderBy: { startAt: 'asc' },
      take: 40,
    });

    const byVenue = new Map<
      string,
      {
        venue: (typeof joins)[number]['venue'];
        previews: ExploreJoinPreviewDto[];
      }
    >();

    for (const join of joins) {
      const key = join.venueId;
      const entry = byVenue.get(key) ?? {
        venue: join.venue,
        previews: [],
      };
      entry.previews.push({
        joinId: join.id,
        startAt: join.startAt.toISOString(),
        scheduledEndAt: join.scheduledEndAt.toISOString(),
        currentParticipants: join.confirmedPlayerCount,
        maxParticipants: join.plannedPlayerCount,
        rewardCoin: String(join.rewardPerParticipant),
        hostNickname: join.host.profile?.nickname ?? '호스트',
        hostVerified: true,
      });
      byVenue.set(key, entry);
    }

    return [...byVenue.values()].map(({ venue, previews }) => {
      const lat = Number(venue.latitude);
      const lng = Number(venue.longitude);
      return {
        venueId: venue.id,
        name: venue.name,
        address: venue.address,
        roadAddress: venue.roadAddress,
        regionLabel: venue.region ?? venue.address,
        categoryName: null,
        phone: venue.phone,
        placeUrl: null,
        latitude: lat,
        longitude: lng,
        distanceMeters: Math.round(
          haversineMeters(input.centerLat, input.centerLng, lat, lng),
        ),
        openJoinCount: previews.length,
        joinPreviews: previews,
        source: 'JJOIN' as const,
        canCreateJoin: true,
      };
    });
  }

  /** Merge DB open joins onto mock venue fixtures by providerPlaceId. */
  async openJoinsByProviderPlaceIds(
    providerPlaceIds: string[],
  ): Promise<Map<string, ExploreJoinPreviewDto[]>> {
    if (providerPlaceIds.length === 0) return new Map();

    const venues = await this.prisma.venue.findMany({
      where: {
        provider: 'MOCK',
        providerPlaceId: { in: providerPlaceIds },
      },
      select: { id: true, providerPlaceId: true },
    });
    const venueIds = venues.map((v) => v.id);
    if (venueIds.length === 0) return new Map();

    const joins = await this.prisma.join.findMany({
      where: {
        venueId: { in: venueIds },
        status: { in: ['OPEN', 'FULL'] },
        startAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) },
      },
      include: {
        venue: true,
        host: { include: { profile: true } },
      },
      orderBy: { startAt: 'asc' },
    });

    const byPlace = new Map<string, ExploreJoinPreviewDto[]>();
    for (const join of joins) {
      const placeId = join.venue.providerPlaceId;
      const list = byPlace.get(placeId) ?? [];
      list.push({
        joinId: join.id,
        startAt: join.startAt.toISOString(),
        scheduledEndAt: join.scheduledEndAt.toISOString(),
        currentParticipants: join.confirmedPlayerCount,
        maxParticipants: join.plannedPlayerCount,
        rewardCoin: String(join.rewardPerParticipant),
        hostNickname: join.host.profile?.nickname ?? '호스트',
        hostVerified: true,
      });
      byPlace.set(placeId, list);
    }
    return byPlace;
  }

  private toDetail(
    join: {
      id: string;
      status: string;
      joinMethod: string;
      title: string | null;
      description: string | null;
      startAt: Date;
      scheduledEndAt: Date;
      plannedPlayerCount: number;
      confirmedPlayerCount: number;
      rewardPerParticipant: Prisma.Decimal;
      sport: { code: string };
      venue: {
        id: string;
        provider: string;
        providerPlaceId: string;
        name: string;
        address: string | null;
        region: string | null;
        latitude: Prisma.Decimal;
        longitude: Prisma.Decimal;
      };
      host: {
        id: string;
        identityStatus: string;
        profile: {
          nickname: string;
          gender: string | null;
          ageBand: string | null;
          regionLabel: string | null;
          bio: string | null;
        } | null;
        sportProfiles: Array<{ skillLevel: string; sport: { code: string } }>;
      };
      participants: Array<{
        id: string;
        userId: string;
        role: string;
        participationStatus: string;
        appliedAt: Date;
        approvedAt: Date | null;
        user: { profile: { nickname: string } | null; identityStatus?: string };
      }>;
    },
    viewerUserId?: string,
  ): JoinDetailDto {
    const hostProfile = this.toPublicHost(join.host);
    assertPublicProfileHasNoPrivateFields(hostProfile as unknown as Record<string, unknown>);

    const participants: JoinParticipantDto[] = join.participants.map((p) => ({
      participantId: p.id,
      userId: p.userId,
      role: p.role as ParticipantRole,
      participationStatus: p.participationStatus as ParticipationStatus,
      nickname: p.user.profile?.nickname ?? '참가자',
      verifiedBadge: true,
      appliedAt: p.appliedAt.toISOString(),
      approvedAt: p.approvedAt?.toISOString() ?? null,
    }));

    const mine = viewerUserId
      ? participants.find((p) => p.userId === viewerUserId) ?? null
      : null;

    return {
      joinId: join.id,
      status: join.status as JoinStatus,
      joinMethod: join.joinMethod as JoinMethod,
      sportCode: join.sport.code,
      title: join.title,
      description: join.description,
      startAt: join.startAt.toISOString(),
      scheduledEndAt: join.scheduledEndAt.toISOString(),
      plannedPlayerCount: join.plannedPlayerCount,
      confirmedPlayerCount: join.confirmedPlayerCount,
      availableSlots: Math.max(0, join.plannedPlayerCount - join.confirmedPlayerCount),
      rewardPerParticipant: String(join.rewardPerParticipant),
      coinAccountingPending: true,
      venue: {
        venueId: join.venue.id,
        provider: join.venue.provider,
        providerPlaceId: join.venue.providerPlaceId,
        name: join.venue.name,
        address: join.venue.address,
        regionLabel: join.venue.region,
        latitude: Number(join.venue.latitude),
        longitude: Number(join.venue.longitude),
      },
      host: hostProfile,
      myParticipation: mine,
      participants,
    };
  }

  private toListItem(
    join: {
      id: string;
      status: string;
      joinMethod: string;
      startAt: Date;
      scheduledEndAt: Date;
      plannedPlayerCount: number;
      confirmedPlayerCount: number;
      rewardPerParticipant: Prisma.Decimal;
      venue: { name: string };
      host: { profile: { nickname: string } | null };
      participants: Array<{
        userId: string;
        role: string;
        participationStatus: string;
      }>;
    },
    userId: string,
  ): JoinListItemDto {
    const mine = join.participants.find((p) => p.userId === userId);
    return {
      joinId: join.id,
      status: join.status as JoinStatus,
      joinMethod: join.joinMethod as JoinMethod,
      startAt: join.startAt.toISOString(),
      scheduledEndAt: join.scheduledEndAt.toISOString(),
      plannedPlayerCount: join.plannedPlayerCount,
      confirmedPlayerCount: join.confirmedPlayerCount,
      availableSlots: Math.max(0, join.plannedPlayerCount - join.confirmedPlayerCount),
      rewardPerParticipant: String(join.rewardPerParticipant),
      venueName: join.venue.name,
      hostNickname: join.host.profile?.nickname ?? '호스트',
      myRole: (mine?.role as ParticipantRole) ?? null,
      myParticipationStatus: (mine?.participationStatus as ParticipationStatus) ?? null,
      pendingApplicantCount: join.participants.filter((p) => p.participationStatus === 'APPLIED')
        .length,
    };
  }

  private toPublicHost(host: {
    id: string;
    identityStatus: string;
    profile: {
      nickname: string;
      gender: string | null;
      ageBand: string | null;
      regionLabel: string | null;
      bio: string | null;
    } | null;
    sportProfiles: Array<{ skillLevel: string; sport: { code: string } }>;
  }): PublicUserProfileDto {
    const profile = host.profile;
    return {
      id: host.id,
      nickname: profile?.nickname ?? '호스트',
      avatarUrl: null,
      verifiedBadge: host.identityStatus === 'VERIFIED',
      genderDisplay: mapGenderDisplay(profile?.gender),
      ageBand: (profile?.ageBand as never) ?? null,
      regionLabel: profile?.regionLabel ?? null,
      bio: profile?.bio ?? null,
      sportProfiles: host.sportProfiles.map((sp) => ({
        sportCode: sp.sport.code,
        skillLevel: sp.skillLevel as never,
      })),
      participationCount: 0,
    };
  }
}
