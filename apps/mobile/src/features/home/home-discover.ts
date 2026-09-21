import type { ApiClient } from '@jjoin/api-client';
import type { DiscoverJoinCardDto } from '@jjoin/types';
import { fetchDiscoverJoins, type DiscoverQuery } from '../explore/discovery/api/join-discover-api';

type HomeNearbyInput = {
  date: string;
  lat: number;
  lng: number;
  radiusMeters: number;
};

/**
 * `/joins/discover` omits venueType as SCREEN-only.
 * Home must ask for each track explicitly.
 */
export function buildHomeNearbyDiscoverQuery(
  venueType: 'SCREEN' | 'FIELD',
  input: HomeNearbyInput,
): DiscoverQuery {
  return {
    date: input.date,
    regionMode: 'NEARBY',
    lat: input.lat,
    lng: input.lng,
    radiusMeters: input.radiusMeters,
    sort: 'TIME',
    joinability: 'JOINABLE',
    venueType,
  };
}

/** Same day/joinable scope as the join-list default (nationwide), FIELD only. */
export function buildHomeFieldNationwideQuery(date: string): DiscoverQuery {
  return {
    date,
    regionMode: 'ALL',
    sort: 'TIME',
    joinability: 'JOINABLE',
    venueType: 'FIELD',
  };
}

/**
 * Prefer joins inside the home radius. When that set is empty, use the
 * nationwide today list so 전체보기 and the home FIELD section agree.
 */
export function selectHomeFieldDiscoverRows(
  nearby: DiscoverJoinCardDto[],
  nationwide: DiscoverJoinCardDto[],
): DiscoverJoinCardDto[] {
  return nearby.length > 0 ? nearby : nationwide;
}

async function fetchHomeDiscoverRows(
  api: ApiClient,
  query: DiscoverQuery,
): Promise<DiscoverJoinCardDto[]> {
  try {
    const res = await fetchDiscoverJoins(api, query);
    return [...res.ongoing, ...res.upcoming];
  } catch {
    return [];
  }
}

export async function loadHomeDiscoverRows(
  api: ApiClient,
  input: {
    date: string;
    coords: { lat: number; lng: number } | null;
    radiusMeters: number;
  },
): Promise<DiscoverJoinCardDto[]> {
  const nearbyBase = input.coords
    ? {
        date: input.date,
        lat: input.coords.lat,
        lng: input.coords.lng,
        radiusMeters: input.radiusMeters,
      }
    : null;
  const [screenRows, fieldNearbyRows] = await Promise.all([
    nearbyBase
      ? fetchHomeDiscoverRows(api, buildHomeNearbyDiscoverQuery('SCREEN', nearbyBase))
      : Promise.resolve([]),
    nearbyBase
      ? fetchHomeDiscoverRows(api, buildHomeNearbyDiscoverQuery('FIELD', nearbyBase))
      : Promise.resolve([]),
  ]);
  const nationwide =
    fieldNearbyRows.length === 0
      ? await fetchHomeDiscoverRows(api, buildHomeFieldNationwideQuery(input.date))
      : [];
  return [...screenRows, ...selectHomeFieldDiscoverRows(fieldNearbyRows, nationwide)];
}
