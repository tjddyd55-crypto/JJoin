import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dedupeGolfFacilities,
  formatFacilityRegion,
} from './store-facility-search';
import type { GolfFacilityMapDto } from '@jjoin/types';

const sample = (id: string, overrides: Partial<GolfFacilityMapDto> = {}): GolfFacilityMapDto =>
  ({
    id,
    displayName: `Store ${id}`,
    facilityType: 'SCREEN_GOLF',
    screenStatus: 'CONFIRMED',
    hasScreenGolf: 'YES',
    primaryBrand: 'GOLFZON',
    latitude: 37.5,
    longitude: 127.0,
    roadAddress: '서울 강남구',
    sido: '서울특별시',
    sigungu: '강남구',
    coordinateStatus: 'VALID',
    selectable: true,
    isScreenJoinEligible: true,
    ...overrides,
  }) as GolfFacilityMapDto;

test('dedupeGolfFacilities keeps first occurrence', () => {
  const items = [sample('a'), sample('a'), sample('b')];
  const out = dedupeGolfFacilities(items);
  assert.equal(out.length, 2);
  assert.equal(out[0]?.id, 'a');
  assert.equal(out[1]?.id, 'b');
});

test('formatFacilityRegion joins sido and sigungu', () => {
  assert.equal(formatFacilityRegion(sample('a')), '서울특별시 강남구');
});
