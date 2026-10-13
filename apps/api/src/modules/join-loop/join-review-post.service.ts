import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JOIN_REVIEW_POST_LIST_DEFAULT_LIMIT,
  JOIN_REVIEW_POST_LIST_MAX_LIMIT,
  JOIN_REVIEW_POST_PHOTO_MAX,
  buildJoinReviewPostContentPreview,
  buildJoinReviewPostPhotoObjectKey,
  normalizeJoinReviewPostContent,
  normalizeJoinReviewPostTitle,
} from '@jjoin/domain';
import type {
  CreateJoinReviewPostRequest,
  JoinReviewPostDetailDto,
  JoinReviewPostListItemDto,
  JoinReviewPostListResponseDto,
  UpdateJoinReviewPostRequest,
} from '@jjoin/types';
import { createJoinReviewPostSchema, updateJoinReviewPostSchema } from '@jjoin/validation';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageProcessingService } from '../storage/image-processing.service';
import { ObjectStorageService } from '../storage/object-storage.service';

type PostRow = {
  id: string;
  authorUserId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    profile: { nickname: string; avatarAsset: { storageKey: string } | null } | null;
  };
  photos: { id: string; objectKey: string; sortOrder: number }[];
  _count?: { photos: number };
};

@Injectable()
export class JoinReviewPostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
    private readonly images: ImageProcessingService,
  ) {}

  async list(params: {
    cursor?: string;
    limit?: number;
  }): Promise<JoinReviewPostListResponseDto> {
    const take = Math.min(
      Math.max(params.limit ?? JOIN_REVIEW_POST_LIST_DEFAULT_LIMIT, 1),
      JOIN_REVIEW_POST_LIST_MAX_LIMIT,
    );
    const cursor = parseListCursor(params.cursor);

    const rows = await this.prisma.joinReviewPost.findMany({
      where: {
        deletedAt: null,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }] },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      include: {
        author: { include: { profile: { include: { avatarAsset: true } } } },
        photos: { orderBy: { sortOrder: 'asc' }, take: 1 },
        _count: { select: { photos: true } },
      },
    });

    const page = rows.slice(0, take);
    const next = rows.length > take ? rows[take] : null;

    return {
      items: page.map((row) => this.toListItem(row)),
      nextCursor: next ? encodeListCursor(next.createdAt, next.id) : null,
    };
  }

  async getById(reviewId: string, viewerUserId: string): Promise<JoinReviewPostDetailDto> {
    const row = await this.prisma.joinReviewPost.findFirst({
      where: { id: reviewId, deletedAt: null },
      include: {
        author: { include: { profile: { include: { avatarAsset: true } } } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('review_not_found');
    return this.toDetail(row, viewerUserId);
  }

  async create(userId: string, body: unknown): Promise<JoinReviewPostDetailDto> {
    const parsed = createJoinReviewPostSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_join_review_post');
    const data = parsed.data as CreateJoinReviewPostRequest;
    const title = normalizeJoinReviewPostTitle(data.title);
    const content = normalizeJoinReviewPostContent(data.content);

    const row = await this.prisma.joinReviewPost.create({
      data: { authorUserId: userId, title, content },
      include: {
        author: { include: { profile: { include: { avatarAsset: true } } } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return this.toDetail(row, userId);
  }

  async update(reviewId: string, userId: string, body: unknown): Promise<JoinReviewPostDetailDto> {
    const parsed = updateJoinReviewPostSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_join_review_post');
    const data = parsed.data as UpdateJoinReviewPostRequest;
    const row = await this.assertAuthor(reviewId, userId);

    const title = data.title != null ? normalizeJoinReviewPostTitle(data.title) : row.title;
    const content =
      data.content != null ? normalizeJoinReviewPostContent(data.content) : row.content;

    const updated = await this.prisma.joinReviewPost.update({
      where: { id: reviewId },
      data: { title, content },
      include: {
        author: { include: { profile: { include: { avatarAsset: true } } } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return this.toDetail(updated, userId);
  }

  async softDelete(reviewId: string, userId: string): Promise<void> {
    await this.assertAuthor(reviewId, userId);
    const row = await this.prisma.joinReviewPost.findUniqueOrThrow({
      where: { id: reviewId },
      include: { photos: true },
    });
    for (const photo of row.photos) {
      await this.storage.deleteObject(photo.objectKey, userId);
    }
    await this.prisma.joinReviewPost.update({
      where: { id: reviewId },
      data: { deletedAt: new Date() },
    });
  }

  async addPhoto(reviewId: string, userId: string, file: Buffer): Promise<JoinReviewPostDetailDto> {
    if (!this.storage.isEnabled()) throw new BadRequestException('object_storage_unavailable');
    const post = await this.assertAuthor(reviewId, userId);
    const photos = await this.prisma.joinReviewPostPhoto.findMany({
      where: { postId: post.id },
      orderBy: { sortOrder: 'asc' },
    });
    if (photos.length >= JOIN_REVIEW_POST_PHOTO_MAX) {
      throw new BadRequestException('photo_limit_exceeded');
    }

    const processed = await this.images.validateAndOptimizeProfileImage(file, 'gallery');
    const objectKey = buildJoinReviewPostPhotoObjectKey({
      environmentPrefix: this.storage.getEnvironmentPrefix(),
      postId: post.id,
      fileId: randomUUID(),
      extension: processed.extension,
    });
    await this.storage.putObject({
      objectKey,
      body: processed.buffer,
      contentType: processed.mimeType,
    });

    await this.prisma.joinReviewPostPhoto.create({
      data: {
        postId: post.id,
        objectKey,
        sortOrder: photos.length,
      },
    });

    return this.getById(reviewId, userId);
  }

  async deletePhoto(reviewId: string, photoId: string, userId: string): Promise<JoinReviewPostDetailDto> {
    await this.assertAuthor(reviewId, userId);
    const photo = await this.prisma.joinReviewPostPhoto.findFirst({
      where: { id: photoId, postId: reviewId },
    });
    if (!photo) throw new NotFoundException('photo_not_found');
    await this.storage.deleteObject(photo.objectKey, userId);
    await this.prisma.joinReviewPostPhoto.delete({ where: { id: photoId } });
    return this.getById(reviewId, userId);
  }

  private async assertAuthor(reviewId: string, userId: string) {
    const row = await this.prisma.joinReviewPost.findFirst({
      where: { id: reviewId, deletedAt: null },
    });
    if (!row) throw new NotFoundException('review_not_found');
    if (row.authorUserId !== userId) throw new ForbiddenException('forbidden');
    return row;
  }

  private toListItem(row: PostRow): JoinReviewPostListItemDto {
    const thumb = row.photos[0];
    return {
      reviewId: row.id,
      title: row.title,
      contentPreview: buildJoinReviewPostContentPreview(row.content),
      author: this.toAuthor(row),
      thumbnailUrl: thumb ? this.storage.getPublicUrl(thumb.objectKey) : null,
      photoCount: row._count?.photos ?? row.photos.length,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toDetail(row: PostRow, viewerUserId: string): JoinReviewPostDetailDto {
    return {
      reviewId: row.id,
      title: row.title,
      content: row.content,
      author: this.toAuthor(row),
      photos: row.photos.map((p) => ({
        photoId: p.id,
        imageUrl: this.storage.getPublicUrl(p.objectKey) ?? '',
        sortOrder: p.sortOrder,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      isMine: row.authorUserId === viewerUserId,
    };
  }

  private toAuthor(row: PostRow) {
    return {
      userId: row.authorUserId,
      nickname: row.author.profile?.nickname ?? '회원',
      avatarUrl: this.storage.getPublicUrl(row.author.profile?.avatarAsset?.storageKey ?? null),
    };
  }
}

function encodeListCursor(createdAt: Date, id: string): string {
  return `${createdAt.toISOString()}|${id}`;
}

function parseListCursor(raw?: string): { createdAt: Date; id: string } | null {
  if (!raw?.trim()) return null;
  const [iso, id] = raw.split('|');
  if (!iso || !id) throw new BadRequestException('invalid_cursor');
  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime())) throw new BadRequestException('invalid_cursor');
  return { createdAt, id };
}
