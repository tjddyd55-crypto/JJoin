import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JoinPreferredGender } from '@jjoin/types';
import {
  hasJoinMemberPreferences,
  validateJoinMemberPreferences,
} from './join-member-preferences';

test('validateJoinMemberPreferences accepts open preferences', () => {
  assert.equal(validateJoinMemberPreferences({}).ok, true);
  assert.equal(
    validateJoinMemberPreferences({
      preferredGender: JoinPreferredGender.ANY,
      minAge: null,
      maxAge: null,
    }).ok,
    true,
  );
});

test('validateJoinMemberPreferences rejects inverted age range', () => {
  const result = validateJoinMemberPreferences({ minAge: 45, maxAge: 30 });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'invalid_age_range');
});

test('hasJoinMemberPreferences detects active filters', () => {
  assert.equal(hasJoinMemberPreferences({ preferredGender: JoinPreferredGender.FEMALE }), true);
  assert.equal(hasJoinMemberPreferences({ minAge: 30, maxAge: 40 }), true);
  assert.equal(hasJoinMemberPreferences({ preferredGender: JoinPreferredGender.ANY }), false);
});

test('age-range and member preferences initialize without a require cycle', async () => {
  const preferences = await import('./join-member-preferences');
  const ageRange = await import('./age-range');
  assert.equal(preferences.JOIN_MEMBER_MIN_AGE, 18);
  assert.equal(preferences.JOIN_MEMBER_MAX_AGE, 70);
  assert.equal(ageRange.MEMBER_AGE_MIN, 18);
  assert.equal(ageRange.MEMBER_AGE_MAX, 70);
  assert.equal(typeof ageRange.formatAgeRangeLabel, 'function');
  assert.deepEqual(preferences.formatJoinMemberPreferenceSummary({ minAge: 30, maxAge: 40 }), [
    '30세 ~ 40세',
  ]);
});
