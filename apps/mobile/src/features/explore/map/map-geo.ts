/** Pure geo helpers — unit-testable without native map. */

export function latitudeDeltaToZoomLevel(latitudeDelta: number): number {
  if (!Number.isFinite(latitudeDelta) || latitudeDelta <= 0) return 14;
  const zoom = Math.log2(360 / latitudeDelta);
  return Math.max(3, Math.min(20, Math.round(zoom)));
}

export function boundsFromCenterAndDeltas(input: {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}): { west: number; south: number; east: number; north: number } {
  const halfLat = input.latitudeDelta / 2;
  const halfLng = input.longitudeDelta / 2;
  return {
    west: input.longitude - halfLng,
    south: input.latitude - halfLat,
    east: input.longitude + halfLng,
    north: input.latitude + halfLat,
  };
}

export function regionFromBounds(bounds: {
  west: number;
  south: number;
  east: number;
  north: number;
}): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  return {
    latitude: (bounds.south + bounds.north) / 2,
    longitude: (bounds.west + bounds.east) / 2,
    latitudeDelta: Math.max(0.002, bounds.north - bounds.south),
    longitudeDelta: Math.max(0.002, bounds.east - bounds.west),
  };
}

export type GeoBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export function isCoordinateInBounds(
  latitude: number,
  longitude: number,
  bounds: GeoBounds,
): boolean {
  return (
    latitude >= bounds.south &&
    latitude <= bounds.north &&
    longitude >= bounds.west &&
    longitude <= bounds.east
  );
}

export function filterCoordinatesInBounds<T extends { latitude: number; longitude: number }>(
  items: T[],
  bounds: GeoBounds,
): T[] {
  return items.filter((item) =>
    isCoordinateInBounds(item.latitude, item.longitude, bounds),
  );
}

/** Count distinct coordinate buckets (detect stacked markers). */
export function countUniqueCoordinateBuckets(
  items: Array<{ latitude: number; longitude: number }>,
  precision = 4,
): number {
  const factor = 10 ** precision;
  const seen = new Set<string>();
  for (const item of items) {
    const lat = Math.round(item.latitude * factor) / factor;
    const lng = Math.round(item.longitude * factor) / factor;
    seen.add(`${lat},${lng}`);
  }
  return seen.size;
}

export function parseMarkerPressId(id: string): {
  kind: 'venue' | 'user' | 'unknown';
  entityId: string;
} {
  if (id.startsWith('venue:')) {
    return { kind: 'venue', entityId: id.slice('venue:'.length) };
  }
  if (id.startsWith('user:')) {
    return { kind: 'user', entityId: id.slice('user:'.length) };
  }
  return { kind: 'unknown', entityId: id };
}
