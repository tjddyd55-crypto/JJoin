import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  StoreOwnershipStatus,
  StoreVerificationStatus,
  type AdminStoreDetailDto,
  type AdminStoreJoinRowDto,
  type AdminStoreKpiPeriod,
  type AdminStoreListItemDto,
  type CreateStoreOwnershipRequest,
  type RejectStoreVerificationRequest,
  type StoreOwnershipDto,
  type StoreOwnershipKpiDto,
  type StoreOwnershipRequestDto,
} from '@jjoin/types';
import {
  computeStoreOwnershipKpi,
  filterJoinsByKpiPeriod,
  formatKoreanPhoneDisplay,
  isStoreKpiSucceededStatus,
  type StoreKpiPeriod,
} from '@jjoin/domain';
import { createStoreOwnershipRequestSchema } from '@jjoin/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { GolfFacilitiesService } from '../golf-facilities/golf-facilities.service';
import { CoinLedgerService } from '../wallet/coin-ledger.service';
import { ensureFoundation } from '../../foundation/ensure-foundation';

@Injectable()
export class StoreOwnershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly golfFacilities: GolfFacilitiesService,
    private readonly ledger: CoinLedgerService,
  ) {}

  async createRequest(
    userId: string,
    raw: CreateStoreOwnershipRequest,
  ): Promise<StoreOwnershipRequestDto> {
    const parsed = createStoreOwnershipRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException('invalid_store_verification_request');
    }
    const input = parsed.data;

    const facility = await this.prisma.golfFacility.findUnique({
      where: { id: input.golfFacilityId },
    });
    if (!facility || !facility.isActive) {
      throw new NotFoundException({
        code: 'FACILITY_NOT_FOUND',
        message: '골프 시설을 찾을 수 없습니다.',
      });
    }

    const activeOwnership = await this.prisma.storeOwnership.findFirst({
      where: {
        userId,
        golfFacilityId: input.golfFacilityId,
        status: 'ACTIVE',
      },
    });
    if (activeOwnership) {
      throw new ConflictException({
        code: 'ACTIVE_OWNERSHIP_EXISTS',
        message: '이미 승인된 매장입니다. 다른 매장을 선택해 주세요.',
      });
    }

    const pending = await this.prisma.storeOwnershipRequest.findFirst({
      where: {
        userId,
        golfFacilityId: input.golfFacilityId,
        status: 'PENDING',
      },
    });
    if (pending) {
      throw new ConflictException({
        code: 'PENDING_VERIFICATION_EXISTS',
        message: '이미 검증 대기 중인 신청이 있습니다.',
      });
    }

    const applicantPhone =
      formatKoreanPhoneDisplay(input.applicantPhone) || input.applicantPhone.trim();

    const row = await this.prisma.storeOwnershipRequest.create({
      data: {
        userId,
        golfFacilityId: input.golfFacilityId,
        applicantName: input.applicantName,
        applicantPhone,
        relation: input.relation,
        memo: input.memo ?? null,
        businessRegistrationNo: input.businessRegistrationNo ?? null,
        status: 'PENDING',
      },
      include: { golfFacility: true },
    });

    return this.toRequestDto(row);
  }

  async listMyRequests(userId: string): Promise<StoreOwnershipRequestDto[]> {
    const rows = await this.prisma.storeOwnershipRequest.findMany({
      where: { userId },
      include: { golfFacility: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toRequestDto(r));
  }

  async listMyStores(userId: string, includeWallet = false): Promise<StoreOwnershipDto[]> {
    const rows = await this.prisma.storeOwnership.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { golfFacility: true, venue: true },
      orderBy: { approvedAt: 'desc' },
    });

    let coinAssetId: string | undefined;
    if (includeWallet) {
      ({ coinAsset: { id: coinAssetId } } = await ensureFoundation(this.prisma));
    }

    const result: StoreOwnershipDto[] = [];
    for (const row of rows) {
      const dto: StoreOwnershipDto = {
        id: row.id,
        golfFacilityId: row.golfFacilityId,
        facilityName: row.golfFacility.displayName,
        facilityAddress: row.golfFacility.roadAddress ?? row.golfFacility.lotAddress ?? null,
        venueId: row.venueId,
        status: row.status as StoreOwnershipStatus,
        approvedAt: row.approvedAt.toISOString(),
      };
      if (includeWallet && coinAssetId) {
        const wallet = await this.ledger.getOrCreateWallet(userId, coinAssetId);
        dto.walletAvailable = String(wallet.availableBalance);
        dto.walletHeld = String(wallet.heldBalance);
      }
      result.push(dto);
    }
    return result;
  }

  async listAdminRequests(status?: StoreVerificationStatus): Promise<StoreOwnershipRequestDto[]> {
    const rows = await this.prisma.storeOwnershipRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        golfFacility: true,
        user: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => this.toRequestDto(r));
  }

  async approveRequest(requestId: string, adminUserId: string): Promise<StoreOwnershipRequestDto> {
    const request = await this.prisma.storeOwnershipRequest.findUnique({
      where: { id: requestId },
      include: { golfFacility: true },
    });
    if (!request) {
      throw new NotFoundException({
        code: 'VERIFICATION_NOT_FOUND',
        message: '검증 신청을 찾을 수 없습니다.',
      });
    }
    if (request.status === 'APPROVED') {
      return this.toRequestDto(request);
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException({
        code: 'INVALID_VERIFICATION_STATUS',
        message: '승인할 수 없는 상태입니다.',
      });
    }

    const existingOwnership = await this.prisma.storeOwnership.findFirst({
      where: {
        userId: request.userId,
        golfFacilityId: request.golfFacilityId,
        status: 'ACTIVE',
      },
    });

    const activated = await this.golfFacilities.activateVenue(
      adminUserId,
      request.golfFacilityId,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      if (existingOwnership) {
        if (!existingOwnership.venueId) {
          await tx.storeOwnership.update({
            where: { id: existingOwnership.id },
            data: { venueId: activated.venueId },
          });
        }
      } else {
        await tx.storeOwnership.create({
          data: {
            userId: request.userId,
            golfFacilityId: request.golfFacilityId,
            venueId: activated.venueId,
            requestId: request.id,
            status: 'ACTIVE',
          },
        });
      }

      return tx.storeOwnershipRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          reviewedByAdminUserId: adminUserId,
          reviewedAt: new Date(),
        },
        include: { golfFacility: true },
      });
    });

    return this.toRequestDto(updated);
  }

  async rejectRequest(
    requestId: string,
    adminUserId: string,
    raw: RejectStoreVerificationRequest,
  ): Promise<StoreOwnershipRequestDto> {
    if (!raw.rejectReason?.trim()) {
      throw new BadRequestException('reject_reason_required');
    }

    const request = await this.prisma.storeOwnershipRequest.findUnique({
      where: { id: requestId },
      include: { golfFacility: true },
    });
    if (!request) {
      throw new NotFoundException({
        code: 'VERIFICATION_NOT_FOUND',
        message: '검증 신청을 찾을 수 없습니다.',
      });
    }
    if (request.status === 'REJECTED') {
      return this.toRequestDto(request);
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException({
        code: 'INVALID_VERIFICATION_STATUS',
        message: '반려할 수 없는 상태입니다.',
      });
    }

    const updated = await this.prisma.storeOwnershipRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectReason: raw.rejectReason.trim(),
        adminNote: raw.adminNote?.trim() ?? null,
        reviewedByAdminUserId: adminUserId,
        reviewedAt: new Date(),
      },
      include: { golfFacility: true },
    });

    return this.toRequestDto(updated);
  }

  async revokeRequest(requestId: string, adminUserId: string): Promise<StoreOwnershipRequestDto> {
    const request = await this.prisma.storeOwnershipRequest.findUnique({
      where: { id: requestId },
      include: { golfFacility: true, ownership: true },
    });
    if (!request) {
      throw new NotFoundException({
        code: 'VERIFICATION_NOT_FOUND',
        message: '검증 신청을 찾을 수 없습니다.',
      });
    }
    if (request.status === 'REVOKED') {
      return this.toRequestDto(request);
    }
    if (request.status !== 'APPROVED') {
      throw new BadRequestException({
        code: 'INVALID_VERIFICATION_STATUS',
        message: '회수할 수 없는 상태입니다.',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (request.ownership && request.ownership.status === 'ACTIVE') {
        await tx.storeOwnership.update({
          where: { id: request.ownership.id },
          data: { status: 'REVOKED', revokedAt: new Date() },
        });
      }
      return tx.storeOwnershipRequest.update({
        where: { id: requestId },
        data: {
          status: 'REVOKED',
          reviewedByAdminUserId: adminUserId,
          reviewedAt: new Date(),
        },
        include: { golfFacility: true },
      });
    });

    return this.toRequestDto(updated);
  }

  async listAdminStores(input: {
    q?: string;
    sido?: string;
    period?: AdminStoreKpiPeriod;
  }): Promise<AdminStoreListItemDto[]> {
    const period = (input.period ?? 'all') as StoreKpiPeriod;
    const q = input.q?.trim();
    const sido = input.sido?.trim();

    const rows = await this.prisma.storeOwnership.findMany({
      where: {
        status: 'ACTIVE',
        ...(sido
          ? { golfFacility: { sido: { contains: sido, mode: 'insensitive' } } }
          : {}),
        ...(q
          ? {
              OR: [
                {
                  golfFacility: {
                    displayName: { contains: q, mode: 'insensitive' },
                  },
                },
                {
                  golfFacility: {
                    roadAddress: { contains: q, mode: 'insensitive' },
                  },
                },
                {
                  golfFacility: {
                    lotAddress: { contains: q, mode: 'insensitive' },
                  },
                },
                {
                  request: {
                    applicantName: { contains: q, mode: 'insensitive' },
                  },
                },
                {
                  request: {
                    applicantPhone: { contains: q, mode: 'insensitive' },
                  },
                },
                {
                  user: {
                    profile: {
                      nickname: { contains: q, mode: 'insensitive' },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        golfFacility: true,
        request: true,
        user: { include: { profile: true } },
        joins: {
          where: { joinKind: 'STORE_MATCHING' },
          select: {
            status: true,
            startAt: true,
            confirmedPlayerCount: true,
            plannedPlayerCount: true,
          },
        },
      },
      orderBy: { approvedAt: 'desc' },
      take: 200,
    });

    return rows.map((row) => this.toAdminStoreListItem(row, period));
  }

  async getAdminStoreDetail(
    ownershipId: string,
    period: AdminStoreKpiPeriod = 'all',
  ): Promise<AdminStoreDetailDto> {
    const row = await this.prisma.storeOwnership.findUnique({
      where: { id: ownershipId },
      include: {
        golfFacility: true,
        request: true,
        user: { include: { profile: true } },
        joins: {
          where: { joinKind: 'STORE_MATCHING' },
          select: {
            id: true,
            status: true,
            startAt: true,
            confirmedPlayerCount: true,
            plannedPlayerCount: true,
            participants: {
              where: {
                participationStatus: { in: ['COMPLETED', 'CONFIRMED'] },
              },
              select: { id: true, participationStatus: true },
            },
          },
          orderBy: { startAt: 'desc' },
          take: 100,
        },
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: 'STORE_OWNERSHIP_NOT_FOUND',
        message: '승인 매장을 찾을 수 없습니다.',
      });
    }

    const kpiPeriod = period as StoreKpiPeriod;
    const ownership = this.toAdminStoreListItem(
      {
        id: row.id,
        userId: row.userId,
        golfFacilityId: row.golfFacilityId,
        venueId: row.venueId,
        status: row.status,
        approvedAt: row.approvedAt,
        golfFacility: row.golfFacility,
        request: row.request,
        user: row.user,
        joins: row.joins.map((j) => ({
          status: j.status,
          startAt: j.startAt,
          confirmedPlayerCount: j.confirmedPlayerCount ?? 0,
          plannedPlayerCount: j.plannedPlayerCount ?? 0,
        })),
      },
      kpiPeriod,
    );

    const periodStart = (() => {
      if (kpiPeriod === 'all') return null;
      const days = kpiPeriod === '30d' ? 30 : 90;
      return new Date(Date.now() - days * 24 * 60 * 60_000);
    })();
    const periodJoins = periodStart
      ? row.joins.filter((j) => j.startAt.getTime() >= periodStart.getTime())
      : row.joins;

    const recentJoins: AdminStoreJoinRowDto[] = periodJoins.slice(0, 20).map((j) => {
      const attended =
        j.status === 'COMPLETED' || j.status === 'SETTLING'
          ? j.participants.filter((p) => p.participationStatus === 'COMPLETED')
              .length
          : null;
      return {
        joinId: j.id,
        startAt: j.startAt.toISOString(),
        status: j.status as AdminStoreJoinRowDto['status'],
        plannedPlayerCount: j.plannedPlayerCount ?? 0,
        confirmedPlayerCount: j.confirmedPlayerCount ?? 0,
        attendedCount: attended,
        succeeded: isStoreKpiSucceededStatus(j.status),
      };
    });

    return {
      ownership,
      applicantName: row.request?.applicantName ?? null,
      applicantPhone: row.request
        ? formatKoreanPhoneDisplay(row.request.applicantPhone)
        : null,
      relation: (row.request?.relation as AdminStoreDetailDto['relation']) ?? null,
      requestId: row.requestId,
      venueId: row.venueId,
      period,
      recentJoins,
    };
  }

  private toAdminStoreListItem(
    row: {
      id: string;
      userId: string;
      golfFacilityId: string;
      venueId: string | null;
      status: string;
      approvedAt: Date;
      golfFacility: {
        displayName: string;
        roadAddress: string | null;
        lotAddress: string | null;
        sido: string | null;
        sigungu: string | null;
      };
      request: {
        applicantName: string;
        applicantPhone: string;
      } | null;
      user: {
        profile: { nickname: string | null } | null;
      };
      joins: Array<{
        status: string;
        startAt: Date;
        confirmedPlayerCount: number;
        plannedPlayerCount: number;
      }>;
    },
    period: StoreKpiPeriod,
  ): AdminStoreListItemDto {
    const periodJoins = filterJoinsByKpiPeriod(row.joins, period);
    const kpiRaw = computeStoreOwnershipKpi(periodJoins);
    const kpi: StoreOwnershipKpiDto = { ...kpiRaw };
    const ownerPhone = row.request?.applicantPhone
      ? formatKoreanPhoneDisplay(row.request.applicantPhone)
      : null;
    return {
      ownershipId: row.id,
      golfFacilityId: row.golfFacilityId,
      facilityName: row.golfFacility.displayName,
      facilityAddress:
        row.golfFacility.roadAddress ?? row.golfFacility.lotAddress ?? null,
      sido: row.golfFacility.sido,
      sigungu: row.golfFacility.sigungu,
      ownerUserId: row.userId,
      ownerName:
        row.request?.applicantName ?? row.user.profile?.nickname ?? null,
      ownerPhone,
      status: row.status as StoreOwnershipStatus,
      approvedAt: row.approvedAt.toISOString(),
      kpi,
    };
  }

  private toRequestDto(row: {
    id: string;
    golfFacilityId: string;
    applicantName: string;
    applicantPhone: string;
    relation: string;
    memo: string | null;
    businessRegistrationNo: string | null;
    status: string;
    rejectReason: string | null;
    adminNote: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    golfFacility: { displayName: string; roadAddress: string | null; lotAddress: string | null };
  }): StoreOwnershipRequestDto {
    return {
      id: row.id,
      golfFacilityId: row.golfFacilityId,
      facilityName: row.golfFacility.displayName,
      facilityAddress: row.golfFacility.roadAddress ?? row.golfFacility.lotAddress ?? null,
      applicantName: row.applicantName,
      applicantPhone: row.applicantPhone,
      relation: row.relation as StoreOwnershipRequestDto['relation'],
      memo: row.memo,
      businessRegistrationNo: row.businessRegistrationNo,
      status: row.status as StoreVerificationStatus,
      rejectReason: row.rejectReason,
      adminNote: row.adminNote,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
