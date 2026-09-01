import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dedupeClubActivityRegions,
  formatClubActivityRegionsCompact,
  normalizeClubActivityRegionInput,
  primaryClubRegionString,
} from './club-activity-regions';

test('dedupeClubActivityRegions rejects duplicate sido+sigungu', () => {
  const out = dedupeClubActivityRegions([
    { sido: '경기도', sigungu: '파주시' },
    { sido: '경기', sigungu: '파주시' },
    { sido: '서울특별시', sigungu: '은평구' },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].sigungu, '파주시');
  assert.equal(out[1].sigungu, '은평구');
});

test('formatClubActivityRegionsCompact shows parts or overflow', () => {
  const regions = [
    normalizeClubActivityRegionInput({ sido: '경기도', sigungu: '일산동구', parentSigungu: '고양시' }),
    normalizeClubActivityRegionInput({ sido: '경기도', sigungu: '파주시' }),
    normalizeClubActivityRegionInput({ sido: '서울특별시', sigungu: '은평구' }),
  ];
  assert.equal(
    formatClubActivityRegionsCompact(regions, { maxParts: 3 }),
    '경기 고양시 일산동구 · 파주시 · 은평구',
  );
  assert.equal(
    formatClubActivityRegionsCompact(regions, { maxParts: 2 }),
    '경기 고양시 일산동구 외 2곳',
  );
});

test('primaryClubRegionString uses first region', () => {
  const regions = dedupeClubActivityRegions([
    { sido: '경기도', sigungu: '일산동구', parentSigungu: '고양시' },
    { sido: '경기도', sigungu: '파주시' },
  ]);
  assert.equal(primaryClubRegionString(regions), '경기 고양시 일산동구');
});
