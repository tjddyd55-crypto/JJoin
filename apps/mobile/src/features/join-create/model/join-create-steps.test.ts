import assert from 'node:assert/strict';
import test from 'node:test';
import { canAdvanceJoinCreateStep } from './join-create-steps';

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

test('FIELD create uses a cost step and rejects 6-player singles', () => {
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
  assert.equal(
    canAdvanceJoinCreateStep('cost', {
      venueReady: true,
      startAtValid: true,
      players: 4,
      venueType: 'FIELD',
      costValid: true,
    }),
    true,
  );
});
