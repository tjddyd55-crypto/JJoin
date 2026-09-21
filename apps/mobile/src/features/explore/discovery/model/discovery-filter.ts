import {
  createDefaultDiscoveryFilter,
  type JoinDiscoveryFilterState,
  type JoinDiscoveryJoinability,
  type JoinDiscoveryRegion,
  type JoinDiscoverySort,
} from '@jjoin/domain';

export type ExploreDiscoveryView = 'LIST' | 'MAP' | 'REGION';

export type JoinDiscoveryUiState = JoinDiscoveryFilterState & {
  view: ExploreDiscoveryView;
  weekAnchorDate: string;
};

export function createInitialDiscoveryUiState(
  now = new Date(),
): JoinDiscoveryUiState {
  const base = createDefaultDiscoveryFilter(now);
  return {
    ...base,
    view: 'LIST',
    weekAnchorDate: base.date,
  };
}

export type DiscoveryFilterPatch = Partial<{
  date: string;
  region: JoinDiscoveryRegion;
  sort: JoinDiscoverySort;
  joinability: JoinDiscoveryJoinability;
  venueType: 'SCREEN' | 'FIELD';
  view: ExploreDiscoveryView;
  weekAnchorDate: string;
}>;

export type JoinListVenueType = 'SCREEN' | 'FIELD';

export function parseJoinListVenueTypeParam(
  raw?: string | string[] | null,
): JoinListVenueType | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'FIELD' || value === 'SCREEN') return value;
  return undefined;
}

/** Route/entry lock: FIELD only when the route says so. Everything else is SCREEN. */
export function resolveJoinListVenueType(
  raw?: string | string[] | null,
): JoinListVenueType {
  return parseJoinListVenueTypeParam(raw) ?? 'SCREEN';
}
