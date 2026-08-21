import type { ExploreVenueSource } from '@jjoin/types';

/** Normalized venue hit from any VenueSearchProvider — never Kakao raw. */
export type VenueSearchHit = {
  source: ExploreVenueSource;
  providerPlaceId: string;
  name: string;
  categoryName: string | null;
  phone: string | null;
  address: string | null;
  roadAddress: string | null;
  longitude: number;
  latitude: number;
  placeUrl: string | null;
  distanceMeters: number | null;
};

export type VenueSearchBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type VenueSearchInput = {
  sportCode: string;
  /** Explicit user query; empty → sport default keyword. */
  query?: string;
  centerLat: number;
  centerLng: number;
  /** Prefer rect when available (map viewport). */
  bounds?: VenueSearchBounds;
  /** Fallback radius meters when bounds missing (capped by config). */
  radiusMeters?: number;
};

export interface VenueSearchProvider {
  readonly name: string;
  search(input: VenueSearchInput): Promise<VenueSearchHit[]>;
}

export const VENUE_SEARCH_PROVIDER = Symbol('VENUE_SEARCH_PROVIDER');
