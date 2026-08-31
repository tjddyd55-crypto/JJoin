import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  JoinKind,
  JoinMethod,
  JoinStatus,
  ParticipantRole,
  ParticipationStatus,
  SCREEN_GOLF_CODE,
  type CreateJoinRequest,
  type ExploreJoinPreviewDto,
  type ExploreVenueDto,
  type JoinCoinPreviewDto,
  type JoinCoinPreviewRequest,
  type JoinDetailDto,
  type JoinListItemDto,
  type JoinParticipantDto,
  type JoinPrefillDto,
  type MatchingJoinExtras,
  type MyJoinsResponse,
  type PublicUserProfileDto,
} from '@jjoin/types';
import {
  SCREEN_GOLF_DURATION_RULE,
  assertPublicProfileHasNoPrivateFields,
  canAffordJoinCreate,
  canApplyMatchingGenderSlot,
  compareJoinDiscoveryPriority,
  computeConfirmedPlayerCount,
  computeJoinCoinRequirement,
  countMatchingGenderComposition,
  createJoinShareSlug,
  DISCOVERY_JOIN_STATUSES,
  estimateEndAt,
  formatMatchingRecruitmentLabel,
  aggregateFacilityJoinActivity,
  buildStoreMatchingSecondaryLabel,
  canConfirmMatchingAttendance,
  computeMatchingRemainingSlots,
  isOngoingJoin,
  isTodayValidJoin,
  mapGenderDisplay,
  nextJoinStatusAfterRoster,
  resolveStoreMatchingDisplayStatus,
  storeMatchingDisplayStatusLabel,
  storeMatchingOwnerListPriority,
  subCoinAmounts,
  computeAutoPayAt,
  computeAttendanceReliability,
  canAccessJoinChat,
  isJoinChatVisibleInUi,
  isJoinCapacityJoinable,
  localDayKey,
} from '@jjoin/domain';
import { createJoinSchema, joinCoinPreviewSchema } from '@jjoin/validation';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureFoundation } from '../../foundation/ensure-foundation';
import { haversineMeters } from '../presence/privacy-location';
import {
  CoinLedgerService,
  InsufficientBalanceError,
} from '../wallet/coin-ledger.service';
import { SettlementService } from '../settlement/settlement.service';
import { MeVenuesService } from '../venues/me-venues.service';
import {
  CoinPolicyDisabledError,
  resolveDefaultRewardPerParticipant,
  resolveRoomCreationFee,
} from '../../coin/dev-coin-policy';
import { UserAccountService } from '../users/user-account.service';
import { mockUserStore } from '../../mock/mock-user.store';
import { NotificationEventService } from '../notifications/notification-event.service';
import { NotificationType } from '@prisma/client';
import { MatchingJoinsService } from './matching-joins.service';
import { JoinEngagementNotifyService } from '../engagement/join-engagement-notify.service';
import { UrgentVacancyService } from '../join-loop/urgent-vacancy.service';
import { JoinChatService } from '../join-loop/join-chat.service';
import type { AttendanceIntent } from '@jjoin/types';

const ACTIVE_JOIN_STATUSES: JoinStatus[] = [JoinStatus.OPEN, JoinStatus.FULL];

function generateJoinShareSlug(): string {
  const bytes = new Uint8Array(10);
  globalThis.crypto.getRandomValues(bytes);
  return createJoinShareSlug(bytes);
}

