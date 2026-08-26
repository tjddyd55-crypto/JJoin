import type {
  DiscoverJoinsResponse,
  DiscoverWeeklyCountsResponse,
  AdminDistrictCatalogResponse,
  UserJoinRegionPreferenceListResponse,
  UpsertUserJoinRegionPreferenceRequest,
  JoinDiscoveryRegionMode,
  JoinDiscoverySort,
  JoinDiscoveryJoinability,
} from '@jjoin/types';
import type { ApiClient } from '@jjoin/api-client';

export type DiscoverQuery = {
  date: string;
  regionMode: JoinDiscoveryRegionMode;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  sido?: string;
  sigungu?: string;
  sort?: JoinDiscoverySort;
  joinability?: JoinDiscoveryJoinability;
};

export type WeeklyQuery = {
  weekStart: string;
  regionMode: JoinDiscoveryRegionMode;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  sido?: string;
  sigungu?: string;
};

export function fetchDiscoverJoins(
  api: ApiClient,
  query: DiscoverQuery,
  signal?: AbortSignal,
): Promise<DiscoverJoinsResponse> {
  return api.getDiscoverJoins(query, signal);
}

export function fetchDiscoverWeeklyCounts(
  api: ApiClient,
  query: WeeklyQuery,
  signal?: AbortSignal,
): Promise<DiscoverWeeklyCountsResponse> {
  return api.getDiscoverWeeklyCounts(query, signal);
}

export function fetchDistrictCatalog(
  api: ApiClient,
): Promise<AdminDistrictCatalogResponse> {
  return api.getRegionDistricts();
}

export function fetchJoinRegionPreferences(
  api: ApiClient,
): Promise<UserJoinRegionPreferenceListResponse> {
  return api.getMyJoinRegions();
}

export function saveJoinRegionPreference(
  api: ApiClient,
  body: UpsertUserJoinRegionPreferenceRequest,
) {
  return api.addMyJoinRegion(body);
}

export function removeJoinRegionPreference(
  api: ApiClient,
  id: string,
): Promise<{ ok: true }> {
  return api.removeMyJoinRegion(id);
}
