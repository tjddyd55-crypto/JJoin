import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAdvanceJoinCreateStep,
  joinCreateStepsForTrack,
} from './join-create-steps';

test('individual capacity stays 2–8 and team capacity uses size × count', () => {
  assert.equal(
    canAdvanceJoinCreateStep('capacity', {
      venueReady: true,
      startAtValid: true,
      players: 4,
      playFormat: 'INDIVIDUAL',
    }),
    true,
  );
  assert.equal(
    canAdvanceJoinCreateStep('capacity', {
      venueReady: true,
      startAtValid: true,
      players: 1,
      playFormat: 'INDIVIDUAL',
    }),
    false,
  );
  assert.equal(
    canAdvanceJoinCreateStep('capacity', {
      venueReady: true,
      startAtValid: true,
      players: 8,
      playFormat: 'TEAM',
      teamSize: 4,
      teamCount: 2,
    }),
    true,
  );
  assert.equal(
    canAdvanceJoinCreateStep('capacity', {
      venueReady: true,
      startAtValid: true,
      players: 8,
      playFormat: 'TEAM',
    }),
    false,
  );
});

test('FIELD create is a single quick-create step and still rejects 6-player singles', () => {
  assert.deepEqual(
    joinCreateStepsForTrack('FIELD').map((step) => step.id),
    ['venue'],
  );
  assert.equal(joinCreateStepsForTrack('FIELD')[0]?.label, '빠른 생성');
  assert.equal(
    canAdvanceJoinCreateStep('venue', {
      venueReady: true,
      startAtValid: true,
      players: 4,
      venueType: 'FIELD',
      costValid: true,
    }),
    true,
  );
  assert.equal(
    canAdvanceJoinCreateStep('venue', {
      venueReady: true,
      startAtValid: true,
      players: 4,
      venueType: 'FIELD',
      costValid: false,
    }),
    false,
  );
  assert.equal(
    canAdvanceJoinCreateStep('capacity', {
      venueReady: true,
      startAtValid: true,
      players: 6,
      playFormat: 'INDIVIDUAL',
      venueType: 'FIELD',
    }),
    false,
  );
});
