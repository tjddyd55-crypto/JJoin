import assert from 'node:assert/strict';
import test from 'node:test';
import { assertVenueTypeMatch, parseJoinVenueType } from '@jjoin/domain';
import { createJoinSchema } from '@jjoin/validation';
import { joinCreateClientMessage } from './join-create-errors';

test('omitted venueType stays SCREEN so existing Join rows remain compatible', () => {
  assert.equal(parseJoinVenueType(undefined), 'SCREEN');
  const parsed = createJoinSchema.safeParse({
    venueId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-20T01:00:00.000Z',
    plannedPlayerCount: 4,
    joinMethod: 'OPEN',
  });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.venueType, undefined);
});

test('FIELD create is rejected when the venue is SCREEN', () => {
  const result = assertVenueTypeMatch({ requested: 'FIELD', venueType: 'SCREEN' });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, 'venue_type_mismatch');
    assert.match(joinCreateClientMessage(result.code), /조인 유형/);
  }
});

test('FIELD individual and 포썸 2v2/3v3 stay on the same create schema', () => {
  const venueId = '11111111-1111-4111-8111-111111111111';
  const startAt = '2026-09-20T01:00:00.000Z';
  const individual = createJoinSchema.safeParse({
    venueId,
    startAt,
    plannedPlayerCount: 4,
    joinMethod: 'OPEN',
    venueType: 'FIELD',
    playFormat: 'INDIVIDUAL',
  });
  const foursome2 = createJoinSchema.safeParse({
    venueId,
    startAt,
    plannedPlayerCount: 4,
    joinMethod: 'OPEN',
    venueType: 'FIELD',
    playFormat: 'TEAM',
    teamSize: 2,
    teamCount: 2,
  });
  const foursome3 = createJoinSchema.safeParse({
    venueId,
    startAt,
    plannedPlayerCount: 6,
    joinMethod: 'OPEN',
    venueType: 'FIELD',
    playFormat: 'TEAM',
    teamSize: 3,
    teamCount: 2,
  });
  assert.equal(individual.success, true);
  assert.equal(foursome2.success, true);
  assert.equal(foursome3.success, true);
});
