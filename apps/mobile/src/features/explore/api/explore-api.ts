import type { ExploreFilter, ExploreMapResponse } from '@jjoin/types';
import { getMockExploreMap } from '../model/mock-explore-data';
import { getApiClient } from '../../../lib/api';
import { isInternalToolsEnabled } from '../../../lib/internal-tools';
import type { SecureSessionStore } from '../../../session/secure-session-store';
import type { MapCoordinate, MapRegion } from '../model/map-types';

export async function fetchExploreMap(input: {
  store: SecureSessionStore;
  filter: ExploreFilter;
  center: MapCoordinate;
  region: MapRegion;
  query?: string;
}): Promise<ExploreMapResponse> {
  const halfLat = input.region.latitudeDelta / 2;
  const halfLng = input.region.longitudeDelta / 2;
  try {
    const client = getApiClient(input.store);
    return await client.getExploreMap({
      filter: input.filter,
      query: input.query,
      centerLat: input.center.latitude,
      centerLng: input.center.longitude,
      southWestLat: input.center.latitude - halfLat,
      southWestLng: input.center.longitude - halfLng,
      northEastLat: input.center.latitude + halfLat,
      northEastLng: input.center.longitude + halfLng,
      sportCode: 'SCREEN_GOLF',
    });
  } catch (error) {
    if (isInternalToolsEnabled()) {
      return getMockExploreMap();
    }
    throw error;
  }
}

export const REGION_SEARCH_FIXTURES: Record<string, MapRegion> = {
  거제: {
    latitude: 34.8806,
    longitude: 128.6211,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  },
  부산: {
    latitude: 35.1796,
    longitude: 129.0756,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  },
  서울: {
    latitude: 37.5665,
    longitude: 126.978,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  },
};
