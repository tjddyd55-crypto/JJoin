export type ExploreMapMarkerPipelineStats = {
  reason: string;
  apiRawCount: number;
  apiMappedCount: number;
  invalidCoordinateCount: number;
  stateVenueCount: number;
  markerDtoCount: number;
  viewportBounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  } | null;
  inViewportCount: number;
  uniqueCoordinateBuckets: number;
};

export function logExploreMapMarkerPipeline(stats: ExploreMapMarkerPipelineStats): void {
  if (!__DEV__) return;
  console.log('[ExploreMap:markers]', {
    ...stats,
    summary: [
      `api=${stats.apiRawCount}`,
      `state=${stats.stateVenueCount}`,
      `dto=${stats.markerDtoCount}`,
      `inViewport=${stats.inViewportCount}`,
      `uniqueCoords=${stats.uniqueCoordinateBuckets}`,
    ].join(' '),
  });
}
