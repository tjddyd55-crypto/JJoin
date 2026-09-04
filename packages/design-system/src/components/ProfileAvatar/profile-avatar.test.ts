import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveProfileAvatarPixel } from './profile-avatar-sizes';

test('profile avatar compact size matches join host row layout', () => {
  const sizes = { joinHost: 56, joinHostLg: 64 };
  assert.equal(resolveProfileAvatarPixel('sm', sizes), 44);
  assert.equal(resolveProfileAvatarPixel('md', sizes), 56);
  assert.equal(resolveProfileAvatarPixel('lg', sizes), 64);
});
