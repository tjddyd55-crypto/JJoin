import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatPlayFormatLabel,
  resolvePlannedPlayerCount,
  validateJoinPlayFormat,
  validateTeamAssignment,
} from './join-play-format';

test('individual play keeps plannedPlayerCount and clears team fields', () => {
  const result = validateJoinPlayFormat({
    playFormat: 'INDIVIDUAL',
    plannedPlayerCount: 4,
    teamSize: 4,
    teamCount: 2,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value, {
    playFormat: 'INDIVIDUAL',
    plannedPlayerCount: 4,
    teamSize: null,
    teamCount: null,
  });
});

test('individual rejects roster outside 2–8', () => {
  assert.equal(validateJoinPlayFormat({ playFormat: 'INDIVIDUAL', plannedPlayerCount: 1 }).ok, false);
  assert.equal(validateJoinPlayFormat({ playFormat: 'INDIVIDUAL', plannedPlayerCount: 9 }).ok, false);
});

test('team format derives capacity from teamSize * teamCount', () => {
  const result = validateJoinPlayFormat({
    playFormat: 'TEAM',
    teamSize: 4,
    teamCount: 2,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.plannedPlayerCount, 8);
  assert.equal(resolvePlannedPlayerCount(result.value), 8);
  assert.equal(formatPlayFormatLabel('TEAM'), '팀전');
});

test('team format requires size and count', () => {
  const result = validateJoinPlayFormat({ playFormat: 'TEAM', plannedPlayerCount: 8 });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'team_size_and_count_required');
});

test('team assignment accepts 0..teamCount-1 and rejects overflow', () => {
  assert.deepEqual(
    validateTeamAssignment({ playFormat: 'TEAM', teamCount: 2, teamIndex: 1 }),
    { ok: true, teamIndex: 1 },
  );
  assert.equal(
    validateTeamAssignment({ playFormat: 'TEAM', teamCount: 2, teamIndex: 2 }).ok,
    false,
  );
  assert.deepEqual(
    validateTeamAssignment({ playFormat: 'INDIVIDUAL', teamCount: null, teamIndex: 1 }),
    { ok: true, teamIndex: null },
  );
});
