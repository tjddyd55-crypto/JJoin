import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  canEditStoreProfile,
  canPublishStoreProfile,
  formatStoreScreenBrandLabel,
  validateStoreScreenBrand,
} from '@jjoin/domain';
import {
  StoreProfileVisibility,
  StoreScreenBrand,
  type PublicStoreDetailDto,
  type PublicStoreListItemDto,
  type StoreProfileDto,
} from '@jjoin/types';
import { upsertStoreProfileSchema } from '@jjoin/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { isAdminUser } from '../../common/admin-auth';
import { FeatureFlagsService } from './feature-flags.service';

@Injectable()
export class StoreProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
  ) {}

  async getOwnerProfile(userId: string, ownershipId: string): Promise<StoreProfileDto> {
    const ownership = await this.requireOwnership(ownershipId);
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
    return this.toDto(ownership, userId, isAdmin);
  }

  async upsertOwnerProfile(userId: string, ownershipId: string, body: unknown): Promise<StoreProfileDto> {
    const parsed = upsertStoreProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'store_profile_invalid', issues: parsed.error.issues });
    }
    const ownership = await this.requireOwnership(ownershipId);
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
    const current = ownership.storeProfile;
    const screenBrand = (parsed.data.screenBrand ?? current?.screenBrand ?? 'OTHER') as StoreScreenBrand;
    const brand = validateStoreScreenBrand({
      screenBrand,
      screenBrandOther: parsed.data.screenBrandOther ?? current?.screenBrandOther,
    });
    if (!brand.ok) throw new BadRequestException(brand.code);

    await this.prisma.storeProfile.upsert({
      where: { ownershipId },
      create: {
        id: randomUUID(),
        ownershipId,
        intro: parsed.data.intro ?? null,
        vibe: parsed.data.vibe ?? null,
        amenities: parsed.data.amenities ?? [],
        screenBrand,
        screenBrandOther: brand.screenBrandOther,
        visibility: (parsed.data.visibility ?? 'PRIVATE') as StoreProfileVisibility,
        updatedByUserId: userId,
      },
      update: {
        ...(parsed.data.intro !== undefined ? { intro: parsed.data.intro } : {}),
        ...(parsed.data.vibe !== undefined ? { vibe: parsed.data.vibe } : {}),
        ...(parsed.data.amenities !== undefined ? { amenities: parsed.data.amenities } : {}),
        screenBrand,
        screenBrandOther: brand.screenBrandOther,
        ...(parsed.data.visibility !== undefined
          ? { visibility: parsed.data.visibility as StoreProfileVisibility }
          : {}),
        updatedByUserId: userId,
      },
    });
    return this.getOwnerProfile(userId, ownershipId);
  }

  async listPublic(query: { sido?: string; sigungu?: string }): Promise<PublicStoreListItemDto[]> {
    const flags = await this.flags.getFlags();
    if (!flags.storeProfilesEnabled) return [];
    const rows = await this.prisma.storeOwnership.findMany({
      where: {
        status: 'ACTIVE',
        storeProfile: {
          is: {
            visibility: 'PUBLIC',
            ...(query.sido
              ? { ownership: undefined }
              : {}),
          },
        },
        golfFacility: {
          ...(query.sido ? { sido: query.sido } : {}),
          ...(query.sigungu ? { sigungu: query.sigungu } : {}),
        },
      },
      include: {
        storeProfile: { include: { photos: { orderBy: { sortOrder: 'asc' } } } },
        golfFacility: true,
        venue: true,
      },
      take: 50,
    });
    return rows
      .filter((row) =>
        canPublishStoreProfile({
          visibility: (row.storeProfile?.visibility ?? 'PRIVATE') as StoreProfileVisibility,
          ownershipStatus: row.status,
        }),
      )
      .map((row) => ({
        ownershipId: row.id,
        name: row.golfFacility.displayName,
        regionLabel: [row.golfFacility.sido, row.golfFacility.sigungu].filter(Boolean).join(' ') || null,
        sido: row.golfFacility.sido,
        sigungu: row.golfFacility.sigungu,
        screenBrand: (row.storeProfile?.screenBrand ?? 'OTHER') as StoreScreenBrand,
        screenBrandLabel: formatStoreScreenBrandLabel(
          (row.storeProfile?.screenBrand ?? 'OTHER') as StoreScreenBrand,
          row.storeProfile?.screenBrandOther,
        ),
        blurb: row.storeProfile?.intro ?? row.storeProfile?.vibe ?? null,
        coverImageUrl: row.storeProfile?.coverObjectKey ?? null,
      }));
  }

  async getPublicDetail(ownershipId: string): Promise<PublicStoreDetailDto> {
    const flags = await this.flags.getFlags();
    if (!flags.storeProfilesEnabled) throw new NotFoundException('store_profile_unavailable');
    const ownership = await this.requireOwnership(ownershipId);
    if (
      !canPublishStoreProfile({
        visibility: (ownership.storeProfile?.visibility ?? 'PRIVATE') as StoreProfileVisibility,
        ownershipStatus: ownership.status,
      })
    ) {
      throw new NotFoundException('store_profile_not_public');
    }
    const dto = await this.toDto(ownership, ownership.userId, false);
    return {
      ...dto,
      venue: {
        venueId: ownership.venueId,
        name: ownership.golfFacility.displayName,
        address: ownership.golfFacility.roadAddress ?? ownership.golfFacility.lotAddress ?? null,
      },
    };
  }

  private async requireOwnership(ownershipId: string) {
    const ownership = await this.prisma.storeOwnership.findUnique({
      where: { id: ownershipId },
      include: {
        storeProfile: { include: { photos: { orderBy: { sortOrder: 'asc' } } } },
        golfFacility: true,
        venue: true,
      },
    });
    if (!ownership) throw new NotFoundException('store_ownership_not_found');
    return ownership;
  }

  private async toDto(
    ownership: Awaited<ReturnType<StoreProfilesService['requireOwnership']>>,
    actorUserId: string,
    isAdmin: boolean,
  ): Promise<StoreProfileDto> {
    const profile = ownership.storeProfile;
    return {
      ownershipId: ownership.id,
      golfFacilityId: ownership.golfFacilityId,
      venueId: ownership.venueId,
      name: ownership.golfFacility.displayName,
      regionLabel: [ownership.golfFacility.sido, ownership.golfFacility.sigungu].filter(Boolean).join(' ') || null,
      sido: ownership.golfFacility.sido,
      sigungu: ownership.golfFacility.sigungu,
      intro: profile?.intro ?? null,
      vibe: profile?.vibe ?? null,
      amenities: profile?.amenities ?? [],
      screenBrand: (profile?.screenBrand ?? 'OTHER') as StoreScreenBrand,
      screenBrandOther: profile?.screenBrandOther ?? null,
      visibility: (profile?.visibility ?? 'PRIVATE') as StoreProfileVisibility,
      coverImageUrl: profile?.coverObjectKey ?? null,
      photos: (profile?.photos ?? []).map((p) => ({
        id: p.id,
        imageUrl: p.objectKey,
        sortOrder: p.sortOrder,
      })),
      canEdit: canEditStoreProfile({
        ownershipStatus: ownership.status,
        ownerUserId: ownership.userId,
        actorUserId,
        isAdmin,
      }),
    };
  }
}
