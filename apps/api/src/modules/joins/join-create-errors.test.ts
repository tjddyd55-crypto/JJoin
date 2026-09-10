import assert from 'node:assert/strict';
import test from 'node:test';
import { createJoinSchema, createStoreMatchingJoinSchema } from '@jjoin/validation';
import { joinCreateBadRequest, joinCreateBadRequestFromZod } from './join-create-errors';

test('store matching zod failure returns first refine code', () => {
  const parsed = createStoreMatchingJoinSchema.safeParse({
    storeOwnershipId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-11T10:00:00.000Z',
    recruitClosesAt: '2026-09-11T07:00:00.000Z',
    targetMaleCount: 1,
    targetFemaleCount: 1,
    minimumPlayers: 3,
    matchingRewardTarget: 'FEMALE',
    rewardPerParticipant: '0',
  });
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  const ex = joinCreateBadRequestFromZod(parsed.error, 'invalid_store_matching_join');
  const body = ex.getResponse() as { code: string; message: string };
  assert.equal(body.code, 'minimum_exceeds_planned');
  assert.match(body.message, /최소 인원/);
});

test('store matching accepts reward 0', () => {
  const parsed = createStoreMatchingJoinSchema.safeParse({
    storeOwnershipId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-11T10:00:00.000Z',
    recruitClosesAt: '2026-09-11T07:00:00.000Z',
    targetMaleCount: 2,
    targetFemaleCount: 2,
    minimumPlayers: 3,
    matchingRewardTarget: 'FEMALE',
    rewardPerParticipant: '0',
  });
  assert.equal(parsed.success, true);
});

test('standard create zod missing venue uses structured code', () => {
  const parsed = createJoinSchema.safeParse({
    startAt: '2026-09-11T10:00:00.000Z',
    plannedPlayerCount: 3,
    joinMethod: 'OPEN',
    rewardPerParticipant: '0',
  });
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  const ex = joinCreateBadRequestFromZod(parsed.error, 'invalid_create_join');
  const body = ex.getResponse() as { code: string };
  assert.equal(body.code, 'venue_or_venueId_required');
});

test('joinCreateBadRequest keeps code + Korean message', () => {
  const ex = joinCreateBadRequest('start_at_must_be_future');
  const body = ex.getResponse() as { code: string; message: string };
  assert.equal(body.code, 'start_at_must_be_future');
  assert.match(body.message, /시작 시간/);
});
