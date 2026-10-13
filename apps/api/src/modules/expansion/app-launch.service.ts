import { BadRequestException, Injectable } from '@nestjs/common';
import {
  APP_LAUNCH_DURATION_DEFAULT_MS,
  buildAppLaunchObjectKey,
  clampAppLaunchDurationMs,
} from '@jjoin/domain';
import type {
  AdminAppLaunchSettingDto,
  AppLaunchConfigDto,
  UpdateAppLaunchSettingRequest,
} from '@jjoin/types';
import { updateAppLaunchSettingSchema } from '@jjoin/validation';
import { randomUUID } from 'node:crypto';
import { resolveApiAppVariant } from '../../config/app-variant';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageProcessingService } from '../storage/image-processing.service';
import { ObjectStorageService } from '../storage/object-storage.service';

@Injectable()
export class AppLaunchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
    private readonly images: ImageProcessingService,
  ) {}

  private variantKey(): 'development' | 'production' {
    return resolveApiAppVariant();
  }

  async getPublic(): Promise<AppLaunchConfigDto> {
    const row = await this.ensureRow();
    return this.toPublicDto(row);
  }

  async getAdmin(): Promise<AdminAppLaunchSettingDto> {
    const row = await this.ensureRow();
    return this.toAdminDto(row);
  }

  async update(body: unknown, updatedByUserId?: string): Promise<AdminAppLaunchSettingDto> {
    const parsed = updateAppLaunchSettingSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_app_launch_setting');
    const data = parsed.data as UpdateAppLaunchSettingRequest;
    const variant = this.variantKey();

    const row = await this.prisma.appLaunchSetting.upsert({
      where: { appVariant: variant },
      create: {
        appVariant: variant,
        enabled: data.enabled ?? true,
        displayDurationMs: clampAppLaunchDurationMs(
          data.displayDurationMs ?? APP_LAUNCH_DURATION_DEFAULT_MS,
        ),
        imageObjectKey: data.imageObjectKey ?? null,
        updatedByUserId: updatedByUserId ?? null,
      },
      update: {
        ...(data.enabled != null ? { enabled: data.enabled } : {}),
        ...(data.displayDurationMs != null
          ? { displayDurationMs: clampAppLaunchDurationMs(data.displayDurationMs) }
          : {}),
        ...(data.imageObjectKey !== undefined ? { imageObjectKey: data.imageObjectKey } : {}),
        updatedByUserId: updatedByUserId ?? null,
      },
    });

    return this.toAdminDto(row);
  }

  async uploadLaunchImage(
    file: Buffer,
    updatedByUserId?: string,
  ): Promise<AdminAppLaunchSettingDto> {
    if (!this.storage.isEnabled()) {
      throw new BadRequestException('object_storage_unavailable');
    }
    const processed = await this.images.validateAndOptimizeProfileImage(file, 'gallery');
    const objectKey = buildAppLaunchObjectKey({
      environmentPrefix: this.storage.getEnvironmentPrefix(),
      fileId: randomUUID(),
      extension: processed.extension,
    });
    await this.storage.putObject({
      objectKey,
      body: processed.buffer,
      contentType: processed.mimeType,
    });
    return this.update({ imageObjectKey: objectKey }, updatedByUserId);
  }

  private async ensureRow() {
    const variant = this.variantKey();
    return this.prisma.appLaunchSetting.upsert({
      where: { appVariant: variant },
      create: {
        appVariant: variant,
        enabled: true,
        displayDurationMs: APP_LAUNCH_DURATION_DEFAULT_MS,
      },
      update: {},
    });
  }

  private toPublicDto(row: {
    enabled: boolean;
    imageObjectKey: string | null;
    displayDurationMs: number;
    updatedAt: Date;
  }): AppLaunchConfigDto {
    return {
      enabled: row.enabled,
      imageUrl: this.storage.getPublicUrl(row.imageObjectKey),
      displayDurationMs: row.displayDurationMs,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toAdminDto(row: {
    enabled: boolean;
    imageObjectKey: string | null;
    displayDurationMs: number;
    updatedAt: Date;
  }): AdminAppLaunchSettingDto {
    return {
      ...this.toPublicDto(row),
      imageObjectKey: row.imageObjectKey,
    };
  }
}
