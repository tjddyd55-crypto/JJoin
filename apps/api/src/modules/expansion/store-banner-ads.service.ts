import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  canApproveStoreBannerAd,
  canEditStoreProfile,
  canRejectStoreBannerAd,
  canScheduleStoreBannerAd,
  resolveStoreBannerAdStatus,
  validateBannerSchedule,
} from '@jjoin/domain';
import type { StoreBannerAdRequestDto } from '@jjoin/types';
import {
  createStoreBannerAdSchema,
  reviewStoreBannerAdSchema,
  scheduleStoreBannerAdSchema,
} from '@jjoin/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { FeatureFlagsService } from './feature-flags.service';

@Injectable()
export class StoreBannerAdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
  ) {}

  async create(userId: string, body: unknown): Promise<StoreBannerAdRequestDto> {
    const flags = await this.flags.getFlags();
    if (!flags.storeBannerAdsEnabled) {
      throw new ForbiddenException('store_banner_ads_disabled');
    }
    const parsed = createStoreBannerAdSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'store_banner_ad_invalid', issues: parsed.error.issues });
    }
    const ownership = await this.prisma.storeOwnership.findUnique({
      where: { id: parsed.data.ownershipId },
      include: { golfFacility: true },
    });
    if (!ownership) throw new NotFoundException('store_ownership_not_found');
    if (
      !canEditStoreProfile({
        ownershipStatus: ownership.status,
        ownerUserId: ownership.userId,
        actorUserId: userId,
        isAdmin: false,
      })
    ) {
      throw new ForbiddenException('store_banner_ad_forbidden');
    }
    const row = await this.prisma.storeBannerAdRequest.create({
      data: {
        id: randomUUID(),
        ownershipId: ownership.id,
        requestedByUserId: userId,
        title: parsed.data.title,
        subtitle: parsed.data.subtitle ?? null,
        imageObjectKey: parsed.data.imageUrl ?? null,
        href: parsed.data.href ?? null,
        memo: parsed.data.memo ?? null,
        status: 'REQUESTED',
      },
      include: { ownership: { include: { golfFacility: true } } },
    });
    return this.toDto(row);
  }

  async listMine(userId: string): Promise<StoreBannerAdRequestDto[]> {
    const rows = await this.prisma.storeBannerAdRequest.findMany({
      where: { requestedByUserId: userId },
      include: { ownership: { include: { golfFacility: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async listAdmin(): Promise<StoreBannerAdRequestDto[]> {
    const rows = await this.prisma.storeBannerAdRequest.findMany({
      include: { ownership: { include: { golfFacility: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((row) => this.toDto(row));
  }

  async review(adminUserId: string, id: string, body: unknown): Promise<StoreBannerAdRequestDto> {
    const parsed = reviewStoreBannerAdSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'store_banner_ad_review_invalid', issues: parsed.error.issues });
    }
    const row = await this.require(id);
    const current = resolveStoreBannerAdStatus(row, new Date());
    if (parsed.data.action === 'APPROVE' && !canApproveStoreBannerAd(current)) {
      throw new BadRequestException('store_banner_ad_not_approvable');
    }
    if (parsed.data.action === 'REJECT' && !canRejectStoreBannerAd(current)) {
      throw new BadRequestException('store_banner_ad_not_rejectable');
    }
    const updated = await this.prisma.storeBannerAdRequest.update({
      where: { id },
      data: {
        status: parsed.data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        adminNote: parsed.data.adminNote ?? null,
        reviewedByAdminUserId: adminUserId,
        reviewedAt: new Date(),
      },
      include: { ownership: { include: { golfFacility: true } } },
    });
    return this.toDto(updated);
  }

  async schedule(id: string, body: unknown): Promise<StoreBannerAdRequestDto> {
    const parsed = scheduleStoreBannerAdSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'store_banner_ad_schedule_invalid', issues: parsed.error.issues });
    }
    const row = await this.require(id);
    const current = resolveStoreBannerAdStatus(row, new Date());
    if (!canScheduleStoreBannerAd(current)) {
      throw new BadRequestException('store_banner_ad_not_schedulable');
    }
    const startsAt = new Date(parsed.data.startsAt);
    const endsAt = new Date(parsed.data.endsAt);
    const valid = validateBannerSchedule({ startsAt, endsAt });
    if (!valid.ok) throw new BadRequestException(valid.code);
    const nextStatus = resolveStoreBannerAdStatus(
      { status: 'APPROVED', startsAt, endsAt },
      new Date(),
    );
    const updated = await this.prisma.storeBannerAdRequest.update({
      where: { id },
      data: { startsAt, endsAt, status: nextStatus },
      include: { ownership: { include: { golfFacility: true } } },
    });
    return this.toDto(updated);
  }

  private async require(id: string) {
    const row = await this.prisma.storeBannerAdRequest.findUnique({
      where: { id },
      include: { ownership: { include: { golfFacility: true } } },
    });
    if (!row) throw new NotFoundException('store_banner_ad_not_found');
    return row;
  }

  private toDto(row: {
    id: string;
    ownershipId: string;
    title: string;
    subtitle: string | null;
    imageObjectKey: string | null;
    href: string | null;
    memo: string | null;
    status: string;
    startsAt: Date | null;
    endsAt: Date | null;
    adminNote: string | null;
    createdAt: Date;
    ownership: { golfFacility: { displayName: string } };
  }): StoreBannerAdRequestDto {
    return {
      id: row.id,
      ownershipId: row.ownershipId,
      storeName: row.ownership.golfFacility.displayName,
      title: row.title,
      subtitle: row.subtitle,
      imageUrl: row.imageObjectKey,
      href: row.href,
      memo: row.memo,
      status: resolveStoreBannerAdStatus(
        {
          status: row.status as never,
          startsAt: row.startsAt,
          endsAt: row.endsAt,
        },
        new Date(),
      ),
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      adminNote: row.adminNote,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
