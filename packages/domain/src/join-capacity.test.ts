import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FIELD_ALLOWED_CAPACITIES,
  FIELD_ALLOWED_INDIVIDUAL_CAPACITIES,
  SCREEN_ALLOWED_CAPACITIES,
  SCREEN_ALLOWED_INDIVIDUAL_CAPACITIES,
  assertScreenCapacityUnchanged,
  isFieldV1Foursome,
  validateJoinCapacityForTrack,
} from './join-capacity';
import { INDIVIDUAL_MAX_PLAYERS, INDIVIDUAL_MIN_PLAYERS } from './join-play-format';

test('SCREEN_ALLOWED_CAPACITIES stays 2–8 individual and existing TEAM bounds', () => {
  assertScreenCapacityUnchanged();
  assert.deepEqual([...SCREEN_ALLOWED_INDIVIDUAL_CAPACITIES], [2, 3, 4, 5, 6, 7, 8]);
  assert.equal(SCREEN_ALLOWED_CAPACITIES.individual[0], INDIVIDUAL_MIN_PLAYERS);
  assert.equal(SCREEN_ALLOWED_CAPACITIES.individual.at(-1), INDIVIDUAL_MAX_PLAYERS);
  assert.equal(validateJoinCapacityForTrack({ playFormat: 'INDIVIDUAL', plannedPlayerCount: 8 }).ok, true);
  assert.equal(
    validateJoinCapacityForTrack({
      playFormat: 'TEAM',
      teamSize: 4,
      teamCount: 2,
      venueType: 'SCREEN',
    }).ok,
    true,
  );
});

test('FIELD v1 allows singles 2/3/4 and foursome 2v2 only', () => {
  assert.deepEqual([...FIELD_ALLOWED_INDIVIDUAL_CAPACITIES], [2, 3, 4]);
  assert.deepEqual(FIELD_ALLOWED_CAPACITIES.foursome, {
    label: '2v2',
    teamSize: 2,
    teamCount: 2,
    plannedPlayerCount: 4,
  });
  for (const count of [2, 3, 4]) {
    assert.equal(
      validateJoinCapacityForTrack({
        playFormat: 'INDIVIDUAL',
        plannedPlayerCount: count,
        venueType: 'FIELD',
      }).ok,
      true,
    );
  }
  const foursome = validateJoinCapacityForTrack({
    playFormat: 'TEAM',
    teamSize: 2,
    teamCount: 2,
    venueType: 'FIELD',
  });
  assert.equal(foursome.ok, true);
  assert.equal(isFieldV1Foursome({ teamSize: 2, teamCount: 2, plannedPlayerCount: 4 }), true);
});

test('FIELD v1 rejects 6 singles and 3v3', () => {
  const six = validateJoinCapacityForTrack({
    playFormat: 'INDIVIDUAL',
    plannedPlayerCount: 6,
    venueType: 'FIELD',
  });
  assert.equal(six.ok, false);
  if (!six.ok) assert.equal(six.code, 'field_capacity_not_allowed');

  const threeVthree = validateJoinCapacityForTrack({
    playFormat: 'TEAM',
    teamSize: 3,
    teamCount: 2,
    venueType: 'FIELD',
  });
  assert.equal(threeVthree.ok, false);
  if (!threeVthree.ok) assert.equal(threeVthree.code, 'field_foursome_v1_2v2_only');
});

test('SCREEN still accepts 6 and TEAM 3×2 so existing create does not regress', () => {
  assert.equal(
    validateJoinCapacityForTrack({
      playFormat: 'INDIVIDUAL',
      plannedPlayerCount: 6,
      venueType: 'SCREEN',
    }).ok,
    true,
  );
  assert.equal(
    validateJoinCapacityForTrack({
      playFormat: 'TEAM',
      teamSize: 3,
      teamCount: 2,
    }).ok,
    true,
  );
});
