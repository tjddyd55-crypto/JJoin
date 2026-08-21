import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  ExploreFilter,
  type ExploreMapResponse,
  type ExploreVenueDto,
} from '@jjoin/types';
import { defaultVenueSearchQuery } from '@jjoin/domain';
import { exploreConfig } from '../presence/presence.config';
import { haversineMeters } from '../presence/privacy-location';
import { PresenceService } from '../presence/presence.service';
import { JoinsService } from '../joins/joins.service';
import {
  VENUE_SEARCH_PROVIDER,
  type VenueSearchHit,
  type VenueSearchProvider,
} from '../../providers/venue-search.types';
import { venueSearchConfig } from '../../providers/venue-search.config';

export type ExploreMapQuery = {
  sportCode?: string;
  filter?: ExploreFilter;
  query?: string;
  centerLat?: number;
  centerLng?: number;
  southWestLat?: number;
  southWestLng?: number;
  northEastLat?: number;
  northEastLng?: number;
  viewerUserId?: string;
};

@Injectable()
export class ExploreService {
  constructor(
    private readonly joins: JoinsService,
    private readonly presence: PresenceService,
    @Inject(VENUE_SEARCH_PROVIDER) private readonly venues: VenueSearchProvider,
  ) {}

  async getMap(query: ExploreMapQuery): Promise<ExploreMapResponse> {
    const sportCode = query.sportCode ?? exploreConfig.defaultSportCode;
    const filter = query.filter ?? 'ALL';
    const centerLat = query.centerLat ?? exploreConfig.demoCenter.latitude;
    const centerLng = query.centerLng ?? exploreConfig.demoCenter.longitude;
    this.assertCenter(centerLat, centerLng);

    const searchQuery = this.normalizeQuery(query.query, sportCode);
    const bounds = this.parseBounds(query);

    let venueDtos: ExploreVenueDto[] = [];

    if (filter === 'TODAY_JOIN') {
      // Phase F regression path: JJOIN-owned open joins only (no Kakao name merge).
      venueDtos = await this.joins.listOpenJoinVenuesNear({
        centerLat,
        centerLng,
      });
    } else if (filter !== 'USER') {
      const hits = await this.venues.search({
        sportCode,
        query: searchQuery,
        centerLat,
        centerLng,
        bounds: bounds ?? undefined,
      });
      if (this.venues.name === 'MOCK') {
        const dbJoins = await this.joins.openJoinsByProviderPlaceIds(
          hits.map((h) => h.providerPlaceId),
        );
        venueDtos = hits.map((h) => {
          const base = this.toVenueDto(h, centerLat, centerLng);
          const previews = dbJoins.get(h.providerPlaceId) ?? [];
          return {
            ...base,
            joinPreviews: previews,
            openJoinCount: previews.length,
            canCreateJoin: true,
          };
        });
      } else {
        venueDtos = hits.map((h) => this.toVenueDto(h, centerLat, centerLng));
      }
    }

    const users =
      filter === 'VENUE' || filter === 'TODAY_JOIN'
        ? []
        : await this.presence.listNearbyPublic({
            centerLat,
            centerLng,
            viewerUserId: query.viewerUserId,
          });

    return {
      venues: venueDtos,
      users,
      metadata: {
        sportCode,
        filter,
        source: this.venues.name === 'MOCK' ? 'mock' : 'live',
        venueCount: venueDtos.length,
        userCount: users.length,
      },
    };
  }

  private toVenueDto(
    hit: VenueSearchHit,
    centerLat: number,
    centerLng: number,
  ): ExploreVenueDto {
    const distance =
      hit.distanceMeters ??
      Math.round(
        haversineMeters(centerLat, centerLng, hit.latitude, hit.longitude),
      );
    return {
      venueId: hit.providerPlaceId,
      name: hit.name,
      address: hit.address,
      roadAddress: hit.roadAddress,
      regionLabel: hit.roadAddress ?? hit.address,
      categoryName: hit.categoryName,
      phone: hit.phone,
      placeUrl: hit.placeUrl,
      latitude: hit.latitude,
      longitude: hit.longitude,
      distanceMeters: distance,
      // Kakao live hits are not auto-linked to JJOIN Venue rows in Phase H.
      openJoinCount: hit.source === 'MOCK' ? 0 : 0,
      joinPreviews: [],
      source: hit.source,
      canCreateJoin: hit.source === 'MOCK' || hit.source === 'JJOIN',
    };
  }

  private normalizeQuery(raw: string | undefined, sportCode: string): string {
    const trimmed = (raw ?? '').trim();
    if (!trimmed) return defaultVenueSearchQuery(sportCode);
    if (trimmed.length > venueSearchConfig.queryMaxLength) {
      throw new BadRequestException('INVALID_QUERY');
    }
    return trimmed;
  }

  private parseBounds(query: ExploreMapQuery) {
    const {
      southWestLat,
      southWestLng,
      northEastLat,
      northEastLng,
    } = query;
    if (
      southWestLat == null ||
      southWestLng == null ||
      northEastLat == null ||
      northEastLng == null
    ) {
      return null;
    }
    this.assertCenter(southWestLat, southWestLng);
    this.assertCenter(northEastLat, northEastLng);
    if (!(southWestLng < northEastLng) || !(southWestLat < northEastLat)) {
      throw new BadRequestException('invalid_bounds');
    }
    return {
      west: southWestLng,
      south: southWestLat,
      east: northEastLng,
      north: northEastLat,
    };
  }

  private assertCenter(lat: number, lng: number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('invalid_coordinate');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestException('invalid_coordinate');
    }
  }
}
