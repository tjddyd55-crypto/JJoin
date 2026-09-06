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
