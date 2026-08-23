import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ActivateVenueRequest, ActivateVenueResponse } from '@jjoin/types';
import { activateVenueSchema } from '@jjoin/validation';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureFoundation } from '../../foundation/ensure-foundation';
import {
  VENUE_SEARCH_PROVIDER,
  type VenueSearchHit,
  type VenueSearchProvider,
} from '../../providers/venue-search.types';

type VenueMeta = {
  placeUrl?: string | null;
  status?: 'ACTIVE' | 'UNAVAILABLE';
  activatedAt?: string;
  activatedByUserId?: string;
};

/**
 * Kakao Live place → JJOIN Venue activation (user-selected only).
 * Dedupes on (provider, providerPlaceId). Never dumps raw Kakao payloads.
 */
@Injectable()
export class VenuesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(VENUE_SEARCH_PROVIDER) private readonly venueSearch: VenueSearchProvider,
  ) {}

  ping() {
    return { module: 'venues', status: 'ready', activation: true };
  }

  async activate(
    userId: string,
    raw: ActivateVenueRequest,
  ): Promise<ActivateVenueResponse> {
    const parsed = activateVenueSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_ACTIVATE_VENUE',
        message: '장소 활성화 요청이 올바르지 않습니다.',
      });
    }
    const input = parsed.data;
    const dbProvider = input.provider; // KAKAO | MOCK

    const existing = await this.prisma.venue.findUnique({
      where: {
        provider_providerPlaceId: {
          provider: dbProvider,
          providerPlaceId: input.providerPlaceId,
        },
      },
    });
    if (existing) {
      return this.toActivateResponse(existing, false);
    }

    const hit = await this.resolveHit(input);
    if (!hit) {
      throw new NotFoundException({
        code: 'VENUE_NOT_FOUND',
        message: '장소 정보를 확인할 수 없습니다. 다시 시도해 주세요.',
      });
    }
    if (hit.providerPlaceId !== input.providerPlaceId) {
      throw new BadRequestException({
        code: 'VENUE_PROVIDER_MISMATCH',
        message: '장소 정보를 확인할 수 없습니다. 다시 시도해 주세요.',
      });
    }

    const { sport } = await ensureFoundation(this.prisma);
    const metadata: VenueMeta = {
      placeUrl: hit.placeUrl,
      status: 'ACTIVE',
      activatedAt: new Date().toISOString(),
      activatedByUserId: userId,
    };

    try {
      const created = await this.prisma.venue.create({
        data: {
          sportId: sport.id,
          provider: dbProvider,
          providerPlaceId: hit.providerPlaceId,
          name: hit.name,
          address: hit.address,
          roadAddress: hit.roadAddress,
          latitude: hit.latitude,
          longitude: hit.longitude,
          phone: null,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
      return this.toActivateResponse(created, true);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const raced = await this.prisma.venue.findUnique({
          where: {
            provider_providerPlaceId: {
              provider: dbProvider,
              providerPlaceId: input.providerPlaceId,
            },
          },
        });
        if (raced) return this.toActivateResponse(raced, false);
        throw new ConflictException({
          code: 'VENUE_CONFLICT',
          message: '장소 정보를 확인할 수 없습니다. 다시 시도해 주세요.',
        });
      }
      throw e;
    }
  }

  async getById(venueId: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      throw new NotFoundException({
        code: 'VENUE_NOT_FOUND',
        message: '장소를 찾을 수 없습니다.',
      });
    }
    return this.toActivateResponse(venue, false);
  }

  /**
   * Batch lookup for Explore merge — one query, no N+1.
   */
  async findByProviderPlaceIds(
    provider: string,
    providerPlaceIds: string[],
  ): Promise<Map<string, { id: string; name: string }>> {
    const map = new Map<string, { id: string; name: string }>();
    if (providerPlaceIds.length === 0) return map;
    const rows = await this.prisma.venue.findMany({
      where: {
        provider,
        providerPlaceId: { in: providerPlaceIds },
      },
      select: { id: true, providerPlaceId: true, name: true },
    });
    for (const row of rows) {
      map.set(row.providerPlaceId, { id: row.id, name: row.name });
    }
    return map;
  }

  private async resolveHit(
    input: ActivateVenueRequest,
  ): Promise<VenueSearchHit | null> {
    if (!this.venueSearch.resolveByPlaceId) {
      throw new ServiceUnavailableException({
        code: 'VENUE_PROVIDER_UNAVAILABLE',
        message: '장소 정보를 확인할 수 없습니다. 다시 시도해 주세요.',
      });
    }
    const hint = input.resolveHint;
    const centerLat = hint?.latitude ?? 37.5665;
    const centerLng = hint?.longitude ?? 126.978;
    const sportCode = hint?.sportCode ?? 'SCREEN_GOLF';
    try {
      return await this.venueSearch.resolveByPlaceId({
        providerPlaceId: input.providerPlaceId,
        sportCode,
        centerLat,
        centerLng,
        query: hint?.query,
      });
    } catch {
      throw new ServiceUnavailableException({
        code: 'VENUE_PROVIDER_UNAVAILABLE',
        message: '장소 정보를 확인할 수 없습니다. 다시 시도해 주세요.',
      });
    }
  }

  private toActivateResponse(
    venue: {
      id: string;
      provider: string;
      providerPlaceId: string;
      name: string;
      address: string | null;
      roadAddress: string | null;
      latitude: Prisma.Decimal | number;
      longitude: Prisma.Decimal | number;
      metadata: Prisma.JsonValue | null;
    },
    created: boolean,
  ): ActivateVenueResponse {
    const meta =
      venue.metadata && typeof venue.metadata === 'object' && !Array.isArray(venue.metadata)
        ? (venue.metadata as VenueMeta)
        : {};
    return {
      venueId: venue.id,
      provider: venue.provider,
      providerPlaceId: venue.providerPlaceId,
      name: venue.name,
      address: venue.address,
      roadAddress: venue.roadAddress,
      latitude: Number(venue.latitude),
      longitude: Number(venue.longitude),
      placeUrl: meta.placeUrl ?? null,
      status: meta.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'ACTIVE',
      created,
    };
  }
}
