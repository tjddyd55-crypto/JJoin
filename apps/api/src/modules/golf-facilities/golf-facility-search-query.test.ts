import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGolfFacilitySearchWhere,
  expandFacilitySearchTokens,
  golfFacilitySearchTake,
  refineGolfFacilitySearchRows,
  GOLF_FACILITY_SEARCH_DB_FETCH_CAP,
} from './golf-facility-search-query';

const TARGET_ID = 'b4967773-759d-4769-9915-764df406e136';

test('expandFacilitySearchTokens inserts space between Hangul and digits', () => {
  assert.deepEqual(expandFacilitySearchTokens('가자24').sort(), [
    '가자 24',
    '가자24',
  ].sort());
  assert.deepEqual(expandFacilitySearchTokens('가자 24').sort(), [
    '가자 24',
    '가자24',
  ].sort());
});

test('text search where uses DB contains OR fields (not nationwide take)', () => {
  const where = buildGolfFacilitySearchWhere({
    q: '가자24',
    screenOnly: true,
  });
  const json = JSON.stringify(where);
  assert.match(json, /가자24/);
  assert.match(json, /가자 24/);
  assert.match(json, /displayName/);
  assert.match(json, /sourceName/);
  assert.match(json, /roadAddress/);
  assert.match(json, /lotAddress/);
  assert.match(json, /isScreenJoinEligible/);
});

test('region search where prefilters sido/sigungu/address before limit', () => {
  const where = buildGolfFacilitySearchWhere({
    sido: '경기도',
    sigungu: '일산동구',
    screenOnly: true,
  });
  const json = JSON.stringify(where);
  assert.match(json, /일산동구/);
  assert.match(json, /고양시/);
  assert.match(json, /isScreenJoinEligible/);
});

test('golfFacilitySearchTake never uses legacy nationwide 2000 hard cap', () => {
  assert.equal(golfFacilitySearchTake(30, false), 31);
  const districtTake = golfFacilitySearchTake(30, true);
  assert.ok(districtTake <= GOLF_FACILITY_SEARCH_DB_FETCH_CAP);
  assert.ok(districtTake >= 31);
  assert.notEqual(districtTake, 2000);
});

test('region refine keeps 고양시 parent row for 일산동구 when address matches', () => {
  const rows = [
    {
      id: TARGET_ID,
      sido: '경기도',
      sigungu: '고양시',
      displayName: '가자 24시 스크린 골프',
      roadAddress: '경기도 고양시 일산동구 중앙로1275번길 60-14',
      lotAddress: null,
    },
    {
      id: 'west',
      sido: '경기도',
      sigungu: '고양시',
      displayName: '서구점',
      roadAddress: '경기도 고양시 일산서구 중앙로',
      lotAddress: null,
    },
    {
      id: 'other',
      sido: '경기도',
      sigungu: '파주시',
      displayName: '파주스크린',
      roadAddress: '경기도 파주시',
      lotAddress: null,
    },
  ];
  const { page, nextCursor } = refineGolfFacilitySearchRows(rows, {
    sido: '경기도',
    sigungu: '일산동구',
    limit: 30,
  });
  assert.equal(page.length, 1);
  assert.equal(page[0]?.id, TARGET_ID);
  assert.equal(nextCursor, null);
});

test('rows beyond legacy rank 2000 stay searchable when DB where already scoped', () => {
  const where = buildGolfFacilitySearchWhere({ q: '가자24', screenOnly: true });
  assert.ok(JSON.stringify(where).includes('가자24'));
  assert.ok(JSON.stringify(where).includes('가자 24'));
  const rows = [
    {
      id: TARGET_ID,
      sido: '경기도',
      sigungu: '고양시',
    },
  ];
  const { page } = refineGolfFacilitySearchRows(rows, { limit: 30 });
  assert.equal(page[0]?.id, TARGET_ID);
});

test('q-only refine does not drop text-matched rows', () => {
  const rows = [
    { id: TARGET_ID, sido: '경기도', sigungu: '고양시' },
    { id: 'x', sido: '서울특별시', sigungu: '중구' },
  ];
  const { page } = refineGolfFacilitySearchRows(rows, { limit: 10 });
  assert.equal(page.length, 2);
});

test('screenOnly false omits isScreenJoinEligible', () => {
  const where = buildGolfFacilitySearchWhere({ q: '스크린' });
  const json = JSON.stringify(where);
  assert.doesNotMatch(json, /isScreenJoinEligible/);
});

test('일산서구 / 덕양구 / 파주시 region hints remain valid', () => {
  for (const sigungu of ['일산서구', '덕양구', '파주시'] as const) {
    const where = buildGolfFacilitySearchWhere({
      sido: '경기도',
      sigungu,
      screenOnly: true,
    });
    assert.match(JSON.stringify(where), new RegExp(sigungu));
  }
});
