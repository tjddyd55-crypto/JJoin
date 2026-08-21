import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  boundsFromCenterAndDeltas,
  latitudeDeltaToZoomLevel,
  parseMarkerPressId,
  regionFromBounds,
} from './map-geo.ts';

describe('map-geo', () => {
  it('converts latitudeDelta to a sane Kakao zoom level', () => {
    assert.equal(latitudeDeltaToZoomLevel(0.04), 13);
    assert.ok(latitudeDeltaToZoomLevel(0.01) > latitudeDeltaToZoomLevel(0.08));
    assert.equal(latitudeDeltaToZoomLevel(0), 14);
  });

  it('builds west/south/east/north from center deltas (x=lng, y=lat)', () => {
    const b = boundsFromCenterAndDeltas({
      latitude: 34.88,
      longitude: 128.62,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    });
    assert.ok(Math.abs(b.west - 128.6) < 1e-9);
    assert.ok(Math.abs(b.east - 128.64) < 1e-9);
    assert.ok(Math.abs(b.south - 34.86) < 1e-9);
    assert.ok(Math.abs(b.north - 34.9) < 1e-9);
  });

  it('round-trips region from Kakao viewport bounds', () => {
    const region = regionFromBounds({
      west: 128.6,
      south: 34.86,
      east: 128.64,
      north: 34.9,
    });
    assert.ok(Math.abs(region.latitude - 34.88) < 1e-9);
    assert.ok(Math.abs(region.longitude - 128.62) < 1e-9);
    assert.ok(Math.abs(region.latitudeDelta - 0.04) < 1e-9);
    assert.ok(Math.abs(region.longitudeDelta - 0.04) < 1e-9);
  });

  it('parses venue/user marker press ids', () => {
    assert.deepEqual(parseMarkerPressId('venue:abc'), {
      kind: 'venue',
      entityId: 'abc',
    });
    assert.deepEqual(parseMarkerPressId('user:u1'), {
      kind: 'user',
      entityId: 'u1',
    });
  });
});
