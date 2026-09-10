import { Injectable, Logger } from '@nestjs/common';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  buildProfileAvatarObjectKey,
  buildProfileGalleryObjectKey,
  buildMallProductCoverObjectKey,
  buildMallProductContentObjectKey,
  buildMallProductGalleryObjectKey,
  buildPublicObjectUrl,
  isOwnedProfileObjectKey,
  isOwnedMallProductObjectKey,
  isPublicReadableObjectKey,
  resolveStorageEnvironmentPrefix,
  type AllowedProfileImageMime,
} from '@jjoin/domain';
import { randomUUID } from 'node:crypto';
import { resolveApiAppVariant } from '../../config/app-variant';

export type ObjectStorageConfig = {
  enabled: boolean;
  bucket: string;
  endpoint: string;
  publicBaseUrl: string;
  environmentPrefix: 'development' | 'production';
};

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  const https = trimmed.startsWith('http://') ? trimmed.replace('http://', 'https://') : trimmed;
  return https.replace(/\/+$/, '');
}

function resolvePublicMediaDeliveryMode(): 'r2' | 'api' {
  const mode = (process.env.MEDIA_PUBLIC_DELIVERY ?? 'r2').trim().toLowerCase();
  return mode === 'api' ? 'api' : 'r2';
}

/** Base URL for anonymous `/media/objects` delivery (React Native Image compatible). */
export function resolvePublicMediaApiBase(): string {
  const explicit =
    process.env.PUBLIC_API_BASE_URL?.trim() || process.env.API_PUBLIC_BASE_URL?.trim() || '';
  if (explicit) return normalizeBaseUrl(explicit);

  const railwayHost =
    process.env.RAILWAY_PUBLIC_DOMAIN?.trim() || process.env.RAILWAY_STATIC_URL?.trim() || '';
  if (railwayHost) {
    const host = railwayHost.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `https://${host}`;
  }

  return '';
}

export function resolvePublicObjectUrl(params: {
  objectKey: string;
  publicBaseUrl: string;
}): string | null {
  const key = params.objectKey.trim().replace(/^\/+/, '');
  if (!key) return null;

  const apiBase = resolvePublicMediaApiBase();
  if (resolvePublicMediaDeliveryMode() === 'api' && apiBase) {
    return `${apiBase}/media/objects?key=${encodeURIComponent(key)}`;
  }

  if (!params.publicBaseUrl) return null;
  return buildPublicObjectUrl(params.publicBaseUrl, key);
}

export function resolveObjectStorageConfig(): ObjectStorageConfig {
  const mode = (process.env.MEDIA_STORAGE_MODE ?? 'mock').trim().toLowerCase();
  if (mode !== 'r2') {
    return {
      enabled: false,
      bucket: '',
      endpoint: '',
      publicBaseUrl: '',
      environmentPrefix: resolveStorageEnvironmentPrefix(resolveApiAppVariant()),
    };
  }

  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? '';
  const bucket = process.env.R2_BUCKET?.trim() ?? '';
  const publicBaseUrl = normalizeBaseUrl(process.env.R2_PUBLIC_BASE_URL?.trim() ?? '');
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

  const enabled =
    Boolean(accountId && accessKeyId && secretAccessKey && bucket && endpoint && publicBaseUrl);

  return {
    enabled,
    bucket,
    endpoint,
    publicBaseUrl,
    environmentPrefix: resolveStorageEnvironmentPrefix(resolveApiAppVariant()),
  };
}

@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly config = resolveObjectStorageConfig();
  private readonly client = this.config.enabled
    ? new S3Client({
        region: 'auto',
        endpoint: this.config.endpoint,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
        },
      })
    : null;

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getEnvironmentPrefix(): 'development' | 'production' {
    return this.config.environmentPrefix;
  }

  buildAvatarObjectKey(userId: string, extension: 'jpg' | 'png' | 'webp'): string {
    return buildProfileAvatarObjectKey({
      environmentPrefix: this.config.environmentPrefix,
      userId,
      fileId: randomUUID(),
      extension,
    });
  }

  buildGalleryObjectKey(userId: string, extension: 'jpg' | 'png' | 'webp'): string {
    return buildProfileGalleryObjectKey({
      environmentPrefix: this.config.environmentPrefix,
      userId,
      fileId: randomUUID(),
      extension,
    });
  }

  buildMallCoverObjectKey(productId: string, extension: 'jpg' | 'png' | 'webp'): string {
    return buildMallProductCoverObjectKey({
      environmentPrefix: this.config.environmentPrefix,
      productId,
      fileId: randomUUID(),
      extension,
    });
  }

  buildMallGalleryObjectKey(productId: string, extension: 'jpg' | 'png' | 'webp'): string {
    return buildMallProductGalleryObjectKey({
      environmentPrefix: this.config.environmentPrefix,
      productId,
      fileId: randomUUID(),
      extension,
    });
  }

  buildMallContentObjectKey(productId: string, extension: 'jpg' | 'png' | 'webp'): string {
    return buildMallProductContentObjectKey({
      environmentPrefix: this.config.environmentPrefix,
      productId,
      fileId: randomUUID(),
      extension,
    });
  }

  async deleteMallObject(objectKey: string, productId: string): Promise<void> {
    if (!objectKey || objectKey.startsWith('mock://') || objectKey.startsWith('http')) return;
    if (!this.client || !this.config.enabled) return;
    if (
      !isOwnedMallProductObjectKey({
        objectKey,
        environmentPrefix: this.config.environmentPrefix,
        productId,
      })
    ) {
      this.logger.warn(`skip_delete_unowned_mall_object product=${productId}`);
      return;
    }
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: objectKey,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `mall_object_delete_failed product=${productId} key=${objectKey} err=${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  getPublicUrl(objectKey: string | null | undefined): string | null {
    if (!objectKey) return null;
    if (objectKey.startsWith('mock://')) return null;
    if (objectKey.startsWith('http://') || objectKey.startsWith('https://')) {
      return objectKey;
    }

    return resolvePublicObjectUrl({
      objectKey,
      publicBaseUrl: this.config.publicBaseUrl,
    });
  }

  canServePublicObject(objectKey: string): boolean {
    if (!objectKey || objectKey.startsWith('mock://') || objectKey.startsWith('http')) return false;
    return isPublicReadableObjectKey({
      objectKey,
      environmentPrefix: this.config.environmentPrefix,
    });
  }

  async getObjectBuffer(objectKey: string): Promise<{ body: Buffer; contentType: string }> {
    if (!this.client || !this.config.enabled) {
      throw new Error('object_storage_not_configured');
    }
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
      }),
    );
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) throw new Error('object_body_empty');
    const contentType = response.ContentType?.trim() || 'application/octet-stream';
    return { body: Buffer.from(bytes), contentType };
  }

  async putObject(params: {
    objectKey: string;
    body: Buffer;
    contentType: AllowedProfileImageMime;
  }): Promise<void> {
    if (!this.client || !this.config.enabled) {
      throw new Error('object_storage_not_configured');
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: params.objectKey,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
  }

  async deleteObject(objectKey: string, ownerUserId: string): Promise<void> {
    if (!objectKey || objectKey.startsWith('mock://') || objectKey.startsWith('http')) return;
    if (!this.client || !this.config.enabled) return;
    if (
      !isOwnedProfileObjectKey({
        objectKey,
        environmentPrefix: this.config.environmentPrefix,
        userId: ownerUserId,
      })
    ) {
      this.logger.warn(`skip_delete_unowned_object user=${ownerUserId}`);
      return;
    }
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: objectKey,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `object_delete_failed user=${ownerUserId} key=${objectKey} err=${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
