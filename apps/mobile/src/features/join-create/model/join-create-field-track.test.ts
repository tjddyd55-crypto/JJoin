import assert from 'node:assert/strict';
import test from 'node:test';
import { FIELD_FOURSOME_PRESETS, formatPlayFormatLabel, parseJoinVenueType } from '@jjoin/domain';
import { canAdvanceJoinCreateStep } from './join-create-steps';

test('create route venueType defaults to SCREEN for existing deep links', () => {
  assert.equal(parseJoinVenueType(undefined), 'SCREEN');
  assert.equal(parseJoinVenueType('FIELD'), 'FIELD');
});

test('FIELD 포썸 2v2 and 3v3 can advance the shared create SSOT', () => {
  assert.equal(
    canAdvanceJoinCreateStep('capacity', {
      venueReady: true,
      startAtValid: true,
      players: 4,
      playFormat: 'TEAM',
      teamSize: FIELD_FOURSOME_PRESETS[0].teamSize,
      teamCount: FIELD_FOURSOME_PRESETS[0].teamCount,
    }),
    true,
  );
  assert.equal(
    canAdvanceJoinCreateStep('capacity', {
      venueReady: true,
      startAtValid: true,
      players: 6,
      playFormat: 'TEAM',
      teamSize: FIELD_FOURSOME_PRESETS[1].teamSize,
      teamCount: FIELD_FOURSOME_PRESETS[1].teamCount,
    }),
    true,
  );
  assert.equal(formatPlayFormatLabel('TEAM', 'FIELD'), '포썸');
});
