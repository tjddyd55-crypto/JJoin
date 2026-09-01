import assert from 'node:assert/strict';
import test from 'node:test';
import { isRawVenueIdLabel, resolveVenueDisplayName } from './venue-display';

test('resolveVenueDisplayName prefers GolfFacility display name', () => {
  assert.equal(
    resolveVenueDisplayName({
      golfFacilityDisplayName: '가자 24시 스크린 골프',
      activatedVenueName: 'LOCALDATA-xyz',
      storedVenueName: 'fallback',
    }),
    '가자 24시 스크린 골프',
  );
});

test('isRawVenueIdLabel detects uuid and json', () => {
  assert.equal(isRawVenueIdLabel('a1b2c3d4-e5f6-7890-abcd-ef1234567890'), true);
  assert.equal(isRawVenueIdLabel('{"id":"x"}'), true);
  assert.equal(isRawVenueIdLabel('가자 24시'), false);
});
