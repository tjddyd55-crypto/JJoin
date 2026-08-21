import assert from 'node:assert/strict';
import test from 'node:test';
import {
  boundingBox,
  haversineMeters,
  roundApproxDistanceMeters,
  toPrivacyDisplayPoint,
} from './privacy-location';
import {
  endOfCalendarDay,
  presencePrivacyEpoch,
  resolveAvailableUntil,
} from './presence-duration';

const secret = 'test-presence-privacy-secret';

test('haversine same point is ~0', () => {
  assert.ok(haversineMeters(34.88, 128.62, 34.88, 128.62) < 1);
});

test('haversine nearby within radius', () => {
  const d = haversineMeters(34.88, 128.62, 34.885, 128.625);
  assert.ok(d > 100 && d < 5000);
});

test('bounding box contains center', () => {
  const box = boundingBox(34.88, 128.62, 5000);
  assert.ok(box.minLat < 34.88 && box.maxLat > 34.88);
  assert.ok(box.minLng < 128.62 && box.maxLng > 128.62);
});

test('privacy display differs from exact and is stable within epoch', () => {
  const epoch = 'session-1';
  const a = toPrivacyDisplayPoint({
    userId: 'user-a',
    latitude: 34.8806,
    longitude: 128.6211,
    privacyEpoch: epoch,
    privacySecret: secret,
    jitterMinMeters: 80,
    jitterMaxMeters: 150,
    gridDegrees: 0.0005,
  });
  const b = toPrivacyDisplayPoint({
    userId: 'user-a',
    latitude: 34.8806,
    longitude: 128.6211,
    privacyEpoch: epoch,
    privacySecret: secret,
    jitterMinMeters: 80,
    jitterMaxMeters: 150,
    gridDegrees: 0.0005,
  });
  assert.equal(a.displayLat, b.displayLat);
  assert.equal(a.displayLng, b.displayLng);
  assert.notEqual(a.displayLat, 34.8806);
});

test('new privacy epoch changes fingerprint', () => {
  const base = {
    userId: 'user-a',
    latitude: 34.8806,
    longitude: 128.6211,
    privacySecret: secret,
    jitterMinMeters: 80,
    jitterMaxMeters: 150,
    gridDegrees: 0.0005,
  };
  const a = toPrivacyDisplayPoint({ ...base, privacyEpoch: 'session-1' });
  const b = toPrivacyDisplayPoint({ ...base, privacyEpoch: 'session-2' });
  assert.ok(a.displayLat !== b.displayLat || a.displayLng !== b.displayLng);
});

test('approx distance rounding avoids excessive precision', () => {
  assert.equal(roundApproxDistanceMeters(1237), 1200);
  assert.equal(roundApproxDistanceMeters(42), 40);
});

test('today resolves to Seoul end of calendar day', () => {
  const now = new Date('2026-08-21T05:00:00.000Z');
  const until = resolveAvailableUntil('today', now, 'Asia/Seoul');
  const end = endOfCalendarDay(now, 'Asia/Seoul');
  assert.equal(until.toISOString(), end.toISOString());
  assert.ok(until.getTime() > now.getTime());
});

test('presencePrivacyEpoch changes when session fields change', () => {
  const a = presencePrivacyEpoch({
    userId: 'u1',
    availableUntil: new Date('2026-08-21T10:00:00.000Z'),
    lastLocationAt: new Date('2026-08-21T08:00:00.000Z'),
  });
  const b = presencePrivacyEpoch({
    userId: 'u1',
    availableUntil: new Date('2026-08-21T11:00:00.000Z'),
    lastLocationAt: new Date('2026-08-21T08:00:00.000Z'),
  });
  assert.notEqual(a, b);
});
