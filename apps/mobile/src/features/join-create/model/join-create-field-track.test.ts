import assert from 'node:assert/strict';
import test from 'node:test';
import { FIELD_FOURSOME_PRESETS, formatPlayFormatLabel, parseJoinVenueType } from '@jjoin/domain';
import { canAdvanceJoinCreateStep } from './join-create-steps';

test('create route venueType defaults to SCREEN for existing deep links', () => {
  assert.equal(parseJoinVenueType(undefined), 'SCREEN');
  assert.equal(parseJoinVenueType('FIELD'), 'FIELD');
});

test('weekly FIELD create title and template stay on the FIELD track', () => {
  const venueType = parseJoinVenueType('FIELD');
  assert.equal(venueType, 'FIELD');
  assert.equal(`라데나골프클럽 ${venueType === 'FIELD' ? '필드 조인' : '스크린골프'}`, '라데나골프클럽 필드 조인');
});

test('FIELD recruit 1-3 advances and 6-player create stays rejected', () => {
  assert.equal(
    canAdvanceJoinCreateStep('capacity', {
      venueReady: true,
      startAtValid: true,
      players: 4,
      playFormat: 'INDIVIDUAL',
      venueType: 'FIELD',
    }),
    true,
  );
  assert.equal(
    canAdvanceJoinCreateStep('capacity', {
      venueReady: true,
      startAtValid: true,
      players: 2,
      playFormat: 'INDIVIDUAL',
      venueType: 'FIELD',
    }),
    true,
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
  assert.equal(formatPlayFormatLabel('TEAM', 'FIELD'), '포썸');
  assert.equal(FIELD_FOURSOME_PRESETS[0].teamSize, 2);
});
