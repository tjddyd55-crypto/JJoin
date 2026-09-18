import test from 'node:test';
import assert from 'node:assert/strict';
import {
  coinGiftSchema,
  createJoinSchema,
  createStoreBannerAdSchema,
  createStoreMatchingJoinSchema,
  firstZodIssueCode,
  profileEditSchema,
  profileMatchPreferenceSchema,
  profileSetupSchema,
  reviewStoreBannerAdSchema,
  scheduleStoreBannerAdSchema,
  termsConsentSchema,
  updateFeatureFlagsSchema,
  updateRewardPolicySchema,
  upsertHomeBannerSchema,
  upsertStoreProfileSchema,
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

test('profile edit accepts lifestyle and handicap fields as nullable', () => {
  const parsed = profileEditSchema.safeParse({
    nickname: '거제스윙',
    age: 32,
    heightCm: 178,
    drinking: 'SOMETIMES',
    smoking: null,
    fieldHandicap: 12,
    screenHandicap: null,
    personality: '차분한 라운드',
  });
  assert.equal(parsed.success, true);
});

test('team play format requires size and count', () => {
  const missing = createJoinSchema.safeParse({
    venueId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-20T01:00:00.000Z',
    plannedPlayerCount: 4,
    joinMethod: 'OPEN',
    playFormat: 'TEAM',
  });
  assert.equal(missing.success, false);

  const ok = createJoinSchema.safeParse({
    venueId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-20T01:00:00.000Z',
    plannedPlayerCount: 8,
    joinMethod: 'OPEN',
    playFormat: 'TEAM',
    teamSize: 4,
    teamCount: 2,
  });
  assert.equal(ok.success, true);
});

test('profile match preference rejects inverted ranges', () => {
  const parsed = profileMatchPreferenceSchema.safeParse({
    minAge: 40,
    maxAge: 20,
  });
  assert.equal(parsed.success, false);
});

test('coin gift and reward policy schemas', () => {
  assert.equal(
    coinGiftSchema.safeParse({
      toUserId: '11111111-1111-4111-8111-111111111111',
      amount: '5',
      idempotencyKey: 'gift-key-01',
    }).success,
    true,
  );
  assert.equal(
    updateRewardPolicySchema.safeParse({ hostThreshold: 0 }).success,
    false,
  );
});

test('store profile, banner, and feature flag schemas', () => {
  assert.equal(
    upsertStoreProfileSchema.safeParse({
      screenBrand: 'OTHER',
      screenBrandOther: '자체 시뮬',
      visibility: 'PUBLIC',
    }).success,
    true,
  );
  assert.equal(upsertHomeBannerSchema.safeParse({ title: '가을' }).success, true);
  assert.equal(
    createStoreBannerAdSchema.safeParse({
      ownershipId: '11111111-1111-4111-8111-111111111111',
      title: '광고',
    }).success,
    true,
  );
  assert.equal(reviewStoreBannerAdSchema.safeParse({ action: 'APPROVE' }).success, true);
  assert.equal(
    scheduleStoreBannerAdSchema.safeParse({
      startsAt: '2026-09-20T00:00:00.000Z',
      endsAt: '2026-09-30T00:00:00.000Z',
    }).success,
    true,
  );
  assert.equal(updateFeatureFlagsSchema.safeParse({ clubsUiEnabled: false }).success, true);
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
