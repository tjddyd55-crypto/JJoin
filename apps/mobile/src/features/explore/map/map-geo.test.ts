import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countUniqueCoordinateBuckets,
  filterCoordinatesInBounds,
  isCoordinateInBounds,
} from './map-geo';

test('isCoordinateInBounds', () => {
  const bounds = { west: 127, south: 37.5, east: 127.1, north: 37.6 };
  assert.equal(isCoordinateInBounds(37.55, 127.05, bounds), true);
  assert.equal(isCoordinateInBounds(37.4, 127.05, bounds), false);
});

test('filterCoordinatesInBounds keeps only in-view items', () => {
  const bounds = { west: 0, south: 0, east: 1, north: 1 };
  const items = [
    { id: 'a', latitude: 0.5, longitude: 0.5 },
    { id: 'b', latitude: 2, longitude: 2 },
  ];
  const filtered = filterCoordinatesInBounds(items, bounds);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.id, 'a');
});

test('countUniqueCoordinateBuckets groups stacked pins', () => {
  const items = [
    { latitude: 37.50101, longitude: 127.00101 },
    { latitude: 37.50102, longitude: 127.00102 },
    { latitude: 37.51, longitude: 127.01 },
  ];
  assert.equal(countUniqueCoordinateBuckets(items, 3), 2);
});
