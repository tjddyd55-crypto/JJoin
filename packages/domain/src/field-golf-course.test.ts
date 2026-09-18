import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FIELD_FOURSOME_PRESETS,
  ODCLOUD_FIELD_GOLF_ROW_KEYS,
  ODCLOUD_FIELD_GOLF_ROW_KEY_ESCAPES,
  decodeOdcloudFieldGolfKeyEscape,
  normalizeFieldGolfCourseItem,
  normalizeFieldGolfSearchQuery,
  parseFieldRegion,
  parseHoleCount,
  resolveFieldGolfExternalId,
  resolveFieldGolfUpsertAction,
} from './field-golf-course';

/** HEX-verified ensure_ascii JSON row from the DEV probe. totalCount=541. */
const SAMPLE_LIVE = JSON.parse(
  '{"구분":"회원제","면적(제곱미터)":1533823,"사업자":"두산큐벡스㈜(문희종)","소재지":"춘천시 신동면 칠전동길 72","이름":"라데나골프클럽","지역":"강원","홀":27}',
) as Record<string, unknown>;

test('live row keys match HEX-verified unicode_escape names', () => {
  const decoded = ODCLOUD_FIELD_GOLF_ROW_KEY_ESCAPES.map(decodeOdcloudFieldGolfKeyEscape);
  assert.deepEqual(decoded, [
    '구분',
    '면적(제곱미터)',
    '사업자',
    '소재지',
    '이름',
    '지역',
    '홀',
  ]);
  assert.deepEqual([...ODCLOUD_FIELD_GOLF_ROW_KEYS], decoded);
});

test('normalize maps the HEX-verified sample row and never invents coords/phone', () => {
  const row = normalizeFieldGolfCourseItem(SAMPLE_LIVE);
  assert.ok(row);
  assert.equal(row?.name, '라데나골프클럽');
  assert.equal(row?.address, '춘천시 신동면 칠전동길 72');
  assert.equal(row?.region, '강원');
  assert.equal(row?.sido, '강원특별자치도');
  assert.equal(row?.sigungu, '춘천시');
  assert.equal(row?.ownerName, '두산큐벡스㈜(문희종)');
  assert.equal(row?.holeCount, 27);
  assert.equal(row?.areaSqm, '1533823');
  assert.equal(row?.status, '회원제');
  assert.equal(row?.latitude, null);
  assert.equal(row?.longitude, null);
  assert.equal(row?.phone, null);
  assert.equal(row?.roadAddress, null);
  assert.equal(row?.sourceUpdatedAt, null);
});

test('English or license aliases are ignored — live payload has no those keys', () => {
  assert.equal(
    normalizeFieldGolfCourseItem({
      name: '핀크스 골프클럽',
      address: '제주특별자치도 서귀포시',
      owner: '핀크스',
      region: '제주',
      type: '대중제',
    }),
    null,
  );
});

test('rows without 이름 are dropped', () => {
  assert.equal(normalizeFieldGolfCourseItem({ 소재지: '서울', 지역: '서울' }), null);
});

test('dedupe prefers 이름+소재지+사업자, then 이름+소재지', () => {
  const withOwner = resolveFieldGolfExternalId({
    name: '한 골프장',
    address: '경기 용인시',
    ownerName: '한골프',
  });
  const withoutOwner = resolveFieldGolfExternalId({
    name: '한 골프장',
    address: '경기 용인시',
    ownerName: null,
  });
  assert.equal(withOwner.idSource, 'NAME_ADDRESS_OWNER');
  assert.equal(withoutOwner.idSource, 'NAME_ADDRESS');
  assert.notEqual(withOwner.externalId, withoutOwner.externalId);
});

test('same 이름+소재지+사업자 yields a stable external id', () => {
  const a = resolveFieldGolfExternalId({
    name: '한 골프장',
    address: '경기 용인시',
    ownerName: '한골프',
  });
  const b = resolveFieldGolfExternalId({
    name: '한골프장',
    address: '경기용인시',
    ownerName: '한 골프',
  });
  assert.equal(a.externalId, b.externalId);
});

test('different 사업자 on the same 이름+소재지 is a different course', () => {
  const a = resolveFieldGolfExternalId({
    name: '한 골프장',
    address: '경기 용인시',
    ownerName: 'A운영',
  });
  const b = resolveFieldGolfExternalId({
    name: '한 골프장',
    address: '경기 용인시',
    ownerName: 'B운영',
  });
  assert.notEqual(a.externalId, b.externalId);
});

test('region parser canonicalizes short 지역 values like 강원', () => {
  assert.deepEqual(parseFieldRegion({ region: '강원', address: null }), {
    sido: '강원특별자치도',
    sigungu: null,
  });
});

test('search pagination is bounded and 1-indexed', () => {
  const q = normalizeFieldGolfSearchQuery({ name: ' 핀크스 ', page: 2, perPage: 99 });
  assert.equal(q.name, '핀크스');
  assert.equal(q.page, 2);
  assert.equal(q.perPage, 50);
  assert.equal(q.skip, 50);
});

test('hole parser accepts live number 27 and string 18홀', () => {
  assert.equal(parseHoleCount(27), 27);
  assert.equal(parseHoleCount('18홀'), 18);
  assert.equal(parseHoleCount('abc'), null);
});

test('second sync with the same live row is UNCHANGED (idempotent)', () => {
  const first = normalizeFieldGolfCourseItem(SAMPLE_LIVE);
  const second = normalizeFieldGolfCourseItem(SAMPLE_LIVE);
  assert.ok(first && second);
  assert.equal(first?.fingerprint, second?.fingerprint);
  assert.equal(
    resolveFieldGolfUpsertAction({
      existingFingerprint: first!.fingerprint,
      nextFingerprint: second!.fingerprint,
    }),
    'UNCHANGED',
  );
  assert.equal(
    resolveFieldGolfUpsertAction({
      existingFingerprint: first!.fingerprint,
      nextFingerprint: 'changed',
    }),
    'UPDATE',
  );
});

test('missing source rows are never hard-deleted — callers only mark inactive', () => {
  assert.equal(
    resolveFieldGolfUpsertAction({ existingFingerprint: null, nextFingerprint: 'x' }),
    'INSERT',
  );
});

test('포썸 presets stay on TEAM 2v2 / 3v3', () => {
  assert.deepEqual(FIELD_FOURSOME_PRESETS, [
    { label: '2v2', teamSize: 2, teamCount: 2 },
    { label: '3v3', teamSize: 3, teamCount: 2 },
  ]);
});
