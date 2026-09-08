import { Global, Module } from '@nestjs/common';
import { ImageProcessingService } from './image-processing.service';
import { MediaUrlService } from './media-url.service';
import { ObjectStorageService } from './object-storage.service';

@Global()
@Module({
  providers: [ObjectStorageService, ImageProcessingService, MediaUrlService],
  exports: [ObjectStorageService, ImageProcessingService, MediaUrlService],
})
export class StorageModule {}
