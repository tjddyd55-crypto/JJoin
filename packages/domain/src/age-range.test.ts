import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatAgeRangeLabel,
  isUnrestrictedAgeRange,
  normalizeAgeRange,
  trackRatioToAge,
  validateMemberAgeRange,
} from './age-range';

test('formatAgeRangeLabel uses explicit ages', () => {
  assert.equal(formatAgeRangeLabel(35, 49), '35세 ~ 49세');
  assert.equal(formatAgeRangeLabel(null, null), '연령 무관');
});

test('normalizeAgeRange keeps unrestricted nulls', () => {
  assert.deepEqual(normalizeAgeRange({ minAge: null, maxAge: null }), {
    minAge: null,
    maxAge: null,
  });
});

test('normalizeAgeRange swaps inverted pair', () => {
  assert.deepEqual(normalizeAgeRange({ minAge: 50, maxAge: 40 }), {
    minAge: 40,
    maxAge: 50,
  });
});

test('validateMemberAgeRange requires paired bounds', () => {
  assert.equal(validateMemberAgeRange({ minAge: 30, maxAge: null }).ok, false);
  assert.equal(validateMemberAgeRange({ minAge: 30, maxAge: 40 }).ok, true);
});

test('trackRatioToAge rounds to nearest year', () => {
  assert.equal(trackRatioToAge(0), 18);
  assert.equal(trackRatioToAge(1), 70);
});

test('isUnrestrictedAgeRange', () => {
  assert.equal(isUnrestrictedAgeRange({ minAge: null, maxAge: null }), true);
  assert.equal(isUnrestrictedAgeRange({ minAge: 20, maxAge: null }), false);
});
