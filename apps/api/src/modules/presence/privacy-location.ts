/**
 * Stable privacy-safe display coordinate.
 * - Deterministic per userId (markers don't jump every request)
 * - Offset from actual GPS so building-level inference is harder
 * - Snapped to a coarse grid
 */
export function toPrivacyDisplayPoint(input: {
  userId: string;
  latitude: number;
  longitude: number;
  jitterMinMeters: number;
  jitterMaxMeters: number;
  gridDegrees: number;
}): { displayLat: number; displayLng: number } {
  const seed = hashString(input.userId);
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
  // Never collapse back onto the same coarse cell as the exact point.
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

function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
