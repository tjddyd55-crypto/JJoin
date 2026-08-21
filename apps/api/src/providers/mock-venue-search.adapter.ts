import { Injectable } from '@nestjs/common';
import { defaultVenueSearchQuery } from '@jjoin/domain';
import { MOCK_EXPLORE_VENUES } from '../modules/explore/explore.mock-venues';
import { haversineMeters } from '../modules/presence/privacy-location';
import type {
  VenueSearchHit,
  VenueSearchInput,
  VenueSearchProvider,
} from './venue-search.types';

/** Local/dev fallback when Kakao credentials are absent. Never silent Production fallback. */
@Injectable()
export class MockVenueSearchAdapter implements VenueSearchProvider {
  readonly name = 'MOCK';

  async search(input: VenueSearchInput): Promise<VenueSearchHit[]> {
    const q = (
      input.query?.trim() ||
      defaultVenueSearchQuery(input.sportCode)
    ).toLowerCase();

    return MOCK_EXPLORE_VENUES.filter((v) => {
      if (input.bounds) {
        const { west, south, east, north } = input.bounds;
        if (
          v.longitude < west ||
          v.longitude > east ||
          v.latitude < south ||
          v.latitude > north
        ) {
          return false;
        }
      }
      if (!q || q === '스크린골프') return true;
      return (
        v.name.toLowerCase().includes(q) ||
        (v.address ?? '').toLowerCase().includes(q) ||
        (v.regionLabel ?? '').toLowerCase().includes(q)
      );
    }).map((v) => ({
      source: 'MOCK' as const,
      providerPlaceId: v.venueId,
      name: v.name,
      categoryName: '스크린골프',
      phone: null,
      address: v.address,
      roadAddress: null,
      longitude: v.longitude,
      latitude: v.latitude,
      placeUrl: null,
      distanceMeters: Math.round(
        haversineMeters(input.centerLat, input.centerLng, v.latitude, v.longitude),
      ),
    }));
  }
}
