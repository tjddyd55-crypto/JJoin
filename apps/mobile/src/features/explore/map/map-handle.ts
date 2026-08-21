import type { MapCoordinate } from '../model/map-types';
import type { MapBounds } from '../model/map-types';

/** Opaque camera control — SDK-specific refs stay inside adapters. */
export type MapCameraHandle = {
  animateCameraTo: (target: MapCoordinate, durationMs?: number) => Promise<void>;
  getViewportBounds?: () => Promise<MapBounds & { center: MapCoordinate }>;
};
