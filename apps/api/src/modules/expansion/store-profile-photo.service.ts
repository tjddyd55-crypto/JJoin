import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { canEditStoreProfile, STORE_MAX_PHOTOS } from '@jjoin/domain';
import type { StoreProfileDto } from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';
import { isAdminUser } from '../../common/admin-auth';
import { ImageProcessingService } from '../storage/image-processing.service';
import { ObjectStorageService } from '../storage/object-storage.service';
import { StoreProfilesService } from './store-profiles.service';

@Injectable()
export class StoreProfilePhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
    private readonly images: ImageProcessingService,
    private readonly profiles: StoreProfilesService,
  ) {}

  async addPhoto(userId: string, ownershipId: string, file: Buffer): Promise<StoreProfileDto> {
    this.assertStorageReady();
    const ownership = await this.requireEditableOwnership(userId, ownershipId);
    const profile = await this.ensureProfile(ownership.id, userId);

    const processed = await this.images.validateAndOptimizeProfileImage(file, 'gallery');
    const objectKey = this.storage.buildStoreGalleryObjectKey(ownershipId, processed.extension);

    await this.storage.putObject({
      objectKey,
      body: processed.buffer,
      contentType: processed.mimeType,
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        const count = await tx.storeProfilePhoto.count({ where: { profileId: profile.id } });
        if (count >= STORE_MAX_PHOTOS) {
          throw new BadRequestException('store_profile_photo_limit_reached');
        }
        const maxSort = await tx.storeProfilePhoto.aggregate({
          where: { profileId: profile.id },
          _max: { sortOrder: true },
        });
        await tx.storeProfilePhoto.create({
          data: {
            id: randomUUID(),
            profileId: profile.id,
            objectKey,
            sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
          },
        });
        const current = await tx.storeProfile.findUnique({ where: { id: profile.id } });
        if (!current?.coverObjectKey) {
          await tx.storeProfile.update({
            where: { id: profile.id },
            data: { coverObjectKey: objectKey, updatedByUserId: userId },
          });
        }
      });
    } catch (error) {
      await this.storage.deleteStoreObject(objectKey, ownershipId);
      throw error;
    }

    return this.profiles.getOwnerProfile(userId, ownershipId);
  }

  async deletePhoto(userId: string, ownershipId: string, photoId: string): Promise<StoreProfileDto> {
    const ownership = await this.requireEditableOwnership(userId, ownershipId);
    const profile = ownership.storeProfile;
    if (!profile) throw new NotFoundException('store_profile_not_found');

    const photo = await this.prisma.storeProfilePhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.profileId !== profile.id) {
      throw new NotFoundException('store_profile_photo_not_found');
    }

    const wasCover = profile.coverObjectKey === photo.objectKey;
    await this.prisma.storeProfilePhoto.delete({ where: { id: photoId } });

    if (wasCover) {
      const next = await this.prisma.storeProfilePhoto.findFirst({
        where: { profileId: profile.id },
        orderBy: { sortOrder: 'asc' },
      });
      await this.prisma.storeProfile.update({
        where: { id: profile.id },
        data: { coverObjectKey: next?.objectKey ?? null, updatedByUserId: userId },
      });
    }

    await this.storage.deleteStoreObject(photo.objectKey, ownershipId);
    return this.profiles.getOwnerProfile(userId, ownershipId);
  }

  async setCoverPhoto(userId: string, ownershipId: string, photoId: string): Promise<StoreProfileDto> {
    const ownership = await this.requireEditableOwnership(userId, ownershipId);
    const profile = ownership.storeProfile;
    if (!profile) throw new NotFoundException('store_profile_not_found');

    const photo = await this.prisma.storeProfilePhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.profileId !== profile.id) {
      throw new NotFoundException('store_profile_photo_not_found');
    }

    await this.prisma.storeProfile.update({
      where: { id: profile.id },
      data: { coverObjectKey: photo.objectKey, updatedByUserId: userId },
    });
    return this.profiles.getOwnerProfile(userId, ownershipId);
  }

  private async ensureProfile(ownershipId: string, userId: string) {
    return this.prisma.storeProfile.upsert({
      where: { ownershipId },
      create: {
        id: randomUUID(),
        ownershipId,
        updatedByUserId: userId,
      },
      update: { updatedByUserId: userId },
    });
  }

  private async requireEditableOwnership(userId: string, ownershipId: string) {
    const ownership = await this.prisma.storeOwnership.findUnique({
      where: { id: ownershipId },
      include: { storeProfile: true },
    });
    if (!ownership) throw new NotFoundException('store_ownership_not_found');
    const isAdmin = await isAdminUser(this.prisma, userId);
    if (
      !canEditStoreProfile({
        ownershipStatus: ownership.status,
        ownerUserId: ownership.userId,
        actorUserId: userId,
        isAdmin,
      })
    ) {
      throw new ForbiddenException('store_profile_forbidden');
    }
    return ownership;
  }

  private assertStorageReady(): void {
    if (!this.storage.isEnabled()) {
      throw new BadRequestException('object_storage_not_configured');
    }
  }
}
