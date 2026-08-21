/**
 * Lightweight privacy-location checks.
 */
import assert from 'node:assert/strict';
import { haversineMeters, toPrivacyDisplayPoint } from './privacy-location';

const a = toPrivacyDisplayPoint({
  userId: 'user-a',
  latitude: 34.88,
  longitude: 128.62,
  jitterMinMeters: 80,
  jitterMaxMeters: 150,
  gridDegrees: 0.0005,
});
const b = toPrivacyDisplayPoint({
  userId: 'user-a',
  latitude: 34.88,
  longitude: 128.62,
  jitterMinMeters: 80,
  jitterMaxMeters: 150,
  gridDegrees: 0.0005,
});
assert.deepEqual(a, b);

const dist = haversineMeters(34.88, 128.62, a.displayLat, a.displayLng);
assert.ok(
  dist >= 50,
  `display point too close to exact GPS: ${dist}m (${a.displayLat},${a.displayLng})`,
);
assert.ok(a.displayLat !== 34.88 || a.displayLng !== 128.62);

const near = haversineMeters(34.88, 128.62, 34.881, 128.621);
const far = haversineMeters(34.88, 128.62, 37.56, 126.97);
assert.ok(near < 5000);
assert.ok(far > 5000);

console.log('privacy-location checks OK', { dist, ...a });
