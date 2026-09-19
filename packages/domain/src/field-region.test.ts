import assert from 'node:assert/strict';
import test from 'node:test';
import { ADMIN_SIDO_GROUPS } from './admin-districts';
import { listSidoSpellings } from './region-explore-catalog';
import {
  FIELD_REGION_CATALOG,
  FIELD_REGION_MAX_DEPTH,
  assertFieldRegionHasNoDongStep,
  formatFieldCourseLocationLine,
  formatFieldCourseRegionLabel,
  formatFieldCourseShortAddress,
  isFieldDongFilterToken,
  isFieldMetroProvince,
  isFieldSigunguFilterToken,
  listFieldSigunguChoices,
  matchesFieldCityCounty,
  nextFieldCoursePickerStepAfterSido,
  normalizeFieldCityCounty,
  shouldSkipFieldSigunguStep,
} from './field-region';

test('FIELD region depth is province → city/county only', () => {
  assert.equal(FIELD_REGION_MAX_DEPTH, 2);
  assertFieldRegionHasNoDongStep();
  assert.equal(isFieldDongFilterToken('양지면'), true);
  assert.equal(isFieldDongFilterToken('역삼동'), true);
  assert.equal(isFieldDongFilterToken('용인시'), false);
  assert.equal(isFieldDongFilterToken('처인구'), false);
});

test('canonicalizes 경기/강원 aliases and strips 도-level 구 to 시', () => {
  assert.deepEqual(normalizeFieldCityCounty('경기', '용인시 처인구'), {
    province: '경기도',
    cityCounty: '용인시',
  });
  assert.deepEqual(normalizeFieldCityCounty('경기도', '처인구'), {
    province: '경기도',
    cityCounty: '용인시',
  });
  assert.deepEqual(normalizeFieldCityCounty('강원', '춘천시 신동면'), {
    province: '강원특별자치도',
    cityCounty: '춘천시',
  });
  assert.deepEqual(normalizeFieldCityCounty('서울특별시', '강남구'), {
    province: '서울특별시',
    cityCounty: '강남구',
  });
});

test('city/county match does not use dong as a filter key', () => {
  assert.equal(
    matchesFieldCityCounty({
      rowSido: '경기도',
      rowSigungu: '용인시 처인구 양지면',
      targetProvince: '경기도',
      targetCityCounty: '용인시',
    }),
    true,
  );
  assert.equal(
    matchesFieldCityCounty({
      rowSido: '경기도',
      rowSigungu: '이천시',
      targetProvince: '경기도',
      targetCityCounty: '용인시',
    }),
    false,
  );
});

test('FIELD catalog cities are 시/군 (or metro 구) and never 읍면동', () => {
  const gyeonggi = FIELD_REGION_CATALOG.find((g) => g.province === '경기도');
  assert.ok(gyeonggi);
  assert.ok(gyeonggi?.cities.some((c) => c.cityCounty === '용인시'));
  assert.equal(gyeonggi?.cities.some((c) => c.cityCounty === '처인구'), false);
  assert.equal(gyeonggi?.cities.some((c) => isFieldDongFilterToken(c.cityCounty)), false);
  assert.ok(ADMIN_SIDO_GROUPS.some((g) => g.sido === '서울특별시' && g.districts.some((d) => d.sigungu === '강남구')));
});

test('course card uses city/county plus a short address that may contain dong text', () => {
  assert.equal(formatFieldCourseRegionLabel({ sido: '경기도', sigungu: '용인시 처인구' }), '용인시');
  assert.equal(
    formatFieldCourseShortAddress('경기도 용인시 처인구 양지면 주북로 100'),
    '경기도 용인시 처인구',
  );
});

test('FIELD picker skips 구 lists for metros and keeps 시/군 for provinces', () => {
  assert.equal(isFieldMetroProvince('서울'), true);
  assert.equal(isFieldMetroProvince('인천광역시'), true);
  assert.equal(isFieldMetroProvince('세종'), true);
  assert.equal(isFieldMetroProvince('경기'), false);
  assert.equal(isFieldMetroProvince('제주'), false);
  assert.equal(shouldSkipFieldSigunguStep('서울특별시'), true);
  assert.equal(shouldSkipFieldSigunguStep('부산'), true);
  assert.equal(shouldSkipFieldSigunguStep('경기도'), false);
  assert.equal(shouldSkipFieldSigunguStep('제주특별자치도'), false);
  assert.equal(nextFieldCoursePickerStepAfterSido('서울'), 'courses');
  assert.equal(nextFieldCoursePickerStepAfterSido('경기'), 'sigungu');
  assert.equal(isFieldSigunguFilterToken('용인시'), true);
  assert.equal(isFieldSigunguFilterToken('연천군'), true);
  assert.equal(isFieldSigunguFilterToken('강남구'), false);
  assert.equal(isFieldSigunguFilterToken('양지면'), false);
  assert.equal(
    listFieldSigunguChoices('서울특별시').some((city) => city.cityCounty === '강남구'),
    false,
  );
  assert.ok(listFieldSigunguChoices('경기도').some((city) => city.cityCounty === '용인시'));
  assert.equal(
    listFieldSigunguChoices('경기도').some((city) => city.cityCounty === '처인구'),
    false,
  );
  assert.equal(formatFieldCourseLocationLine({ sido: '경기', sigungu: '용인시 처인구' }), '경기 용인시');
  assert.equal(formatFieldCourseLocationLine({ sido: '서울특별시', sigungu: '강남구' }), '서울 강남구');
});

test('province SQL variants include 경기/경기도 aliases', () => {
  const variants = listSidoSpellings('경기');
  assert.ok(variants.includes('경기도'));
  assert.ok(variants.includes('경기'));
});
