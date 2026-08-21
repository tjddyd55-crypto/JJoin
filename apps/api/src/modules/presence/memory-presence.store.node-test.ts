import assert from 'node:assert/strict';
import test from 'node:test';
import { PresenceVisibility } from '@jjoin/types';
import { MemoryPresenceStore } from './memory-presence.store';

test('memory store excludes expired and hidden', async () => {
  const store = new MemoryPresenceStore();
  const now = new Date();
  await store.upsert({
    userId: 'alive',
    visibility: PresenceVisibility.AVAILABLE,
    availableUntil: new Date(now.getTime() + 60_000),
    latitude: 34.88,
    longitude: 128.62,
    accuracyMeters: 10,
    lastLocationAt: now,
    updatedAt: now,
  });
  await store.upsert({
    userId: 'expired',
    visibility: PresenceVisibility.AVAILABLE,
    availableUntil: new Date(now.getTime() - 60_000),
    latitude: 34.881,
    longitude: 128.621,
    accuracyMeters: 10,
    lastLocationAt: now,
    updatedAt: now,
  });
  await store.upsert({
    userId: 'hidden',
    visibility: PresenceVisibility.HIDDEN,
    availableUntil: null,
    latitude: 34.882,
    longitude: 128.622,
    accuracyMeters: 10,
    lastLocationAt: now,
    updatedAt: now,
  });

  const near = await store.findNearbyCandidates({
    centerLat: 34.88,
    centerLng: 128.62,
    radiusMeters: 5000,
    freshnessMinutes: 180,
    limit: 40,
  });
  assert.equal(near.length, 1);
  assert.equal(near[0]?.userId, 'alive');

  await store.hide('alive');
  const afterHide = await store.findNearbyCandidates({
    centerLat: 34.88,
    centerLng: 128.62,
    radiusMeters: 5000,
    freshnessMinutes: 180,
    limit: 40,
  });
  assert.equal(afterHide.length, 0);
});

test('memory store self exclusion via viewerUserId', async () => {
  const store = new MemoryPresenceStore();
  const now = new Date();
  await store.upsert({
    userId: 'me',
    visibility: PresenceVisibility.AVAILABLE,
    availableUntil: new Date(now.getTime() + 60_000),
    latitude: 34.88,
    longitude: 128.62,
    accuracyMeters: null,
    lastLocationAt: now,
    updatedAt: now,
  });
  const near = await store.findNearbyCandidates({
    centerLat: 34.88,
    centerLng: 128.62,
    radiusMeters: 5000,
    freshnessMinutes: 180,
    viewerUserId: 'me',
    limit: 40,
  });
  assert.equal(near.length, 0);
});
