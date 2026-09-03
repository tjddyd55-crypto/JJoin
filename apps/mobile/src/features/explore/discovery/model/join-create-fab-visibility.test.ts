import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shouldShowJoinCreateFab } from './join-create-fab-visibility';

test('shouldShowJoinCreateFab hides for general members', () => {
  assert.equal(shouldShowJoinCreateFab('GENERAL'), false);
  assert.equal(shouldShowJoinCreateFab(undefined), false);
});

test('shouldShowJoinCreateFab shows for store owners and premium', () => {
  assert.equal(shouldShowJoinCreateFab('STORE_OWNER'), true);
  assert.equal(shouldShowJoinCreateFab('PREMIUM'), true);
});
