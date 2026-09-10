import { z } from 'zod';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStoreMatchingJoinSchema,
  firstZodIssueCode,
  profileSetupSchema,
  termsConsentSchema,
} from './index';

test('profile setup requires nickname and region', () => {
  const bad = profileSetupSchema.safeParse({
    nickname: 'a',
    gender: 'MALE',
    ageBand: 'THIRTIES',
    regionLabel: '',
    skillLevel: 'BEGINNER',
  });
  assert.equal(bad.success, false);

  const ok = profileSetupSchema.safeParse({
    nickname: '거제스윙',
    gender: 'MALE',
    ageBand: 'THIRTIES',
    regionLabel: '거제',
    skillLevel: 'INTERMEDIATE',
  });
  assert.equal(ok.success, true);
});

test('store matching schema accepts reward 0 and female target', () => {
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

test('firstZodIssueCode surfaces minimum_exceeds_planned', () => {
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
  assert.equal(firstZodIssueCode(parsed.error, 'invalid_store_matching_join'), 'minimum_exceeds_planned');
});

test('terms require all mandatory consents', () => {
  const bad = termsConsentSchema.safeParse({
    termsOfService: true,
    privacy: true,
    identity: false,
    location: true,
    marketing: false,
  });
  assert.equal(bad.success, false);
});
