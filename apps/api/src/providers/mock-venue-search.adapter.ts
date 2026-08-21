import { Injectable } from '@nestjs/common';
import type { VenueSearchProvider } from './ports';
import { MOCK_EXPLORE_VENUES } from '../modules/explore/explore.mock-venues';

@Injectable()
export class MockVenueSearchAdapter implements VenueSearchProvider {
  async searchNearby(input: {
    lat: number;
    lng: number;
    sportCode: string;
    query?: string;
  }) {
    const q = (input.query ?? '').trim().toLowerCase();
    return MOCK_EXPLORE_VENUES.filter((v) =>
      q ? v.name.toLowerCase().includes(q) || (v.address ?? '').includes(q) : true,
    ).map((v) => ({
      providerPlaceId: v.venueId,
      name: v.name,
      lat: v.latitude,
      lng: v.longitude,
    }));
  }
}
