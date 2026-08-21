/** JJOIN-neutral map types — Naver SDK types stay inside adapters. */

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapRegion = MapCoordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapBounds = {
  southWest: MapCoordinate;
  northEast: MapCoordinate;
};

export type MapCameraState = {
  center: MapCoordinate;
  zoom?: number;
};

export type ExploreFilterId = 'ALL' | 'VENUE' | 'USER' | 'TODAY_JOIN';

export type SheetMode = 'PEEK' | 'VENUE' | 'USER' | 'PRESENCE_PRIVACY' | 'PRESENCE_DURATION';

export const GEOJE_DEMO_REGION: MapRegion = {
  latitude: 34.8806,
  longitude: 128.6211,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export const SEOUL_FALLBACK_REGION: MapRegion = {
  latitude: 37.5665,
  longitude: 126.978,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};
