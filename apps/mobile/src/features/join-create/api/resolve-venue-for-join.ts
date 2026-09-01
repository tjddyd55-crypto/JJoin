import type { ExploreVenueDto } from '@jjoin/types';
import type { ApiClient } from '@jjoin/api-client';
import { isRawVenueIdLabel, resolveVenueDisplayName } from '@jjoin/domain';

export type ResolvedJoinVenue = {
  venueId: string;
  name: string;
  address: string;
  phone?: string | null;
  latitude?: number;
  longitude?: number;
};

/** Activate/resolve Explore venue → JJOIN venueId for Join Create. */
export async function resolveVenueForJoin(
  api: ApiClient,
  selectedVenue: ExploreVenueDto,
): Promise<ResolvedJoinVenue> {
  if (selectedVenue.source === 'GOLF_FACILITY' || selectedVenue.golfFacilityId) {
    const facilityId = selectedVenue.golfFacilityId ?? selectedVenue.venueId;
    const activated = await api.activateGolfFacilityVenue(facilityId);
    const name = resolveVenueDisplayName({
      golfFacilityDisplayName: selectedVenue.name,
      activatedVenueName: activated.name,
    });
    return {
      venueId: activated.venueId,
      name: isRawVenueIdLabel(name) ? selectedVenue.name : name,
      address: selectedVenue.roadAddress ?? selectedVenue.address ?? '',
      phone: selectedVenue.phone,
      latitude: selectedVenue.latitude,
      longitude: selectedVenue.longitude,
    };
  }

  if (selectedVenue.jjoinVenueId) {
    const activated = await api.getVenue(selectedVenue.jjoinVenueId);
    return {
      venueId: activated.venueId,
      name: activated.name,
      address: activated.roadAddress ?? activated.address ?? '',
      phone: selectedVenue.phone,
      latitude: activated.latitude,
      longitude: activated.longitude,
    };
  }

  const provider =
    selectedVenue.source === 'MOCK' || selectedVenue.provider === 'MOCK' ? 'MOCK' : 'KAKAO';
  const providerPlaceId = selectedVenue.providerPlaceId ?? selectedVenue.venueId;
  const activated = await api.activateVenue({
    provider,
    providerPlaceId,
    resolveHint: {
      latitude: selectedVenue.latitude,
      longitude: selectedVenue.longitude,
      query: selectedVenue.name,
    },
  });
  return {
    venueId: activated.venueId,
    name: activated.name,
    address: activated.roadAddress ?? activated.address ?? '',
    phone: selectedVenue.phone,
    latitude: activated.latitude,
    longitude: activated.longitude,
  };
}
