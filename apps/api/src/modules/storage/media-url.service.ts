import { Injectable } from '@nestjs/common';
import type { ProfilePhotoDto } from '@jjoin/types';
import { ObjectStorageService } from '../storage/object-storage.service';

@Injectable()
export class MediaUrlService {
  constructor(private readonly storage: ObjectStorageService) {}

  resolveAvatarUrl(storageKey: string | null | undefined): string | null {
    return this.storage.getPublicUrl(storageKey ?? null);
  }

  mapProfilePhotos(
    rows: Array<{ id: string; objectKey: string; sortOrder: number }>,
  ): ProfilePhotoDto[] {
    return rows
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row) => ({
        id: row.id,
        imageUrl: this.storage.getPublicUrl(row.objectKey),
        sortOrder: row.sortOrder,
      }));
  }
}
