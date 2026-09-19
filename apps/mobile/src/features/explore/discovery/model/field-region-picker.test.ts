import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FIELD_REGION_CATALOG,
  assertFieldRegionHasNoDongStep,
  isFieldDongFilterToken,
  nextFieldCoursePickerStepAfterSido,
  normalizeFieldCityCounty,
  shouldSkipFieldSigunguStep,
} from '@jjoin/domain';

test('FIELD create/list region catalog is province → city/county only', () => {
  assertFieldRegionHasNoDongStep();
  const gyeonggi = FIELD_REGION_CATALOG.find((g) => g.province === '경기도');
  assert.ok(gyeonggi?.cities.some((c) => c.cityCounty === '용인시'));
  assert.equal(gyeonggi?.cities.some((c) => c.cityCounty === '처인구'), false);
  assert.equal(isFieldDongFilterToken('역삼동'), true);
  assert.deepEqual(normalizeFieldCityCounty('경기도', '용인시 처인구'), {
    province: '경기도',
    cityCounty: '용인시',
  });
  assert.equal(shouldSkipFieldSigunguStep('서울특별시'), true);
  assert.equal(nextFieldCoursePickerStepAfterSido('경기도'), 'sigungu');
});
