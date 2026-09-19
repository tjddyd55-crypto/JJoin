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
  computeStoreMinPrice,
  formatKrwPriceFrom,
  formatStoreScreenBrandLabel,
  sortStorePriceSlots,
  validateStoreScreenBrand,
} from '@jjoin/domain';
import {
  StoreProfileVisibility,
  StoreScreenBrand,
  type PublicStoreDetailDto,
  type PublicStoreListItemDto,
  type StoreOperatingHoursDto,
  type StorePriceSlotDto,
  type StoreProfileDto,
} from '@jjoin/types';
import { upsertStoreProfileSchema } from '@jjoin/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { isAdminUser } from '../../common/admin-auth';
import { ObjectStorageService } from '../storage/object-storage.service';
import { FeatureFlagsService } from './feature-flags.service';

@Injectable()
export class StoreProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
    private readonly storage: ObjectStorageService,
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

    const profileId = await this.prisma.$transaction(async (tx) => {
      const profile = await tx.storeProfile.upsert({
        where: { ownershipId },
        create: {
          id: randomUUID(),
          ownershipId,
          intro: parsed.data.intro ?? null,
          vibe: parsed.data.vibe ?? null,
          amenities: parsed.data.amenities ?? [],
          screenBrand,
          screenBrandOther: brand.screenBrandOther,
          screenModel: parsed.data.screenModel ?? null,
          roomCount: parsed.data.roomCount ?? null,
          phone: parsed.data.phone ?? null,
          reservationLabel: parsed.data.reservationLabel ?? null,
          reservationUrl: parsed.data.reservationUrl ?? null,
          reservationNote: parsed.data.reservationNote ?? null,
          parkingAvailable: parsed.data.parkingAvailable ?? null,
          parkingNote: parsed.data.parkingNote ?? null,
          leftHandedAvailable: parsed.data.leftHandedAvailable ?? null,
          unmanned: parsed.data.unmanned ?? null,
          visibility: (parsed.data.visibility ?? 'PRIVATE') as StoreProfileVisibility,
          updatedByUserId: userId,
        },
        update: {
          ...(parsed.data.intro !== undefined ? { intro: parsed.data.intro } : {}),
          ...(parsed.data.vibe !== undefined ? { vibe: parsed.data.vibe } : {}),
          ...(parsed.data.amenities !== undefined ? { amenities: parsed.data.amenities } : {}),
          screenBrand,
          screenBrandOther: brand.screenBrandOther,
          ...(parsed.data.screenModel !== undefined ? { screenModel: parsed.data.screenModel } : {}),
          ...(parsed.data.roomCount !== undefined ? { roomCount: parsed.data.roomCount } : {}),
          ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
          ...(parsed.data.reservationLabel !== undefined
            ? { reservationLabel: parsed.data.reservationLabel }
            : {}),
          ...(parsed.data.reservationUrl !== undefined ? { reservationUrl: parsed.data.reservationUrl } : {}),
          ...(parsed.data.reservationNote !== undefined ? { reservationNote: parsed.data.reservationNote } : {}),
          ...(parsed.data.parkingAvailable !== undefined
            ? { parkingAvailable: parsed.data.parkingAvailable }
            : {}),
          ...(parsed.data.parkingNote !== undefined ? { parkingNote: parsed.data.parkingNote } : {}),
          ...(parsed.data.leftHandedAvailable !== undefined
            ? { leftHandedAvailable: parsed.data.leftHandedAvailable }
            : {}),
          ...(parsed.data.unmanned !== undefined ? { unmanned: parsed.data.unmanned } : {}),
          ...(parsed.data.visibility !== undefined
            ? { visibility: parsed.data.visibility as StoreProfileVisibility }
            : {}),
          updatedByUserId: userId,
        },
      });

      if (parsed.data.operatingHours) {
        await tx.storeOperatingHours.deleteMany({ where: { profileId: profile.id } });
        if (parsed.data.operatingHours.length > 0) {
          await tx.storeOperatingHours.createMany({
            data: parsed.data.operatingHours.map((row, index) => ({
              id: randomUUID(),
              profileId: profile.id,
              dayGroup: row.dayGroup,
              label: row.label ?? null,
              startTime: row.startTime ?? null,
              endTime: row.endTime ?? null,
              isClosed: row.isClosed ?? false,
              is24Hours: row.is24Hours ?? false,
              sortOrder: row.sortOrder ?? index,
            })),
          });
        }
      }

      if (parsed.data.priceSlots) {
        await tx.storePriceSlot.deleteMany({ where: { profileId: profile.id } });
        if (parsed.data.priceSlots.length > 0) {
          await tx.storePriceSlot.createMany({
            data: parsed.data.priceSlots.map((row, index) => ({
              id: randomUUID(),
              profileId: profile.id,
              dayType: row.dayType,
              startTime: row.startTime,
              endTime: row.endTime,
              price: row.price,
              label: row.label ?? null,
              sortOrder: row.sortOrder ?? index,
            })),
          });
        }
      }

      return profile.id;
    });

    void profileId;
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
          },
        },
        golfFacility: {
          ...(query.sido ? { sido: query.sido } : {}),
          ...(query.sigungu ? { sigungu: query.sigungu } : {}),
        },
      },
      include: {
        storeProfile: {
          include: {
            photos: { orderBy: { sortOrder: 'asc' } },
            priceSlots: true,
          },
        },
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
      .map((row) => {
        const minPrice = computeStoreMinPrice(row.storeProfile?.priceSlots ?? []);
        return {
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
          coverImageUrl: this.storage.getPublicUrl(row.storeProfile?.coverObjectKey ?? null),
          minPrice,
          minPriceLabel: minPrice != null ? formatKrwPriceFrom(minPrice) : null,
          reservationAvailable: Boolean(row.storeProfile?.reservationUrl?.trim()),
        };
      });
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
        address:
          ownership.golfFacility.roadAddress ??
          ownership.golfFacility.lotAddress ??
          ownership.venue?.roadAddress ??
          ownership.venue?.address ??
          null,
      },
    };
  }

  private async requireOwnership(ownershipId: string) {
    const ownership = await this.prisma.storeOwnership.findUnique({
      where: { id: ownershipId },
      include: {
        storeProfile: {
          include: {
            photos: { orderBy: { sortOrder: 'asc' } },
            operatingHours: { orderBy: { sortOrder: 'asc' } },
            priceSlots: true,
          },
        },
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
    const coverKey = profile?.coverObjectKey ?? null;
    const priceSlots = sortStorePriceSlots(
      (profile?.priceSlots ?? []).map(
        (slot): StorePriceSlotDto => ({
          id: slot.id,
          dayType: slot.dayType,
          startTime: slot.startTime,
          endTime: slot.endTime,
          price: slot.price,
          label: slot.label,
          sortOrder: slot.sortOrder,
        }),
      ),
    );
    const minPrice = computeStoreMinPrice(priceSlots);
    const address =
      ownership.golfFacility.roadAddress ??
      ownership.golfFacility.lotAddress ??
      ownership.venue?.roadAddress ??
      ownership.venue?.address ??
      null;

    return {
      ownershipId: ownership.id,
      golfFacilityId: ownership.golfFacilityId,
      venueId: ownership.venueId,
      name: ownership.golfFacility.displayName,
      regionLabel: [ownership.golfFacility.sido, ownership.golfFacility.sigungu].filter(Boolean).join(' ') || null,
      sido: ownership.golfFacility.sido,
      sigungu: ownership.golfFacility.sigungu,
      address,
      intro: profile?.intro ?? null,
      vibe: profile?.vibe ?? null,
      amenities: profile?.amenities ?? [],
      screenBrand: (profile?.screenBrand ?? 'OTHER') as StoreScreenBrand,
      screenBrandOther: profile?.screenBrandOther ?? null,
      screenModel: profile?.screenModel ?? null,
      roomCount: profile?.roomCount ?? null,
      phone: profile?.phone ?? null,
      reservationLabel: profile?.reservationLabel ?? null,
      reservationUrl: profile?.reservationUrl ?? null,
      reservationNote: profile?.reservationNote ?? null,
      parkingAvailable: profile?.parkingAvailable ?? null,
      parkingNote: profile?.parkingNote ?? null,
      leftHandedAvailable: profile?.leftHandedAvailable ?? null,
      unmanned: profile?.unmanned ?? null,
      visibility: (profile?.visibility ?? 'PRIVATE') as StoreProfileVisibility,
      coverImageUrl: this.storage.getPublicUrl(coverKey),
      photos: (profile?.photos ?? []).map((p) => ({
        id: p.id,
        imageUrl: this.storage.getPublicUrl(p.objectKey),
        sortOrder: p.sortOrder,
        isCover: coverKey != null && p.objectKey === coverKey,
      })),
      operatingHours: (profile?.operatingHours ?? []).map(
        (row): StoreOperatingHoursDto => ({
          id: row.id,
          dayGroup: row.dayGroup,
          label: row.label,
          startTime: row.startTime,
          endTime: row.endTime,
          isClosed: row.isClosed,
          is24Hours: row.is24Hours,
          sortOrder: row.sortOrder,
        }),
      ),
      priceSlots,
      minPrice,
      canEdit: canEditStoreProfile({
        ownershipStatus: ownership.status,
        ownerUserId: ownership.userId,
        actorUserId,
        isAdmin,
      }),
    };
  }
}
