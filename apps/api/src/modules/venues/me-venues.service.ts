import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AddUserVenueFavoriteRequest,
  CreateCustomVenueRequest,
  UserVenueListResponse,
  UserVenuePickerItemDto,
} from '@jjoin/types';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureFoundation } from '../../foundation/ensure-foundation';
import { venueSearchConfig } from '../../providers/venue-search.config';

const RECENT_LIMIT = 5;

@Injectable()
export class MeVenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async listRecent(userId: string): Promise<UserVenueListResponse> {
    const rows = await this.prisma.userVenueRecent.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
      take: RECENT_LIMIT,
      include: {
        venue: {
          include: { golfFacility: { select: { facilityType: true } } },
        },
      },
    });
    const favoriteIds = await this.favoriteVenueIdSet(
      userId,
      rows.map((r) => r.venueId),
    );
    return {
      items: rows.map((r) =>
        this.toPickerItem(r.venue, favoriteIds.has(r.venueId)),
      ),
    };
  }

  async listFavorites(userId: string): Promise<UserVenueListResponse> {
    const rows = await this.prisma.userVenueFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        venue: {
          include: { golfFacility: { select: { facilityType: true } } },
        },
      },
    });
    return {
      items: rows.map((r) => this.toPickerItem(r.venue, true)),
    };
  }

  async addFavorite(userId: string, body: AddUserVenueFavoriteRequest) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: body.venueId },
    });
    if (!venue) {
      throw new NotFoundException({
        code: 'VENUE_NOT_FOUND',
        message: '장소를 찾을 수 없습니다.',
      });
    }
    await this.prisma.userVenueFavorite.upsert({
      where: { userId_venueId: { userId, venueId: body.venueId } },
      create: { userId, venueId: body.venueId },
      update: {},
    });
    return { ok: true as const };
  }

  async removeFavorite(userId: string, venueId: string) {
    await this.prisma.userVenueFavorite.deleteMany({
      where: { userId, venueId },
    });
    return { ok: true as const };
  }

  /** Called after successful Join create — bumps venue to top of recent list. */
  async touchRecent(userId: string, venueId: string) {
    await this.prisma.userVenueRecent.upsert({
      where: { userId_venueId: { userId, venueId } },
      create: { userId, venueId, lastUsedAt: new Date() },
      update: { lastUsedAt: new Date() },
    });
    const overflow = await this.prisma.userVenueRecent.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
      skip: RECENT_LIMIT,
      select: { id: true },
    });
    if (overflow.length) {
      await this.prisma.userVenueRecent.deleteMany({
        where: { id: { in: overflow.map((r) => r.id) } },
      });
    }
  }

  async createCustomVenue(userId: string, body: CreateCustomVenueRequest) {
    const name = body.name.trim();
    const address = body.address.trim();
    if (!name || !address) {
      throw new BadRequestException('name_and_address_required');
    }

    const geo = await this.geocodeAddress(address);
    const { sport } = await ensureFoundation(this.prisma);
    const providerPlaceId = `custom:${randomUUID()}`;

    const venue = await this.prisma.venue.create({
      data: {
        sportId: sport.id,
        provider: 'CUSTOM',
        providerPlaceId,
        name,
        address,
        roadAddress: address,
        phone: body.phone?.trim() || null,
        latitude: geo.lat,
        longitude: geo.lng,
        region: geo.region,
        metadata: {
          createdByUserId: userId,
          geocoded: geo.ok,
        },
      },
    });

    return {
      venueId: venue.id,
      name: venue.name,
      address: venue.address,
      roadAddress: venue.roadAddress,
      phone: venue.phone,
      latitude: Number(venue.latitude),
      longitude: Number(venue.longitude),
    };
  }

  private async geocodeAddress(query: string): Promise<{
    lat: number;
    lng: number;
    region: string | null;
    ok: boolean;
  }> {
    const key = venueSearchConfig.restApiKey;
    if (!key) {
      return { lat: 37.5665, lng: 126.978, region: null, ok: false };
    }
    const url = new URL('https://dapi.kakao.com/v2/local/search/address.json');
    url.searchParams.set('query', query);
    try {
      const res = await fetch(url.toString(), {
        headers: { Authorization: `KakaoAK ${key}` },
      });
      if (!res.ok) {
        return { lat: 37.5665, lng: 126.978, region: null, ok: false };
      }
      const json = (await res.json()) as {
        documents?: Array<{ x: string; y: string; address?: { region_1depth_name?: string } }>;
      };
      const doc = json.documents?.[0];
      if (!doc) {
        return { lat: 37.5665, lng: 126.978, region: null, ok: false };
      }
      return {
        lat: Number(doc.y),
        lng: Number(doc.x),
        region: doc.address?.region_1depth_name ?? null,
        ok: Number.isFinite(Number(doc.y)) && Number.isFinite(Number(doc.x)),
      };
    } catch {
      return { lat: 37.5665, lng: 126.978, region: null, ok: false };
    }
  }

  private async favoriteVenueIdSet(userId: string, venueIds: string[]) {
    if (!venueIds.length) return new Set<string>();
    const rows = await this.prisma.userVenueFavorite.findMany({
      where: { userId, venueId: { in: venueIds } },
      select: { venueId: true },
    });
    return new Set(rows.map((r) => r.venueId));
  }

  private toPickerItem(
    venue: {
      id: string;
      name: string;
      address: string | null;
      roadAddress: string | null;
      phone: string | null;
      latitude: { toString(): string };
      longitude: { toString(): string };
      golfFacilityId: string | null;
      golfFacility?: { facilityType: string } | null;
    },
    isFavorite: boolean,
  ): UserVenuePickerItemDto {
    return {
      venueId: venue.id,
      name: venue.name,
      address: venue.address,
      roadAddress: venue.roadAddress,
      phone: venue.phone,
      latitude: Number(venue.latitude),
      longitude: Number(venue.longitude),
      golfFacilityId: venue.golfFacilityId,
      facilityType: venue.golfFacility?.facilityType ?? null,
      isFavorite,
    };
  }
}
