import assert from 'node:assert/strict';
import test from 'node:test';
import {
  JOIN_CREATE_FORM_DEFAULTS,
  resolveJoinCreatePlayersFromParams,
  resolveJoinCreateRewardFromParams,
  shouldResetJoinCreateSession,
} from './join-create-session';

test('success leave then new create resets session', () => {
  assert.equal(shouldResetJoinCreateSession({ pendingNewSession: false }), false);
  assert.equal(shouldResetJoinCreateSession({ pendingNewSession: true }), true);
});

test('defaults preserve intentional form baseline', () => {
  assert.equal(JOIN_CREATE_FORM_DEFAULTS.players, 4);
  assert.equal(JOIN_CREATE_FORM_DEFAULTS.rewardPerParticipant, '0');
  assert.equal(resolveJoinCreatePlayersFromParams(undefined), 4);
  assert.equal(resolveJoinCreatePlayersFromParams('3'), 3);
  assert.equal(resolveJoinCreateRewardFromParams(undefined), '0');
  assert.equal(resolveJoinCreateRewardFromParams('1000'), '1000');
});
