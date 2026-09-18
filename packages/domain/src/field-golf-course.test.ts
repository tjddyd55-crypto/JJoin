import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FIELD_FOURSOME_PRESETS,
  normalizeFieldGolfCourseItem,
  normalizeFieldGolfSearchQuery,
  parseFieldRegion,
  parseHoleCount,
  resolveFieldGolfExternalId,
  resolveFieldGolfUpsertAction,
} from './field-golf-course';

const SAMPLE_KO = {
  지역: '경기',
  이름: '스카이72 골프클럽',
  사업자: '한국공항(주)',
  소재지: '인천광역시 중구 운서동 1730',
  '면적(제곱미터)': '123456',
  홀: '18홀',
  구분: '회원제',
};

test('normalize uses official Korean ODCloud columns and does not invent coords', () => {
  const row = normalizeFieldGolfCourseItem(SAMPLE_KO);
  assert.ok(row);
  assert.equal(row?.name, '스카이72 골프클럽');
  assert.equal(row?.address, '인천광역시 중구 운서동 1730');
  assert.equal(row?.sido, '경기도');
  assert.equal(row?.ownerName, '한국공항(주)');
  assert.equal(row?.holeCount, 18);
  assert.equal(row?.status, '회원제');
  assert.equal(row?.latitude, null);
  assert.equal(row?.phone, null);
});

test('English official aliases are accepted when present', () => {
  const row = normalizeFieldGolfCourseItem({
    region: '제주',
    name: '핀크스 골프클럽',
    owner: '핀크스',
    address: '제주특별자치도 서귀포시 안덕면',
    area: '1000',
    'number of holes': '27',
    type: '대중제',
  });
  assert.ok(row);
  assert.equal(row?.sido, '제주특별자치도');
  assert.equal(row?.holeCount, 27);
  assert.equal(row?.status, '대중제');
});

test('rows without a name are dropped rather than invented', () => {
  assert.equal(normalizeFieldGolfCourseItem({ 소재지: '서울' }), null);
});

test('dedupe prefers source id, then license, then name+address', () => {
  assert.equal(resolveFieldGolfExternalId({ 관리번호: 'A-1', 이름: 'A' }).idSource, 'SOURCE_ID');
  assert.equal(
    resolveFieldGolfExternalId({ 사업자등록번호: '123-45-67890', 이름: 'A' }).idSource,
    'LICENSE_OR_BUSINESS',
  );
  assert.equal(resolveFieldGolfExternalId({ 이름: '한 골프장', 소재지: '경기 용인' }).idSource, 'NAME_ADDRESS');
});

test('same name+address yields a stable external id', () => {
  const a = resolveFieldGolfExternalId({ 이름: '한 골프장', 소재지: '경기 용인시' });
  const b = resolveFieldGolfExternalId({ 이름: '한골프장', 소재지: '경기용인시' });
  assert.equal(a.externalId, b.externalId);
});

test('region parser canonicalizes short sido names', () => {
  assert.deepEqual(parseFieldRegion({ region: '서울', address: null, sido: null, sigungu: null }), {
    sido: '서울특별시',
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

test('hole parser accepts 18홀 style values', () => {
  assert.equal(parseHoleCount('18홀'), 18);
  assert.equal(parseHoleCount('abc'), null);
});

test('second sync with the same fingerprint is UNCHANGED (idempotent)', () => {
  const first = normalizeFieldGolfCourseItem(SAMPLE_KO);
  const second = normalizeFieldGolfCourseItem(SAMPLE_KO);
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
