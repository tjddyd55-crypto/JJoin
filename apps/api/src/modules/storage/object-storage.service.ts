import { Injectable, Logger } from '@nestjs/common';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  buildProfileAvatarObjectKey,
  buildProfileGalleryObjectKey,
  buildPublicObjectUrl,
  isOwnedProfileObjectKey,
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

  getPublicUrl(objectKey: string | null | undefined): string | null {
    if (!objectKey || !this.config.publicBaseUrl) return null;
    if (objectKey.startsWith('mock://') || objectKey.startsWith('http://') || objectKey.startsWith('https://')) {
      return objectKey.startsWith('http') ? objectKey : null;
    }
    return buildPublicObjectUrl(this.config.publicBaseUrl, objectKey);
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
