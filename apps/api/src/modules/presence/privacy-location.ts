import { createHmac } from 'crypto';

/**
 * Privacy-safe display coordinate for public maps.
 * - Deterministic within a presence privacy epoch (markers don't jump every request)
 * - Epoch rotates per presence session → no permanent fingerprint from userId alone
 * - Exact GPS never returned; offset + coarse grid
 */
export function toPrivacyDisplayPoint(input: {
  userId: string;
  latitude: number;
  longitude: number;
  /** Session/epoch material (NOT permanent userId-only). */
  privacyEpoch: string;
  privacySecret: string;
  jitterMinMeters: number;
  jitterMaxMeters: number;
  gridDegrees: number;
}): { displayLat: number; displayLng: number } {
  const seed = hmacToUint(
    input.privacySecret,
    `${input.userId}|${input.privacyEpoch}`,
  );
  const span = Math.max(1, input.jitterMaxMeters - input.jitterMinMeters);
  const meters = input.jitterMinMeters + (seed % span);
  const angle = ((seed % 360) * Math.PI) / 180;
  const dLat = (meters * Math.cos(angle)) / 111_320;
  const dLng =
    (meters * Math.sin(angle)) /
    (111_320 * Math.cos((input.latitude * Math.PI) / 180) || 1);
  const rawLat = input.latitude + dLat;
  const rawLng = input.longitude + dLng;
  let displayLat = snap(rawLat, input.gridDegrees);
  let displayLng = snap(rawLng, input.gridDegrees);
  const exactLat = snap(input.latitude, input.gridDegrees);
  const exactLng = snap(input.longitude, input.gridDegrees);
  if (displayLat === exactLat && displayLng === exactLng) {
    displayLat = exactLat + (seed % 2 === 0 ? input.gridDegrees : -input.gridDegrees);
    displayLng = exactLng + (seed % 3 === 0 ? input.gridDegrees : -input.gridDegrees);
  }
  return { displayLat, displayLng };
}

export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Approximate public distance — no excessive precision. */
export function roundApproxDistanceMeters(meters: number): number {
  if (meters < 100) return Math.round(meters / 10) * 10;
  if (meters < 1000) return Math.round(meters / 50) * 50;
  return Math.round(meters / 100) * 100;
}

export function boundingBox(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusMeters / 111_320;
  const cos = Math.cos((centerLat * Math.PI) / 180) || 1;
  const lngDelta = radiusMeters / (111_320 * cos);
  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLng: centerLng - lngDelta,
    maxLng: centerLng + lngDelta,
  };
}

function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

function hmacToUint(secret: string, material: string): number {
  const digest = createHmac('sha256', secret).update(material).digest();
  return digest.readUInt32BE(0);
}
