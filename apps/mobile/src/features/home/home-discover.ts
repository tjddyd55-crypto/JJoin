import type { ApiClient } from '@jjoin/api-client';
import {
  buildDiscoverRegionApiQuery,
  createDefaultDiscoveryFilter,
} from '@jjoin/domain';
import type { DiscoverJoinCardDto } from '@jjoin/types';
import { identityFor } from '../../../app-variant-identity.cjs';
import { fetchDiscoverJoins, type DiscoverQuery } from '../explore/discovery/api/join-discover-api';

function applicationIds(variant: 'development' | 'production'): Set<string> {
  const identity = identityFor(variant);
  return new Set([identity.androidPackage, identity.iosBundleIdentifier]);
}

/** Installed binary identity. Metro `APP_VARIANT` does not change these. */
const DEVELOPMENT_APPLICATION_IDS = applicationIds('development');
const PRODUCTION_APPLICATION_IDS = applicationIds('production');

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

/**
 * Same day / region / sort / joinability as 전체보기
 * (`createDefaultDiscoveryFilter`: KST date, region ALL, sort TIME, joinability ALL).
 * `venueType` is always sent. ALL does not send `radiusMeters` (NEARBY does).
 */
export function buildHomeNationwideDiscoverQuery(
  venueType: 'SCREEN' | 'FIELD',
  date: string,
): DiscoverQuery {
  const defaults = createDefaultDiscoveryFilter();
  const region = buildDiscoverRegionApiQuery({ region: defaults.region });
  const regionFields = 'error' in region ? { regionMode: 'ALL' as const } : region;
  return {
    date,
    sort: defaults.sort,
    joinability: defaults.joinability,
    venueType,
    ...regionFields,
  };
}

/** Nationwide FIELD query — same list defaults as SCREEN, venueType FIELD. */
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
 * Development when the installed package is the DEV binary, even if Metro
 * started without `APP_VARIANT` and rewrote `extra.appVariant` to production.
 * The production package stays production even if Metro sets development.
 * Unknown package (tests, web) follows `resolveAppVariant`, not the Metro dev flag.
 */
export function resolveHomeDiscoverDevelopmentVariant(input: {
  appVariant: 'development' | 'production';
  applicationId?: string | null;
}): boolean {
  const applicationId = input.applicationId ?? '';
  if (PRODUCTION_APPLICATION_IDS.has(applicationId)) return false;
  if (DEVELOPMENT_APPLICATION_IDS.has(applicationId)) return true;
  return input.appVariant === 'development';
}

/**
 * FIELD nationwide fallback matches the join list for every build.
 * SCREEN nationwide fallback runs on the development binary so a login far
 * from seed venues still sees today's joins. Production package stays nearby-only.
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
