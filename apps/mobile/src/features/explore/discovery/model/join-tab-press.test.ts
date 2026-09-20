import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  JOIN_TAB_DEFAULT_VENUE_TYPE,
  JOIN_TAB_ROUTE_NAME,
  resolveTabPressParams,
  shouldNavigateOnTabPress,
} from './join-tab-press';

test('bottom join tab press always resets to SCREEN', () => {
  assert.equal(JOIN_TAB_ROUTE_NAME, 'joins');
  assert.equal(JOIN_TAB_DEFAULT_VENUE_TYPE, 'SCREEN');
  assert.deepEqual(
    resolveTabPressParams({
      name: 'joins',
      params: { venueType: 'FIELD' },
    }),
    { venueType: 'SCREEN' },
  );
  assert.deepEqual(resolveTabPressParams({ name: 'joins' }), {
    venueType: 'SCREEN',
  });
  assert.equal(shouldNavigateOnTabPress('joins', true), true);
  assert.equal(shouldNavigateOnTabPress('joins', false), true);
});

test('tab press helper does not rewrite a stored FIELD route until Join is pressed', () => {
  const fieldRoute = { name: 'joins', params: { venueType: 'FIELD' as const } };
  assert.equal(fieldRoute.params.venueType, 'FIELD');
  assert.deepEqual(resolveTabPressParams(fieldRoute), { venueType: 'SCREEN' });
});

test('other tabs keep stored params and skip navigate when focused', () => {
  assert.deepEqual(
    resolveTabPressParams({ name: 'index', params: { keep: true } }),
    { keep: true },
  );
  assert.equal(resolveTabPressParams({ name: 'mall' }), undefined);
  assert.equal(shouldNavigateOnTabPress('index', true), false);
  assert.equal(shouldNavigateOnTabPress('index', false), true);
});
