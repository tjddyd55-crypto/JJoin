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
  /**
   * When true, search by query accuracy only (no rect / radius).
   * Used for explicit keywords like "서울 스크린골프" so current map region cannot trap results.
   */
  unscoped?: boolean;
};

export type VenueResolveInput = {
  providerPlaceId: string;
  sportCode: string;
  centerLat: number;
  centerLng: number;
  query?: string;
};

export interface VenueSearchProvider {
  readonly name: string;
  search(input: VenueSearchInput): Promise<VenueSearchHit[]>;
  /** Server-side place verify for activation (anti-spoof). */
  resolveByPlaceId?(input: VenueResolveInput): Promise<VenueSearchHit | null>;
}

export const VENUE_SEARCH_PROVIDER = Symbol('VENUE_SEARCH_PROVIDER');
