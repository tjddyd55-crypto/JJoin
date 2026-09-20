import assert from 'node:assert/strict';
import test from 'node:test';
import { listFieldSigunguChoices } from '@jjoin/domain';
import {
  formatFieldNotificationRegions,
  isFieldRegionSelected,
  listCustomFieldCityChoices,
  toggleFieldNotificationRegion,
} from './join-created-preference-regions';

test('CUSTOM city picker exposes the full Gyeonggi catalog, not 8 cities', () => {
  const cities = listCustomFieldCityChoices('경기도');
  assert.ok(cities.length >= 31);
  assert.equal(cities.length, listFieldSigunguChoices('경기도').length);
  assert.ok(cities.some((city) => city.cityCounty === '용인시'));
  assert.ok(cities.some((city) => city.cityCounty === '연천군'));
  assert.ok(cities.some((city) => city.cityCounty === '가평군'));
  assert.equal(cities.slice(0, 8).length, 8);
  assert.ok(cities.length > 8);
});

test('CUSTOM picker keeps province-wide and multi-city selection', () => {
  let selected = toggleFieldNotificationRegion([], { province: '경기도', cityCounty: null });
  selected = toggleFieldNotificationRegion(selected, { province: '경기도', cityCounty: '용인시' });
  selected = toggleFieldNotificationRegion(selected, { province: '경기도', cityCounty: '성남시' });
  assert.equal(isFieldRegionSelected(selected, { province: '경기도', cityCounty: null }), true);
  assert.equal(isFieldRegionSelected(selected, { province: '경기도', cityCounty: '용인시' }), true);
  assert.equal(isFieldRegionSelected(selected, { province: '경기도', cityCounty: '성남시' }), true);
  selected = toggleFieldNotificationRegion(selected, { province: '경기도', cityCounty: '용인시' });
  assert.equal(isFieldRegionSelected(selected, { province: '경기도', cityCounty: '용인시' }), false);
  assert.match(formatFieldNotificationRegions(selected), /경기도/);
});
