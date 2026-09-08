import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ALLOWED_PROFILE_IMAGE_MIMES,
  PROFILE_AVATAR_MAX_EDGE_PX,
  PROFILE_GALLERY_MAX_EDGE_PX,
  PROFILE_IMAGE_MAX_BYTES,
  isAllowedProfileImageMime,
  normalizeImageExtension,
  type AllowedProfileImageMime,
} from '@jjoin/domain';
import sharp from 'sharp';
import type { Metadata } from 'sharp';

export type ProcessedProfileImage = {
  buffer: Buffer;
  mimeType: AllowedProfileImageMime;
  extension: 'jpg' | 'png' | 'webp';
};

@Injectable()
export class ImageProcessingService {
  async validateAndOptimizeProfileImage(
    input: Buffer,
    purpose: 'avatar' | 'gallery',
  ): Promise<ProcessedProfileImage> {
    if (!input.length || input.length > PROFILE_IMAGE_MAX_BYTES) {
      throw new BadRequestException('image_too_large');
    }

    let metadata: Metadata;
    try {
      metadata = await sharp(input, { failOn: 'error' }).metadata();
    } catch {
      throw new BadRequestException('invalid_image');
    }

    const mimeType = this.resolveMimeType(metadata.format);
    if (!mimeType) {
      throw new BadRequestException('unsupported_image_type');
    }

    const maxEdge = purpose === 'avatar' ? PROFILE_AVATAR_MAX_EDGE_PX : PROFILE_GALLERY_MAX_EDGE_PX;
    let pipeline = sharp(input, { failOn: 'error' }).rotate();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const longEdge = Math.max(width, height);
    if (longEdge > maxEdge) {
      pipeline = pipeline.resize({
        width: width >= height ? maxEdge : undefined,
        height: height > width ? maxEdge : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    if (mimeType === 'image/png') {
      const buffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
      return { buffer, mimeType, extension: 'png' };
    }
    if (mimeType === 'image/webp') {
      const buffer = await pipeline.webp({ quality: 82 }).toBuffer();
      return { buffer, mimeType, extension: 'webp' };
    }

    const buffer = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    return { buffer, mimeType: 'image/jpeg', extension: 'jpg' };
  }

  private resolveMimeType(format?: string): AllowedProfileImageMime | null {
    switch (format) {
      case 'jpeg':
      case 'jpg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      default:
        return null;
    }
  }
}

export function assertAllowedUploadMime(mimeType: string | undefined): AllowedProfileImageMime {
  const normalized = (mimeType ?? '').trim().toLowerCase();
  if (!isAllowedProfileImageMime(normalized)) {
    throw new BadRequestException('unsupported_image_type');
  }
  return normalized;
}

export { ALLOWED_PROFILE_IMAGE_MIMES, normalizeImageExtension };
