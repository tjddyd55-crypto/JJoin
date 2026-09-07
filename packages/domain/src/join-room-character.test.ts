import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatScreenHandicapRange,
  normalizeJoinParticipantSkill,
  validateJoinParticipantSkill,
} from './join-participant-skill';
import { validateScreenHandicap } from './screen-handicap';

test('validateScreenHandicap allows null and negative', () => {
  assert.deepEqual(validateScreenHandicap(null), { ok: true, value: null });
  assert.deepEqual(validateScreenHandicap(-3), { ok: true, value: -3 });
  assert.equal(validateScreenHandicap(99).ok, false);
});

test('normalizeJoinParticipantSkill clears handicap unless range mode', () => {
  assert.deepEqual(
    normalizeJoinParticipantSkill({ participantSkillMode: 'ANY', minScreenHandicap: 1, maxScreenHandicap: 5 }),
    { participantSkillMode: 'ANY', minScreenHandicap: null, maxScreenHandicap: null },
  );
  assert.deepEqual(
    normalizeJoinParticipantSkill({ participantSkillMode: 'HANDICAP_RANGE' }),
    { participantSkillMode: 'HANDICAP_RANGE', minScreenHandicap: 0, maxScreenHandicap: 15 },
  );
});

test('validateJoinParticipantSkill requires range when HANDICAP_RANGE', () => {
  assert.equal(
    validateJoinParticipantSkill({ participantSkillMode: 'HANDICAP_RANGE', minScreenHandicap: null, maxScreenHandicap: 10 }).ok,
    false,
  );
  assert.equal(
    validateJoinParticipantSkill({ participantSkillMode: 'HANDICAP_RANGE', minScreenHandicap: 5, maxScreenHandicap: 15 }).ok,
    true,
  );
});

test('formatScreenHandicapRange', () => {
  assert.equal(formatScreenHandicapRange(5, 15), '핸디 5~15');
});
