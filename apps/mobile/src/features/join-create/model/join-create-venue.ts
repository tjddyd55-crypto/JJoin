/** Join Create — single venue selection SSOT. */
export type JoinCreateVenueSource = 'VENUE' | 'GOLF_FACILITY' | 'CUSTOM';

export type JoinCreateVenueSelection = {
  /** Activated JJOIN Venue id — used in createJoin payload when present. */
  venueId?: string;
  golfFacilityId?: string;
  name: string;
  address: string;
  phone?: string | null;
  latitude?: number;
  longitude?: number;
  facilityType?: string | null;
  source: JoinCreateVenueSource;
  isFavorite?: boolean;
};

export function venueSelectionFromVenueDto(input: {
  venueId: string;
  name: string;
  address?: string | null;
  roadAddress?: string | null;
  phone?: string | null;
  latitude?: number;
  longitude?: number;
  golfFacilityId?: string | null;
  facilityType?: string | null;
  isFavorite?: boolean;
}): JoinCreateVenueSelection {
  return {
    venueId: input.venueId,
    golfFacilityId: input.golfFacilityId ?? undefined,
    name: input.name,
    address: input.roadAddress ?? input.address ?? '',
    phone: input.phone,
    latitude: input.latitude,
    longitude: input.longitude,
    facilityType: input.facilityType,
    source: 'VENUE',
    isFavorite: input.isFavorite,
  };
}

export function venueSelectionLabel(v: JoinCreateVenueSelection): string {
  return v.name;
}

export function venueSelectionHasPlace(v: JoinCreateVenueSelection | null): v is JoinCreateVenueSelection {
  return (
    v != null &&
    v.name.trim().length > 0 &&
    (Boolean(v.venueId) || v.source === 'CUSTOM')
  );
}
