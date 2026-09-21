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

/** Same day/joinable scope as the join-list default (nationwide). */
export function buildHomeNationwideDiscoverQuery(
  venueType: 'SCREEN' | 'FIELD',
  date: string,
): DiscoverQuery {
  return {
    date,
    regionMode: 'ALL',
    sort: 'TIME',
    joinability: 'JOINABLE',
    venueType,
  };
}

/** Same day/joinable scope as the join-list default (nationwide), FIELD only. */
export function buildHomeFieldNationwideQuery(date: string): DiscoverQuery {
  return buildHomeNationwideDiscoverQuery('FIELD', date);
}

/**
 * Prefer joins inside the home radius. When that set is empty, use the
 * nationwide today list so 전체보기 and the home section agree.
 */
export function selectHomeDiscoverRowsWithFallback(
  nearby: DiscoverJoinCardDto[],
  nationwide: DiscoverJoinCardDto[],
): DiscoverJoinCardDto[] {
  return nearby.length > 0 ? nearby : nationwide;
}

export function selectHomeFieldDiscoverRows(
  nearby: DiscoverJoinCardDto[],
  nationwide: DiscoverJoinCardDto[],
): DiscoverJoinCardDto[] {
  return selectHomeDiscoverRowsWithFallback(nearby, nationwide);
}

/**
 * FIELD nationwide fallback matches the join list for every build.
 * SCREEN nationwide fallback is Development only, so a Kakao login far from
 * seed venues still sees today's demo joins. Production SCREEN stays nearby-only.
 */
export function shouldFallbackHomeDiscoverNationwide(input: {
  venueType: 'SCREEN' | 'FIELD';
  nearbyCount: number;
  developmentVariant: boolean;
}): boolean {
  if (input.nearbyCount > 0) return false;
  if (input.venueType === 'FIELD') return true;
  return input.developmentVariant;
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

async function loadNationwideIfNeeded(
  api: ApiClient,
  input: {
    date: string;
    venueType: 'SCREEN' | 'FIELD';
    nearbyCount: number;
    developmentVariant: boolean;
  },
): Promise<DiscoverJoinCardDto[]> {
  if (
    !shouldFallbackHomeDiscoverNationwide({
      venueType: input.venueType,
      nearbyCount: input.nearbyCount,
      developmentVariant: input.developmentVariant,
    })
  ) {
    return [];
  }
  return fetchHomeDiscoverRows(
    api,
    buildHomeNationwideDiscoverQuery(input.venueType, input.date),
  );
}

async function loadNearbyHomeRows(
  api: ApiClient,
  input: {
    date: string;
    coords: { lat: number; lng: number } | null;
    radiusMeters: number;
  },
): Promise<[DiscoverJoinCardDto[], DiscoverJoinCardDto[]]> {
  if (!input.coords) return [[], []];
  const nearbyBase = {
    date: input.date,
    lat: input.coords.lat,
    lng: input.coords.lng,
    radiusMeters: input.radiusMeters,
  };
  const screenRows = fetchHomeDiscoverRows(api, buildHomeNearbyDiscoverQuery('SCREEN', nearbyBase));
  const fieldRows = fetchHomeDiscoverRows(api, buildHomeNearbyDiscoverQuery('FIELD', nearbyBase));
  return Promise.all([screenRows, fieldRows]);
}

export async function loadHomeDiscoverRows(
  api: ApiClient,
  input: {
    date: string;
    coords: { lat: number; lng: number } | null;
    radiusMeters: number;
    developmentVariant?: boolean;
  },
): Promise<DiscoverJoinCardDto[]> {
  const developmentVariant = input.developmentVariant === true;
  const [screenRows, fieldNearbyRows] = await loadNearbyHomeRows(api, input);
  const [screenNationwide, fieldNationwide] = await Promise.all([
    loadNationwideIfNeeded(api, {
      date: input.date,
      venueType: 'SCREEN',
      nearbyCount: screenRows.length,
      developmentVariant,
    }),
    loadNationwideIfNeeded(api, {
      date: input.date,
      venueType: 'FIELD',
      nearbyCount: fieldNearbyRows.length,
      developmentVariant,
    }),
  ]);
  return [
    ...selectHomeDiscoverRowsWithFallback(screenRows, screenNationwide),
    ...selectHomeDiscoverRowsWithFallback(fieldNearbyRows, fieldNationwide),
  ];
}
