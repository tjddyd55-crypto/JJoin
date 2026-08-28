import type {
  DiscoverRegionSummaryResponse,
  DiscoverFacilityJoinsResponse,
  DiscoverJoinsResponse,
  JoinDiscoverySort,
} from '@jjoin/types';
import type { ApiClient } from '@jjoin/api-client';

export function fetchRegionSummary(
  api: ApiClient,
  query: {
    date: string;
    joinability?: 'JOINABLE' | 'ALL';
    sido?: string;
    sigungu?: string;
  },
  signal?: AbortSignal,
): Promise<DiscoverRegionSummaryResponse> {
  return api.getDiscoverRegionSummary(query, signal);
}

export function fetchFacilityJoins(
  api: ApiClient,
  query: {
    date: string;
    joinability?: 'JOINABLE' | 'ALL';
    regionMode: 'NEARBY' | 'DISTRICT';
    lat?: number;
    lng?: number;
    radiusMeters?: number;
    sido?: string;
    sigungu?: string;
    sort?: JoinDiscoverySort;
  },
  signal?: AbortSignal,
): Promise<DiscoverFacilityJoinsResponse> {
  return api.getDiscoverFacilityJoins(query, signal);
}

export function fetchVenueJoins(
  api: ApiClient,
  query: {
    date: string;
    regionMode: 'DISTRICT';
    sido: string;
    sigungu: string;
    joinability?: 'JOINABLE' | 'ALL';
    sort?: JoinDiscoverySort;
  },
  signal?: AbortSignal,
): Promise<DiscoverJoinsResponse> {
  return api.getDiscoverJoins({ ...query, joinability: query.joinability ?? 'JOINABLE' }, signal);
}
