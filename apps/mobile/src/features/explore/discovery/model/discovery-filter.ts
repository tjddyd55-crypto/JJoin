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
  view: ExploreDiscoveryView;
  weekAnchorDate: string;
}>;
