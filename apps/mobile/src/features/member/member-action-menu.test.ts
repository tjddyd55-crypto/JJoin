import assert from 'node:assert/strict';
import test from 'node:test';
import { isOwnMemberProfile, resolveBoundGiftRecipientName } from './model/member-actions';

test('hides member actions on own profile', () => {
  assert.equal(isOwnMemberProfile('u1', 'u1'), true);
  assert.equal(isOwnMemberProfile('u1', 'u2'), false);
  assert.equal(isOwnMemberProfile(null, 'u2'), false);
});

test('gift confirm name comes from the server profile only', () => {
  assert.equal(resolveBoundGiftRecipientName(' 서버닉 '), '서버닉');
  assert.equal(resolveBoundGiftRecipientName(''), null);
  assert.equal(resolveBoundGiftRecipientName(undefined), null);
});
