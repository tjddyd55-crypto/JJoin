import {
  LOCALDATA_GOLF_VENUE_PROVIDER,
  type ExploreMapResponse,
  type ExploreVenueDto,
  type GolfFacilityMapDto,
} from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import type { SecureSessionStore } from '../../../session/secure-session-store';
import type { MapCoordinate, MapRegion } from '../model/map-types';

export function facilityTypeLabel(facilityType: string): string {
  switch (facilityType) {
    case 'SCREEN_GOLF':
      return '스크린골프';
    case 'MIXED_GOLF_FACILITY':
      return '복합 골프시설';
    case 'PRACTICE_RANGE':
    case 'INDOOR_PRACTICE':
    case 'OUTDOOR_PRACTICE':
      return '골프연습장';
    case 'GOLF_ACADEMY':
      return '골프 아카데미';
    case 'OTHER_GOLF_FACILITY':
      return '기타 골프시설';
    case 'UNKNOWN':
    default:
      return '골프시설';
  }
}

export function brandLabel(primaryBrand: string): string | null {
  if (!primaryBrand || primaryBrand === 'UNKNOWN') return null;
  const map: Record<string, string> = {
    GOLFZON: '골프존',
    SG_GOLF: 'SG골프',
    FRIENDS_SCREEN: '프렌즈',
    OTHER: '기타',
  };
  return map[primaryBrand] ?? primaryBrand;
}

/** Map GolfFacility → Explore venue card shape (venueId = facility id until activation). */
export function golfFacilityToExploreVenue(
  f: GolfFacilityMapDto,
  center?: MapCoordinate,
): ExploreVenueDto | null {
  if (f.latitude == null || f.longitude == null) return null;
  const selectable = f.selectable !== false && f.coordinateStatus !== 'MISSING';
  const brand = brandLabel(f.primaryBrand);
  const typeLabel = facilityTypeLabel(f.facilityType);
  const regionParts = [f.sido, f.sigungu].filter(Boolean);
  let distanceMeters: number | null = null;
  if (center) {
    distanceMeters = haversineMeters(
      center.latitude,
      center.longitude,
      f.latitude,
      f.longitude,
    );
  }
  return {
    venueId: f.id,
    name: f.displayName,
    address: f.roadAddress,
    roadAddress: f.roadAddress,
    regionLabel: regionParts.length ? regionParts.join(' ') : null,
    categoryName: brand ? `${typeLabel} · ${brand}` : typeLabel,
    phone: f.phone ?? null,
    placeUrl: null,
    latitude: f.latitude,
    longitude: f.longitude,
    distanceMeters,
    openJoinCount: f.openJoinCount ?? 0,
    todayJoinCount: f.todayJoinCount ?? f.selectedDateJoinCount ?? 0,
    ongoingJoinCount: f.ongoingJoinCount ?? 0,
    hasTodayJoin: f.hasTodayJoin ?? f.hasSelectedDateJoin ?? false,
    hasOngoingJoin: f.hasOngoingJoin ?? false,
    joinPreviews: f.joinPreviews ?? [],
    source: 'GOLF_FACILITY',
    canCreateJoin: selectable,
    jjoinVenueId: null,
    isActivated: false,
    activationRequired: selectable,
    provider: LOCALDATA_GOLF_VENUE_PROVIDER,
    providerPlaceId: undefined,
    golfFacilityId: f.id,
  };
}

export async function fetchGolfFacilitiesInRegion(input: {
  store: SecureSessionStore;
  center: MapCoordinate;
  region: MapRegion;
  signal?: AbortSignal;
  /** When true, keep only facilities with selected-date/ongoing joins. */
  todayJoinOnly?: boolean;
  date?: string;
  regionMode?: 'NEARBY' | 'DISTRICT';
  sido?: string;
  sigungu?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
}): Promise<ExploreMapResponse> {
  const halfLat = input.region.latitudeDelta / 2;
  const halfLng = input.region.longitudeDelta / 2;
  const client = getApiClient(input.store);
  const result = await client.getGolfFacilitiesInBounds({
    north: input.center.latitude + halfLat,
    south: input.center.latitude - halfLat,
    east: input.center.longitude + halfLng,
    west: input.center.longitude - halfLng,
    date: input.date,
    regionMode: input.regionMode,
    sido: input.sido,
    sigungu: input.sigungu,
    lat: input.lat,
    lng: input.lng,
    radiusMeters: input.radiusMeters,
  });
  if (input.signal?.aborted) {
    throw new Error('Aborted');
  }
  let venues = result.items
    .map((f) => golfFacilityToExploreVenue(f, input.center))
    .filter((v): v is ExploreVenueDto => v != null);
  if (__DEV__) {
    console.log('[ExploreMap:api]', {
      rawCount: result.items.length,
      mappedCount: venues.length,
      invalidCoordinateCount: result.items.length - venues.length,
      truncated: result.truncated,
    });
  }
  if (input.todayJoinOnly) {
    venues = venues.filter(
      (v) => v.hasTodayJoin || v.hasOngoingJoin || v.openJoinCount > 0,
    );
  }
  return {
    venues,
    users: [],
    metadata: {
      sportCode: 'SCREEN_GOLF',
      filter: input.todayJoinOnly ? 'TODAY_JOIN' : 'VENUE',
      source: 'live',
      venueCount: venues.length,
      userCount: 0,
    },
  };
}

export async function searchGolfFacilitiesForExplore(input: {
  store: SecureSessionStore;
  q: string;
  center?: MapCoordinate;
}): Promise<{
  venues: ExploreVenueDto[];
  unavailable: GolfFacilityMapDto[];
}> {
  const client = getApiClient(input.store);
  const result = await client.searchGolfFacilities({ q: input.q, limit: 30 });
  const venues: ExploreVenueDto[] = [];
  const unavailable: GolfFacilityMapDto[] = [];
  for (const f of result.items) {
    if (f.selectable === false || f.coordinateStatus === 'MISSING' || f.latitude == null) {
      unavailable.push(f);
      continue;
    }
    const v = golfFacilityToExploreVenue(f, input.center);
    if (v) venues.push(v);
  }
  return { venues, unavailable };
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
