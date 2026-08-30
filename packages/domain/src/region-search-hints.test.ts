import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRegionSearchDbHints,
  matchesFacilityRegionSearch,
  matchesRegionScope,
} from './region-explore-catalog';

test('buildRegionSearchDbHints: 일산동구 includes parent 고양시 + address leaf', () => {
  const hints = buildRegionSearchDbHints('경기도', '일산동구');
  assert.ok(hints);
  assert.ok(hints!.sidoVariants.includes('경기도'));
  assert.ok(hints!.sidoVariants.includes('경기'));
  assert.ok(hints!.sigunguCandidates.includes('일산동구'));
  assert.ok(hints!.sigunguCandidates.includes('고양시'));
  assert.equal(hints!.addressContains, '일산동구');
});

test('buildRegionSearchDbHints: 고양시 expands to gu children', () => {
  const hints = buildRegionSearchDbHints('경기도', '고양시');
  assert.ok(hints);
  assert.ok(hints!.sigunguCandidates.includes('고양시'));
  assert.ok(hints!.sigunguCandidates.includes('일산동구'));
  assert.ok(hints!.sigunguCandidates.includes('일산서구'));
  assert.ok(hints!.sigunguCandidates.includes('덕양구'));
});

test('buildRegionSearchDbHints: 파주시 has no parent expansion', () => {
  const hints = buildRegionSearchDbHints('경기도', '파주시');
  assert.ok(hints);
  assert.deepEqual(
    [...hints!.sigunguCandidates].sort(),
    ['파주시'],
  );
  assert.equal(hints!.addressContains, '파주시');
});

test('matchesRegionScope: 고양시 row matches 일산동구 target via parent city', () => {
  assert.equal(
    matchesRegionScope('경기도', '고양시', '경기도', '일산동구'),
    true,
  );
  assert.equal(
    matchesRegionScope('경기도', '고양시', '경기도', '일산서구'),
    true,
  );
  assert.equal(
    matchesRegionScope('경기도', '고양시', '경기도', '덕양구'),
    true,
  );
  assert.equal(
    matchesRegionScope('경기도', '파주시', '경기도', '일산동구'),
    false,
  );
});

test('matchesFacilityRegionSearch: parent city needs address leaf', () => {
  assert.equal(
    matchesFacilityRegionSearch(
      {
        sido: '경기도',
        sigungu: '고양시',
        roadAddress: '경기도 고양시 일산동구 중앙로1275번길 60-14',
      },
      '경기도',
      '일산동구',
    ),
    true,
  );
  assert.equal(
    matchesFacilityRegionSearch(
      {
        sido: '경기도',
        sigungu: '고양시',
        roadAddress: '경기도 고양시 일산서구 중앙로',
      },
      '경기도',
      '일산동구',
    ),
    false,
  );
  assert.equal(
    matchesFacilityRegionSearch(
      { sido: '경기도', sigungu: '파주시', roadAddress: '경기도 파주시' },
      '경기도',
      '파주시',
    ),
    true,
  );
});