@Injectable()
export class JoinsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: CoinLedgerService,
    private readonly settlement: SettlementService,
    private readonly accounts: UserAccountService,
    private readonly notifications: NotificationEventService,
    private readonly meVenues: MeVenuesService,
    @Inject(forwardRef(() => MatchingJoinsService))
    private readonly matchingJoins: MatchingJoinsService,
    @Inject(forwardRef(() => JoinEngagementNotifyService))
    private readonly engagementNotify: JoinEngagementNotifyService,
    @Inject(forwardRef(() => UrgentVacancyService))
    private readonly urgentVacancy: UrgentVacancyService,
    @Inject(forwardRef(() => JoinChatService))
    private readonly joinChat: JoinChatService,
  ) {}

  ping() {
    return {
      module: 'joins',
      status: 'ready',
      coinAccounting: 'WALLET_LEDGER_HOLD',
    };
  }

  async previewCoin(hostUserId: string, raw: JoinCoinPreviewRequest): Promise<JoinCoinPreviewDto> {
    const parsed = joinCoinPreviewSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException('invalid_coin_preview');
    }
    let reward: string;
    let roomCreationFee: string;
    try {
      reward = parsed.data.rewardPerParticipant ?? resolveDefaultRewardPerParticipant();
      roomCreationFee = resolveRoomCreationFee();
    } catch (e) {
      if (e instanceof CoinPolicyDisabledError) {
        throw new ServiceUnavailableException({
          code: e.code,
          message: '코인 정책이 아직 적용되지 않았습니다.',
        });
      }
      throw e;
    }
    const requirement = computeJoinCoinRequirement({
      plannedPlayerCount: parsed.data.plannedPlayerCount,
      rewardPerParticipant: reward,
      roomCreationFee,
    });
    const { coinAsset } = await ensureFoundation(this.prisma);
    const wallet = await this.ledger.getOrCreateWallet(hostUserId, coinAsset.id);
    const walletAvailable = String(wallet.availableBalance);
    const canCreate = canAffordJoinCreate(walletAvailable, requirement.totalRequiredCoin);
    const walletAfterCreation = canCreate
      ? subCoinAmounts(walletAvailable, requirement.totalRequiredCoin)
      : walletAvailable;
    return {
      roomCreationFee: requirement.roomCreationFee,
      rewardPerParticipant: requirement.rewardPerParticipant,
      rewardEligibleSlots: requirement.rewardEligibleSlots,
      rewardHoldTotal: requirement.rewardHoldTotal,
      totalRequiredCoin: requirement.totalRequiredCoin,
      walletAvailable,
      walletAfterCreation,
      canCreate,
    };
  }

  async create(hostUserId: string, raw: CreateJoinRequest): Promise<JoinDetailDto> {
    await this.accounts.assertIdentityVerified(hostUserId, 'CREATE_JOIN');
    const parsed = createJoinSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException('invalid_create_join');
    }
    const input = parsed.data;
    const startAt = new Date(input.startAt);
    if (Number.isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
      throw new BadRequestException('start_at_must_be_future');
    }

    const clientIdempotencyKey = input.idempotencyKey?.trim();
    if (clientIdempotencyKey) {
      const existingFee = await this.prisma.coinTransaction.findUnique({
        where: { idempotencyKey: `join:${clientIdempotencyKey}:room-fee` },
      });
      if (existingFee?.refType === 'JOIN' && existingFee.refId) {
        return this.getDetail(existingFee.refId, hostUserId);
      }
      const existingHold = await this.prisma.coinTransaction.findUnique({
        where: { idempotencyKey: `join:${clientIdempotencyKey}:reward-hold` },
      });
      if (existingHold?.refType === 'JOIN' && existingHold.refId) {
        return this.getDetail(existingHold.refId, hostUserId);
      }
    }

    const { sport, coinAsset } = await ensureFoundation(this.prisma);
    if (input.sportCode !== sport.code && input.sportCode !== SCREEN_GOLF_CODE) {
      throw new BadRequestException('unsupported_sport');
    }

    let rewardPerParticipant: string;
    let roomCreationFee: string;
    try {
      rewardPerParticipant = input.rewardPerParticipant ?? resolveDefaultRewardPerParticipant();
      roomCreationFee = resolveRoomCreationFee();
    } catch (e) {
      if (e instanceof CoinPolicyDisabledError) {
        throw new ServiceUnavailableException({
          code: e.code,
          message: '코인 정책이 아직 적용되지 않았습니다.',
        });
      }
      throw e;
    }
    const requirement = computeJoinCoinRequirement({
      plannedPlayerCount: input.plannedPlayerCount,
      rewardPerParticipant,
      roomCreationFee,
    });

    const scheduledEndAt = estimateEndAt({
      startAt,
      playerCount: input.plannedPlayerCount,
      rule: SCREEN_GOLF_DURATION_RULE,
    });

    const joinId = randomUUID();
    const idemBase = clientIdempotencyKey ?? joinId;
    let createdVenueId: string | null = null;

    try {
      await this.prisma.$transaction(async (tx) => {
        let venue;
        if (input.venueId) {
          const byId = await tx.venue.findUnique({ where: { id: input.venueId } });
          if (!byId) {
            throw new BadRequestException({
              code: 'VENUE_NOT_FOUND',
              message: '장소 정보를 확인할 수 없습니다. 다시 시도해 주세요.',
            });
          }
          venue = byId;
        } else if (!input.venue) {
          throw new BadRequestException('invalid_create_join');
        } else if (input.venue.provider === 'KAKAO') {
          const existing = await tx.venue.findUnique({
            where: {
              provider_providerPlaceId: {
                provider: 'KAKAO',
                providerPlaceId: input.venue.providerPlaceId,
              },
            },
          });
          if (!existing) {
            throw new BadRequestException({
              code: 'VENUE_NOT_ACTIVATED',
              message: '장소 정보를 확인할 수 없습니다. 다시 시도해 주세요.',
            });
          }
          venue = existing;
        } else {
          venue = await tx.venue.upsert({
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
        }

        createdVenueId = venue.id;

        const wallet = await this.ledger.getOrCreateWallet(hostUserId, coinAsset.id, tx);
        const locked = await this.ledger.lockWallet(tx, wallet.id);
        const available = String(locked.availableBalance);
        if (!canAffordJoinCreate(available, requirement.totalRequiredCoin)) {
          throw new InsufficientBalanceError();
        }

        // Join row first — CoinHold.joinId FK requires the join to exist.
        await tx.join.create({
          data: {
            id: joinId,
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
            rewardPerParticipant: new Prisma.Decimal(requirement.rewardPerParticipant),
            coinAssetId: coinAsset.id,
            roomCreationFeeAmount: new Prisma.Decimal(requirement.roomCreationFee),
            rewardHoldTotalAmount: new Prisma.Decimal(requirement.rewardHoldTotal),
            participants: {
              create: {
                userId: hostUserId,
                role: 'HOST',
                participationStatus: 'APPROVED',
                approvedAt: new Date(),
                confirmedAt: new Date(),
              },
            },
            ...(clientIdempotencyKey
              ? {
                  options: {
                    create: {
                      optionKey: 'client_idempotency_key',
                      optionValueJson: { key: clientIdempotencyKey },
                    },
                  },
                }
              : {}),
          },
        });

        await this.ledger.applyRoomCreationFee(tx, {
          walletId: wallet.id,
          coinAssetId: coinAsset.id,
          amount: requirement.roomCreationFee,
          joinId,
          idempotencyKey: `join:${idemBase}:room-fee`,
        });

        await this.ledger.applyJoinRewardHold(tx, {
          walletId: wallet.id,
          coinAssetId: coinAsset.id,
          amount: requirement.rewardHoldTotal,
          joinId,
          idempotencyKey: `join:${idemBase}:reward-hold`,
        });
      });
    } catch (e) {
      if (e instanceof CoinPolicyDisabledError) {
        throw new ServiceUnavailableException({
          code: e.code,
          message: '코인 정책이 아직 적용되지 않았습니다.',
        });
      }
      if (e instanceof InsufficientBalanceError) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_BALANCE',
          message: '보유 코인이 부족합니다.',
        });
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        if (clientIdempotencyKey) {
          const fee = await this.prisma.coinTransaction.findUnique({
            where: { idempotencyKey: `join:${clientIdempotencyKey}:room-fee` },
          });
          if (fee?.refId) return this.getDetail(fee.refId, hostUserId);
        }
        throw new ConflictException('join_create_conflict');
      }
      throw e;
    }

    const updated = await this.ledger.getOrCreateWallet(hostUserId, coinAsset.id);
    mockUserStore.syncWalletBalances(
      hostUserId,
      String(updated.availableBalance),
      String(updated.heldBalance),
    );

    if (createdVenueId) {
      await this.meVenues.touchRecent(hostUserId, createdVenueId);
    }

    await this.ensureShareSlug(joinId);
    void this.engagementNotify.notifyNewJoinableJoin(joinId);

    return this.getDetail(joinId, hostUserId);
  }

  async getPrefill(sourceJoinId: string, userId: string): Promise<JoinPrefillDto> {
    const join = await this.prisma.join.findUnique({
      where: { id: sourceJoinId },
      include: { venue: true },
    });
    if (!join) throw new NotFoundException('join_not_found');

    const isHost = join.hostUserId === userId;
    let isStoreOwner = false;
    if (join.storeOwnershipId) {
      const ownership = await this.prisma.storeOwnership.findFirst({
        where: { id: join.storeOwnershipId, userId, status: 'ACTIVE' },
        select: { id: true },
      });
      isStoreOwner = Boolean(ownership);
    } else if (join.venue.golfFacilityId) {
      const ownership = await this.prisma.storeOwnership.findFirst({
        where: {
          golfFacilityId: join.venue.golfFacilityId,
          userId,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      isStoreOwner = Boolean(ownership);
    }
    if (!isHost && !isStoreOwner) {
      throw new ForbiddenException({
        code: 'JOIN_PREFILL_FORBIDDEN',
        message: '재오픈은 호스트 또는 매장 소유자만 가능합니다.',
      });
    }

    return {
      sourceJoinId: join.id,
      venueId: join.venueId,
      golfFacilityId: join.venue.golfFacilityId,
      title: join.title,
      description: join.description,
      plannedPlayerCount: join.plannedPlayerCount,
      targetMaleCount: join.targetMaleCount,
      targetFemaleCount: join.targetFemaleCount,
      rewardPerParticipant: String(join.rewardPerParticipant),
      joinKind: join.joinKind as JoinKind,
      matchingRewardTarget: join.matchingRewardTarget as JoinPrefillDto['matchingRewardTarget'],
      storeOwnershipId: join.storeOwnershipId,
      minimumPlayers: join.minimumPlayers,
    };
  }

  /** Assign opaque share slug after commit when missing. */
  async ensureShareSlug(joinId: string): Promise<string | null> {
    const existing = await this.prisma.join.findUnique({
      where: { id: joinId },
      select: { shareSlug: true },
    });
    if (!existing) return null;
    if (existing.shareSlug) return existing.shareSlug;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const shareSlug = generateJoinShareSlug();
      try {
        await this.prisma.join.update({
          where: { id: joinId },
          data: { shareSlug },
        });
        return shareSlug;
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          continue;
        }
        throw e;
      }
    }
    return null;
  }

  async resolveShareSlug(shareSlug: string): Promise<{ joinId: string; shareSlug: string }> {
    const slug = shareSlug?.trim();
    if (!slug) throw new NotFoundException('join_not_found');
    const join = await this.prisma.join.findUnique({
      where: { shareSlug: slug },
      select: { id: true, shareSlug: true },
    });
    if (!join?.shareSlug) throw new NotFoundException('join_not_found');
    return { joinId: join.id, shareSlug: join.shareSlug };
  }

  async getDetail(joinId: string, viewerUserId?: string): Promise<JoinDetailDto> {
    const joinMeta = await this.prisma.join.findUnique({
      where: { id: joinId },
      select: { joinKind: true },
    });
    if (joinMeta?.joinKind === 'STORE_MATCHING') {
      await this.matchingJoins.ensureMatchingDeadline(joinId);
    }

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
        chatRoom: true,
      },
    });
    if (!join) throw new NotFoundException('join_not_found');
    let bookmarked = false;
    if (viewerUserId) {
      const bookmark = await this.prisma.joinBookmark.findUnique({
        where: { userId_joinId: { userId: viewerUserId, joinId } },
        select: { id: true },
      });
      bookmarked = Boolean(bookmark);
    }
    const reliabilityByUserId = await this.loadAttendanceReliabilityByUserIds([
      join.hostUserId,
      ...join.participants.map((p) => p.userId),
    ]);
    const detail = this.toDetail(join, viewerUserId, { bookmarked, reliabilityByUserId });
    if (viewerUserId) {
      try {
        detail.settlement = await this.settlement.getJoinSettlements(joinId, viewerUserId);
      } catch (e) {
        if (!(e instanceof ForbiddenException)) throw e;
      }
    }
    return detail;
  }

  private async loadAttendanceReliabilityByUserIds(
    userIds: string[],
  ): Promise<
    Map<
      string,
      {
        completedCount: number;
        noShowCount: number;
        attendanceRatePercent: number | null;
      }
    >
  > {
    const unique = [...new Set(userIds.filter(Boolean))];
    const result = new Map<
      string,
      {
        completedCount: number;
        noShowCount: number;
        attendanceRatePercent: number | null;
      }
    >();
    for (const id of unique) {
      result.set(id, {
        completedCount: 0,
        noShowCount: 0,
        attendanceRatePercent: null,
      });
    }
    if (unique.length === 0) return result;

    const rows = await this.prisma.joinParticipant.groupBy({
      by: ['userId', 'participationStatus'],
      where: {
        userId: { in: unique },
        participationStatus: { in: ['COMPLETED', 'NO_SHOW'] },
      },
      _count: { _all: true },
    });

    const completed = new Map<string, number>();
    const noshow = new Map<string, number>();
    for (const row of rows) {
      if (row.participationStatus === 'COMPLETED') {
        completed.set(row.userId, row._count._all);
      } else if (row.participationStatus === 'NO_SHOW') {
        noshow.set(row.userId, row._count._all);
      }
    }
    for (const id of unique) {
      const reliability = computeAttendanceReliability({
        completedCount: completed.get(id) ?? 0,
        noShowCount: noshow.get(id) ?? 0,
      });
      result.set(id, {
        completedCount: reliability.completedCount,
        noShowCount: reliability.noShowCount,
        attendanceRatePercent: reliability.attendanceRatePercent,
      });
    }
    return result;
  }

  async myJoins(userId: string): Promise<MyJoinsResponse> {
    const [hostedRows, participatingRows] = await Promise.all([
      this.prisma.join.findMany({
        where: { hostUserId: userId },
        include: {
          venue: true,
          host: { include: { profile: true } },
          participants: true,
          chatRoom: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.joinParticipant.findMany({
        where: { userId, role: 'PARTICIPANT' },
        include: {
          join: {
            include: {
              venue: true,
              host: { include: { profile: true } },
              participants: true,
              chatRoom: true,
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
    await this.accounts.assertIdentityVerified(userId, 'APPLY_JOIN');

    const joinKindRow = await this.prisma.join.findUnique({
      where: { id: joinId },
      select: { joinKind: true },
    });
    if (joinKindRow?.joinKind === 'STORE_MATCHING') {
      await this.matchingJoins.ensureMatchingDeadline(joinId);
      return this.applyStoreMatching(joinId, userId);
    }

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

    const [joinMeta, applicant] = await Promise.all([
      this.prisma.join.findUnique({ where: { id: joinId }, select: { hostUserId: true } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      }),
    ]);
    if (joinMeta && applicant) {
      const nickname = applicant.profile?.nickname ?? '참가자';
      await this.notifications.enqueueSafe({
        userId: joinMeta.hostUserId,
        type: NotificationType.JOIN_APPLICATION_RECEIVED,
        title: '새 참가 신청',
        body: `${nickname}님이 조인 참가를 신청했습니다.`,
        data: {
          type: NotificationType.JOIN_APPLICATION_RECEIVED,
          joinId,
        },
        eventKey: `join:${joinId}:application:${userId}:received`,
      });
    }

    return this.getDetail(joinId, userId);
  }

  private async applyStoreMatching(joinId: string, userId: string): Promise<JoinDetailDto> {
    const applicant = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!applicant?.profile?.gender) {
      throw new BadRequestException({
        code: 'GENDER_REQUIRED',
        message: '참가하려면 프로필에서 성별을 설정해주세요.',
      });
    }
    const applicantGender = applicant.profile.gender;

    await this.prisma.$transaction(async (tx) => {
      const join = await tx.join.findUnique({
        where: { id: joinId },
        include: {
          participants: { include: { user: { include: { profile: true } } } },
        },
      });
      if (!join) throw new NotFoundException('join_not_found');
      if (join.joinKind !== 'STORE_MATCHING') {
        throw new BadRequestException('not_store_matching_join');
      }
      if (join.hostUserId === userId) {
        throw new ForbiddenException('host_cannot_apply');
      }
      if (join.status === 'CANCELLED' || join.status === 'COMPLETED') {
        throw new BadRequestException('join_not_joinable');
      }
      if (!this.matchingJoins.isStoreMatchingJoinable(join)) {
        throw new BadRequestException('join_not_joinable');
      }

      const existing = join.participants.find((p) => p.userId === userId);
      if (existing && existing.participationStatus !== 'CANCELLED') {
        throw new ConflictException('already_applied');
      }

      const confirmedGenders = join.participants
        .filter(
          (p) =>
            p.role !== 'HOST' &&
            p.id !== existing?.id &&
            (p.participationStatus === 'APPROVED' || p.participationStatus === 'CONFIRMED'),
        )
        .map((p) => p.user.profile?.gender ?? null);

      if (
        !canApplyMatchingGenderSlot({
          applicantGender,
          targetMaleCount: join.targetMaleCount ?? 0,
          targetFemaleCount: join.targetFemaleCount ?? 0,
          confirmedGenders,
        })
      ) {
        throw new BadRequestException({
          code: 'GENDER_SLOT_FULL',
          message: '해당 성별 모집 인원이 마감되었습니다.',
        });
      }

      const now = new Date();
      const participant = existing
        ? await tx.joinParticipant.update({
            where: { id: existing.id },
            data: {
              participationStatus: 'APPROVED',
              approvedAt: now,
              confirmedAt: now,
              cancelledAt: null,
            },
          })
        : await tx.joinParticipant.create({
            data: {
              joinId,
              userId,
              role: 'PARTICIPANT',
              participationStatus: 'APPROVED',
              approvedAt: now,
              confirmedAt: now,
            },
          });

      const rosterParticipants = existing
        ? join.participants.map((p) =>
            p.id === existing.id
              ? { ...p, participationStatus: 'APPROVED' as const }
              : p,
          )
        : [
            ...join.participants,
            { role: 'PARTICIPANT' as const, participationStatus: 'APPROVED' as const },
          ];
      const rosterCount = this.matchingJoins.countMatchingParticipants(rosterParticipants);

      const scheduledEndAt = estimateEndAt({
        startAt: join.startAt,
        playerCount: Math.max(rosterCount, 1),
        rule: SCREEN_GOLF_DURATION_RULE,
      });
      const nextStatus = nextJoinStatusAfterRoster({
        currentStatus: join.status,
        confirmedPlayerCount: rosterCount,
        plannedPlayerCount: join.plannedPlayerCount,
      });

      await tx.join.update({
        where: { id: joinId },
        data: {
          confirmedPlayerCount: rosterCount,
          scheduledEndAt,
          status: nextStatus as never,
        },
      });

      await this.settlement.ensureSettlementOnApprove(tx, {
        joinId,
        participantId: participant.id,
        scheduledEndAt,
        rewardPerParticipant: join.rewardPerParticipant,
        coinAssetId: join.coinAssetId,
      });

      // Leave marks settlement NOT_ELIGIBLE without moving JOIN hold; rejoin must restore HELD.
      const settlement = await tx.rewardSettlement.findUnique({
        where: { joinParticipantId: participant.id },
      });
      if (settlement?.rewardStatus === 'NOT_ELIGIBLE') {
        await tx.rewardSettlement.update({
          where: { id: settlement.id },
          data: {
            rewardStatus: 'HELD',
            heldAt: now,
            refundedAt: null,
            settlementAvailableAt: scheduledEndAt,
            autoPayAt: computeAutoPayAt(scheduledEndAt),
          },
        });
      }
    });

    void this.joinChat.ensureRoomForJoin(joinId).then(() =>
      this.joinChat.onMemberJoined(joinId, userId),
    );
    void this.urgentVacancy.clearIfNeeded(joinId);

    return this.getDetail(joinId, userId);
  }

  async approve(
    joinId: string,
    participantId: string,
    hostUserId: string,
  ): Promise<JoinDetailDto> {
    let newlyApprovedUserId: string | null = null;

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
      if (
        participant.participationStatus === 'APPROVED' ||
        participant.participationStatus === 'CONFIRMED'
      ) {
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

      await this.settlement.ensureSettlementOnApprove(tx, {
        joinId,
        participantId,
        scheduledEndAt,
        rewardPerParticipant: join.rewardPerParticipant,
        coinAssetId: join.coinAssetId,
      });

      newlyApprovedUserId = participant.userId;
    });

    if (newlyApprovedUserId) {
      await this.notifications.enqueueSafe({
        userId: newlyApprovedUserId,
        type: NotificationType.JOIN_APPLICATION_APPROVED,
        title: '참가 승인',
        body: '참가 신청이 승인되었습니다.',
        data: {
          type: NotificationType.JOIN_APPLICATION_APPROVED,
          joinId,
        },
        eventKey: `join:${joinId}:application:${newlyApprovedUserId}:approved`,
      });
      void this.joinChat.ensureRoomForJoin(joinId).then(() =>
        this.joinChat.onMemberJoined(joinId, newlyApprovedUserId!),
      );
    }

    void this.urgentVacancy.clearIfNeeded(joinId);

    return this.getDetail(joinId, hostUserId);
  }

  /** Phase F “오늘 조인”: discovery statuses, today-valid or ongoing, not ended. */
  async listOpenJoinVenuesNear(input: {
    centerLat: number;
    centerLng: number;
  }): Promise<ExploreVenueDto[]> {
    const now = new Date();
    const joins = await this.prisma.join.findMany({
      where: {
        status: { in: [...DISCOVERY_JOIN_STATUSES] },
        scheduledEndAt: { gt: now },
      },
      include: {
        venue: true,
        host: { include: { profile: true } },
      },
      orderBy: { startAt: 'asc' },
      take: 80,
    });

    const discoveryJoins = joins.filter(
      (join) =>
        isOngoingJoin({
          status: join.status,
          startAt: join.startAt,
          scheduledEndAt: join.scheduledEndAt,
          now,
        }) ||
        isTodayValidJoin({
          status: join.status,
          startAt: join.startAt,
          scheduledEndAt: join.scheduledEndAt,
          now,
        }),
    );

    const byVenue = new Map<
      string,
      {
        venue: (typeof joins)[number]['venue'];
        previews: ExploreJoinPreviewDto[];
      }
    >();

    for (const join of discoveryJoins.sort((a, b) =>
      compareJoinDiscoveryPriority(a, b, now),
    )) {
      const key = join.venueId;
      const entry = byVenue.get(key) ?? {
        venue: join.venue,
        previews: [],
      };
      entry.previews.push(this.toJoinPreview(join));
      byVenue.set(key, entry);
    }

    return [...byVenue.values()].map(({ venue, previews }) => {
      const lat = Number(venue.latitude);
      const lng = Number(venue.longitude);
      const activity = aggregateFacilityJoinActivity(previews, now);
      const todayKey = localDayKey(now);
      const urgentJoinCount = discoveryJoins.filter(
        (j) =>
          j.venueId === venue.id &&
          j.isUrgent &&
          localDayKey(j.startAt) === todayKey &&
          isJoinCapacityJoinable({
            status: j.status,
            currentParticipants: j.confirmedPlayerCount,
            maxParticipants: j.plannedPlayerCount,
          }),
      ).length;
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
        openJoinCount: activity.openJoinCount,
        todayJoinCount: activity.todayJoinCount,
        urgentJoinCount,
        ongoingJoinCount: activity.ongoingJoinCount,
        hasTodayJoin: activity.hasTodayJoin,
        hasOngoingJoin: activity.hasOngoingJoin,
        joinPreviews: previews,
        source: 'JJOIN' as const,
        canCreateJoin: true,
      };
    });
  }

  /** Merge DB discovery joins onto venue fixtures by providerPlaceId. */
  async openJoinsByProviderPlaceIds(
    providerPlaceIds: string[],
    provider: string = 'MOCK',
  ): Promise<Map<string, ExploreJoinPreviewDto[]>> {
    if (providerPlaceIds.length === 0) return new Map();

    const venues = await this.prisma.venue.findMany({
      where: {
        provider,
        providerPlaceId: { in: providerPlaceIds },
      },
      select: { id: true, providerPlaceId: true },
    });
    const venueIds = venues.map((v) => v.id);
    if (venueIds.length === 0) return new Map();

    const now = new Date();
    const joins = await this.prisma.join.findMany({
      where: {
        venueId: { in: venueIds },
        status: { in: [...DISCOVERY_JOIN_STATUSES] },
        scheduledEndAt: { gt: now },
      },
      include: {
        venue: true,
        host: { include: { profile: true } },
      },
      orderBy: { startAt: 'asc' },
    });

    const byPlace = new Map<string, ExploreJoinPreviewDto[]>();
    for (const join of joins) {
      if (
        !isOngoingJoin({
          status: join.status,
          startAt: join.startAt,
          scheduledEndAt: join.scheduledEndAt,
          now,
        }) &&
        !isTodayValidJoin({
          status: join.status,
          startAt: join.startAt,
          scheduledEndAt: join.scheduledEndAt,
          now,
        })
      ) {
        continue;
      }
      const placeId = join.venue.providerPlaceId;
      const list = byPlace.get(placeId) ?? [];
      list.push(this.toJoinPreview(join));
      byPlace.set(placeId, list);
    }
    for (const [placeId, list] of byPlace) {
      list.sort((a, b) => compareJoinDiscoveryPriority(a, b, now));
      byPlace.set(placeId, list);
    }
    return byPlace;
  }

  toListItemPublic(
    join: Parameters<JoinsService['toListItem']>[0],
    userId: string,
  ): JoinListItemDto {
    return this.toListItem(join, userId);
  }

  private toJoinPreview(join: {
    id: string;
    status: string;
    startAt: Date;
    scheduledEndAt: Date;
    confirmedPlayerCount: number;
    plannedPlayerCount: number;
    rewardPerParticipant: Prisma.Decimal;
    host: { profile: { nickname: string } | null };
  }): ExploreJoinPreviewDto {
    return {
      joinId: join.id,
      status: join.status as JoinStatus,
      startAt: join.startAt.toISOString(),
      scheduledEndAt: join.scheduledEndAt.toISOString(),
      currentParticipants: join.confirmedPlayerCount,
      maxParticipants: join.plannedPlayerCount,
      rewardCoin: String(join.rewardPerParticipant),
      hostNickname: join.host.profile?.nickname ?? '호스트',
      hostVerified: true,
    };
  }

  private toDetail(
    join: {
      id: string;
      status: string;
      joinMethod: string;
      joinKind?: string;
      title: string | null;
      description: string | null;
      startAt: Date;
      scheduledEndAt: Date;
      plannedPlayerCount: number;
      confirmedPlayerCount: number;
      recruitClosesAt?: Date | null;
      minimumPlayers?: number | null;
      targetMaleCount?: number | null;
      targetFemaleCount?: number | null;
      matchingRewardTarget?: string | null;
      storeOwnershipId?: string | null;
      confirmedAt?: Date | null;
      cancelledAt?: Date | null;
      shareSlug?: string | null;
      isUrgent?: boolean;
      urgentUntil?: Date | null;
      urgentSeats?: number | null;
      rewardPerParticipant: Prisma.Decimal;
      roomCreationFeeAmount: Prisma.Decimal;
      rewardHoldTotalAmount: Prisma.Decimal;
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
        attendanceIntent?: string;
        attendanceIntentAt?: Date | null;
        appliedAt: Date;
        approvedAt: Date | null;
        user: { profile: { nickname: string; gender?: string | null } | null; identityStatus?: string };
      }>;
      chatRoom?: {
        status: string;
        hideAfter: Date | null;
      } | null;
    },
    viewerUserId?: string,
    extras?: {
      bookmarked?: boolean;
      reliabilityByUserId?: Map<
        string,
        {
          completedCount: number;
          noShowCount: number;
          attendanceRatePercent: number | null;
        }
      >;
    },
  ): JoinDetailDto {
    const hostProfile = this.toPublicHost(
      join.host,
      extras?.reliabilityByUserId?.get(join.host.id),
    );
    assertPublicProfileHasNoPrivateFields(hostProfile as unknown as Record<string, unknown>);

    const participants: JoinParticipantDto[] = join.participants.map((p) => {
      const reliability = extras?.reliabilityByUserId?.get(p.userId);
      return {
        participantId: p.id,
        userId: p.userId,
        role: p.role as ParticipantRole,
        participationStatus: p.participationStatus as ParticipationStatus,
        attendanceIntent: (p.attendanceIntent as AttendanceIntent | undefined) ?? undefined,
        attendanceIntentAt: p.attendanceIntentAt?.toISOString() ?? null,
        nickname: p.user.profile?.nickname ?? '참가자',
        verifiedBadge: true,
        appliedAt: p.appliedAt.toISOString(),
        approvedAt: p.approvedAt?.toISOString() ?? null,
        gender: (p.user.profile?.gender as JoinParticipantDto['gender']) ?? null,
        completedJoinCount: reliability?.completedCount,
        noShowCount: reliability?.noShowCount,
        attendanceRatePercent: reliability?.attendanceRatePercent ?? null,
      };
    });

    const mine = viewerUserId
      ? participants.find((p) => p.userId === viewerUserId) ?? null
      : null;

    const matchingExtras = this.buildMatchingExtras({
      joinKind: join.joinKind,
      status: join.status,
      startAt: join.startAt,
      scheduledEndAt: join.scheduledEndAt,
      plannedPlayerCount: join.plannedPlayerCount,
      confirmedPlayerCount: join.confirmedPlayerCount,
      recruitClosesAt: join.recruitClosesAt,
      minimumPlayers: join.minimumPlayers,
      targetMaleCount: join.targetMaleCount,
      targetFemaleCount: join.targetFemaleCount,
      matchingRewardTarget: join.matchingRewardTarget,
      storeOwnershipId: join.storeOwnershipId,
      confirmedAt: join.confirmedAt,
      cancelledAt: join.cancelledAt,
      participants: join.participants,
    });

    const chatAvailable = viewerUserId
      ? canAccessJoinChat({
          role: mine?.role ?? (join.host.id === viewerUserId ? 'HOST' : null),
          participationStatus:
            mine?.participationStatus ??
            (join.host.id === viewerUserId ? 'APPROVED' : null),
          attendanceIntent: mine?.attendanceIntent,
        }) &&
        isJoinChatVisibleInUi({
          hasRoom: Boolean(join.chatRoom),
          roomStatus: join.chatRoom?.status,
          hideAfter: join.chatRoom?.hideAfter,
        })
      : false;

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
      roomCreationFeeAmount: String(join.roomCreationFeeAmount),
      rewardHoldTotalAmount: String(join.rewardHoldTotalAmount),
      coinAccountingPending: false,
      shareSlug: join.shareSlug ?? null,
      bookmarked: extras?.bookmarked ?? false,
      isUrgent: join.isUrgent ?? false,
      urgentUntil: join.urgentUntil?.toISOString() ?? null,
      urgentSeats: join.urgentSeats ?? null,
      chatAvailable,
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
      ...matchingExtras,
    };
  }

  private toListItem(
    join: {
      id: string;
      status: string;
      joinMethod: string;
      joinKind?: string;
      startAt: Date;
      scheduledEndAt: Date;
      plannedPlayerCount: number;
      confirmedPlayerCount: number;
      recruitClosesAt?: Date | null;
      minimumPlayers?: number | null;
      targetMaleCount?: number | null;
      targetFemaleCount?: number | null;
      matchingRewardTarget?: string | null;
      storeOwnershipId?: string | null;
      confirmedAt?: Date | null;
      cancelledAt?: Date | null;
      isUrgent?: boolean;
      hostUserId?: string;
      rewardPerParticipant: Prisma.Decimal;
      roomCreationFeeAmount: Prisma.Decimal;
      rewardHoldTotalAmount: Prisma.Decimal;
      venue: { name: string };
      host: { id?: string; profile: { nickname: string } | null };
      participants: Array<{
        userId: string;
        role: string;
        participationStatus: string;
        attendanceIntent?: string | null;
        user?: { profile: { gender: string | null } | null };
      }>;
      chatRoom?: {
        status: string;
        hideAfter: Date | null;
      } | null;
    },
    userId: string,
  ): JoinListItemDto {
    const mine = join.participants.find((p) => p.userId === userId);
    const matchingExtras = this.buildMatchingExtras({
      joinKind: join.joinKind,
      status: join.status,
      startAt: join.startAt,
      scheduledEndAt: join.scheduledEndAt,
      plannedPlayerCount: join.plannedPlayerCount,
      confirmedPlayerCount: join.confirmedPlayerCount,
      recruitClosesAt: join.recruitClosesAt,
      minimumPlayers: join.minimumPlayers,
      targetMaleCount: join.targetMaleCount,
      targetFemaleCount: join.targetFemaleCount,
      matchingRewardTarget: join.matchingRewardTarget,
      storeOwnershipId: join.storeOwnershipId,
      confirmedAt: join.confirmedAt,
      cancelledAt: join.cancelledAt,
      participants: join.participants,
    });
    const isHost =
      mine?.role === 'HOST' ||
      join.hostUserId === userId ||
      join.host.id === userId;
    const chatAvailable =
      canAccessJoinChat({
        role: mine?.role ?? (isHost ? 'HOST' : null),
        participationStatus:
          mine?.participationStatus ?? (isHost ? 'APPROVED' : null),
        attendanceIntent: mine?.attendanceIntent,
      }) &&
      isJoinChatVisibleInUi({
        hasRoom: Boolean(join.chatRoom),
        roomStatus: join.chatRoom?.status,
        hideAfter: join.chatRoom?.hideAfter,
      });
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
      isUrgent: join.isUrgent ?? false,
      chatAvailable,
      ...matchingExtras,
    };
  }

  private buildMatchingExtras(join: {
    joinKind?: string;
    status?: string;
    startAt?: Date;
    scheduledEndAt?: Date;
    plannedPlayerCount?: number;
    confirmedPlayerCount?: number;
    recruitClosesAt?: Date | null;
    minimumPlayers?: number | null;
    targetMaleCount?: number | null;
    targetFemaleCount?: number | null;
    matchingRewardTarget?: string | null;
    storeOwnershipId?: string | null;
    confirmedAt?: Date | null;
    cancelledAt?: Date | null;
    participants?: Array<{
      role: string;
      participationStatus: string;
      user?: { profile?: { gender?: string | null } | null };
    }>;
  }): MatchingJoinExtras {
    if (join.joinKind !== 'STORE_MATCHING') {
      return {};
    }

    const maleTarget = join.targetMaleCount ?? 0;
    const femaleTarget = join.targetFemaleCount ?? 0;
    // Composition counts confirmed roster across lifecycle (incl. COMPLETED/NO_SHOW after settlement).
    // CANCELLED/APPLIED rows are excluded so leave and leave→rejoin stay correct.
    const composition = countMatchingGenderComposition(
      (join.participants ?? []).map((p) => ({
        role: p.role,
        participationStatus: p.participationStatus,
        gender: (p.user?.profile?.gender as 'MALE' | 'FEMALE' | null | undefined) ?? null,
      })),
    );
    const confirmedMale = composition.male;
    const confirmedFemale = composition.female;

    const now = new Date();
    const startAt = join.startAt ?? now;
    const scheduledEndAt = join.scheduledEndAt ?? now;
    const confirmedPlayerCount = join.confirmedPlayerCount ?? 0;
    const plannedPlayerCount = join.plannedPlayerCount ?? confirmedPlayerCount;
    const status = join.status ?? 'OPEN';
    const displayStatus = resolveStoreMatchingDisplayStatus({
      now,
      status,
      recruitClosesAt: join.recruitClosesAt,
      startAt,
      scheduledEndAt,
      confirmedPlayerCount,
      minimumPlayers: join.minimumPlayers,
      confirmedAt: join.confirmedAt,
      cancelledAt: join.cancelledAt,
    });
    const remainingSlots = computeMatchingRemainingSlots(plannedPlayerCount, confirmedPlayerCount);
    const recruitmentLabel = formatMatchingRecruitmentLabel({
      targetMaleCount: maleTarget,
      targetFemaleCount: femaleTarget,
      confirmedMale,
      confirmedFemale,
    });

    return {
      joinKind: JoinKind.STORE_MATCHING,
      recruitClosesAt: join.recruitClosesAt?.toISOString() ?? null,
      minimumPlayers: join.minimumPlayers ?? null,
      targetMaleCount: join.targetMaleCount ?? null,
      targetFemaleCount: join.targetFemaleCount ?? null,
      matchingRewardTarget: (join.matchingRewardTarget as MatchingJoinExtras['matchingRewardTarget']) ?? null,
      recruitmentLabel,
      confirmedMaleCount: confirmedMale,
      confirmedFemaleCount: confirmedFemale,
      storeOwnershipId: join.storeOwnershipId ?? null,
      displayStatus,
      displayStatusLabel: storeMatchingDisplayStatusLabel(displayStatus, {
        audience: 'host',
        confirmedPlayerCount,
      }),
      displaySubtitle: buildStoreMatchingSecondaryLabel({
        displayStatus,
        recruitmentLabel,
        remainingSlots,
        confirmedPlayerCount,
        recruitClosesAt: join.recruitClosesAt,
        now,
      }),
      canConfirmAttendance: canConfirmMatchingAttendance({
        now,
        status,
        scheduledEndAt,
      }),
      remainingSlots,
      ownerListPriority: storeMatchingOwnerListPriority(displayStatus),
    };
  }

  private toPublicHost(
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
    },
    reliability?: {
      completedCount: number;
      noShowCount: number;
      attendanceRatePercent: number | null;
    },
  ): PublicUserProfileDto {
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
      completedJoinCount: reliability?.completedCount,
      noShowCount: reliability?.noShowCount,
      attendanceRatePercent: reliability?.attendanceRatePercent ?? null,
    };
  }
}
