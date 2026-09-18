import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertVenueTypeMatch,
  formatJoinVenueTypeLabel,
  hasValidKoreaMapCoords,
  parseJoinVenueType,
} from './venue-type';

test('parseJoinVenueType defaults omitted values to SCREEN', () => {
  assert.equal(parseJoinVenueType(undefined), 'SCREEN');
  assert.equal(parseJoinVenueType('FIELD'), 'FIELD');
  assert.equal(parseJoinVenueType('nope'), 'SCREEN');
});

test('venue type mismatch is rejected without creating a second Join model', () => {
  assert.deepEqual(assertVenueTypeMatch({ requested: 'FIELD', venueType: 'SCREEN' }), {
    ok: false,
    code: 'venue_type_mismatch',
  });
  assert.deepEqual(assertVenueTypeMatch({ requested: 'FIELD', venueType: 'FIELD' }), {
    ok: true,
  });
});

test('map coords require Korea bounds and reject 0,0 sentinels', () => {
  assert.equal(hasValidKoreaMapCoords(37.5, 127.0), true);
  assert.equal(hasValidKoreaMapCoords(0, 0), false);
  assert.equal(hasValidKoreaMapCoords(null, 127), false);
});

test('user-facing track labels stay SCREEN/FIELD', () => {
  assert.equal(formatJoinVenueTypeLabel('SCREEN'), '스크린 조인');
  assert.equal(formatJoinVenueTypeLabel('FIELD'), '필드 조인');
});
