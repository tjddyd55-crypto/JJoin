import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JOIN_SESSION_REVIEW_PHOTO_MAX,
  buildJoinSessionReviewPhotoObjectKey,
  evaluateJoinSessionReviewAuthorEligibility,
  normalizeJoinSessionReviewContent,
  normalizeJoinSessionReviewTitle,
} from '@jjoin/domain';
import type {
  JoinSessionReviewDto,
  JoinSessionReviewEligibleItemDto,
  JoinSessionReviewJoinSummaryDto,
  JoinSessionReviewMineItemDto,
  MyJoinSessionReviewsHubDto,
  UpsertJoinSessionReviewRequest,
} from '@jjoin/types';
import { upsertJoinSessionReviewSchema } from '@jjoin/validation';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageProcessingService } from '../storage/image-processing.service';
import { ObjectStorageService } from '../storage/object-storage.service';

@Injectable()
export class JoinSessionReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
    private readonly images: ImageProcessingService,
  ) {}

  async listForJoin(joinId: string): Promise<JoinSessionReviewDto[]> {
    const rows = await this.prisma.joinSessionReview.findMany({
      where: { joinId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { include: { profile: { include: { avatarAsset: true } } } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return rows.map((row) => this.toDto(row));
  }

  async getMine(joinId: string, userId: string): Promise<JoinSessionReviewDto | null> {
    const row = await this.prisma.joinSessionReview.findUnique({
      where: { joinId_authorUserId: { joinId, authorUserId: userId } },
      include: {
        author: { include: { profile: { include: { avatarAsset: true } } } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return row ? this.toDto(row) : null;
  }

  async upsert(
    joinId: string,
    userId: string,
    body: unknown,
  ): Promise<JoinSessionReviewDto> {
    const parsed = upsertJoinSessionReviewSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_join_session_review');
    const data = parsed.data as UpsertJoinSessionReviewRequest;
    const title = normalizeJoinSessionReviewTitle(data.title);
    const content = normalizeJoinSessionReviewContent(data.content);

    await this.assertAuthorEligible(joinId, userId);

    const row = await this.prisma.joinSessionReview.upsert({
      where: { joinId_authorUserId: { joinId, authorUserId: userId } },
      create: { joinId, authorUserId: userId, title, content },
      update: { title, content },
      include: {
        author: { include: { profile: { include: { avatarAsset: true } } } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return this.toDto(row);
  }

  async listAdmin(limit = 50): Promise<JoinSessionReviewDto[]> {
    const rows = await this.prisma.joinSessionReview.findMany({
      take: Math.min(Math.max(limit, 1), 200),
      orderBy: { createdAt: 'desc' },
      include: {
        author: { include: { profile: { include: { avatarAsset: true } } } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return rows.map((row) => this.toDto(row));
  }

  async deleteReviewAsAdmin(reviewId: string, adminUserId: string): Promise<void> {
    const row = await this.prisma.joinSessionReview.findUnique({
      where: { id: reviewId },
      include: { photos: true },
    });
    if (!row) throw new NotFoundException('review_not_found');
    for (const photo of row.photos) {
      await this.storage.deleteObject(photo.objectKey, adminUserId);
    }
    await this.prisma.joinSessionReview.delete({ where: { id: reviewId } });
  }

  async deleteReview(joinId: string, reviewId: string, userId: string): Promise<void> {
    const row = await this.prisma.joinSessionReview.findFirst({
      where: { id: reviewId, joinId },
      include: { photos: true },
    });
    if (!row) throw new NotFoundException('review_not_found');
    if (row.authorUserId !== userId) throw new ForbiddenException('forbidden');

    for (const photo of row.photos) {
      await this.storage.deleteObject(photo.objectKey, userId);
    }
    await this.prisma.joinSessionReview.delete({ where: { id: reviewId } });
  }

  async addPhoto(joinId: string, userId: string, file: Buffer): Promise<JoinSessionReviewDto> {
    if (!this.storage.isEnabled()) throw new BadRequestException('object_storage_unavailable');
    const review = await this.prisma.joinSessionReview.findUnique({
      where: { joinId_authorUserId: { joinId, authorUserId: userId } },
      include: { photos: true },
    });
    if (!review) throw new NotFoundException('review_not_found');
    if (review.photos.length >= JOIN_SESSION_REVIEW_PHOTO_MAX) {
      throw new BadRequestException('photo_limit_exceeded');
    }

    const processed = await this.images.validateAndOptimizeProfileImage(file, 'gallery');
    const objectKey = buildJoinSessionReviewPhotoObjectKey({
      environmentPrefix: this.storage.getEnvironmentPrefix(),
      reviewId: review.id,
      fileId: randomUUID(),
      extension: processed.extension,
    });
    await this.storage.putObject({
      objectKey,
      body: processed.buffer,
      contentType: processed.mimeType,
    });

    await this.prisma.joinSessionReviewPhoto.create({
      data: {
        reviewId: review.id,
        objectKey,
        sortOrder: review.photos.length,
      },
    });

    const refreshed = await this.prisma.joinSessionReview.findUniqueOrThrow({
      where: { id: review.id },
      include: {
        author: { include: { profile: { include: { avatarAsset: true } } } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return this.toDto(refreshed);
  }

  async listEligibleForUser(userId: string): Promise<JoinSessionReviewEligibleItemDto[]> {
    const reviewedJoinIds = new Set(
      (
        await this.prisma.joinSessionReview.findMany({
          where: { authorUserId: userId },
          select: { joinId: true },
        })
      ).map((row) => row.joinId),
    );

    const participations = await this.prisma.joinParticipant.findMany({
      where: {
        userId,
        participationStatus: { in: ['CONFIRMED', 'COMPLETED'] },
      },
      include: { join: { include: { venue: true } } },
    });

    const eligible: JoinSessionReviewEligibleItemDto[] = [];
    for (const row of participations) {
      if (reviewedJoinIds.has(row.joinId)) continue;
      const eligibility = evaluateJoinSessionReviewAuthorEligibility({
        joinStatus: row.join.status,
        scheduledEndAt: row.join.scheduledEndAt,
        participationStatus: row.participationStatus,
      });
      if (!eligibility.ok) continue;
      eligible.push(this.toJoinSummary(row.join));
    }

    eligible.sort(
      (a, b) => new Date(b.scheduledEndAt).getTime() - new Date(a.scheduledEndAt).getTime(),
    );
    return eligible;
  }

  async listMineForUser(userId: string): Promise<JoinSessionReviewMineItemDto[]> {
    const rows = await this.prisma.joinSessionReview.findMany({
      where: { authorUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        join: { include: { venue: true } },
        author: { include: { profile: { include: { avatarAsset: true } } } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return rows.map((row) => ({
      ...this.toDto(row),
      join: this.toJoinSummary(row.join),
    }));
  }

  async getHubForUser(userId: string): Promise<MyJoinSessionReviewsHubDto> {
    const [eligible, mine] = await Promise.all([
      this.listEligibleForUser(userId),
      this.listMineForUser(userId),
    ]);
    return { eligible, mine };
  }

  async deletePhoto(
    joinId: string,
    photoId: string,
    userId: string,
  ): Promise<JoinSessionReviewDto> {
    const photo = await this.prisma.joinSessionReviewPhoto.findFirst({
      where: { id: photoId, review: { joinId, authorUserId: userId } },
    });
    if (!photo) throw new NotFoundException('photo_not_found');
    await this.storage.deleteObject(photo.objectKey, userId);
    await this.prisma.joinSessionReviewPhoto.delete({ where: { id: photoId } });

    const review = await this.prisma.joinSessionReview.findUniqueOrThrow({
      where: { joinId_authorUserId: { joinId, authorUserId: userId } },
      include: {
        author: { include: { profile: { include: { avatarAsset: true } } } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return this.toDto(review);
  }

  private toJoinSummary(join: {
    id: string;
    title: string | null;
    startAt: Date;
    scheduledEndAt: Date;
    venue: { name: string; venueType: string };
  }): JoinSessionReviewJoinSummaryDto {
    return {
      joinId: join.id,
      title: join.title,
      venueType: join.venue.venueType as JoinSessionReviewJoinSummaryDto['venueType'],
      venueName: join.venue.name,
      startAt: join.startAt.toISOString(),
      scheduledEndAt: join.scheduledEndAt.toISOString(),
    };
  }

  private async assertAuthorEligible(joinId: string, userId: string) {
    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: {
        participants: { where: { userId }, take: 1 },
      },
    });
    if (!join) throw new NotFoundException('join_not_found');
    const participant = join.participants[0];
    if (!participant) throw new ForbiddenException('not_participant');
    const eligibility = evaluateJoinSessionReviewAuthorEligibility({
      joinStatus: join.status,
      scheduledEndAt: join.scheduledEndAt,
      participationStatus: participant.participationStatus,
    });
    if (!eligibility.ok) throw new ForbiddenException(eligibility.reason);
  }

  private toDto(row: {
    id: string;
    joinId: string;
    authorUserId: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    author: {
      profile: { nickname: string; avatarAsset: { storageKey: string } | null } | null;
    };
    photos: { id: string; objectKey: string; sortOrder: number }[];
  }): JoinSessionReviewDto {
    return {
      reviewId: row.id,
      joinId: row.joinId,
      authorUserId: row.authorUserId,
      authorNickname: row.author.profile?.nickname ?? '회원',
      authorAvatarUrl: this.storage.getPublicUrl(
        row.author.profile?.avatarAsset?.storageKey ?? null,
      ),
      title: row.title,
      content: row.content,
      photos: row.photos.map((p) => ({
        photoId: p.id,
        imageUrl: this.storage.getPublicUrl(p.objectKey) ?? '',
        sortOrder: p.sortOrder,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
