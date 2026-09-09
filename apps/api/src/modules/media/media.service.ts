import { Injectable, NotFoundException } from '@nestjs/common';
import { ObjectStorageService } from '../storage/object-storage.service';

@Injectable()
export class MediaService {
  constructor(private readonly storage: ObjectStorageService) {}

  ping() {
    return { module: 'media', status: 'ok' };
  }

  async getPublicObject(objectKey: string): Promise<{ body: Buffer; contentType: string }> {
    const key = objectKey.trim().replace(/^\/+/, '');
    if (!key || !this.storage.canServePublicObject(key)) {
      throw new NotFoundException('media_not_found');
    }
    return this.storage.getObjectBuffer(key);
  }
}
