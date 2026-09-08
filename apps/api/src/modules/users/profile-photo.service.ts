import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MAX_PROFILE_GALLERY_PHOTOS } from '@jjoin/domain';
import type { MeDto, ProfilePhotoDto } from '@jjoin/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageProcessingService } from '../storage/image-processing.service';
import { MediaUrlService } from '../storage/media-url.service';
import { ObjectStorageService } from '../storage/object-storage.service';
import { UserAccountService } from './user-account.service';

@Injectable()
export class ProfilePhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
    private readonly images: ImageProcessingService,
    private readonly mediaUrls: MediaUrlService,
    private readonly accounts: UserAccountService,
  ) {}

  async uploadAvatar(userId: string, file: Buffer): Promise<MeDto> {
    this.assertStorageReady();
    const processed = await this.images.validateAndOptimizeProfileImage(file, 'avatar');
    const objectKey = this.storage.buildAvatarObjectKey(userId, processed.extension);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { include: { avatarAsset: true } } },
    });
    if (!user?.profile) throw new NotFoundException('profile_not_found');
    const previousKey = user.profile.avatarAsset?.storageKey ?? null;

    await this.storage.putObject({
      objectKey,
      body: processed.buffer,
      contentType: processed.mimeType,
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        const asset = await tx.mediaAsset.create({
          data: {
            ownerUserId: userId,
            kind: 'AVATAR',
            storageKey: objectKey,
            mimeType: processed.mimeType,
          },
        });
        await tx.userProfile.update({
          where: { userId },
          data: { avatarAssetId: asset.id },
        });
      });
    } catch (error) {
      await this.storage.deleteObject(objectKey, userId);
      throw error;
    }

    if (previousKey && previousKey !== objectKey) {
      await this.storage.deleteObject(previousKey, userId);
    }

    return this.accounts.getMe(userId);
  }

  async deleteAvatar(userId: string): Promise<MeDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { include: { avatarAsset: true } } },
    });
    if (!user?.profile) throw new NotFoundException('profile_not_found');
    const previousKey = user.profile.avatarAsset?.storageKey ?? null;

    await this.prisma.userProfile.update({
      where: { userId },
      data: { avatarAssetId: null },
    });

    if (previousKey) {
      await this.storage.deleteObject(previousKey, userId);
    }

    return this.accounts.getMe(userId);
  }

  async addGalleryPhoto(userId: string, file: Buffer): Promise<MeDto> {
    this.assertStorageReady();
    const processed = await this.images.validateAndOptimizeProfileImage(file, 'gallery');
    const objectKey = this.storage.buildGalleryObjectKey(userId, processed.extension);

    await this.storage.putObject({
      objectKey,
      body: processed.buffer,
      contentType: processed.mimeType,
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        const count = await tx.userProfilePhoto.count({ where: { userId } });
        if (count >= MAX_PROFILE_GALLERY_PHOTOS) {
          throw new BadRequestException('profile_gallery_limit_reached');
        }
        const maxSort = await tx.userProfilePhoto.aggregate({
          where: { userId },
          _max: { sortOrder: true },
        });
        const nextSort = (maxSort._max.sortOrder ?? -1) + 1;
        await tx.userProfilePhoto.create({
          data: {
            userId,
            objectKey,
            sortOrder: nextSort,
          },
        });
      });
    } catch (error) {
      await this.storage.deleteObject(objectKey, userId);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw error;
      }
      throw error;
    }

    return this.accounts.getMe(userId);
  }

  async deleteGalleryPhoto(userId: string, photoId: string): Promise<MeDto> {
    const photo = await this.prisma.userProfilePhoto.findUnique({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('profile_photo_not_found');
    if (photo.userId !== userId) throw new ForbiddenException('profile_photo_forbidden');

    await this.prisma.userProfilePhoto.delete({ where: { id: photoId } });
    await this.storage.deleteObject(photo.objectKey, userId);

    return this.accounts.getMe(userId);
  }

  async reorderGalleryPhotos(userId: string, photoIds: string[]): Promise<MeDto> {
    const unique = new Set(photoIds);
    if (unique.size !== photoIds.length) {
      throw new BadRequestException('profile_photo_duplicate');
    }

    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.userProfilePhoto.findMany({
        where: { userId },
        orderBy: { sortOrder: 'asc' },
      });
      if (rows.length !== photoIds.length) {
        throw new BadRequestException('profile_photo_set_mismatch');
      }
      const ownedIds = new Set(rows.map((row) => row.id));
      for (const id of photoIds) {
        if (!ownedIds.has(id)) {
          throw new ForbiddenException('profile_photo_forbidden');
        }
      }
      await Promise.all(
        photoIds.map((id, index) =>
          tx.userProfilePhoto.update({
            where: { id },
            data: { sortOrder: index },
          }),
        ),
      );
    });

    return this.accounts.getMe(userId);
  }

  mapGalleryRows(rows: Array<{ id: string; objectKey: string; sortOrder: number }>): ProfilePhotoDto[] {
    return this.mediaUrls.mapProfilePhotos(rows);
  }

  private assertStorageReady(): void {
    if (!this.storage.isEnabled()) {
      throw new BadRequestException('object_storage_not_configured');
    }
  }
}
