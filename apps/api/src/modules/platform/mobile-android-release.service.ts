import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ANDROID_MOBILE_RELEASE_SETTINGS_ID,
  isPublishableAndroidRelease,
  validateMobileAndroidReleaseUpdate,
  type MobileAndroidReleaseValues,
} from '@jjoin/domain';
import type {
  AdminMobileAndroidReleaseDto,
  PublicMobileAndroidReleaseDto,
} from '@jjoin/types';
import { updateMobileAndroidReleaseSchema } from '@jjoin/validation';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MobileAndroidReleaseService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicRelease(): Promise<PublicMobileAndroidReleaseDto> {
    const row = await this.ensureRow();
    const values = this.rowToValues(row);
    if (!isPublishableAndroidRelease(values)) {
      return this.emptyPublicDto();
    }
    return this.toPublicDto(values);
  }

  async getAdminRelease(): Promise<AdminMobileAndroidReleaseDto> {
    const row = await this.ensureRow();
    return this.toAdminDto(this.rowToValues(row), row);
  }

  async updateAdminRelease(
    raw: unknown,
    actorUserId?: string,
  ): Promise<AdminMobileAndroidReleaseDto> {
    const parsed = updateMobileAndroidReleaseSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_mobile_android_release');

    const current = this.rowToValues(await this.ensureRow());
    const patch = validateMobileAndroidReleaseUpdate(parsed.data);
    const merged: MobileAndroidReleaseValues = {
      ...current,
      ...(patch.latestVersionCode !== undefined
        ? { latestVersionCode: patch.latestVersionCode }
        : {}),
      ...(patch.latestVersionName !== undefined
        ? { latestVersionName: patch.latestVersionName }
        : {}),
      ...(patch.apkUrl !== undefined ? { apkUrl: patch.apkUrl } : {}),
      ...(patch.releaseNotes !== undefined ? { releaseNotes: patch.releaseNotes } : {}),
    };

    const publishable = isPublishableAndroidRelease(merged);
    const row = await this.prisma.androidMobileReleaseSettings.update({
      where: { id: ANDROID_MOBILE_RELEASE_SETTINGS_ID },
      data: {
        latestVersionCode: merged.latestVersionCode,
        latestVersionName: merged.latestVersionName,
        apkUrl: merged.apkUrl,
        releaseNotes: merged.releaseNotes,
        publishedAt: publishable ? new Date() : null,
        updatedBy: actorUserId ?? null,
      },
    });

    return this.toAdminDto(this.rowToValues(row), row);
  }

  private async ensureRow() {
    return this.prisma.androidMobileReleaseSettings.upsert({
      where: { id: ANDROID_MOBILE_RELEASE_SETTINGS_ID },
      create: { id: ANDROID_MOBILE_RELEASE_SETTINGS_ID },
      update: {},
    });
  }

  private rowToValues(row: {
    latestVersionCode: number;
    latestVersionName: string;
    apkUrl: string;
    releaseNotes: string | null;
    publishedAt: Date | null;
  }): MobileAndroidReleaseValues {
    return {
      latestVersionCode: row.latestVersionCode,
      latestVersionName: row.latestVersionName,
      apkUrl: row.apkUrl,
      releaseNotes: row.releaseNotes,
      publishedAt: row.publishedAt?.toISOString() ?? null,
    };
  }

  private emptyPublicDto(): PublicMobileAndroidReleaseDto {
    return {
      latestVersionCode: 0,
      latestVersionName: '0.0.0',
      apkUrl: '',
      releaseNotes: null,
      publishedAt: null,
    };
  }

  private toPublicDto(values: MobileAndroidReleaseValues): PublicMobileAndroidReleaseDto {
    return {
      latestVersionCode: values.latestVersionCode,
      latestVersionName: values.latestVersionName,
      apkUrl: values.apkUrl,
      releaseNotes: values.releaseNotes,
      publishedAt: values.publishedAt,
    };
  }

  private toAdminDto(
    values: MobileAndroidReleaseValues,
    row: { updatedAt: Date; updatedBy: string | null },
  ): AdminMobileAndroidReleaseDto {
    return {
      ...this.toPublicDto(values),
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    };
  }
}
