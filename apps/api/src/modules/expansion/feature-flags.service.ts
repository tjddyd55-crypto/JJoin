import { Injectable } from '@nestjs/common';
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_SETTINGS_ID,
  normalizeFeatureFlags,
  type FeatureFlagSnapshot,
} from '@jjoin/domain';
import type { FeatureFlagDto } from '@jjoin/types';
import { updateFeatureFlagsSchema } from '@jjoin/validation';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFlags(): Promise<FeatureFlagDto> {
    const row = await this.prisma.featureFlagSettings.upsert({
      where: { id: FEATURE_FLAG_SETTINGS_ID },
      create: { id: FEATURE_FLAG_SETTINGS_ID },
      update: {},
    });
    return normalizeFeatureFlags({
      clubsUiEnabled: row.clubsUiEnabled,
      profileMatchAlertsEnabled: row.profileMatchAlertsEnabled,
      storeProfilesEnabled: row.storeProfilesEnabled,
      homeBannersEnabled: row.homeBannersEnabled,
      storeBannerAdsEnabled: row.storeBannerAdsEnabled,
      coinGiftEnabled: row.coinGiftEnabled,
      attendanceRewardsEnabled: row.attendanceRewardsEnabled,
    });
  }

  async updateFlags(body: unknown, updatedBy?: string): Promise<FeatureFlagDto> {
    const parsed = updateFeatureFlagsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'feature_flags_invalid', issues: parsed.error.issues });
    }
    await this.prisma.featureFlagSettings.upsert({
      where: { id: FEATURE_FLAG_SETTINGS_ID },
      create: { id: FEATURE_FLAG_SETTINGS_ID, ...parsed.data, updatedBy: updatedBy ?? null },
      update: { ...parsed.data, updatedBy: updatedBy ?? null },
    });
    return this.getFlags();
  }

  snapshot(): FeatureFlagSnapshot {
    return DEFAULT_FEATURE_FLAGS;
  }
}
