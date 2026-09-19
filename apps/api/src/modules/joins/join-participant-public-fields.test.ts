import assert from 'node:assert/strict';
import test from 'node:test';
import {
  pickJoinParticipantGolfHandicaps,
  resolveJoinParticipantPublicFields,
} from './join-participant-public-fields';

test('pickJoinParticipantGolfHandicaps prefers SCREEN_GOLF sport row', () => {
  const picked = pickJoinParticipantGolfHandicaps([
    { fieldHandicap: 20, screenHandicap: 18, sport: { code: 'OTHER' } },
    { fieldHandicap: 12, screenHandicap: 8, sport: { code: 'SCREEN_GOLF' } },
  ]);
  assert.deepEqual(picked, { fieldHandicap: 12, screenHandicap: 8 });
});

test('resolveJoinParticipantPublicFields hides age and handicaps when toggles are off', () => {
  const hidden = resolveJoinParticipantPublicFields({
    age: 46,
    fieldHandicap: 12,
    screenHandicap: 8,
    showAge: false,
    showHandicap: false,
    isOwner: false,
  });
  assert.deepEqual(hidden, { age: null, fieldHandicap: null, screenHandicap: null });
});

test('resolveJoinParticipantPublicFields keeps owner values even when toggles are off', () => {
  const own = resolveJoinParticipantPublicFields({
    age: 46,
    fieldHandicap: 12,
    screenHandicap: 8,
    showAge: false,
    showHandicap: false,
    isOwner: true,
  });
  assert.deepEqual(own, { age: 46, fieldHandicap: 12, screenHandicap: 8 });
});
