/**
 * Join venue track — one Join engine, two user-facing tracks.
 * SSOT: Venue.venueType. Existing rows are SCREEN.
 */

export const JOIN_VENUE_TYPES = ['SCREEN', 'FIELD'] as const;
export type JoinVenueType = (typeof JOIN_VENUE_TYPES)[number];

export const DEFAULT_JOIN_VENUE_TYPE: JoinVenueType = 'SCREEN';

export function isJoinVenueType(value: unknown): value is JoinVenueType {
  return value === 'SCREEN' || value === 'FIELD';
}

export function parseJoinVenueType(
  value: unknown,
  fallback: JoinVenueType = DEFAULT_JOIN_VENUE_TYPE,
): JoinVenueType {
  return isJoinVenueType(value) ? value : fallback;
}

export function formatJoinVenueTypeLabel(venueType: JoinVenueType): string {
  return venueType === 'FIELD' ? '필드 조인' : '스크린 조인';
}

export function formatJoinVenueTypeShortLabel(venueType: JoinVenueType): string {
  return venueType === 'FIELD' ? '필드' : '스크린';
}

/** Korea WGS84 bounds used by SCREEN public-data geocode. */
const KR_LAT = [33, 39] as const;
const KR_LNG = [124, 132] as const;

export function hasValidKoreaMapCoords(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  if (latitude == null || longitude == null) return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude === 0 && longitude === 0) return false;
  return (
    latitude >= KR_LAT[0] &&
    latitude <= KR_LAT[1] &&
    longitude >= KR_LNG[0] &&
    longitude <= KR_LNG[1]
  );
}

export function assertVenueTypeMatch(input: {
  requested: JoinVenueType;
  venueType: JoinVenueType;
}): { ok: true } | { ok: false; code: 'venue_type_mismatch' } {
  if (input.requested !== input.venueType) {
    return { ok: false, code: 'venue_type_mismatch' };
  }
  return { ok: true };
}
